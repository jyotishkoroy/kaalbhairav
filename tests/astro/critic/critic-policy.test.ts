/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import { buildReadingPlan } from "../../../lib/astro/synthesis";
import { applyDeterministicCriticChecks, buildFallbackReadingCriticResult, buildRewritePolicy, buildSkippedReadingCriticResult, normalizeReadingCriticResult, sanitizeCriticString, sanitizeCriticStringArray, shouldUseReadingCritic, validateReadingCriticResult } from "../../../lib/astro/critic";
import type { ReadingCriticResult } from "../../../lib/astro/critic";
import type { ListeningAnalysis } from "../../../lib/astro/listening";

const listening = {
  topic: "career",
  emotionalTone: "anxious",
  emotionalNeed: "reassurance",
  userSituationSummary: "The user feels stuck at work.",
  acknowledgementHint: "I hear how heavy this feels.",
  missingContext: [],
  shouldAskFollowUp: false,
  safetyRisks: [],
  humanizationHints: ["gentle"],
  source: "deterministic_fallback",
  confidence: "medium",
} satisfies ListeningAnalysis;

function plan(overrides: Partial<ReturnType<typeof buildReadingPlan>> = {}) {
  return {
    ...buildReadingPlan({
      question: "Will I get promoted?",
      listening,
      concern: { topic: "career" },
      evidence: [{ id: "e1", label: "Saturn", explanation: "Saturn points to delay", confidence: "high", source: "chart" }],
      chartAnchors: ["house_10"],
      safetyRestrictions: ["Do not provide exact timing without a grounded source."],
    }),
    ...overrides,
  };
}

const valid: ReadingCriticResult = {
  safe: true,
  grounded: true,
  specific: true,
  compassionate: true,
  feelsHeardScore: 0.8,
  genericnessScore: 0.1,
  fearBasedScore: 0.1,
  missingRequiredElements: [],
  unsafeClaims: [],
  inventedFacts: [],
  unsupportedTimingClaims: [],
  unsupportedRemedies: [],
  shouldRewrite: false,
  rewriteInstructions: [],
  source: "ollama",
};

describe("critic policy results", () => {
  it("buildSkippedReadingCriticResult source skipped", () => expect(buildSkippedReadingCriticResult().source).toBe("skipped"));
  it("buildFallbackReadingCriticResult source fallback", () => expect(buildFallbackReadingCriticResult().source).toBe("fallback"));
  it("valid JSON normalizes", () => expect(normalizeReadingCriticResult(valid).source).toBe("ollama"));
  it("invalid object falls back", () => expect(validateReadingCriticResult(null)?.source ?? "fallback").toBe("fallback"));
  it("score below 0 clamps to 0", () => expect(validateReadingCriticResult({ ...valid, feelsHeardScore: -1 }).feelsHeardScore).toBe(0));
  it("score above 1 clamps to 1", () => expect(validateReadingCriticResult({ ...valid, genericnessScore: 2 }).genericnessScore).toBe(1));
  it("missing score defaults conservatively", () => expect(validateReadingCriticResult({ ...valid, feelsHeardScore: undefined }).feelsHeardScore).toBe(0.5));
  it("string score coerces or falls back safely", () => expect(validateReadingCriticResult({ ...valid, feelsHeardScore: "0.7" }).feelsHeardScore).toBe(0.7));
  it("missing arrays default empty", () => expect(validateReadingCriticResult({ ...valid, missingRequiredElements: undefined }).missingRequiredElements).toEqual([]));
  it("non-string arrays sanitized", () => expect(sanitizeCriticStringArray(["a", 1 as never, "A"])).toEqual(["a"]));
  it("unknown missingRequiredElements removed", () => expect(validateReadingCriticResult({ ...valid, missingRequiredElements: ["bad", "chart_anchor"] }).missingRequiredElements).toEqual(["chart_anchor"]));
  it("markdown stripped", () => expect(sanitizeCriticString("**hello** _there_")).toBe("hello there"));
  it("token-like secret redacted", () => expect(sanitizeCriticString("sk-secret-123")).toContain("[REDACTED]"));
  it("local URL redacted", () => expect(sanitizeCriticString("http://localhost:3000")).toContain("[REDACTED_URL]"));
  it("unsafeClaims capped", () => expect(validateReadingCriticResult({ ...valid, unsafeClaims: Array.from({ length: 20 }, (_, i) => `u${i}`) }).unsafeClaims.length).toBeLessThanOrEqual(12));
  it("inventedFacts capped", () => expect(validateReadingCriticResult({ ...valid, inventedFacts: Array.from({ length: 20 }, (_, i) => `u${i}`) }).inventedFacts.length).toBeLessThanOrEqual(12));
  it("unsupportedTimingClaims capped", () => expect(validateReadingCriticResult({ ...valid, unsupportedTimingClaims: Array.from({ length: 20 }, (_, i) => `u${i}`) }).unsupportedTimingClaims.length).toBeLessThanOrEqual(12));
  it("unsupportedRemedies capped", () => expect(validateReadingCriticResult({ ...valid, unsupportedRemedies: Array.from({ length: 20 }, (_, i) => `u${i}`) }).unsupportedRemedies.length).toBeLessThanOrEqual(12));
  it("rewriteInstructions capped", () => expect(validateReadingCriticResult({ ...valid, rewriteInstructions: Array.from({ length: 20 }, (_, i) => `u${i}`) }).rewriteInstructions.length).toBeLessThanOrEqual(16));
  it("source unknown falls back", () => expect(validateReadingCriticResult({ ...valid, source: "weird" as never }).source).toBe("fallback"));
});

describe("critic policy gating", () => {
  it("shouldUse false by default", () => expect(shouldUseReadingCritic({ question: "Q", listening, plan: plan(), answer: "A", env: {} }).allowed).toBe(false));
  it("ASTRO_OLLAMA_CRITIC_ENABLED=true alone false", () => expect(shouldUseReadingCritic({ question: "Q", listening, plan: plan(), answer: "A", env: { ASTRO_OLLAMA_CRITIC_ENABLED: "true" } }).allowed).toBe(false));
  it("ASTRO_COMPANION_PIPELINE_ENABLED=true alone false", () => expect(shouldUseReadingCritic({ question: "Q", listening, plan: plan(), answer: "A", env: { ASTRO_COMPANION_PIPELINE_ENABLED: "true" } }).allowed).toBe(false));
  it("both critic and companion flags true allows policy", () => expect(shouldUseReadingCritic({ question: "Q", listening, plan: plan(), answer: "A", env: { ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" } }).allowed).toBe(true));
  it("ASTRO_RAG_ENABLED alone false", () => expect(shouldUseReadingCritic({ question: "Q", listening, plan: plan(), answer: "A", env: { ASTRO_RAG_ENABLED: "true" } }).allowed).toBe(false));
  it("ASTRO_LOCAL_CRITIC_ENABLED alone false", () => expect(shouldUseReadingCritic({ question: "Q", listening, plan: plan(), answer: "A", env: { ASTRO_LOCAL_CRITIC_ENABLED: "true" } }).allowed).toBe(false));
});

describe("critic rewrite policy", () => {
  it("rewrite allowed for missing acknowledgement only", () => expect(buildRewritePolicy({ critic: { ...valid, missingRequiredElements: ["emotional_acknowledgement"] } }).allowed).toBe(true));
  it("rewrite allowed for genericness mild failure", () => expect(buildRewritePolicy({ critic: { ...valid, genericnessScore: 0.8 } }).allowed).toBe(true));
  it("rewrite denied for unsafeClaims", () => expect(buildRewritePolicy({ critic: { ...valid, unsafeClaims: ["x"] } }).allowed).toBe(false));
  it("rewrite denied for inventedFacts", () => expect(buildRewritePolicy({ critic: { ...valid, inventedFacts: ["x"] } }).allowed).toBe(false));
  it("rewrite denied for unsupportedTimingClaims", () => expect(buildRewritePolicy({ critic: { ...valid, unsupportedTimingClaims: ["x"] } }).allowed).toBe(false));
  it("rewrite denied for unsupportedRemedies", () => expect(buildRewritePolicy({ critic: { ...valid, unsupportedRemedies: ["x"] } }).allowed).toBe(false));
  it("rewrite denied for high fearBasedScore", () => expect(buildRewritePolicy({ critic: { ...valid, fearBasedScore: 0.8 } }).allowed).toBe(false));
  it("rewrite denied when attemptCount >= 1", () => expect(buildRewritePolicy({ critic: valid, attemptCount: 1 }).allowed).toBe(false));
  it("rewrite instructions sanitized", () => expect(buildRewritePolicy({ critic: { ...valid, missingRequiredElements: ["emotional_acknowledgement"], rewriteInstructions: ["**hello** http://localhost:3000"] } }).instructions.join(" ")).not.toContain("localhost"));
});

describe("critic deterministic safety", () => {
  it("deterministic safety cannot be overridden by safe critic output", () => {
    const result = applyDeterministicCriticChecks({ plan: plan(), answer: "I hear you. Jupiter in Aries guarantees success next month.", critic: valid });
    expect(result.safe).toBe(false);
  });
  it("good grounded answer remains safe/grounded/specific/compassionate", () => {
    const result = applyDeterministicCriticChecks({ plan: plan(), answer: "I hear you. Saturn points to delay, so keep one practical step visible and steady. This is support only, not certainty.", critic: valid });
    expect(result.compassionate).toBe(true);
  });
  it("missing chart anchor adds missingRequiredElements", () => {
    const result = applyDeterministicCriticChecks({ plan: plan(), answer: "I hear you. Keep one practical step visible and steady. This is support only, not certainty.", critic: valid });
    expect(result.missingRequiredElements).toContain("chart_anchor");
  });
  it("follow_up mode requires follow_up", () => {
    const result = applyDeterministicCriticChecks({ plan: plan({ mode: "follow_up", followUp: { question: "What part matters most?", reason: "clarify" } }), answer: "I hear you. Saturn points to delay.", critic: valid });
    expect(result.missingRequiredElements).toContain("follow_up");
  });
  it("safety mode requires safety_boundary", () => {
    const result = applyDeterministicCriticChecks({ plan: plan({ safetyBoundaries: ["This is support only, not certainty."] }), answer: "I hear you. Saturn points to delay, so keep one practical step visible and steady.", critic: valid });
    expect(result.missingRequiredElements).toContain("safety_boundary");
  });
});
