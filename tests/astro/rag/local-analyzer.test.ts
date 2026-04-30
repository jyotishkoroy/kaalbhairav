import { describe, expect, it } from "vitest";
import { analyzeQuestionWithLocalAnalyzer, deterministicAnalyzeQuestion } from "../../../lib/astro/rag/local-analyzer";
import { getAstroRagFlags, type AstroRagFlags } from "../../../lib/astro/rag/feature-flags";

type FetchLikeResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type FetchLike = (input: string | URL, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<FetchLikeResponse>;
type AnalyzerTopic = "career" | "sleep" | "marriage" | "money" | "foreign" | "education" | "safety" | "general";

function makeResponse(status: number, body: unknown): FetchLikeResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function createFetchMock(response: FetchLikeResponse | (() => Promise<FetchLikeResponse>)) {
  const calls: Array<{ input: string | URL; init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal } }> = [];
  const fetchImpl: FetchLike = async (input, init) => {
    calls.push({ input, init });
    if (typeof response === "function") return response();
    return response;
  };
  return { fetchImpl, calls };
}

function createThrowingFetchMock(error: Error, timeout?: number) {
  const calls: Array<unknown> = [];
  const fetchImpl: FetchLike = async (input, init) => {
    calls.push([input, init]);
    if (timeout) await new Promise((resolve) => setTimeout(resolve, timeout));
    throw error;
  };
  return { fetchImpl, calls };
}

describe("local analyzer client", () => {
  it("local analyzer disabled -> deterministic fallback, no fetch call", async () => {
    const fetch = createFetchMock(makeResponse(200, {}));
    const result = await analyzeQuestionWithLocalAnalyzer({ question: "What is my Lagna?", env: {}, fetchImpl: fetch.fetchImpl as never, flags: getAstroRagFlags({}) });
    expect(fetch.calls).toHaveLength(0);
    expect(result.ok).toBe(true);
    expect(result.fallbackUsed).toBe(true);
  });

  it("enabled but missing secret -> fallback, no fetch call, error missing_local_analyzer_secret", async () => {
    const fetch = createFetchMock(makeResponse(200, {}));
    const flags = getAstroRagFlags({ ASTRO_LOCAL_ANALYZER_ENABLED: "true" });
    const result = await analyzeQuestionWithLocalAnalyzer({ question: "What is my Lagna?", env: {}, fetchImpl: fetch.fetchImpl as never, flags });
    expect(fetch.calls).toHaveLength(0);
    expect(result.error).toBe("missing_local_analyzer_secret");
  });

  it("enabled with secret -> calls /analyze-question", async () => {
    const fetch = createFetchMock(makeResponse(200, { language: "en", topic: "career", questionType: "interpretive", riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 }));
    const flags = getAstroRagFlags({ ASTRO_LOCAL_ANALYZER_ENABLED: "true" });
    await analyzeQuestionWithLocalAnalyzer({ question: "Why am I not getting promotion?", env: { TARAYAI_LOCAL_SECRET: "secret" }, fetchImpl: fetch.fetchImpl as never, flags });
    expect(fetch.calls).toHaveLength(1);
    expect(String(fetch.calls[0]?.input)).toContain("/analyze-question");
  });

  it("base URL trailing slash handled", async () => {
    const fetch = createFetchMock(makeResponse(200, { language: "en", topic: "career", questionType: "interpretive", riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 }));
    const flags = getAstroRagFlags({ ASTRO_LOCAL_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787/" });
    await analyzeQuestionWithLocalAnalyzer({ question: "Q", env: { TARAYAI_LOCAL_SECRET: "secret" }, fetchImpl: fetch.fetchImpl as never, flags });
    expect(String(fetch.calls[0]?.input)).toBe("http://127.0.0.1:8787/analyze-question");
  });

  it("sends headers", async () => {
    const fetch = createFetchMock(makeResponse(200, { language: "en", topic: "career", questionType: "interpretive", riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 }));
    const flags = getAstroRagFlags({ ASTRO_LOCAL_ANALYZER_ENABLED: "true" });
    await analyzeQuestionWithLocalAnalyzer({ question: "Q", env: { ASTRO_LOCAL_ANALYZER_SECRET: "secret" }, fetchImpl: fetch.fetchImpl as never, flags });
    expect(fetch.calls[0]?.init?.headers).toMatchObject({ "content-type": "application/json", "X-tarayai-local-secret": "secret" });
  });

  it("includes question/language/context in body", async () => {
    const fetch = createFetchMock(makeResponse(200, { language: "en", topic: "career", questionType: "interpretive", riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 }));
    const flags = getAstroRagFlags({ ASTRO_LOCAL_ANALYZER_ENABLED: "true" });
    await analyzeQuestionWithLocalAnalyzer({ question: "Q", language: "hi", context: { a: 1 }, env: { TARAYAI_LOCAL_SECRET: "secret" }, fetchImpl: fetch.fetchImpl as never, flags });
    expect(JSON.parse(fetch.calls[0]?.init?.body as string)).toMatchObject({ question: "Q", language: "hi", context: { a: 1 } });
  });

  it("long question is truncated before network request", async () => {
    const fetch = createFetchMock(makeResponse(200, { language: "en", topic: "career", questionType: "interpretive", riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 }));
    const flags = getAstroRagFlags({ ASTRO_LOCAL_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_MAX_INPUT_CHARS: "10" });
    await analyzeQuestionWithLocalAnalyzer({ question: "x".repeat(50), env: { TARAYAI_LOCAL_SECRET: "secret" }, fetchImpl: fetch.fetchImpl as never, flags });
    expect((JSON.parse(fetch.calls[0]?.init?.body as string).question as string).length).toBe(10);
  });

  const successCases: Array<{
    question: string;
    topic: AnalyzerTopic;
    questionType: "exact_fact" | "interpretive" | "timing" | "remedy" | "unsafe" | "general";
    requiredFacts?: string[];
    riskFlags?: string[];
    needsTiming?: boolean;
    needsRemedy?: boolean;
    confidence?: number;
  }> = [
    { question: "I am working hard and not getting promotion.", topic: "career", questionType: "interpretive" },
    { question: "What is my Lagna?", topic: "general", questionType: "exact_fact", requiredFacts: ["lagna"] },
    { question: "Give me remedy for bad sleep.", topic: "sleep", questionType: "remedy", needsRemedy: true },
    { question: "When will I get married?", topic: "marriage", questionType: "timing", needsTiming: true },
    { question: "Can my chart tell when I will die?", topic: "safety", questionType: "unsafe", riskFlags: ["death"] },
    { question: "What is my Moon sign?", topic: "general", questionType: "exact_fact", confidence: 1.5 },
  ];
  for (const testCase of successCases) {
    it(`proxy success: ${testCase.question}`, async () => {
      const fetch = createFetchMock(makeResponse(200, { language: "en", topic: testCase.topic, questionType: testCase.questionType, riskFlags: testCase.riskFlags ?? [], needsTiming: testCase.needsTiming ?? false, needsRemedy: testCase.needsRemedy ?? false, requiredFacts: testCase.requiredFacts ?? [], retrievalTags: ["x"], shouldAskFollowup: false, followupQuestion: null, confidence: testCase.confidence ?? 0.7 }));
      const flags = getAstroRagFlags({ ASTRO_LOCAL_ANALYZER_ENABLED: "true" });
      const result = await analyzeQuestionWithLocalAnalyzer({ question: testCase.question, env: { TARAYAI_LOCAL_SECRET: "secret" }, fetchImpl: fetch.fetchImpl as never, flags });
      expect(result.usedOllama).toBe(true);
      expect(result.result.source).toBe("ollama");
      if (testCase.question.includes("die")) expect(result.result.riskFlags).toContain("death");
    });
  }

  const failureCases: Array<{ name: string; fetchImpl: FetchLike; error: string; flags?: AstroRagFlags }> = [
    { name: "fetch throws", fetchImpl: createThrowingFetchMock(new Error("offline")).fetchImpl, error: "proxy_request_failed" },
    { name: "Abort timeout", fetchImpl: async () => new Promise<FetchLikeResponse>(() => {}), error: "timeout", flags: getAstroRagFlags({ ASTRO_LOCAL_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_TIMEOUT_MS: "1" }) },
    { name: "non-2xx 502", fetchImpl: async () => makeResponse(502, { error: "x" }), error: "proxy_status_502" },
    { name: "401", fetchImpl: async () => makeResponse(401, { error: "no" }), error: "proxy_status_401" },
    { name: "invalid JSON response", fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad"); } }), error: "proxy_request_failed" },
    { name: "schema-invalid JSON", fetchImpl: async () => makeResponse(200, { hello: "world" }), error: "invalid_analyzer_schema" },
    { name: "fallbackRecommended true", fetchImpl: async () => makeResponse(200, { fallbackRecommended: true, language: "en", topic: "career", questionType: "interpretive", riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 }), error: "fallback_recommended" },
    { name: "broken response", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }), error: "invalid_analyzer_schema" },
  ];
  for (const testCase of failureCases) {
    it(`proxy failure fallback: ${testCase.name}`, async () => {
      const flags = testCase.flags ?? getAstroRagFlags({ ASTRO_LOCAL_ANALYZER_ENABLED: "true" });
      const result = await analyzeQuestionWithLocalAnalyzer({ question: "What is my Lagna?", env: { TARAYAI_LOCAL_SECRET: "secret" }, fetchImpl: testCase.fetchImpl as never, flags });
      expect(result.fallbackUsed).toBe(true);
      expect(result.error).toBe(testCase.error);
    });
  }

  const exactCases = [
    ["What is my Lagna?", "lagna"],
    ["What is my Moon sign?", "moon_sign"],
    ["Where is Sun placed?", "planet_placement:sun"],
    ["Which planet rules the 10th house?", "lord_10"],
    ["Compare Aries and Taurus SAV.", "sav"],
    ["Is Moon with Mercury?", "co_presence:moon_mercury"],
    ["What is my current Mahadasha?", "current_dasha"],
    ["What is my Moon nakshatra?", "moon_nakshatra"],
  ] as const;
  for (const [question, expectedFact] of exactCases) {
    it(`deterministic exact fact: ${question}`, () => {
      const result = deterministicAnalyzeQuestion(question);
      expect(result.questionType).toBe("exact_fact");
      expect(result.requiredFacts).toContain(expectedFact);
    });
  }

  const domainCases = [
    { question: "I am working hard and not getting promotion.", topic: "career" },
    { question: "Why am I not getting recognition at work?", topic: "career" },
    { question: "Give me remedy for bad sleep.", topic: "sleep", needsRemedy: true },
    { question: "When will I get married?", topic: "marriage", needsTiming: true },
    { question: "Will foreign work suit me?", topic: "foreign" },
    { question: "Will my salary improve?", topic: "career" },
    { question: "I have debt and money stress.", topic: "money" },
    { question: "Will I pass my exam?", topic: "education" },
    { question: "Is mantra or meditation good for me?", topic: "spirituality", needsRemedy: true },
    { question: "What will happen?", topic: "general", shouldAskFollowup: true },
  ] as const;
  for (const testCase of domainCases) {
    it(`deterministic domain: ${testCase.question}`, () => {
      const result = deterministicAnalyzeQuestion(testCase.question);
      expect(result.topic).toBe(testCase.topic);
      if ("needsRemedy" in testCase && testCase.needsRemedy) expect(result.needsRemedy).toBe(true);
      if ("needsTiming" in testCase && testCase.needsTiming) expect(result.needsTiming).toBe(true);
      if ("shouldAskFollowup" in testCase && testCase.shouldAskFollowup) expect(result.shouldAskFollowup).toBe(true);
    });
  }

  const unsafeCases = [
    ["Can my chart tell when I will die?", "death"],
    ["Do I have cancer according to chart?", "medical"],
    ["Should I stop medicine?", "medical"],
    ["I want to die.", "self_harm"],
    ["Will I definitely win court case?", "legal"],
    ["Which stock will guarantee profit?", "financial_guarantee"],
    ["Which gemstone guarantees money?", "gemstone_guarantee"],
    ["Is expensive puja mandatory?", "expensive_puja_pressure"],
  ] as const;
  for (const [question, flag] of unsafeCases) {
    it(`deterministic unsafe: ${question}`, () => {
      const result = deterministicAnalyzeQuestion(question);
      expect(result.riskFlags).toContain(flag);
    });
  }
});
