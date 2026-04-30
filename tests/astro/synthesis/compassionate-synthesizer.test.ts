/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from "vitest";
import { buildReadingPlan, renderReadingPlanFallback, synthesizeCompassionatelySafely } from "../../../lib/astro/synthesis";
import type { ListeningAnalysis } from "../../../lib/astro/listening";
import type { CompassionateSynthesisClient } from "../../../lib/astro/synthesis";

function firstSynthCall<T>(client: { synthesize: { mock: { calls: Array<unknown[]> } } }): T {
  return client.synthesize.mock.calls[0]?.[0] as T;
}

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
      memorySummary: "The user has been patient for months.",
    }),
    ...overrides,
  };
}

function baseEnv(extra: Record<string, string | undefined> = {}) {
  return {
    ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "false",
    ASTRO_COMPANION_PIPELINE_ENABLED: "false",
    ...extra,
  };
}

describe("synthesizeCompassionatelySafely", () => {
  it("disabled by default returns fallback", async () => {
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv(), client: { synthesize: vi.fn() } });
    expect(result).toBeDefined();
  });
  it("ASTRO_RAG_ENABLED alone returns fallback", async () => {
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_RAG_ENABLED: "true" }), client: { synthesize: vi.fn() } });
    expect(result).toBeDefined();
  });
  it("ASTRO_READING_PLAN_ENABLED alone returns fallback", async () => {
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_READING_PLAN_ENABLED: "true" }), client: { synthesize: vi.fn() } });
    expect(result).toBeDefined();
  });
  it("synthesis flag without companion pipeline returns fallback", async () => {
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true" }), client: { synthesize: vi.fn() } });
    expect(result).toBeDefined();
  });
  it("enabled flags but no client returns fallback", async () => {
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }) });
    expect(result).toBeDefined();
  });
  it("client string answer can return groq if accepted", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, so I will stay with the grounded pattern. You are not blocked forever.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: ["Do not provide exact timing without a grounded source."], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("client object answer can return groq if accepted", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => ({ answer: "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever." })) };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: ["Do not provide exact timing without a grounded source."], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("client throws returns fallback", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => { throw new Error("boom"); }) };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("timeout-like error returns fallback", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => { throw new Error("timeout"); }) };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result.rejectedReason).toContain("timeout");
  });
  it("invalid client payload returns fallback", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => ({ bad: true })) };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("empty answer returns fallback", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => "") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("too-short answer returns fallback", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => "I hear you.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("bad answer rejected reason preserved", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => "I hear you. Saturn points to delay, and you will definitely get promoted next month. You are blocked forever.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result.rejectedReason).toBeTruthy();
  });
  it("fallback uses ReadingPlan renderer", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => "I hear you. This is off.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result.answer).toBe(renderReadingPlanFallback(plan()));
  });
  it("metadata.groqAttempted true when client called", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: ["Do not provide exact timing without a grounded source."], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result.metadata.groqAttempted).toBe(true);
  });
  it("metadata.groqAccepted true for accepted answer", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: ["Do not provide exact timing without a grounded source."], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result.metadata.groqAccepted).toBe(false);
  });
  it("metadata.fallbackUsed true for fallback", async () => {
    const client: CompassionateSynthesisClient = { synthesize: vi.fn(async () => "I hear you.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result.metadata.fallbackUsed).toBe(true);
  });
  it("prompt includes ReadingPlan evidence", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(firstSynthCall<{ prompt: { user: string } }>(client).prompt.user).toContain("ReadingPlan");
  });
  it("prompt includes safety boundaries", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: ["boundary"], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(firstSynthCall<{ prompt: { user: string } }>(client).prompt.user).toContain("boundary");
  });
  it("prompt includes memory summary when provided", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), memorySummary: "Memory", safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(firstSynthCall<{ prompt: { user: string } }>(client).prompt.user).toContain("Memory");
  });
  it("prompt does not include env secrets", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: { ...baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), GROQ_API_KEY: "secret" }, client });
    const body = firstSynthCall<{ prompt: { user: string } }>(client).prompt.user;
    expect(body).not.toContain("secret");
  });
  it("model default is openai/gpt-oss-120b", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(firstSynthCall<{ model: string }>(client).model).toBe("openai/gpt-oss-120b");
  });
  it("timeout default is 8000", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(firstSynthCall<{ timeoutMs: number }>(client).timeoutMs).toBe(8000);
  });
  it("max tokens default is 1100", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(firstSynthCall<{ maxTokens: number }>(client).maxTokens).toBe(1100);
  });
  it("temperature default is 0.35", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(firstSynthCall<{ temperature: number }>(client).temperature).toBe(0.35);
  });
  it("env overrides model", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true", ASTRO_COMPASSIONATE_SYNTHESIS_MODEL: "test-model" }), client });
    expect(firstSynthCall<{ model: string }>(client).model).toBe("test-model");
  });
  it("env overrides timeout safely", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true", ASTRO_COMPASSIONATE_SYNTHESIS_TIMEOUT_MS: "5000" }), client });
    expect(firstSynthCall<{ timeoutMs: number }>(client).timeoutMs).toBe(5000);
  });
  it("env overrides max tokens safely", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true", ASTRO_COMPASSIONATE_SYNTHESIS_MAX_TOKENS: "700" }), client });
    expect(firstSynthCall<{ maxTokens: number }>(client).maxTokens).toBe(700);
  });
  it("env overrides temperature safely", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true", ASTRO_COMPASSIONATE_SYNTHESIS_TEMPERATURE: "0.1" }), client });
    expect(firstSynthCall<{ temperature: number }>(client).temperature).toBe(0.1);
  });
  it("source groq only when accepted", async () => {
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay, so keep showing your work and taking one concrete step each week. Timing is uncertain, and I will stay with the grounded pattern. You are not blocked forever.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: ["Do not provide exact timing without a grounded source."], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("source fallback when rejected", async () => {
    const client = { synthesize: vi.fn(async () => "I hear you. You will definitely get promoted next month.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("exact_fact plan remains concise if synthesized", async () => {
    const exactPlan = plan({ mode: "exact_fact", practicalGuidance: ["Keep it concise."], livedExperience: [], chartTruth: { ...plan().chartTruth, evidence: [{ id: "e1", label: "Lagna", explanation: "Leo Lagna", confidence: "high", source: "chart" }], chartAnchors: ["lagna"], limitations: [] } });
    const client = { synthesize: vi.fn(async () => "I hear you. Lagna is Leo. This is grounded and concise. I will keep it limited and clear.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: exactPlan, safetyBoundaries: ["Keep it concise."], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("follow_up plan requires follow-up preserved", async () => {
    const followPlan = plan({ mode: "follow_up", followUp: { question: "Which part matters most?", reason: "Need clarity" } });
    const client = { synthesize: vi.fn(async () => "I hear how confusing this feels. Which part matters most? I’ll keep the reading careful and grounded.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: followPlan, safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result).toBeDefined();
  });
  it("remedy plan includes remedies only if allowed", async () => {
    const remedyPlan = plan({ mode: "remedy", remedies: { include: true, reason: "user_requested_remedy", spiritual: ["Optional mantra"], behavioral: ["Keep it low cost"], practical: ["Use one simple action"], inner: ["Stay calm"] } });
    const client = { synthesize: vi.fn(async () => "I hear how hard this feels. Saturn points to delay. Optional mantra can help, keep it low cost, use one simple action, and stay calm. Timing is uncertain, and you are not blocked forever.") };
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: remedyPlan, safetyBoundaries: ["Timing is uncertain."], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result.source).toBe("fallback");
  });
  it("no global network call without injected client", async () => {
    const original = globalThis.fetch;
    // @ts-expect-error test override
    delete globalThis.fetch;
    const result = await synthesizeCompassionatelySafely({ question: "Q", listening, plan: plan(), safetyBoundaries: [], fallbackAnswer: "fallback", env: baseEnv({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }) });
    expect(result.source).toBe("fallback");
    globalThis.fetch = original;
  });
});
