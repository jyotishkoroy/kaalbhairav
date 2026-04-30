// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerContract } from "./answer-contract-types";
import type { RetrievalContext } from "./retrieval-types";
import type { ReasoningPath } from "./reasoning-path-builder";
import type { TimingContext } from "./timing-engine";
import type { SufficiencyDecision } from "./sufficiency-checker";
import type { GroqAnswerWriterInput, GroqAnswerWriterResult } from "./groq-answer-writer";
import type { AnswerValidationResult } from "./validation-types";
import type { LocalCriticClientResult } from "./local-critic";
import type { FallbackAnswerResult } from "./fallback-answer";
import { buildFallbackAnswer, buildGroqUnavailableFallback, buildInsufficientDataFallback, buildSafetyFallback, buildValidationFailedFallback } from "./fallback-answer";
import { mergeCriticWithValidation } from "./local-critic";
import { buildCorrectionInstruction } from "./answer-validator";

export type RetryControllerInput = {
  question: string;
  contract: AnswerContract;
  context: RetrievalContext;
  reasoningPath: ReasoningPath;
  timing: TimingContext;
  sufficiency: SufficiencyDecision;
  initialWriterResult: GroqAnswerWriterResult;
  initialValidation: AnswerValidationResult;
  initialCritic?: LocalCriticClientResult;
  writeAnswer: (input: GroqAnswerWriterInput) => Promise<GroqAnswerWriterResult>;
  validateAnswer: (input: {
    question: string;
    answer: string;
    contract: AnswerContract;
    context: RetrievalContext;
    reasoningPath: ReasoningPath;
    timing: TimingContext;
  }) => AnswerValidationResult;
  critiqueAnswer?: (input: {
    question: string;
    answer: string;
    contract: AnswerContract;
    context: RetrievalContext;
    reasoningPath: ReasoningPath;
    timing: TimingContext;
    validation: AnswerValidationResult;
  }) => Promise<LocalCriticClientResult>;
  env?: Record<string, string | undefined>;
};

export type RetryControllerResult = {
  ok: boolean;
  finalAnswer: string;
  source: "initial_groq" | "retry_groq" | "fallback";
  retryAttempted: boolean;
  retrySucceeded: boolean;
  fallbackUsed: boolean;
  fallback?: FallbackAnswerResult;
  writerResult: GroqAnswerWriterResult | null;
  validation: AnswerValidationResult | null;
  critic: LocalCriticClientResult | null;
  correctionInstruction: string;
  metadata: {
    initialValidationOk: boolean;
    finalValidationOk: boolean;
    criticUsed: boolean;
    retryReason: string | null;
    fallbackReason: string | null;
  };
};

function safeFallback(input: Partial<RetryControllerInput> | undefined, reason: Parameters<typeof buildFallbackAnswer>[0]["reason"], extra?: Partial<Parameters<typeof buildFallbackAnswer>[0]>): FallbackAnswerResult {
  return buildFallbackAnswer({
    reason,
    question: input?.question,
    contract: input?.contract,
    context: input?.context,
    reasoningPath: input?.reasoningPath,
    timing: input?.timing,
    sufficiency: input?.sufficiency,
    validation: input?.initialValidation,
    critic: input?.initialCritic,
    ...extra,
  });
}

function contractModeBlocksRetry(contract: AnswerContract): boolean {
  return contract.answerMode === "safety" || contract.answerMode === "exact_fact" || contract.answerMode === "followup" || contract.exactFactsOnly || !contract.canUseGroq;
}

export function buildRetryCorrectionInstruction(input: {
  validation: AnswerValidationResult;
  critic?: LocalCriticClientResult;
  contract: AnswerContract;
}): string {
  const merged = buildCorrectionInstruction(input.validation);
  const critic = input.critic?.critic;
  const criticLines: string[] = [];
  if (critic?.shouldRetry || critic?.tooGeneric) criticLines.push("- make the answer more specific and less generic");
  if (critic?.companionToneScore !== undefined && critic.companionToneScore < 0.55) criticLines.push("- improve companion tone and remove robotic phrasing");
  if (critic?.unsafeClaims?.length) criticLines.push(`- remove unsafe claims: ${critic.unsafeClaims.slice(0, 8).join(", ")}`);
  if (critic?.wrongFacts?.length) criticLines.push(`- remove wrong facts: ${critic.wrongFacts.slice(0, 8).join(", ")}`);
  if (critic?.missingAnchors?.length) criticLines.push(`- use anchors: ${critic.missingAnchors.slice(0, 8).join(", ")}`);
  if (critic?.correctionInstruction) criticLines.push(critic.correctionInstruction.trim());
  if (!criticLines.length) criticLines.push("- correct the prior issues exactly and do not introduce new facts");
  return ["This is a retry. Correct the prior issues exactly. Do not introduce new facts.", merged, ...criticLines].join("\n");
}

export function shouldRetryAnswer(input: {
  validation: AnswerValidationResult;
  critic?: LocalCriticClientResult;
  contract: AnswerContract;
}): { retry: boolean; reason: string | null; correctionInstruction: string } {
  if (contractModeBlocksRetry(input.contract)) {
    return { retry: false, reason: "contract_blocks_retry", correctionInstruction: "" };
  }
  if (input.validation.fallbackRecommended) {
    return { retry: false, reason: "validation_fallback", correctionInstruction: "" };
  }
  const merged = input.critic ? mergeCriticWithValidation({ validation: input.validation, criticResult: input.critic }) : null;
  if (merged?.fallbackRecommended) return { retry: false, reason: "critic_forces_fallback", correctionInstruction: merged.correctionInstruction };
  const criticRetry = Boolean(input.critic?.retryRecommended || merged?.retryRecommended);
  const retry = Boolean(input.validation.retryRecommended || criticRetry);
  const reason = retry ? (input.validation.retryRecommended ? "validation_retry" : "critic_retry") : null;
  return { retry, reason, correctionInstruction: retry ? buildRetryCorrectionInstruction({ validation: input.validation, critic: input.critic, contract: input.contract }) : "" };
}

export async function runRetryAndFallbackController(input?: Partial<RetryControllerInput>): Promise<RetryControllerResult> {
  const emptyValidation = input?.initialValidation ?? {
    ok: false,
    score: 0,
    issues: [],
    missingAnchors: [],
    missingSections: [],
    wrongFacts: [],
    unsafeClaims: [],
    genericnessScore: 1,
    retryRecommended: false,
    fallbackRecommended: true,
    correctionInstruction: "",
    metadata: {
      checkedAnchors: 0,
      checkedSections: 0,
      checkedTimingWindows: 0,
      contractDomain: "unknown",
      contractAnswerMode: "unknown",
      strictFailureCount: 0,
      warningCount: 0,
    },
  };
  const fallback = () => safeFallback(input, "generic_failure");
  if (!input?.contract || !input.context || !input.reasoningPath || !input.timing || !input.sufficiency || !input.initialWriterResult || !input.initialValidation || !input.writeAnswer || !input.validateAnswer || !input.question) {
    const fb = fallback();
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: null,
      validation: emptyValidation,
      critic: null,
      correctionInstruction: "",
      metadata: {
        initialValidationOk: false,
        finalValidationOk: false,
        criticUsed: false,
        retryReason: "missing_input",
        fallbackReason: fb.reason,
      },
    };
  }

  if (input.sufficiency.answerMode === "safety") {
    const fb = buildSafetyFallback(input as Parameters<typeof buildSafetyFallback>[0]);
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: input.initialValidation,
      critic: input.initialCritic ?? null,
      correctionInstruction: "",
      metadata: { initialValidationOk: input.initialValidation.ok, finalValidationOk: false, criticUsed: false, retryReason: "contract_mode", fallbackReason: fb.reason },
    };
  }
  if (input.sufficiency.answerMode === "exact_fact" || input.sufficiency.answerMode === "followup") {
    const fb = input.sufficiency.answerMode === "followup"
      ? buildFallbackAnswer({ ...input, reason: "ask_followup" })
      : input.sufficiency.answerMode === "exact_fact"
        ? buildFallbackAnswer({ ...input, reason: "exact_fact" })
        : buildFallbackAnswer({ ...input, reason: "generic_failure" });
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: input.initialValidation,
      critic: input.initialCritic ?? null,
      correctionInstruction: "",
      metadata: { initialValidationOk: input.initialValidation.ok, finalValidationOk: false, criticUsed: false, retryReason: "contract_mode", fallbackReason: fb.reason },
    };
  }

  const mergedCritic = input.initialCritic ? mergeCriticWithValidation({ validation: input.initialValidation, criticResult: input.initialCritic }) : null;
  const effectiveValidation = input.initialValidation;
  const effectiveCritic = input.initialCritic ?? null;
  const initialValidationOk = Boolean(effectiveValidation.ok);
  const initialCriticForRetry = mergedCritic?.fallbackRecommended ? input.initialCritic : input.initialCritic;
  const retryDecision = shouldRetryAnswer({ validation: effectiveValidation, critic: initialCriticForRetry ?? undefined, contract: input.contract });

  if (input.sufficiency.answerMode === "timing_limited") {
    const fb = safeFallback(input, "timing_unavailable");
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: "",
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: "timing_unavailable", fallbackReason: fb.reason },
    };
  }

  if (input.sufficiency.status === "fallback") {
    const fb = safeFallback(input, input.timing.available ? "insufficient_data" : "timing_unavailable");
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: "",
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: "insufficient_data", fallbackReason: fb.reason },
    };
  }

  if ((input.sufficiency.missingFacts?.length ?? 0) > 0) {
    const fb = safeFallback(input, "insufficient_data");
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: "",
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: "insufficient_data", fallbackReason: fb.reason },
    };
  }

  if (String(input.contract.answerMode) === "fallback") {
    const fb = safeFallback(input, "insufficient_data");
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: "",
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: "contract_mode", fallbackReason: fb.reason },
    };
  }

  if (input.contract.answerMode === "safety") {
    const fb = buildSafetyFallback(input as Parameters<typeof buildSafetyFallback>[0]);
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: "",
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: "contract_mode", fallbackReason: fb.reason },
    };
  }

  if (input.contract.answerMode === "exact_fact" || input.contract.answerMode === "followup" || input.contract.exactFactsOnly || !input.contract.canUseGroq) {
    const reason = input.contract.answerMode === "followup" ? "ask_followup" : input.contract.answerMode === "exact_fact" ? "exact_fact" : "generic_failure";
    const fb = safeFallback(input, reason);
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: "",
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: "contract_blocks_retry", fallbackReason: fb.reason },
    };
  }

  if (initialValidationOk && !(mergedCritic?.fallbackRecommended || input.initialCritic?.fallbackRecommended)) {
    return {
      ok: true,
      finalAnswer: input.initialWriterResult.answer ?? "",
      source: "initial_groq",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: false,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: "",
      metadata: { initialValidationOk: true, finalValidationOk: true, criticUsed: Boolean(input.initialCritic), retryReason: null, fallbackReason: null },
    };
  }

  if (effectiveValidation.fallbackRecommended || mergedCritic?.fallbackRecommended) {
    const fb = safeFallback(input, effectiveValidation.fallbackRecommended ? "validation_failed" : "critic_required_failed");
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: retryDecision.correctionInstruction,
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: retryDecision.reason, fallbackReason: fb.reason },
    };
  }

  if (!retryDecision.retry) {
    const fb = effectiveValidation.missingSections.length || effectiveValidation.missingAnchors.length ? buildInsufficientDataFallback(input as Parameters<typeof buildInsufficientDataFallback>[0]) : buildGroqUnavailableFallback(input as Parameters<typeof buildGroqUnavailableFallback>[0]);
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: false,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: retryDecision.correctionInstruction,
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: retryDecision.reason, fallbackReason: fb.reason },
    };
  }

  let retryWriter: GroqAnswerWriterResult | null = null;
  try {
    retryWriter = await input.writeAnswer({
      question: input.question,
      contract: input.contract,
      context: input.context,
      reasoningPath: input.reasoningPath,
      timing: input.timing,
      correctionInstruction: retryDecision.correctionInstruction,
      env: input.env,
    });
  } catch {
    const fb = buildGroqUnavailableFallback(input as Parameters<typeof buildGroqUnavailableFallback>[0]);
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: true,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: retryDecision.correctionInstruction,
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: retryDecision.reason, fallbackReason: fb.reason },
    };
  }

  if (!retryWriter?.ok || !retryWriter.answer) {
    const fb = buildGroqUnavailableFallback(input as Parameters<typeof buildGroqUnavailableFallback>[0]);
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: true,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: retryWriter ?? input.initialWriterResult,
      validation: effectiveValidation,
      critic: effectiveCritic,
      correctionInstruction: retryDecision.correctionInstruction,
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(input.initialCritic), retryReason: retryDecision.reason, fallbackReason: fb.reason },
    };
  }

  const retryValidation = input.validateAnswer({
    question: input.question,
    answer: retryWriter.answer,
    contract: input.contract,
    context: input.context,
    reasoningPath: input.reasoningPath,
    timing: input.timing,
  });
  let retryCritic = input.initialCritic ?? null;
  if (input.critiqueAnswer && !retryValidation.fallbackRecommended) {
    retryCritic = await input.critiqueAnswer({
      question: input.question,
      answer: retryWriter.answer,
      contract: input.contract,
      context: input.context,
      reasoningPath: input.reasoningPath,
      timing: input.timing,
      validation: retryValidation,
    });
  }

  const mergedRetryCritic = retryCritic ? mergeCriticWithValidation({ validation: retryValidation, criticResult: retryCritic }) : null;
  if (!retryValidation.ok || retryValidation.fallbackRecommended || mergedRetryCritic?.fallbackRecommended) {
    const fb = retryValidation.fallbackRecommended ? buildValidationFailedFallback(input as Parameters<typeof buildValidationFailedFallback>[0]) : safeFallback(input, "validation_failed");
    return {
      ok: false,
      finalAnswer: fb.answer,
      source: "fallback",
      retryAttempted: true,
      retrySucceeded: false,
      fallbackUsed: true,
      fallback: fb,
      writerResult: retryWriter,
      validation: retryValidation,
      critic: retryCritic,
      correctionInstruction: retryDecision.correctionInstruction,
      metadata: { initialValidationOk, finalValidationOk: false, criticUsed: Boolean(retryCritic), retryReason: retryDecision.reason, fallbackReason: fb.reason },
    };
  }

  return {
    ok: true,
    finalAnswer: retryWriter.answer,
    source: "retry_groq",
    retryAttempted: true,
    retrySucceeded: true,
    fallbackUsed: false,
    writerResult: retryWriter,
    validation: retryValidation,
    critic: retryCritic,
    correctionInstruction: retryDecision.correctionInstruction,
    metadata: { initialValidationOk, finalValidationOk: true, criticUsed: Boolean(retryCritic), retryReason: retryDecision.reason, fallbackReason: null },
  };
}

export async function runRagRetryController(): Promise<RetryControllerResult> {
  return runRetryAndFallbackController();
}
