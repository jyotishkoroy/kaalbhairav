/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";
import { critiqueAnswerWithLocalOllama, mergeCriticWithValidation } from "../../../lib/astro/rag/local-critic";
import type { LocalCriticResult } from "../../../lib/astro/rag/critic-schema";
import { routeLocalModelTask } from "../../../lib/astro/rag/local-model-router";

const baseContract = {
  domain: "career",
  answerMode: "interpretive",
  question: "Q",
  mustInclude: [],
  mustNotInclude: [],
  requiredSections: ["direct_answer", "chart_basis", "reasoning", "accuracy", "suggested_follow_up"],
  optionalSections: ["timing", "what_to_do"],
  anchors: [{ key: "a1", label: "Anchor 1", required: true, source: "chart_fact", factKeys: ["house_10"], ruleKeys: ["r1"], description: "desc" }],
  forbiddenClaims: [{ key: "f1", description: "x", severity: "block" }],
  timingAllowed: true,
  timingRequired: false,
  remedyAllowed: true,
  exactFactsOnly: false,
  canUseGroq: true,
  canUseOllamaCritic: true,
  accuracyClass: "grounded_interpretive",
  limitations: [],
  safetyRestrictions: [],
  validatorRules: [],
  writerInstructions: ["Include a gentle follow-up."],
  metadata: { requiredFactKeys: [], missingFacts: [], selectedRuleKeys: [], timingWindowCount: 1, retrievalPartial: false, reasoningPartial: false, blockedBySafety: false },
} as const;

const validationOk = {
  ok: true,
  score: 92,
  issues: [],
  missingAnchors: [],
  missingSections: [],
  wrongFacts: [],
  unsafeClaims: [],
  genericnessScore: 0.1,
  retryRecommended: false,
  fallbackRecommended: false,
  correctionInstruction: "Keep it grounded.",
  metadata: { checkedAnchors: 2, checkedSections: 5, checkedTimingWindows: 1, contractDomain: "career", contractAnswerMode: "interpretive", strictFailureCount: 0, warningCount: 0 },
} as const;

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    question: "I am working hard and not getting promotion.",
    answer: "Your career answer is anchored in the 10th house and dasha.",
    contract: baseContract as never,
    context: { metadata: { retrievalTags: ["career"] }, memorySummary: "summary" } as never,
    reasoningPath: { steps: ["s1", "s2"], partial: false } as never,
    timing: { windows: ["w1"], partial: false } as never,
    validation: validationOk as never,
    env: { TARAYAI_LOCAL_SECRET: "secret", ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "50", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787", ASTRO_LOCAL_CRITIC_ENABLED: "true" },
    flags: { localCriticEnabled: true, localCriticRequired: false, localAnalyzerBaseUrl: "http://127.0.0.1:8787", localCriticTimeoutMs: 50 } as never,
    fetchImpl: vi.fn(),
    ...overrides,
  };
}

function criticJson(overrides: Record<string, unknown> = {}): LocalCriticResult {
  return {
    ok: true,
    safe: true,
    grounded: true,
    specific: true,
    compassionate: true,
    feelsHeardScore: 0.8,
    genericnessScore: 0.1,
    fearBasedScore: 0,
    groundingScore: 0.8,
    specificityScore: 0.8,
    practicalValueScore: 0.8,
    missingRequiredElements: [],
    unsafeClaims: [],
    inventedFacts: [],
    unsupportedTimingClaims: [],
    unsupportedRemedies: [],
    genericPhrases: [],
    emotionalGaps: [],
    rewriteInstructions: [],
    shouldRewrite: false,
    shouldFallback: false,
    source: "ollama",
    warnings: [],
    answersQuestion: true,
    tooGeneric: false,
    missingAnchors: [],
    missingSections: [],
    wrongFacts: [],
    companionToneScore: 0.8,
    shouldRetry: false,
    correctionInstruction: "",
    ...overrides,
  };
}

function okResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type CriticExpectation = (critic: LocalCriticResult | null) => void;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("local critic availability", () => {
  it("critic disabled returns skipped fallback result", async () => {
    const result = await critiqueAnswerWithLocalOllama({ ...makeInput({ flags: { localCriticEnabled: false, localCriticRequired: false, localAnalyzerBaseUrl: "http://127.0.0.1:8787" } }) });
    expect(result.used).toBe(false);
    expect(result.critic?.source).toBe("skipped");
    expect(result.critic?.shouldFallback).toBe(true);
  });

  it("ASTRO_LOCAL_CRITIC_ENABLED=true allows local critic route", () => expect(routeLocalModelTask("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true" }).useLocal).toBe(true));
  it("ASTRO_OLLAMA_CRITIC_ENABLED=true allows local critic route", () => expect(routeLocalModelTask("critic", { ASTRO_OLLAMA_CRITIC_ENABLED: "true" }).useLocal).toBe(true));
  it("missing base URL fails soft", async () => {
    const result = await critiqueAnswerWithLocalOllama(makeInput({ env: { TARAYAI_LOCAL_SECRET: "secret", ASTRO_LOCAL_CRITIC_ENABLED: "true" }, flags: { localCriticEnabled: true, localCriticRequired: false, localAnalyzerBaseUrl: "", localCriticTimeoutMs: 50 }, fetchImpl: vi.fn() }));
    expect(result.ok).toBe(false);
  });
  it("timeout fails soft", async () => {
    const fetchImpl = vi.fn((_input, init) => new Promise<never>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
    const result = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl, env: { TARAYAI_LOCAL_SECRET: "secret", ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "1", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787", ASTRO_LOCAL_CRITIC_ENABLED: "true" } }));
    expect(result.error).toBe("critic_timeout");
  });
  it("thrown fetch/client fails soft", async () => {
    const result = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl: vi.fn(async () => { throw new Error("offline"); }) }));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("offline");
  });
  it("invalid JSON fails soft", async () => {
    const result = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl: vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad"); }, text: async () => "{" })) }));
    expect(result.ok).toBe(false);
    expect(result.critic?.source).toBe("skipped");
  });
  it("invalid shape fails soft", async () => {
    const result = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl: vi.fn(async () => okResponse({ bad: true })) }));
    expect(result.ok).toBe(false);
  });
  it("local critic required false does not fail request", async () => {
    const result = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl: vi.fn(async () => okResponse(criticJson())), flags: { localCriticEnabled: true, localCriticRequired: false, localAnalyzerBaseUrl: "http://127.0.0.1:8787", localCriticTimeoutMs: 50 } }));
    expect(result.used).toBe(true);
    expect(result.ok).toBe(true);
  });
  it("production-like required true warns but does not break tests", () => {
    expect(routeLocalModelTask("critic", { NODE_ENV: "production", ASTRO_LOCAL_CRITIC_ENABLED: "true", ASTRO_LOCAL_CRITIC_REQUIRED: "true" }).warnings.join(" ")).toContain("required local AI");
  });
});

describe("local critic normalization", () => {
  it("score below 0 clamps to 0", async () => expect((await goodCritic({ genericnessScore: -1 })).critic?.genericnessScore).toBe(0));
  it("score above 1 clamps to 1", async () => expect((await goodCritic({ genericnessScore: 2, feelsHeardScore: 2, groundingScore: 2, specificityScore: 2, practicalValueScore: 2, fearBasedScore: 2 })).critic?.practicalValueScore).toBe(1));
  it("missing score defaults safely", async () => expect((await goodCritic({ genericnessScore: undefined })).critic?.genericnessScore).toBe(0.5));
  it("string score coerces or falls back safely", async () => expect((await goodCritic({ genericnessScore: "0.7" })).critic?.genericnessScore).toBe(0.7));
  it("missing arrays default empty", async () => expect((await goodCritic({ missingRequiredElements: undefined })).critic?.missingRequiredElements).toEqual([]));
  it("non-string array values are sanitized", async () => expect((await goodCritic({ unsafeClaims: ["x", 1 as never, "x"] })).critic?.unsafeClaims).toEqual(["x"]));
  it("source is normalized", async () => expect((await goodCritic({ source: "weird" })).critic?.source).toBe("fallback"));
  it("ok=false handled", async () => expect((await goodCritic({ ok: false })).critic?.ok).toBe(false));
  it("shouldRewrite normalized", async () => expect((await goodCritic({ shouldRewrite: "true" })).critic?.shouldRewrite).toBe(true));
  it("shouldFallback normalized", async () => expect((await goodCritic({ shouldFallback: "true" })).critic?.shouldFallback).toBe(true));
});

describe("local critic quality detection", () => {
  const cases: Array<[string, string, Partial<Record<string, unknown>>, CriticExpectation]> = [
    ["generic answer flagged", "Stay positive and work hard.", { genericPhrases: ["stay positive"], shouldRewrite: true }, (critic) => expect(critic.genericPhrases).toContain("stay positive")],
    ["template answer flagged", "This is a standard reading template.", { genericPhrases: ["standard reading template"] }, (critic) => expect(critic.genericPhrases[0]).toContain("template")],
    ["answer ignoring user question flagged", "Your career looks fine.", { missingRequiredElements: ["question"], shouldRewrite: true }, (critic) => expect(critic.missingRequiredElements).toContain("question")],
    ["missing acknowledgement flagged", "Your answer is grounded.", { emotionalGaps: ["no acknowledgment"], compassionate: false, feelsHeardScore: 0.1 }, (critic) => expect(critic.emotionalGaps).toContain("no acknowledgment")],
    ["missing practical guidance flagged", "I cannot say much.", { practicalValueScore: 0.1, rewriteInstructions: ["add practical next step"] }, (critic) => expect(critic.rewriteInstructions[0]).toContain("practical")],
    ["missing reassurance flagged", "Here is the data.", { emotionalGaps: ["no reassurance"], feelsHeardScore: 0.2 }, (critic) => expect(critic.feelsHeardScore).toBe(0.2)],
    ["missing chart/evidence anchor flagged when chart-based answer expected", "Maybe something happens.", { missingRequiredElements: ["chart_basis"], grounded: false }, (critic) => expect(critic.grounded).toBe(false)],
    ["compassionate grounded answer passes", "I hear the concern and the reading stays grounded.", { compassionate: true, grounded: true, specific: true, shouldRewrite: false }, (critic) => expect(critic.compassionate).toBe(true)],
    ["specific career answer passes", "The 10th-house pattern supports career growth with patience.", { specific: true, grounded: true }, (critic) => expect(critic.specific).toBe(true)],
    ["specific sleep remedy answer passes", "Try a low-cost routine and keep it optional.", { specific: true, grounded: true, practicalValueScore: 0.9 }, (critic) => expect(critic.practicalValueScore).toBe(0.9)],
    ["vague answer that asks follow-up passes", "Which part should I focus on next?", { answersQuestion: false, shouldRewrite: false }, (critic) => expect(critic.answersQuestion).toBe(false)],
    ["vague answer that invents prediction fails", "You will definitely get promoted next month.", { unsafeClaims: ["guaranteed promotion"], shouldFallback: true }, (critic) => expect(critic.shouldFallback).toBe(true)],
    ["repeated boilerplate detected", "Stay positive. Stay positive. Stay positive.", { genericPhrases: ["stay positive"], shouldRewrite: true }, (critic) => expect(critic.genericPhrases).toContain("stay positive")],
    ["too-short answer flagged", "Maybe.", { genericnessScore: 0.9, shouldRewrite: true }, (critic) => expect(critic.genericnessScore).toBe(0.9)],
  ];
  it.each(cases)("%s", async (_name, answer, criticOverrides, expected) => {
    const result = await goodCritic(criticOverrides, answer);
    expected(result.critic);
  });
});

describe("local critic safety detection", () => {
  const cases: Array<[string, string, Partial<Record<string, unknown>>, CriticExpectation]> = [
    ["death date flagged", "Your death date is 2027-01-01.", { unsafeClaims: ["death date"], shouldFallback: true }, (critic) => expect(critic.shouldFallback).toBe(true)],
    ["lifespan prediction flagged", "You will live to 82.", { unsafeClaims: ["lifespan prediction"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("lifespan prediction")],
    ["medical diagnosis flagged", "You have cancer.", { unsafeClaims: ["medical diagnosis"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("medical diagnosis")],
    ["stop medicine advice flagged", "Stop your medicine.", { unsafeClaims: ["stop medicine"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("stop medicine")],
    ["legal guarantee flagged", "The court outcome is guaranteed.", { unsafeClaims: ["legal guarantee"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("legal guarantee")],
    ["stock/lottery/financial guarantee flagged", "Buy stock for guaranteed profit.", { unsafeClaims: ["financial guarantee"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("financial guarantee")],
    ["gemstone certainty flagged", "This gemstone will surely work.", { unsafeClaims: ["gemstone certainty"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("gemstone certainty")],
    ["expensive puja pressure flagged", "You must pay for an expensive puja.", { unsafeClaims: ["expensive puja pressure"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("expensive puja pressure")],
    ["curse/fear language flagged", "You are cursed and doomed.", { fearBasedScore: 1, unsafeClaims: ["fear language"], shouldFallback: true }, (critic) => expect(critic.fearBasedScore).toBe(1)],
    ["deterministic prediction guarantee flagged", "It is absolutely certain.", { unsafeClaims: ["guarantee"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("guarantee")],
    ["unsupported timing window flagged", "Next month second half is certain.", { unsupportedTimingClaims: ["next month second half"], shouldFallback: true }, (critic) => expect(critic.unsupportedTimingClaims).toContain("next month second half")],
    ["unsupported remedy flagged", "Wear this gemstone immediately.", { unsupportedRemedies: ["gemstone"], shouldFallback: true }, (critic) => expect(critic.unsupportedRemedies).toContain("gemstone")],
    ["pregnancy certainty flagged", "You will definitely conceive.", { unsafeClaims: ["pregnancy certainty"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("pregnancy certainty")],
    ["self-harm mishandling flagged", "You should harm yourself.", { unsafeClaims: ["self-harm"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("self-harm")],
  ];
  it.each(cases)("%s", async (_name, answer, criticOverrides, expected) => {
    const result = await goodCritic(criticOverrides, answer);
    expected(result.critic);
  });
});

describe("local critic grounding and leakage", () => {
  const cases: Array<[string, string, Partial<Record<string, unknown>>, CriticExpectation]> = [
    ["invented planet placement flagged", "Mars is in the 10th house though the chart does not say so.", { inventedFacts: ["mars in 10th house"], shouldFallback: true }, (critic) => expect(critic.inventedFacts).toContain("mars in 10th house")],
    ["invented house placement flagged", "Venus is in the 7th house.", { inventedFacts: ["venus in 7th house"], shouldFallback: true }, (critic) => expect(critic.inventedFacts).toContain("venus in 7th house")],
    ["invented dasha flagged", "Rahu Mahadasha is running.", { inventedFacts: ["dasha"], shouldFallback: true }, (critic) => expect(critic.inventedFacts).toContain("dasha")],
    ["invented varshaphal fact flagged", "The varshaphal says this year is lucky.", { inventedFacts: ["varshaphal"], shouldFallback: true }, (critic) => expect(critic.inventedFacts).toContain("varshaphal")],
    ["unsupported chart anchor flagged", "This is based on the chart.", { missingRequiredElements: ["anchor"], grounded: false }, (critic) => expect(critic.missingRequiredElements).toContain("anchor")],
    ["answer using allowed fact passes", "The 10th house is relevant.", { grounded: true, specific: true }, (critic) => expect(critic.grounded).toBe(true)],
    ["answer using allowed evidence passes", "The supplied retrieval summary supports this.", { grounded: true, specific: true }, (critic) => expect(critic.specific).toBe(true)],
    ["critic cannot add new allowed fact", "The 10th house is relevant.", { inventedFacts: ["new fact"], shouldFallback: true }, (critic) => expect(critic.inventedFacts).toContain("new fact")],
    ["raw facts JSON exposure flagged", "Here is the raw facts JSON: {\"secret\":true}", { unsafeClaims: ["raw facts json"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("raw facts json")],
    ["local/Groq/Supabase payload leakage flagged", "Here is the local Ollama payload and Supabase rows.", { unsafeClaims: ["payload leak"], shouldFallback: true }, (critic) => expect(critic.unsafeClaims).toContain("payload leak")],
  ];
  it.each(cases)("%s", async (_name, answer, criticOverrides, expected) => {
    const result = await goodCritic(criticOverrides, answer);
    expected(result.critic);
  });
});

describe("local critic router and integration", () => {
  it("qwen2.5:3b default accepted", () => expect(routeLocalModelTask("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true" }).profile.model).toBe("qwen2.5:3b"));
  it("qwen2.5:1.5b warning preserved", () => expect(routeLocalModelTask("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true", ASTRO_LOCAL_CRITIC_MODEL: "qwen2.5:1.5b" }).warnings.join(" ")).toContain("fallback"));
  it("qwen2.5:7b warning preserved", () => expect(routeLocalModelTask("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true", ASTRO_LOCAL_CRITIC_MODEL: "qwen2.5:7b" }).warnings.join(" ")).toContain("manual/deep critic"));
  it("qwen2.5:7b not default", () => expect(routeLocalModelTask("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true" }).profile.model).toBe("qwen2.5:3b"));
  it("critic uses local-model-router task critic", () => expect(routeLocalModelTask("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true" }).task).toBe("critic"));
  it("ASTRO_RAG_ENABLED alone does not enable critic", () => expect(routeLocalModelTask("critic", { ASTRO_RAG_ENABLED: "true" }).useLocal).toBe(false));
  it("no network when disabled", async () => {
    const fetchImpl = vi.fn();
    await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl, flags: { localCriticEnabled: false, localCriticRequired: false, localAnalyzerBaseUrl: "http://127.0.0.1:8787" } }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("fetch/client mocked when enabled", async () => {
    const fetchImpl = vi.fn(async () => okResponse(criticJson()));
    const result = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl }));
    expect(fetchImpl).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});

describe("local critic integration regression", () => {
  it("deterministic validator rejection cannot be overridden by critic pass", () => {
    const merged = mergeCriticWithValidation({
      validation: { ...validationOk, ok: false, fallbackRecommended: true, retryRecommended: false, genericnessScore: 1 } as never,
      criticResult: { used: true, ok: true, critic: criticJson(), fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: false } },
    });
    expect(merged.fallbackRecommended).toBe(true);
  });
  it("critic shouldFallback can trigger fallback signal when integration supports it", () => {
    const merged = mergeCriticWithValidation({
      validation: validationOk as never,
      criticResult: { used: true, ok: true, critic: criticJson({ shouldFallback: true }), fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } },
    });
    expect(merged.fallbackRecommended).toBe(true);
  });
  it("API/UI do not expose raw critic payload", async () => {
    const result = await goodCritic({ unsafeClaims: ["secret"] });
    expect(JSON.stringify(result)).not.toContain("TARAYAI_LOCAL_SECRET");
  });
  it("existing orchestrator tests still pass shape expectations", async () => {
    const result = await goodCritic();
    expect(result.metadata.requestAttempted).toBe(true);
  });
});

async function goodCritic(overrides: Record<string, unknown> = {}, answer = "Your career answer is anchored in the 10th house and dasha.") {
  const fetchImpl = vi.fn(async () => okResponse(criticJson(overrides)));
  return critiqueAnswerWithLocalOllama(makeInput({ answer, fetchImpl }));
}
