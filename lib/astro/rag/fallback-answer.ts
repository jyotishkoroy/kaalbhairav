// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerContract } from "./answer-contract-types";
import type { RetrievalContext } from "./retrieval-types";
import type { ReasoningPath } from "./reasoning-path-builder";
import type { SufficiencyDecision } from "./sufficiency-checker";
import type { TimingContext } from "./timing-engine";
import type { AnswerValidationResult } from "./validation-types";
import type { LocalCriticClientResult } from "./local-critic";

export type FallbackReason =
  | "exact_fact"
  | "safety"
  | "ask_followup"
  | "insufficient_data"
  | "groq_unavailable"
  | "validation_failed"
  | "critic_required_failed"
  | "supabase_unavailable"
  | "timing_unavailable"
  | "generic_failure";

export type FallbackAnswerInput = {
  question?: string;
  reason: FallbackReason;
  contract?: AnswerContract;
  context?: RetrievalContext;
  reasoningPath?: ReasoningPath;
  timing?: TimingContext;
  sufficiency?: SufficiencyDecision;
  validation?: AnswerValidationResult;
  critic?: LocalCriticClientResult;
};

export type FallbackAnswerResult = {
  answer: string;
  reason: FallbackReason;
  followupQuestion: string | null;
  limitations: string[];
  metadata: {
    deterministic: true;
    usedChartFactKeys: string[];
    validationOk: boolean | null;
    criticOk: boolean | null;
  };
};

function normalizeText(value: unknown, max = 200): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? text.slice(0, max) : text;
}

function dedupe(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = normalizeText(value, 300);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function trimList(values: string[], max = 8): string[] {
  return dedupe(values).slice(0, max);
}

function usedChartFactKeys(contract?: AnswerContract, context?: RetrievalContext, reasoningPath?: ReasoningPath): string[] {
  const keys = new Set<string>();
  for (const anchor of contract?.anchors ?? []) if (anchor.key) keys.add(anchor.key);
  for (const fact of context?.chartFacts ?? []) {
    if (fact.factKey) keys.add(fact.factKey);
    if (fact.factType) keys.add(fact.factType);
  }
  for (const step of reasoningPath?.steps ?? []) {
    for (const factKey of step.factKeys ?? []) if (factKey) keys.add(factKey);
  }
  return [...keys].slice(0, 12);
}

function baseLimitations(input: FallbackAnswerInput): string[] {
  const parts = [
    ...(input.contract?.limitations ?? []),
    ...(input.sufficiency?.limitations ?? []),
    input.timing?.limitation ?? "",
    input.validation?.issues?.map((issue) => issue.message) ?? [],
  ].flat();
  return trimList(parts, 8);
}

function missingFactsText(input: FallbackAnswerInput): string {
  const facts = trimList(input.sufficiency?.missingFacts ?? input.validation?.missingAnchors ?? [], 8);
  if (!facts.length) return "Some required chart facts are still missing.";
  return `Missing facts: ${facts.join(", ")}${(input.sufficiency?.missingFacts?.length ?? 0) > facts.length ? ", and other required facts." : "."}`;
}

function anchorSummary(input: FallbackAnswerInput): string {
  const anchors = input.contract?.anchors?.map((anchor) => anchor.label).filter(Boolean).slice(0, 5) ?? [];
  if (!anchors.length) return "I can only provide a safe, limited response right now.";
  return `Available grounded anchors: ${anchors.join(", ")}.`;
}

function followupQuestion(input: FallbackAnswerInput): string {
  return normalizeText(input.sufficiency?.followupQuestion, 240) || "Which exact chart fact or question scope should I focus on?";
}

function safetyAnswer(input: FallbackAnswerInput): FallbackAnswerResult {
  const saferAlternative = input.contract?.safetyRestrictions?.[0] ?? "I can help with a safer, non-guaranteed chart interpretation instead.";
  const answer = `I cannot answer that safely. ${saferAlternative}`;
  return buildResult(input, "safety", answer, null);
}

function followupAnswer(input: FallbackAnswerInput): FallbackAnswerResult {
  return buildResult(input, "ask_followup", followupQuestion(input), followupQuestion(input));
}

function insufficientDataAnswer(input: FallbackAnswerInput): FallbackAnswerResult {
  const answer = `${missingFactsText(input)} ${anchorSummary(input)} Please share the missing detail or ask for a narrower question.`;
  return buildResult(input, "insufficient_data", answer, null);
}

function groqUnavailableAnswer(input: FallbackAnswerInput): FallbackAnswerResult {
  const answer = `The full generated answer is temporarily unavailable. ${anchorSummary(input)} I can still give a safe, limited response based only on the available chart anchors.`;
  return buildResult(input, "groq_unavailable", answer, null);
}

function validationFailedAnswer(input: FallbackAnswerInput): FallbackAnswerResult {
  const answer = `The generated answer did not pass grounding checks. ${anchorSummary(input)} I can return a safer limited answer instead.`;
  return buildResult(input, "validation_failed", answer, null);
}

function timingUnavailableAnswer(input: FallbackAnswerInput): FallbackAnswerResult {
  const answer = `No grounded timing source exists here, so timing must be omitted. ${anchorSummary(input)} I can answer without timing or ask for the missing timing source.`;
  return buildResult(input, "timing_unavailable", answer, null);
}

function exactFactAnswer(input: FallbackAnswerInput): FallbackAnswerResult {
  const answer = `I can only answer with the exact structured chart fact that is available. ${anchorSummary(input)} Please ask for one exact chart fact at a time.`;
  return buildResult(input, "exact_fact", answer, null);
}

function buildResult(input: FallbackAnswerInput, reason: FallbackReason, answer: string, followupQuestion: string | null): FallbackAnswerResult {
  const validationOk = input.validation?.ok ?? null;
  const criticOk = input.critic?.ok ?? null;
  return {
    answer: normalizeText(answer, 1200),
    reason,
    followupQuestion,
    limitations: baseLimitations(input),
    metadata: {
      deterministic: true,
      usedChartFactKeys: usedChartFactKeys(input.contract, input.context, input.reasoningPath),
      validationOk,
      criticOk,
    },
  };
}

export function buildFallbackAnswer(input: FallbackAnswerInput): FallbackAnswerResult {
  switch (input.reason) {
    case "safety":
      return safetyAnswer(input);
    case "ask_followup":
      return followupAnswer(input);
    case "insufficient_data":
      return insufficientDataAnswer(input);
    case "groq_unavailable":
      return groqUnavailableAnswer(input);
    case "validation_failed":
      return validationFailedAnswer(input);
    case "timing_unavailable":
      return timingUnavailableAnswer(input);
    case "exact_fact":
      return exactFactAnswer(input);
    case "critic_required_failed":
    case "supabase_unavailable":
    case "generic_failure":
    default:
      return buildResult(input, input.reason, `I cannot answer that safely right now. ${anchorSummary(input)}`, null);
  }
}

export function buildSafetyFallback(input: FallbackAnswerInput): FallbackAnswerResult {
  return buildFallbackAnswer({ ...input, reason: "safety" });
}

export function buildFollowupFallback(input: FallbackAnswerInput): FallbackAnswerResult {
  return buildFallbackAnswer({ ...input, reason: "ask_followup" });
}

export function buildInsufficientDataFallback(input: FallbackAnswerInput): FallbackAnswerResult {
  return buildFallbackAnswer({ ...input, reason: "insufficient_data" });
}

export function buildGroqUnavailableFallback(input: FallbackAnswerInput): FallbackAnswerResult {
  return buildFallbackAnswer({ ...input, reason: "groq_unavailable" });
}

export function buildValidationFailedFallback(input: FallbackAnswerInput): FallbackAnswerResult {
  return buildFallbackAnswer({ ...input, reason: "validation_failed" });
}
