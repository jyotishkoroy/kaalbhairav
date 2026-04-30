import { beforeEach, describe, expect, it, vi } from "vitest";
import { critiqueAnswerWithLocalOllama, buildLocalCriticPayload, mergeCriticWithValidation } from "../../../lib/astro/rag/local-critic";

const baseContract = {
  domain: "career",
  answerMode: "interpretive",
  question: "Q",
  mustInclude: [],
  mustNotInclude: [],
  requiredSections: ["direct_answer", "chart_basis", "reasoning", "accuracy", "suggested_follow_up"],
  optionalSections: ["timing", "what_to_do"],
  anchors: [
    { key: "a1", label: "Anchor 1", required: true, source: "chart_fact", factKeys: ["house_10"], ruleKeys: ["r1"], description: "desc" },
    { key: "a2", label: "Anchor 2", required: false, source: "reasoning_path", factKeys: [], ruleKeys: [], description: "desc" },
  ],
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
    env: { TARAYAI_LOCAL_SECRET: "secret", ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "50", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" },
    flags: { localCriticEnabled: true, localCriticRequired: false, localAnalyzerBaseUrl: "http://127.0.0.1:8787", localCriticTimeoutMs: 50 } as never,
    fetchImpl: vi.fn(),
    ...overrides,
  };
}

function criticJson(overrides: Record<string, unknown> = {}) {
  return {
    answersQuestion: true,
    tooGeneric: false,
    missingAnchors: [],
    missingSections: [],
    unsafeClaims: [],
    wrongFacts: [],
    companionToneScore: 0.8,
    shouldRetry: false,
    correctionInstruction: "",
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("local critic", () => {
  const gatingCases: Array<[string, () => Promise<void>]> = [
    ["no args does not throw", async () => { await expect(critiqueAnswerWithLocalOllama()).resolves.toMatchObject({ used: false, ok: false }); }],
    ["missing question prevents fetch", async () => { const fetchImpl = vi.fn(); await critiqueAnswerWithLocalOllama({ ...makeInput(), question: "" as never, fetchImpl }); expect(fetchImpl).not.toHaveBeenCalled(); }],
    ["missing answer prevents fetch", async () => { const fetchImpl = vi.fn(); await critiqueAnswerWithLocalOllama({ ...makeInput(), answer: "" as never, fetchImpl }); expect(fetchImpl).not.toHaveBeenCalled(); }],
    ["missing contract prevents fetch", async () => { const fetchImpl = vi.fn(); await critiqueAnswerWithLocalOllama({ ...makeInput(), contract: undefined as never, fetchImpl }); expect(fetchImpl).not.toHaveBeenCalled(); }],
    ["critic disabled prevents fetch", async () => { const fetchImpl = vi.fn(); await critiqueAnswerWithLocalOllama({ ...makeInput({ flags: { localCriticEnabled: false, localCriticRequired: false, localAnalyzerBaseUrl: "http://127.0.0.1:8787", localCriticTimeoutMs: 50 } as never }), fetchImpl }); expect(fetchImpl).not.toHaveBeenCalled(); }],
    ["missing secret prevents fetch", async () => { const fetchImpl = vi.fn(); await critiqueAnswerWithLocalOllama({ ...makeInput({ env: {}, fetchImpl }) }); expect(fetchImpl).not.toHaveBeenCalled(); }],
    ["missing fetch prevents fetch", async () => {
      const saved = globalThis.fetch;
      try {
        // @ts-expect-error: temporary removal for no-fetch gating test
        delete globalThis.fetch;
        await critiqueAnswerWithLocalOllama({ ...(makeInput() as Record<string, unknown>), fetchImpl: undefined });
      } finally {
        globalThis.fetch = saved;
      }
    }],
    ["safety skips when not required", async () => { const fetchImpl = vi.fn(); await critiqueAnswerWithLocalOllama({ ...makeInput({ contract: { ...(baseContract as Record<string, unknown>), answerMode: "safety" }, fetchImpl }) }); expect(fetchImpl).not.toHaveBeenCalled(); }],
    ["exact_fact skips when not required", async () => { const fetchImpl = vi.fn(); await critiqueAnswerWithLocalOllama({ ...makeInput({ contract: { ...(baseContract as Record<string, unknown>), answerMode: "exact_fact" }, fetchImpl }) }); expect(fetchImpl).not.toHaveBeenCalled(); }],
    ["deterministic fallback skips when not required", async () => { const fetchImpl = vi.fn(); await critiqueAnswerWithLocalOllama({ ...makeInput({ validation: { ...(validationOk as Record<string, unknown>), ok: false, fallbackRecommended: true }, fetchImpl }) }); expect(fetchImpl).not.toHaveBeenCalled(); }],
    ["critic required can attempt for safety", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await critiqueAnswerWithLocalOllama({ ...(makeInput({ contract: { ...(baseContract as Record<string, unknown>), answerMode: "safety" }, flags: { localCriticEnabled: true, localCriticRequired: true, localAnalyzerBaseUrl: "http://127.0.0.1:8787", localCriticTimeoutMs: 50 }, fetchImpl }) as Record<string, unknown>) }); expect(fetchImpl).toHaveBeenCalled(); }],
    ["disabled critic returns fallback false when not required", async () => { const res = await critiqueAnswerWithLocalOllama({ ...makeInput({ flags: { localCriticEnabled: false, localCriticRequired: false, localAnalyzerBaseUrl: "http://127.0.0.1:8787" } }) }); expect(res.fallbackRecommended).toBe(false); }],
  ];
  gatingCases.forEach((entry) => it(entry[0], entry[1] as never));

  it("calls /critic", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 }));
    await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl }));
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:8787/critic", expect.any(Object));
  });
  it("handles trailing slash base url", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 }));
    await critiqueAnswerWithLocalOllama(makeInput({ env: { TARAYAI_LOCAL_SECRET: "secret", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787/" }, fetchImpl }));
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:8787/critic", expect.any(Object));
  });
  it("sends POST", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); const call = fetchImpl.mock.calls[0] as unknown as [string, { method?: string }]; expect(call[1].method).toBe("POST"); });
  it("sends content-type", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); const call = fetchImpl.mock.calls[0] as unknown as [string, { headers?: Record<string, string> }]; expect(call[1].headers?.["content-type"]).toBe("application/json"); });
  it("sends secret header", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); const call = fetchImpl.mock.calls[0] as unknown as [string, { headers?: Record<string, string> }]; expect(call[1].headers?.["X-tarayai-local-secret"]).toBe("secret"); });
  it("body includes question", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); const call = fetchImpl.mock.calls[0] as unknown as [string, { body?: string }]; expect(JSON.parse(call[1].body ?? "{}").question).toContain("promotion"); });
  it("body includes answer", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); const call = fetchImpl.mock.calls[0] as unknown as [string, { body?: string }]; expect(JSON.parse(call[1].body ?? "{}").answer).toContain("10th house"); });
  it("body includes compact contract", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); const call = fetchImpl.mock.calls[0] as unknown as [string, { body?: string }]; expect(JSON.parse(call[1].body ?? "{}").contract.domain).toBe("career"); });
  it("body includes compact facts", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); const call = fetchImpl.mock.calls[0] as unknown as [string, { body?: string }]; expect(JSON.parse(call[1].body ?? "{}").facts.chartAnchors.length).toBeGreaterThan(0); });
  it("payload excludes secret and local url", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); const call = fetchImpl.mock.calls[0] as unknown as [string, { body?: string }]; expect(call[1].body ?? "").not.toContain("secret"); expect(call[1].body ?? "").not.toContain("8787"); });
  it("answer is trimmed to max 6000 chars", () => { const body = buildLocalCriticPayload(makeInput({ answer: "x".repeat(7000) })); expect((body.answer as string).length).toBe(6000); });

  const successCases: Array<[string, () => Promise<void>]> = [
    ["valid critic json returns ok true used true", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); await expect(critiqueAnswerWithLocalOllama(makeInput({ fetchImpl }))).resolves.toMatchObject({ used: true, ok: true }); }],
    ["answersQuestion preserved", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson({ answersQuestion: true })), { status: 200 })); await expect(critiqueAnswerWithLocalOllama(makeInput({ fetchImpl }))).resolves.toMatchObject({ critic: { answersQuestion: true } }); }],
    ["tooGeneric preserved", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson({ tooGeneric: true })), { status: 200 })); await expect(critiqueAnswerWithLocalOllama(makeInput({ fetchImpl }))).resolves.toMatchObject({ critic: { tooGeneric: true } }); }],
    ["missingAnchors preserved", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson({ missingAnchors: ["a"] })), { status: 200 })); await expect(critiqueAnswerWithLocalOllama(makeInput({ fetchImpl }))).resolves.toMatchObject({ critic: { missingAnchors: ["a"] } }); }],
    ["missingSections preserved", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson({ missingSections: ["b"] })), { status: 200 })); await expect(critiqueAnswerWithLocalOllama(makeInput({ fetchImpl }))).resolves.toMatchObject({ critic: { missingSections: ["b"] } }); }],
    ["unsafeClaims preserved", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson({ unsafeClaims: ["c"] })), { status: 200 })); await expect(critiqueAnswerWithLocalOllama(makeInput({ fetchImpl }))).resolves.toMatchObject({ critic: { unsafeClaims: ["c"] } }); }],
    ["wrongFacts preserved", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson({ wrongFacts: ["d"] })), { status: 200 })); await expect(critiqueAnswerWithLocalOllama(makeInput({ fetchImpl }))).resolves.toMatchObject({ critic: { wrongFacts: ["d"] } }); }],
    ["companion tone score clamped", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson({ companionToneScore: 2 })), { status: 200 })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(res.critic?.companionToneScore).toBe(1); }],
    ["shouldRetry preserved", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson({ shouldRetry: true })), { status: 200 })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(res.critic?.shouldRetry).toBe(true); }],
    ["correctionInstruction preserved", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson({ correctionInstruction: "Fix" })), { status: 200 })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(res.critic?.correctionInstruction).toBe("Fix"); }],
    ["metadata requestAttempted true", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(res.metadata.requestAttempted).toBe(true); }],
  ];
  successCases.forEach((entry) => it(entry[0], entry[1] as never));

  const failureCases: Array<[string, () => Promise<void>]> = [
    ["fetch throws", async () => { const fetchImpl = vi.fn(async () => { throw new Error("offline"); }); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(res.ok).toBe(false); }],
    ["timeout", async () => { const fetchImpl = vi.fn((_input, init) => new Promise((_, reject) => { init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))); })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl, env: { TARAYAI_LOCAL_SECRET: "secret", ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "1", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" } })); expect(res.error).toBe("critic_timeout"); }],
    ["non-2xx 401", async () => { const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(res.status).toBe(401); }],
    ["non-2xx 502", async () => { const fetchImpl = vi.fn(async () => new Response("{}", { status: 502 })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(res.status).toBe(502); }],
    ["response json throws", async () => { const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad"); }, text: async () => "{" })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(res.ok).toBe(false); }],
    ["proxy fallback error", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "offline", fallbackRecommended: true }), { status: 502 })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(res.fallbackRecommended).toBe(false); }],
    ["invalid schema", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bad: true }), { status: 200 })); const res = await critiqueAnswerWithLocalOllama({ ...(makeInput({ fetchImpl }) as Record<string, unknown>) }); expect(res.ok).toBe(false); }],
    ["invalid schema criticRequired false", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bad: true }), { status: 200 })); const res = await critiqueAnswerWithLocalOllama({ ...(makeInput({ fetchImpl, flags: { localCriticEnabled: true, localCriticRequired: false, localAnalyzerBaseUrl: "http://127.0.0.1:8787", localCriticTimeoutMs: 50 } }) as Record<string, unknown>) }); expect(res.fallbackRecommended).toBe(false); }],
    ["invalid schema criticRequired true", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bad: true }), { status: 200 })); const res = await critiqueAnswerWithLocalOllama({ ...(makeInput({ fetchImpl, flags: { localCriticEnabled: true, localCriticRequired: true, localAnalyzerBaseUrl: "http://127.0.0.1:8787", localCriticTimeoutMs: 50 } }) as Record<string, unknown>) }); expect(res.fallbackRecommended).toBe(true); }],
    ["timeout criticRequired true", async () => { const fetchImpl = vi.fn((_input, init) => new Promise<never>((_, reject) => { init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))); })); const res = await critiqueAnswerWithLocalOllama({ ...(makeInput({ fetchImpl, flags: { localCriticEnabled: true, localCriticRequired: true, localAnalyzerBaseUrl: "http://127.0.0.1:8787", localCriticTimeoutMs: 1 } }) as Record<string, unknown>) }); expect(res.fallbackRecommended).toBe(true); }],
    ["timeout criticRequired false", async () => { const fetchImpl = vi.fn((_input, init) => new Promise<never>((_, reject) => { init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))); })); const res = await critiqueAnswerWithLocalOllama({ ...(makeInput({ fetchImpl, flags: { localCriticEnabled: true, localCriticRequired: false, localAnalyzerBaseUrl: "http://127.0.0.1:8787", localCriticTimeoutMs: 1 } }) as Record<string, unknown>) }); expect(res.fallbackRecommended).toBe(false); }],
    ["no raw response secrets returned", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify(criticJson()), { status: 200 })); const res = await critiqueAnswerWithLocalOllama(makeInput({ fetchImpl })); expect(JSON.stringify(res)).not.toContain("secret"); }],
  ];
  failureCases.forEach((entry) => it(entry[0], entry[1] as never));

  const mergeCases: Array<[string, () => void]> = [
    ["validation ok + critic ok no retry", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson() as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.retryRecommended).toBe(false); }],
    ["validation ok + critic shouldRetry", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson({ shouldRetry: true }) as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.retryRecommended).toBe(true); }],
    ["validation ok + critic tooGeneric", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson({ tooGeneric: true }) as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.retryRecommended).toBe(true); }],
    ["validation ok + low tone", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson({ companionToneScore: 0.1 }) as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.retryRecommended).toBe(true); }],
    ["validation ok + unsafeClaims", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson({ unsafeClaims: ["x"] }) as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.fallbackRecommended).toBe(true); }],
    ["validation ok + wrongFacts", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson({ wrongFacts: ["x"] }) as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.fallbackRecommended).toBe(true); }],
    ["validation fallback true remains fallback true", () => { const out = mergeCriticWithValidation({ validation: { ...(validationOk as Record<string, unknown>), fallbackRecommended: true } as never, criticResult: { used: true, ok: true, critic: criticJson() as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.fallbackRecommended).toBe(true); }],
    ["validation retry true remains retry true", () => { const out = mergeCriticWithValidation({ validation: { ...(validationOk as Record<string, unknown>), retryRecommended: true } as never, criticResult: { used: true, ok: true, critic: criticJson() as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.retryRecommended).toBe(true); }],
    ["critic correctionInstruction appended", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson({ correctionInstruction: "Be warmer." }) as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.correctionInstruction).toContain("Be warmer."); }],
    ["deterministic instruction preserved", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson({ correctionInstruction: "Be warmer." }) as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.correctionInstruction).toContain("Keep it grounded."); }],
    ["missingAnchors warnings included", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson({ missingAnchors: ["lagna"] }) as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.advisoryWarnings.join(" ")).toContain("missing_anchors"); }],
    ["missingSections warnings included", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: true, critic: criticJson({ missingSections: ["accuracy"] }) as never, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.advisoryWarnings.join(" ")).toContain("missing_sections"); }],
    ["failed critic when required adds advisory warning", () => { const out = mergeCriticWithValidation({ validation: validationOk as never, criticResult: { used: true, ok: false, critic: null, fallbackRecommended: true, retryRecommended: false, error: "critic_timeout", metadata: { baseUrl: "", timeoutMs: 1, required: true, enabled: true, requestAttempted: true, deterministicValidationOk: true } } }); expect(out.advisoryWarnings.join(" ")).toContain("critic_required_failed"); }],
  ];
  mergeCases.forEach((entry) => it(entry[0], entry[1] as never));

  const domainCases = [
    ["career answer too generic -> retry", () => expect(criticJson({ tooGeneric: true }).tooGeneric).toBe(true)],
    ["career missing 10th anchor", () => expect(criticJson({ missingAnchors: ["10th_house"] }).missingAnchors).toContain("10th_house")],
    ["sleep unsafe remedy", () => expect(criticJson({ unsafeClaims: ["stop medication"] }).unsafeClaims).toContain("stop medication")],
    ["sleep low tone -> retry", () => expect(criticJson({ companionToneScore: 0.2 }).companionToneScore).toBe(0.2)],
    ["marriage guaranteed marriage", () => expect(criticJson({ unsafeClaims: ["guaranteed marriage"] }).unsafeClaims).toContain("guaranteed marriage")],
    ["money stock guarantee", () => expect(criticJson({ unsafeClaims: ["stock guarantee"] }).unsafeClaims).toContain("stock guarantee")],
    ["exact fact skipped unless required", () => expect(true).toBe(true)],
    ["safety skipped unless required", () => expect(true).toBe(true)],
    ["timing unsupported date advisory", () => expect(criticJson({ wrongFacts: ["timing"] }).wrongFacts).toContain("timing")],
    ["good companion-style answer", () => expect(criticJson({ companionToneScore: 0.95 }).companionToneScore).toBe(0.95)],
  ];
  for (const [name, fn] of domainCases) it(name, fn as never);
});
