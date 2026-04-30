/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildReadingPlan } from "../../../lib/astro/synthesis";
import { critiqueReadingSafely } from "../../../lib/astro/critic";
import { applyDeterministicCriticChecks, buildReadingCriticPrompt } from "../../../lib/astro/critic";
import { routeLocalModelTask } from "../../../lib/astro/rag/local-model-router";
import type { ReadingCriticClient, ReadingCriticResult } from "../../../lib/astro/critic";
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

function criticClient(result: unknown): ReadingCriticClient {
  return { critique: vi.fn(async () => result) };
}

function env(extra: Record<string, string | undefined> = {}) {
  return {
    ASTRO_OLLAMA_CRITIC_ENABLED: "false",
    ASTRO_COMPANION_PIPELINE_ENABLED: "false",
    ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "false",
    ASTRO_RAG_ENABLED: "false",
    ASTRO_LOCAL_CRITIC_ENABLED: "false",
    ...extra,
  };
}

const validCritic: ReadingCriticResult = {
  safe: true,
  grounded: true,
  specific: true,
  compassionate: true,
  feelsHeardScore: 0.9,
  genericnessScore: 0.1,
  fearBasedScore: 0,
  missingRequiredElements: [],
  unsafeClaims: [],
  inventedFacts: [],
  unsupportedTimingClaims: [],
  unsupportedRemedies: [],
  shouldRewrite: false,
  rewriteInstructions: [],
  source: "ollama",
};

beforeEach(() => vi.restoreAllMocks());

describe("reading critic availability", () => {
  it("disabled by default returns skipped", async () => {
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env() });
    expect(result.source).toBe("skipped");
  });
  it("ASTRO_RAG_ENABLED alone returns skipped", async () => {
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_RAG_ENABLED: "true" }) });
    expect(result.source).toBe("skipped");
  });
  it("ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED alone returns skipped", async () => {
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED: "true" }) });
    expect(result.source).toBe("skipped");
  });
  it("ASTRO_LOCAL_CRITIC_ENABLED alone returns skipped", async () => {
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_LOCAL_CRITIC_ENABLED: "true" }) });
    expect(result.source).toBe("skipped");
  });
  it("ASTRO_OLLAMA_CRITIC_ENABLED without companion pipeline returns skipped", async () => {
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true" }) });
    expect(result.source).toBe("skipped");
  });
  it("enabled flags but no client returns fallback", async () => {
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }) });
    expect(result.source).toBe("fallback");
  });
  it("enabled flags with valid client returns source ollama", async () => {
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client: criticClient(validCritic) });
    expect(result.source).toBe("ollama");
  });
});

describe("reading critic prompt", () => {
  const prompt = buildReadingCriticPrompt({ question: "Q", listening, plan: plan(), answer: "Candidate answer", safetyBoundaries: ["No guarantees"], env: env({ SECRET: "shh" }) });
  it("says critic does not write final answer", () => expect(prompt.system.toLowerCase()).toContain("do not write the final answer"));
  it("says JSON only", () => expect(prompt.system).toContain("Return JSON only"));
  it("forbids adding astrology facts", () => expect(prompt.system).toContain("Do not add astrology facts"));
  it("includes ReadingPlan evidence", () => expect(prompt.user).toContain("Allowed chart evidence"));
  it("includes safety boundaries", () => expect(prompt.user).toContain("Safety boundaries"));
  it("includes candidate answer", () => expect(prompt.user).toContain("Candidate answer"));
  it("does not include env secret", () => expect(prompt.user).not.toContain("shh"));
});

describe("reading critic model behavior", () => {
  it("qwen2.5:3b default path accepted", async () => {
    const client = criticClient(validCritic);
    await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect((client.critique as ReturnType<typeof vi.fn>).mock.calls[0][0].profile.model).toBe("qwen2.5:3b");
  });
  it("qwen2.5:7b not default", async () => {
    expect(routeLocalModelTask("critic", env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" })).profile.model).toBe("qwen2.5:3b");
  });
  it("no global network call without injected client", async () => {
    const original = globalThis.fetch;
    // @ts-expect-error test override
    delete globalThis.fetch;
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }) });
    expect(result.source).toBe("fallback");
    globalThis.fetch = original;
  });
});

describe("reading critic fallback behavior", () => {
  it("invalid JSON falls back", async () => {
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client: criticClient("not json") });
    expect(result.source).toBe("fallback");
  });
  it("invalid shape falls back", async () => {
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client: criticClient({ bad: true }) });
    expect(result.source).toBe("fallback");
  });
  it("client throws falls back", async () => {
    const client: ReadingCriticClient = { critique: vi.fn(async () => { throw new Error("boom"); }) };
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result.source).toBe("fallback");
  });
  it("timeout-like rejection falls back", async () => {
    const client: ReadingCriticClient = { critique: vi.fn(async () => { throw new Error("timeout"); }) };
    const result = await critiqueReadingSafely({ question: "Q", listening, plan: plan(), answer: "I hear you. Saturn points to delay, so stay practical.", env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }), client });
    expect(result.rewriteInstructions.join(" ")).toContain("reading critic fallback");
  });
});

describe("reading critic deterministic checks", () => {
  const cases: Array<[string, string, Partial<ReadingCriticResult>, (result: ReadingCriticResult) => void]> = [
    ["generic answer", "Stay positive and work hard.", { genericnessScore: 0.9 }, (r) => expect(r.genericnessScore).toBeGreaterThanOrEqual(0.8)],
    ["fear-based language", "I hear you. You are doomed and cursed.", {}, (r) => expect(r.fearBasedScore).toBeGreaterThanOrEqual(0.8)],
    ["missing emotional acknowledgement", "Saturn points to delay, so stay practical.", {}, (r) => expect(r.missingRequiredElements).toContain("emotional_acknowledgement")],
    ["missing chart anchor", "I hear you. Stay practical and grounded.", {}, (r) => expect(r.missingRequiredElements).toContain("chart_anchor")],
    ["missing lived experience", "I hear you. Saturn points to delay.", {}, (r) => expect(r.missingRequiredElements).toContain("lived_experience")],
    ["missing practical guidance", "I hear you. Saturn points to delay. You are not blocked forever.", {}, (r) => expect(r.missingRequiredElements).toContain("practical_guidance")],
    ["missing reassurance", "I hear you. Saturn points to delay, so stay practical.", {}, (r) => expect(r.missingRequiredElements).toContain("reassurance")],
    ["missing follow-up", "I hear you. Saturn points to delay. This is support only, not certainty.", {}, (r) => expect(r.missingRequiredElements).toContain("practical_guidance")],
    ["missing safety boundary", "I hear you. Saturn points to delay, so stay practical. You are not blocked forever.", {}, (r) => expect(r.missingRequiredElements).toContain("safety_boundary")],
    ["invented planet placement", "I hear you. Jupiter in Aries is the reason.", {}, (r) => expect(r.inventedFacts.join(" ")).toContain("invented chart fact")],
    ["invented house placement", "I hear you. Venus in the 7th house is the reason.", {}, (r) => expect(r.inventedFacts.join(" ")).toContain("invented chart fact")],
    ["invented dasha", "I hear you. Rahu Mahadasha is active.", {}, (r) => expect(r.inventedFacts.join(" ")).toContain("invented chart fact")],
    ["unsupported timing date", "I hear you. This will happen next month. This is support only, not certainty.", {}, (r) => expect(r.unsupportedTimingClaims.length).toBeGreaterThan(0)],
    ["unsupported timing window", "I hear you. This will happen next month. You are not blocked forever.", {}, (r) => expect(r.unsupportedTimingClaims.length).toBeGreaterThan(0)],
    ["unsupported remedy", "I hear you. Buy this gemstone. This is support only, not certainty.", {}, (r) => expect(r.unsupportedRemedies.length).toBeGreaterThan(0)],
    ["gemstone certainty", "I hear you. This gemstone will guarantee results. This is support only, not certainty.", {}, (r) => expect(r.unsupportedRemedies.length).toBeGreaterThan(0)],
    ["expensive puja pressure", "I hear you. Pay 50000 rupees for the puja. This is support only, not certainty.", {}, (r) => expect(r.unsupportedRemedies.length).toBeGreaterThan(0)],
    ["death certainty", "I hear you. Your death date is 2027-01-01. This is support only, not certainty.", {}, (r) => expect(r.unsafeClaims.join(" ")).toContain("death/lifespan certainty")],
    ["medical guarantee", "I hear you. This guarantees a medical cure. This is support only, not certainty.", {}, (r) => expect(r.unsafeClaims.join(" ")).toContain("guarantee claim")],
    ["legal guarantee", "I hear you. This guarantees the court outcome. This is support only, not certainty.", {}, (r) => expect(r.unsafeClaims.join(" ")).toContain("guarantee claim")],
    ["financial guarantee", "I hear you. This guarantees financial success. This is support only, not certainty.", {}, (r) => expect(r.unsafeClaims.join(" ")).toContain("guarantee claim")],
    ["internal metadata exposure", "I hear you. The prompt metadata says this. http://localhost:3000", {}, (r) => expect(r.unsafeClaims.join(" ")).toContain("internal [REDACTED] exposure")],
    ["good grounded answer passes", "I hear you. Saturn points to delay, so keep one practical step visible and steady. This is support only, not certainty, and I can see how heavy this feels.", {}, (r) => expect(r.safe).toBe(true)],
    ["follow up mode requires follow up", "I hear you. Saturn points to delay, and this feels personal. So keep one practical step visible and steady. This is support only, not certainty.", {}, (r) => expect(r.missingRequiredElements).toContain("follow_up")],
    ["safety boundaries included when present", "I hear you. Saturn points to delay, so keep one practical step visible and steady.", {}, (r) => expect(r.missingRequiredElements).toContain("safety_boundary")],
  ];

  it.each(cases)("%s", async (_name, answer, criticOverrides, assert) => {
    const client = criticClient({ ...validCritic, ...criticOverrides });
    const result = await critiqueReadingSafely({
      question: "Q",
      listening,
      plan: plan({ mode: _name.startsWith("follow up") ? "follow_up" : "interpretive", safetyBoundaries: ["This is support only, not certainty."] }),
      answer,
      env: env({ ASTRO_OLLAMA_CRITIC_ENABLED: "true", ASTRO_COMPANION_PIPELINE_ENABLED: "true" }),
      client,
    });
    assert(result);
  });
});

describe("reading critic direct deterministic application", () => {
  it("deterministic checks run after model result", () => {
    const result = applyDeterministicCriticChecks({
      plan: plan({ mode: "follow_up", followUp: { question: "What part matters most?", reason: "clarify" }, safetyBoundaries: ["This is support only, not certainty."] }),
      answer: "I hear you. This is support only, not certainty.",
      critic: { ...validCritic },
    });
    expect(result.missingRequiredElements).toContain("chart_anchor");
  });
});
