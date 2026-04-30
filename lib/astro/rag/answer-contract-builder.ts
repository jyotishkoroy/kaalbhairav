// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerContract, AnswerContractDomain, BuildAnswerContractInput, ContractAnchor, ForbiddenClaim, StoreAnswerContractInput } from "./answer-contract-types";
import { buildCommonForbiddenClaims, COMMON_FORBIDDEN_CLAIMS, COMMON_VALIDATOR_RULES, trimContractText, uniqueStrings } from "./contracts/common";
import { buildCareerContractParts } from "./contracts/career";
import { buildGeneralContractParts } from "./contracts/general";
import { buildMarriageContractParts } from "./contracts/marriage";
import { buildMoneyContractParts } from "./contracts/money";
import { buildSafetyContractParts } from "./contracts/safety";
import { buildSleepContractParts } from "./contracts/sleep";

const FALLBACK_CONTRACT: AnswerContract = {
  domain: "general",
  answerMode: "fallback",
  question: "",
  mustInclude: [],
  mustNotInclude: [],
  requiredSections: ["direct_answer", "limitations", "suggested_follow_up"],
  optionalSections: [],
  anchors: [],
  forbiddenClaims: [...COMMON_FORBIDDEN_CLAIMS],
  timingAllowed: false,
  timingRequired: false,
  remedyAllowed: false,
  exactFactsOnly: false,
  canUseGroq: false,
  canUseOllamaCritic: false,
  accuracyClass: "unavailable",
  limitations: ["Sufficiency could not be checked because required pipeline context is missing."],
  safetyRestrictions: [],
  validatorRules: [...COMMON_VALIDATOR_RULES, "timing_allowed:false", "remedy_allowed:false", "exact_facts_only:false", "groq_allowed:false", "accuracy_class:unavailable"],
  writerInstructions: ["Use a deterministic fallback response and ask one clear follow-up if needed."],
  metadata: {
    requiredFactKeys: [],
    missingFacts: [],
    selectedRuleKeys: [],
    timingWindowCount: 0,
    retrievalPartial: true,
    reasoningPartial: true,
    blockedBySafety: false,
  },
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDomainValue(domain: string | undefined): AnswerContractDomain {
  const normalized = normalizeText(domain).toLowerCase();
  const allowed: AnswerContractDomain[] = ["safety", "exact_fact", "career", "sleep", "marriage", "money", "foreign", "education", "spirituality", "health", "legal", "timing", "general"];
  return (allowed.includes(normalized as AnswerContractDomain) ? (normalized as AnswerContractDomain) : "general");
}

export function normalizeContractDomain(domain: string | undefined): AnswerContractDomain {
  return normalizeDomainValue(domain);
}

function pickParts(input: BuildAnswerContractInput) {
  if (input.sufficiency.answerMode === "safety") return buildSafetyContractParts(input);
  switch (normalizeDomainValue(input.plan.domain)) {
    case "career":
      return buildCareerContractParts(input);
    case "sleep":
      return buildSleepContractParts(input);
    case "marriage":
      return buildMarriageContractParts(input);
    case "money":
      return buildMoneyContractParts(input);
    default:
      return buildGeneralContractParts(input);
  }
}

function buildAnchorsFromFacts(input: BuildAnswerContractInput): ContractAnchor[] {
  const anchors: ContractAnchor[] = [];
  const seen = new Set<string>();
  for (const fact of input.context.chartFacts ?? []) {
    const key = fact.factKey || fact.factType;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    anchors.push({
      key,
      label: fact.factKey.replace(/_/g, " "),
      required: input.plan.requiredFacts.includes(fact.factKey),
      source: "chart_fact",
      factKeys: [fact.factKey],
      ruleKeys: [],
      description: trimContractText(`${fact.factValue}${fact.sign ? ` ${fact.sign}` : ""}${fact.planet ? ` ${fact.planet}` : ""}` || fact.factKey, 400),
    });
  }
  return anchors;
}

export function buildContractAnchors(input: BuildAnswerContractInput): ContractAnchor[] {
  const anchors: ContractAnchor[] = [];
  const seen = new Set<string>();
  for (const factKey of uniqueStrings((input.plan.requiredFacts ?? []).map((key) => key.trim()))) {
    if (seen.has(factKey)) continue;
    seen.add(factKey);
    anchors.push({
      key: factKey,
      label: factKey.replace(/_/g, " "),
      required: true,
      source: "retrieval",
      factKeys: [factKey],
      ruleKeys: [],
      description: `Required fact anchor for ${factKey}.`,
    });
  }
  for (const factAnchor of buildAnchorsFromFacts(input)) {
    if (!seen.has(factAnchor.key)) {
      seen.add(factAnchor.key);
      anchors.push(factAnchor);
    }
  }
  for (const step of input.reasoningPath.steps ?? []) {
    const key = step.id || step.label;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    anchors.push({
      key,
      label: step.label,
      required: false,
      source: "reasoning_path",
      factKeys: uniqueStrings(step.factKeys ?? []),
      ruleKeys: uniqueStrings(step.ruleKeys ?? []),
      description: trimContractText(step.explanation, 400),
    });
  }
  if (input.timing.available && input.sufficiency.metadata.timingAllowed) {
    for (const window of input.timing.windows ?? []) {
      const key = `timing:${window.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      anchors.push({
        key,
        label: window.label,
        required: false,
        source: "timing",
        factKeys: uniqueStrings(window.factKeys ?? []),
        ruleKeys: [],
        description: trimContractText(window.interpretation, 400),
      });
    }
  }
  if (input.sufficiency.metadata.blockedBySafety || input.sufficiency.answerMode === "safety") {
    for (const restriction of input.plan.safetyRestrictions ?? []) {
      const key = `safety:${restriction.slice(0, 24)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      anchors.push({
        key,
        label: "Safety restriction",
        required: true,
        source: "safety",
        factKeys: [],
        ruleKeys: [],
        description: trimContractText(restriction, 400),
      });
    }
  }
  return anchors;
}

export function buildContractForbiddenClaims(input: BuildAnswerContractInput): ForbiddenClaim[] {
  const claims = [...buildCommonForbiddenClaims({ plan: input.plan, sufficiency: input.sufficiency })];
  if (input.plan.answerType === "exact_fact") {
    claims.push({ key: "exact_fact_expansion", description: "Do not expand an exact fact answer into interpretation or timing.", severity: "block" });
  }
  if (!input.sufficiency.metadata.timingAllowed || !input.timing.available) {
    claims.push({ key: "no_timing_invention", description: "Do not invent timing windows.", severity: "block" });
  }
  if (!input.plan.remedyAllowed) {
    claims.push({ key: "no_remedy_escalation", description: "Do not escalate into remedies when they are not allowed.", severity: "warn" });
  }
  return claims;
}

export function buildContractValidatorRules(input: BuildAnswerContractInput): string[] {
  const parts = pickParts(input);
  const rules = [
    ...parts.validatorRules,
    `require_section:${parts.requiredSections.join(",")}`,
    `timing_allowed:${Boolean(input.timing.available && input.sufficiency.metadata.timingAllowed && input.plan.timingAllowed)}`,
    `remedy_allowed:${Boolean(input.plan.remedyAllowed && input.sufficiency.answerMode !== "safety")}`,
    `exact_facts_only:${input.sufficiency.answerMode === "exact_fact"}`,
    `groq_allowed:${input.sufficiency.canUseGroq}`,
    `accuracy_class:${input.sufficiency.answerMode === "safety" ? "safety_only" : input.sufficiency.status === "ask_followup" ? "partial" : input.sufficiency.status === "fallback" ? "unavailable" : input.sufficiency.metadata.missingRequiredFactCount === 0 ? (input.sufficiency.metadata.timingRequested && !input.timing.available ? "partial" : "grounded_interpretive") : "partial"}`,
  ];
  for (const anchor of buildContractAnchors(input)) {
    rules.push(`require_anchor:${anchor.key}`);
  }
  for (const claim of buildContractForbiddenClaims(input)) {
    rules.push(`forbid_claim:${claim.key}`);
  }
  return uniqueStrings(rules);
}

function accuracyFor(input: BuildAnswerContractInput): AnswerContract["accuracyClass"] {
  if (input.sufficiency.answerMode === "safety") return "safety_only";
  if (input.sufficiency.status === "ask_followup") return "partial";
  if (input.sufficiency.status === "fallback") return "unavailable";
  if (input.sufficiency.answerMode === "exact_fact") return input.sufficiency.metadata.missingRequiredFactCount === 0 ? "totally_accurate" : "unavailable";
  if (input.sufficiency.metadata.missingRequiredFactCount > 0 || input.sufficiency.limitations.length || input.reasoningPath.warnings.length || input.context.metadata.errors.length) return "partial";
  return "grounded_interpretive";
}

function requiredSectionsFor(input: BuildAnswerContractInput, parts: ReturnType<typeof pickParts>): AnswerContract["requiredSections"] {
  if (input.sufficiency.status === "ask_followup") return ["direct_answer", "suggested_follow_up"];
  if (input.sufficiency.status === "fallback") return ["direct_answer", "limitations", "suggested_follow_up"];
  if (input.sufficiency.answerMode === "safety") return ["safety_response", "limitations", "suggested_follow_up"];
  return parts.requiredSections as AnswerContract["requiredSections"];
}

function optionalSectionsFor(input: BuildAnswerContractInput, parts: ReturnType<typeof pickParts>): AnswerContract["optionalSections"] {
  return uniqueStrings([...parts.optionalSections, ...(input.timing.available ? ["timing"] : []), ...(input.plan.remedyAllowed ? ["safe_remedies"] : []), "limitations"]) as AnswerContract["optionalSections"];
}

export function buildAnswerContract(input?: Partial<BuildAnswerContractInput>): AnswerContract {
  if (!input?.plan || !input.context || !input.reasoningPath || !input.timing || !input.sufficiency || !input.question) {
    return FALLBACK_CONTRACT;
  }

  const complete: BuildAnswerContractInput = {
    question: input.question,
    plan: input.plan,
    context: input.context,
    reasoningPath: input.reasoningPath,
    timing: input.timing,
    sufficiency: input.sufficiency,
  };
  const parts = pickParts(complete);
  const timingAllowed = Boolean(complete.timing.available && complete.sufficiency.metadata.timingAllowed && complete.plan.timingAllowed);
  const remedyAllowed = Boolean(complete.plan.remedyAllowed && complete.sufficiency.answerMode !== "safety");
  const contract: AnswerContract = {
    id: undefined,
    domain: normalizeContractDomain(complete.plan.domain),
    answerMode: complete.sufficiency.answerMode,
    question: complete.question,
    mustInclude: uniqueStrings(parts.mustInclude),
    mustNotInclude: uniqueStrings([...parts.mustNotInclude, ...COMMON_FORBIDDEN_CLAIMS.map((claim) => claim.description)]),
    requiredSections: requiredSectionsFor(complete, parts),
    optionalSections: optionalSectionsFor(complete, parts),
    anchors: buildContractAnchors(complete),
    forbiddenClaims: buildContractForbiddenClaims(complete),
    timingAllowed,
    timingRequired: Boolean(complete.plan.requiresTimingSource || complete.plan.needsTiming),
    remedyAllowed,
    exactFactsOnly: complete.sufficiency.answerMode === "exact_fact",
    canUseGroq: Boolean(complete.sufficiency.canUseGroq),
    canUseOllamaCritic: Boolean(complete.sufficiency.canUseOllamaCritic),
    accuracyClass: accuracyFor(complete),
    limitations: uniqueStrings([
      ...complete.sufficiency.limitations,
      ...(complete.timing.limitation ? [complete.timing.limitation] : []),
      ...(complete.reasoningPath.warnings ?? []),
      ...(complete.context.metadata.errors ?? []),
    ]),
    safetyRestrictions: uniqueStrings([
      ...complete.plan.safetyRestrictions,
      ...complete.sufficiency.limitations.filter((item) => /safety|medical|legal|death|lifespan|financial|gemstone|puja/i.test(item)),
    ]),
    validatorRules: buildContractValidatorRules(complete),
    writerInstructions: uniqueStrings([
      ...parts.writerInstructions,
      ...(complete.sufficiency.status === "ask_followup" ? ["Ask one clear follow-up only."] : []),
      ...(complete.sufficiency.status === "fallback" ? ["Use deterministic fallback only."] : []),
      ...(complete.sufficiency.answerMode === "safety" ? ["Do not add interpretation beyond the refusal."] : []),
    ]),
    metadata: {
      requiredFactKeys: uniqueStrings(complete.plan.requiredFacts ?? []),
      missingFacts: uniqueStrings(complete.sufficiency.missingFacts ?? []),
      selectedRuleKeys: uniqueStrings(complete.reasoningPath.selectedRuleKeys ?? []),
      timingWindowCount: complete.timing.windows?.length ?? 0,
      retrievalPartial: Boolean(complete.context.metadata.partial),
      reasoningPartial: Boolean(complete.reasoningPath.metadata.partial || complete.reasoningPath.missingAnchors.length),
      blockedBySafety: Boolean(complete.sufficiency.metadata.blockedBySafety),
    },
  };
  return contract;
}

export async function storeAnswerContract(input: StoreAnswerContractInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!input?.supabase || !input.userId || !input.question || !input.contract) return { ok: false, error: "missing_input" };
  try {
    const row = {
      user_id: input.userId,
      profile_id: input.profileId ?? null,
      question: input.question,
      domain: input.contract.domain,
      must_include: input.contract.mustInclude,
      must_not_include: input.contract.mustNotInclude,
      required_sections: input.contract.requiredSections,
      timing_allowed: input.contract.timingAllowed,
      remedy_allowed: input.contract.remedyAllowed,
      contract: input.contract,
    };
    const inserted = input.supabase.from("astro_answer_contracts").insert(row);
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
