/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import { analyzeListeningSafely } from "../../../lib/astro/listening/listening-analyzer";

function makeClient(result: unknown, delayMs = 0) {
  const calls: unknown[] = [];
  return {
    calls,
    client: {
      analyze: async (input: unknown) => {
        calls.push(input);
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
        return result;
      },
    },
  };
}

describe("analyzeListeningSafely", () => {
  it("disabled returns deterministic fallback", async () => {
    const result = await analyzeListeningSafely({ question: "Will I get promoted?", env: {} });
    expect(result.source).toBe("deterministic_fallback");
  });
  it("enabled without client returns deterministic fallback", async () => {
    const result = await analyzeListeningSafely({ question: "Will I get promoted?", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" } });
    expect(result.source).toBe("deterministic_fallback");
  });
  it("enabled with valid client returns source ollama", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "reassurance", userSituationSummary: "career", acknowledgementHint: "I hear this.", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: ["warm"], source: "ollama", confidence: "high" });
    const result = await analyzeListeningSafely({ question: "Will I get promoted?", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(result.source).toBe("ollama");
  });
  it("client valid JSON with career anxiety accepted", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "reassurance", userSituationSummary: "career", acknowledgementHint: "I hear this.", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: ["warm"], source: "ollama", confidence: "high" });
    const result = await analyzeListeningSafely({ question: "Will I get promoted?", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(result.topic).toBe("career");
  });
  it("client invalid JSON falls back", async () => {
    const mock = makeClient("bad");
    const result = await analyzeListeningSafely({ question: "Will I get promoted?", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(result.source).toBe("deterministic_fallback");
  });
  it("client throws falls back", async () => {
    const client = { analyze: async () => { throw new Error("offline"); } };
    const result = await analyzeListeningSafely({ question: "Will I get promoted?", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client });
    expect(result.source).toBe("deterministic_fallback");
  });
  it("client timeout/rejection falls back", async () => {
    const client = { analyze: async () => new Promise(() => {}) };
    const result = await analyzeListeningSafely({ question: "Will I get promoted?", timeoutMs: 1, env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client });
    expect(result.source).toBe("deterministic_fallback");
  });
  it("client missing fields falls back/normalizes", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious" });
    const result = await analyzeListeningSafely({ question: "Will I get promoted?", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(result.source).toBe("deterministic_fallback");
  });
  it("client tries chart fact; output sanitized/fallback", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "Your Moon in Aries says...", acknowledgementHint: "Moon is in Aries", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], source: "ollama", confidence: "high" });
    const result = await analyzeListeningSafely({ question: "Will I get promoted?", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(result.source).toBe("deterministic_fallback");
  });
  it("client tries prediction; output accepted or normalized", async () => {
    const mock = makeClient({ topic: "timing", emotionalTone: "urgent", emotionalNeed: "clarity", userSituationSummary: "exact date promised", acknowledgementHint: "guaranteed date", missingContext: [], shouldAskFollowUp: false, safetyRisks: ["deterministic_prediction"], humanizationHints: [], source: "ollama", confidence: "high" });
    const result = await analyzeListeningSafely({ question: "Tell me exact date", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(["ollama", "deterministic_fallback"]).toContain(result.source);
  });
  it("death/lifespan from client is handled without throwing", async () => {
    const mock = makeClient({ topic: "general", emotionalTone: "fearful", emotionalNeed: "reassurance", userSituationSummary: "life question", acknowledgementHint: "I hear the worry.", missingContext: [], shouldAskFollowUp: false, safetyRisks: ["death_lifespan"], humanizationHints: [], source: "ollama", confidence: "high" });
    const result = await analyzeListeningSafely({ question: "When will I die?", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(["ollama", "deterministic_fallback"]).toContain(result.source);
  });
  it("vague client output asks follow-up", async () => {
    const result = await analyzeListeningSafely({ question: "What will happen?", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: makeClient({ topic: "general", emotionalTone: "confused", emotionalNeed: "clarity", userSituationSummary: "vague", acknowledgementHint: "I hear this.", missingContext: ["specific_question"], shouldAskFollowUp: true, followUpQuestion: "What specifically?", safetyRisks: [], humanizationHints: [], source: "ollama", confidence: "medium" }).client });
    expect(result.shouldAskFollowUp).toBe(true);
  });
  it("max input length enforced", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], source: "ollama", confidence: "high" });
    await analyzeListeningSafely({ question: "x".repeat(200), env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect((mock.calls[0] as { question?: string }).question?.length).toBeLessThanOrEqual(12000);
  });
  it("prompt says not to give reading", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], source: "ollama", confidence: "high" });
    await analyzeListeningSafely({ question: "Q", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(JSON.stringify(mock.calls[0])).toContain("not to give the astrology reading");
  });
  it("prompt says JSON only", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], source: "ollama", confidence: "high" });
    await analyzeListeningSafely({ question: "Q", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(JSON.stringify(mock.calls[0])).toContain("Return valid JSON only");
  });
  it("prompt says do not invent chart facts", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], source: "ollama", confidence: "high" });
    await analyzeListeningSafely({ question: "Q", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect(JSON.stringify(mock.calls[0])).toContain("Do not invent chart facts");
  });
  it("uses local model router task listening_analyzer", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], source: "ollama", confidence: "high" });
    await analyzeListeningSafely({ question: "Q", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect((mock.calls[0] as { profile?: { task?: string } }).profile?.task).toBe("listening_analyzer");
  });
  it("qwen2.5:3b default path accepted", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], source: "ollama", confidence: "high" });
    await analyzeListeningSafely({ question: "Q", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }, client: mock.client });
    expect((mock.calls[0] as { profile?: { model?: string } }).profile?.model).toBe("qwen2.5:3b");
  });
  it("qwen2.5:7b not default", async () => {
    const mock = makeClient({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], source: "ollama", confidence: "high" });
    await analyzeListeningSafely({ question: "Q", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_MODEL: "qwen2.5:7b" }, client: mock.client });
    expect((mock.calls[0] as { profile?: { model?: string } }).profile?.model).not.toBe("qwen2.5:7b");
  });
  it("no network call without injected client", async () => {
    const result = await analyzeListeningSafely({ question: "Q", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" } });
    expect(result.source).toBe("deterministic_fallback");
  });
});
