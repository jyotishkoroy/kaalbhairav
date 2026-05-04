// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerValidationInput, AnswerValidationResult, StoreValidationResultInput, ValidationIssue } from "./validation-types";
import { getAstroRagFlags } from "./feature-flags";
import { classifySafetyIntent } from "./safety-intent-classifier";
import { validateFactGrounding } from "./validators/fact-validator";
import { validateAnswerSafety } from "./validators/safety-validator";
import { validateAnswerTiming } from "./validators/timing-validator";
import { validateAnswerRemedies } from "./validators/remedy-validator";
import { validateGenericness } from "./validators/genericness-validator";
import { buildIssue, clampScore, extractAnswerText, textIncludesLoose, uniqueStrings } from "./validators/validator-utils";
import type { PublicChartFacts } from "../public-chart-facts.ts";
import { extractAstroClaimsFromAnswer, validateExtractedClaimsAgainstPublicFacts } from "./extract-answer-claims";

function emptyResult(): AnswerValidationResult {
  return {
    ok: false,
    score: 0,
    issues: [buildIssue("missing_answer", "error", "Missing answer and validation input.", "missing_input")],
    missingAnchors: [],
    missingSections: [],
    wrongFacts: [],
    unsafeClaims: [],
    genericnessScore: 1,
    retryRecommended: false,
    fallbackRecommended: true,
    correctionInstruction: "Return a grounded answer with the required contract sections and only supplied facts.",
    metadata: {
      checkedAnchors: 0,
      checkedSections: 0,
      checkedTimingWindows: 0,
      contractDomain: "unknown",
      contractAnswerMode: "unknown",
      strictFailureCount: 1,
      warningCount: 0,
    },
  };
}

function issueWeight(issue: ValidationIssue): number {
  return issue.severity === "error" ? 20 : 5;
}

function hasSectionText(answer: string, section: string): boolean {
  return textIncludesLoose(answer, section) || new RegExp(`\\b${section.replace(/_/g, "\\s*")}\\b`, "i").test(answer);
}

export function buildCorrectionInstruction(result: AnswerValidationResult): string {
  const lines: string[] = [];
  if (result.missingSections.length) lines.push(`- include sections: ${uniqueStrings(result.missingSections).join(", ")}`);
  if (result.missingAnchors.length) lines.push(`- use anchors: ${uniqueStrings(result.missingAnchors).join(", ")}`);
  if (result.wrongFacts.length) lines.push(`- remove wrong facts: ${uniqueStrings(result.wrongFacts).join(", ")}`);
  if (result.unsafeClaims.length) lines.push(`- remove unsafe claims: ${uniqueStrings(result.unsafeClaims).join(", ")}`);
  if (result.issues.some((issue) => issue.code === "invented_timing" || issue.code === "timing_not_allowed")) lines.push(`- remove unsupported timing and stay within supplied windows`);
  if (!lines.length) lines.push("- keep the answer grounded in the supplied facts and contract");
  return lines.join("\n");
}

function validateSections(input: AnswerValidationInput, answer: string): { issues: ValidationIssue[]; missingSections: string[] } {
  const issues: ValidationIssue[] = [];
  const missingSections: string[] = [];
  const jsonSections = input.json?.sections ?? {};
  const answerLower = answer.toLowerCase();
  for (const section of input.contract.requiredSections ?? []) {
    const jsonText = typeof jsonSections[section] === "string" ? jsonSections[section].trim() : "";
    const present = Boolean(jsonText) || hasSectionText(answerLower, section);
    if (!present) {
      missingSections.push(section);
      issues.push(buildIssue("missing_required_section", "error", `Missing required section: ${section}`, section));
    }
  }
  if ((input.contract.requiredSections ?? []).includes("accuracy") && !hasSectionText(answerLower, "accuracy")) {
    issues.push(buildIssue("accuracy_missing", "warning", "Accuracy section is missing.", "accuracy"));
  }
  if ((input.contract.requiredSections ?? []).includes("suggested_follow_up")) {
    const followUp = typeof input.json?.suggestedFollowUp === "string" ? input.json.suggestedFollowUp.trim() : "";
    if (!followUp && !/\?\s*$/.test(answer.trim())) {
      issues.push(buildIssue("followup_missing", "warning", "Suggested follow-up is missing.", "suggested_follow_up"));
    }
  }
  return { issues, missingSections };
}

export function validateRagAnswer(input?: Partial<AnswerValidationInput>): AnswerValidationResult {
  if (!input?.answer && !input?.json) return emptyResult();
  if (!input.contract || !input.context || !input.reasoningPath || !input.timing) return emptyResult();

  const answer = extractAnswerText({ answer: input.answer, json: input.json ?? null });
  if (!answer) return emptyResult();

  const fullInput: AnswerValidationInput = {
    question: input.question ?? "",
    answer,
    json: input.json ?? null,
    contract: input.contract,
    context: input.context,
    reasoningPath: input.reasoningPath,
    timing: input.timing,
    questionFrame: input.questionFrame,
    structuredIntent: input.structuredIntent,
  };

  const sections = validateSections(fullInput, answer);
  const fact = validateFactGrounding(fullInput);
  const safety = validateAnswerSafety(fullInput);
  const timing = validateAnswerTiming(fullInput);
  const remedy = validateAnswerRemedies(fullInput);
  const generic = validateGenericness(fullInput);
  const flags = getAstroRagFlags();
  const gradedSafetyDecisions = flags.gradedSafetyActionsEnabled ? classifySafetyIntent({
    rawQuestion: fullInput.question,
    coreQuestion: fullInput.questionFrame?.coreQuestion,
    questionFrame: fullInput.questionFrame,
    structuredIntent: fullInput.structuredIntent,
    answerText: answer,
  }) : [];

  const rawIssues = [...sections.issues, ...fact.issues, ...safety.issues, ...timing, ...remedy, ...generic.issues];
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const issue of rawIssues) {
    const key = JSON.stringify(issue);
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push(issue);
  }
  const missingAnchors = uniqueStrings(fact.missingAnchors);
  const missingSections = uniqueStrings(sections.missingSections);
  const wrongFacts = uniqueStrings(fact.wrongFacts);
  const unsafeClaims = uniqueStrings(safety.unsafeClaims);
  const genericnessScore = generic.genericnessScore;

  let score = 100;
  for (const issue of issues) score -= issueWeight(issue);
  score -= Math.round(genericnessScore * 25);
  score = clampScore(score);
  const strictFailureCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const safetyCritical = issues.some((issue) => ["unsafe_claim", "medical_claim", "legal_claim", "financial_claim", "death_lifespan_claim", "gemstone_guarantee", "expensive_puja_pressure"].includes(issue.code));
  const wrongFactCritical = wrongFacts.length > 0 || issues.some((issue) => issue.code === "invented_timing" || issue.code === "wrong_chart_fact");
  const repairable = issues.some((issue) => ["missing_required_section", "missing_required_anchor", "generic_answer", "too_short", "does_not_answer_question", "accuracy_missing", "followup_missing"].includes(issue.code));
  const ok = strictFailureCount === 0 && score >= 75;
  const retryRecommended = !ok && (repairable || genericnessScore >= 0.65);
  const fallbackRecommended = safetyCritical || wrongFactCritical || score < 55 || gradedSafetyDecisions.some((decision) => decision.action === "replace_answer");

  return {
    ok,
    score,
    issues,
    missingAnchors,
    missingSections,
    wrongFacts,
    unsafeClaims,
    genericnessScore,
    retryRecommended,
    fallbackRecommended,
    correctionInstruction: buildCorrectionInstruction({
      ok,
      score,
      issues,
      missingAnchors,
      missingSections,
      wrongFacts,
      unsafeClaims,
      genericnessScore,
      retryRecommended,
      fallbackRecommended,
      correctionInstruction: "",
      metadata: {
        checkedAnchors: missingAnchors.length,
        checkedSections: input.contract.requiredSections?.length ?? 0,
        checkedTimingWindows: input.timing.windows?.length ?? 0,
        contractDomain: input.contract.domain,
        contractAnswerMode: input.contract.answerMode,
        strictFailureCount,
        warningCount,
      },
    }),
    metadata: {
      checkedAnchors: input.contract.anchors?.length ?? 0,
      checkedSections: input.contract.requiredSections?.length ?? 0,
      checkedTimingWindows: input.timing.windows?.length ?? 0,
      contractDomain: input.contract.domain,
      contractAnswerMode: input.contract.answerMode,
      strictFailureCount,
      warningCount,
    },
  };
}

export function validateAstroAnswerAgainstPublicFacts(args: {
  answer: string;
  publicFacts: PublicChartFacts;
  unavailableFields?: Set<string>;
}): AnswerValidationResult {
  const claims = extractAstroClaimsFromAnswer(args.answer);
  return validateExtractedClaimsAgainstPublicFacts({ claims, publicFacts: args.publicFacts, unavailableFields: args.unavailableFields });
}

export async function storeValidationResult(input: StoreValidationResultInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!input?.supabase || !input.userId || !input.question || !input.answer || !input.validation) return { ok: false, error: "missing_input" };
  try {
    const row = {
      user_id: input.userId,
      profile_id: input.profileId ?? null,
      question: input.question,
      answer: input.answer,
      passed: input.validation.ok,
      score: input.validation.score,
      issues: input.validation.issues,
      missing_anchors: input.validation.missingAnchors,
      missing_sections: input.validation.missingSections,
      wrong_facts: input.validation.wrongFacts,
      unsafe_claims: input.validation.unsafeClaims,
      retry_recommended: input.validation.retryRecommended,
      fallback_recommended: input.validation.fallbackRecommended,
      correction_instruction: input.validation.correctionInstruction,
      contract_id: input.contractId ?? null,
      metadata: input.validation.metadata,
    };
    const inserted = input.supabase.from("astro_validation_results").insert(row);
    const result = typeof (inserted as { select?: unknown }).select === "function"
      ? await (inserted as { select: (columns?: string) => PromiseLike<{ data: unknown; error: unknown }> }).select("id")
      : await inserted;
    const data = result && typeof result === "object" && "data" in result ? (result as { data?: unknown }).data : undefined;
    const error = result && typeof result === "object" && "error" in result ? (result as { error?: unknown }).error : undefined;
    if (error) return { ok: false, error: typeof error === "string" ? error : "store_failed" };
    const id = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined)?.id : (data as Record<string, unknown> | undefined)?.id;
    return { ok: true, id: typeof id === "string" ? id : undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "store_failed" };
  }
}
