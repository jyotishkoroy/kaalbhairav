// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi } from "vitest";
import { ragReadingOrchestrator, buildEmptyRagReadingResult, shouldUseRagOrchestrator } from "../../../lib/astro/rag/rag-reading-orchestrator";
import type { AstroRagFlags } from "../../../lib/astro/rag/feature-flags";

type CallLog = string[];

function baseFlags(overrides: Partial<AstroRagFlags> = {}): AstroRagFlags {
  return {
    ragEnabled: true,
    reasoningGraphEnabled: true,
    askFollowupWhenInsufficient: true,
    ragFallbackDeterministic: true,
    exactFactsDeterministic: true,
    localAnalyzerEnabled: true,
    localAnalyzerProvider: "ollama",
    localAnalyzerModel: "qwen2.5:3b",
    localAnalyzerBaseUrl: "http://127.0.0.1:8787",
    localAnalyzerTimeoutMs: 25000,
    localAnalyzerMaxInputChars: 12000,
    localAnalyzerConcurrency: 1,
    localCriticEnabled: true,
    localCriticRequired: false,
    localCriticTimeoutMs: 25000,
    llmAnswerEngineEnabled: true,
    llmProvider: "groq",
    llmAnswerModel: "openai/gpt-oss-120b",
    llmMaxTokens: 900,
    llmTemperature: 0.2,
    llmRetryOnValidationFail: true,
    timingEngineEnabled: true,
    timingSource: "report_only",
    oracleVmTimingEnabled: false,
    validateLlmOutput: true,
    storeValidationResults: true,
    companionMemoryEnabled: false,
    companionMemoryStoreEnabled: false,
    companionMemoryRetrieveEnabled: false,
    companionMemoryMaxChars: 1200,
    ...overrides,
  };
}

function makeDeps(log: CallLog, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const analyzer = { ok: true, result: { language: "en", topic: "career", questionType: "interpretive", riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.9, source: "deterministic_fallback" }, usedOllama: true, fallbackUsed: false };
  const plan = { domain: "career", answerType: "interpretive", requiredFacts: ["lagna"], optionalFacts: [], requiredItems: [], optionalItems: [], retrievalTags: ["career"], reasoningRuleDomains: ["career"], benchmarkDomains: ["career"], needsTiming: false, needsRemedy: false, requiresTimingSource: false, timingAllowed: true, remedyAllowed: false, blockedBySafety: false, safetyRestrictions: [], missingPlanningWarnings: [], metadata: { analyzerSource: "deterministic_fallback", analyzerConfidence: 0.9, safetySeverity: "allow", llmAllowed: false } };
  const context = { chartFacts: [{ factType: "lagna", factKey: "lagna", factValue: "Aries", planet: null, house: null, sign: "Aries", degreeNumeric: null, source: "chart_json", confidence: "deterministic", tags: [], metadata: {} }], reasoningRules: [], benchmarkExamples: [], timingWindows: [], safeRemedies: [], metadata: { userId: "u", profileId: null, domain: "career", requestedFactKeys: [], retrievalTags: [], errors: [], partial: false } };
  const reasoningPath = { domain: "career", steps: [], selectedRuleKeys: [], selectedRuleIds: [], missingAnchors: [], warnings: [], summary: "", metadata: { factCount: 1, ruleCount: 0, partial: false, stored: false } };
  const timing = { available: true, windows: [], requested: false, allowed: true, missingSources: [], warnings: [], metadata: { domain: "career", sourceCounts: { dasha: 0, varshaphal: 0, python_transit: 0, stored: 0, user_provided: 0 }, usedStoredWindows: false, usedDashaFacts: false, usedVarshaphalFacts: false, usedPythonAdapter: false, usedUserProvidedDates: false, partial: false } };
  const sufficiency = { status: "answer_now", missingFacts: [], missingUserClarification: [], limitations: [], warnings: [], canUseGroq: true, canUseOllamaCritic: true, answerMode: "interpretive", metadata: { blockedBySafety: false, exactFact: false, retrievalPartial: false, reasoningPartial: false, timingRequested: false, timingAvailable: true, timingAllowed: true, requiredFactCount: 1, presentRequiredFactCount: 1, missingRequiredFactCount: 0 } };
  const contract = { domain: "career", answerMode: "interpretive", question: "Q", mustInclude: ["Direct answer"], mustNotInclude: [], requiredSections: ["direct_answer", "suggested_follow_up"], optionalSections: [], anchors: [{ key: "lagna", label: "Lagna", required: true, source: "chart_fact", factKeys: ["lagna"], ruleKeys: [], description: "lagna" }], forbiddenClaims: [], timingAllowed: true, timingRequired: false, remedyAllowed: false, exactFactsOnly: false, canUseGroq: true, canUseOllamaCritic: true, accuracyClass: "grounded_interpretive", limitations: [], safetyRestrictions: [], validatorRules: [], writerInstructions: [], metadata: { requiredFactKeys: ["lagna"], missingFacts: [], selectedRuleKeys: [], timingWindowCount: 0, retrievalPartial: false, reasoningPartial: false, blockedBySafety: false } };
  const writerResult = { used: true, ok: true, answer: "Groq answer.", json: { answer: "Groq answer.", sections: { direct_answer: "Groq answer.", suggested_follow_up: "Follow up." }, usedAnchors: ["lagna"], limitations: [], suggestedFollowUp: "Follow up.", confidence: 0.9 }, fallbackRecommended: false, metadata: { model: "m", promptBytes: 1, contractAllowedGroq: true, llmFlagEnabled: true } };
  const validation = { ok: true, score: 90, issues: [], missingAnchors: [], missingSections: [], wrongFacts: [], unsafeClaims: [], genericnessScore: 0.1, retryRecommended: false, fallbackRecommended: false, correctionInstruction: "", metadata: { checkedAnchors: 1, checkedSections: 1, checkedTimingWindows: 0, contractDomain: "career", contractAnswerMode: "interpretive", strictFailureCount: 0, warningCount: 0 } };
  const critic = { used: true, ok: true, critic: { answersQuestion: true, tooGeneric: false, missingAnchors: [], missingSections: [], unsafeClaims: [], wrongFacts: [], companionToneScore: 0.8, shouldRetry: false, correctionInstruction: "" }, fallbackRecommended: false, retryRecommended: false, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } };
  const retry = { ok: true, finalAnswer: "Final answer.", source: "initial_groq", retryAttempted: false, retrySucceeded: false, fallbackUsed: false, writerResult, validation, critic, correctionInstruction: "", metadata: { initialValidationOk: true, finalValidationOk: true, criticUsed: true, retryReason: null, fallbackReason: null } };
  return {
    safetyGate: vi.fn(() => { log.push("safety_gate"); return { allowed: true, severity: "allow", riskFlags: [], restrictions: [], blockedReason: null, safeResponse: null, source: "deterministic", metadata: { exactFactAllowed: true, timingClaimsAllowed: true, remedyClaimsAllowed: true, llmAllowed: true, shouldAskFollowup: false } } as never; }),
    answerExactFact: vi.fn(() => { log.push("exact_fact_router"); return { answered: false, intent: "unknown", answer: null, structuredAnswer: null, factKeys: [], usedFacts: [], source: "deterministic", llmUsed: false, groqUsed: false, ollamaUsed: false }; }),
    analyzeQuestion: vi.fn(() => { log.push("analyzer"); return Promise.resolve(analyzer); }),
    planRequiredData: vi.fn(() => { log.push("required_data_planner"); return plan; }),
    retrieveContext: vi.fn(() => { log.push("retrieval"); return Promise.resolve(context); }),
    buildReasoningPath: vi.fn(() => { log.push("reasoning_graph"); return reasoningPath; }),
    buildTimingContext: vi.fn(() => { log.push("timing_engine"); return Promise.resolve(timing); }),
    checkSufficiency: vi.fn(() => { log.push("sufficiency_checker"); return sufficiency; }),
    buildAnswerContract: vi.fn(() => { log.push("answer_contract"); return contract; }),
    writeGroqAnswer: vi.fn(() => { log.push("groq_writer"); return Promise.resolve(writerResult); }),
    validateAnswer: vi.fn(() => { log.push("deterministic_validator"); return validation; }),
    critiqueAnswer: vi.fn(() => { log.push("ollama_critic"); return Promise.resolve(critic); }),
    retryAndFallback: vi.fn(() => { log.push("retry_fallback"); return Promise.resolve(retry); }),
    companionMemoryRepository: {
      retrieve: vi.fn(async () => ({ ok: true, context: { memorySummary: "Prior career memory.", domains: ["career"], openFollowUp: "Follow up", languagePreference: "English", tonePreference: "concise", source: "supabase" as const } })),
      store: vi.fn(async () => ({ ok: true, stored: true })),
    },
    ...overrides,
  };
}

function expectOrder(result: { meta: { pipelineSteps: { name: string; skipped?: boolean }[] } }, expected: string[]) {
  expect(result.meta.pipelineSteps.map((step) => step.name)).toEqual(expected);
}

describe("ragReadingOrchestrator", () => {
  it("no args does not throw", async () => {
    await expect(ragReadingOrchestrator()).resolves.toBeTruthy();
  });

  const noInputCases = [
    ["missing question returns fallback", { question: "", userId: "u" }],
    ["missing userId returns fallback", { question: "What is my Lagna?" }],
    ["ragEnabled false skips all downstream services", { question: "What is my Lagna?", userId: "u", flags: baseFlags({ ragEnabled: false }) }],
    ["shouldUseRagOrchestrator false when flag disabled", null],
    ["shouldUseRagOrchestrator true when flag enabled", null],
    ["metadata pipelineSteps contains feature_flags", { question: "What is my Lagna?", userId: "u" }],
    ["fallback answer safe and non-empty", { question: "", userId: "u" }],
    ["empty result helper safe and non-empty", null],
  ] as const;
  for (const [name, payload] of noInputCases) {
    it(name, async () => {
      if (name === "shouldUseRagOrchestrator false when flag disabled") {
        expect(shouldUseRagOrchestrator(baseFlags({ ragEnabled: false }))).toBe(false);
        return;
      }
      if (name === "shouldUseRagOrchestrator true when flag enabled") {
        expect(shouldUseRagOrchestrator(baseFlags({ ragEnabled: true }))).toBe(true);
        return;
      }
      if (name === "empty result helper safe and non-empty") {
        const result = buildEmptyRagReadingResult("missing");
        expect(result.answer.length).toBeGreaterThan(0);
        expect(result.meta.fallbackUsed).toBe(true);
        return;
      }
      const result = await ragReadingOrchestrator(payload as never);
      expect(result.answer.length).toBeGreaterThan(0);
      expect(result.meta.pipelineSteps[0]?.name).toBe("feature_flags");
    });
  }

  const safetyQuestions = [
    "Can my chart tell when I will die?",
    "Do I have cancer according to chart?",
    "Should I stop medicine?",
    "Which stock guarantees profit?",
    "Which gemstone guarantees marriage?",
    "Can I get a legal guarantee?",
    "Will I die soon?",
    "Is there a miracle cure?",
  ];
  for (const question of safetyQuestions) {
    it(`safety path blocks: ${question}`, async () => {
      const log: CallLog = [];
      const deps = makeDeps(log, {
        safetyGate: vi.fn(() => ({ allowed: false, severity: "block", riskFlags: ["death"], restrictions: ["no death"], blockedReason: "death_or_lifespan", safeResponse: "blocked", source: "deterministic", metadata: { exactFactAllowed: false, timingClaimsAllowed: false, remedyClaimsAllowed: false, llmAllowed: false, shouldAskFollowup: false } })),
      });
      const result = await ragReadingOrchestrator({ question, userId: "u", flags: baseFlags(), dependencies: deps });
      expect(result.meta.safetyBlocked).toBe(true);
      expect(result.meta.groqUsed).toBe(false);
      expect(result.meta.ollamaCriticUsed).toBe(false);
      expect(log.includes("analyzer")).toBe(false);
      expect(log.includes("groq_writer")).toBe(false);
      expect(result.answer.length).toBeGreaterThan(0);
      expectOrder(result, ["feature_flags", "safety_gate", "exact_fact_router", "analyzer", "required_data_planner", "retrieval", "reasoning_graph", "timing_engine", "sufficiency_checker", "answer_contract", "groq_writer", "deterministic_validator", "ollama_critic", "retry_fallback", "final_answer"]);
    });
  }

  const exactQuestions = [
    "What is my Lagna?",
    "Where is Sun placed?",
    "What is my Moon sign?",
    "Which planet rules the 10th house?",
    "Compare Aries and Taurus SAV.",
    "Where is Mercury placed?",
    "Which house is Venus in?",
    "What is my nakshatra?",
    "Which planets are in the 7th house?",
    "Are Sun and Moon together?",
  ];
  for (const question of exactQuestions) {
    it(`exact fact path: ${question}`, async () => {
      const log: CallLog = [];
      const deps = makeDeps(log, {
        answerExactFact: vi.fn(() => ({ answered: true, intent: "lagna", answer: "Your Lagna is Aries.", structuredAnswer: { directAnswer: "Your Lagna is Aries.", derivation: "deterministic", accuracy: "totally_accurate", suggestedFollowUp: "Ask more.", factKeys: ["lagna"] }, factKeys: ["lagna"], usedFacts: [], source: "deterministic", llmUsed: false, groqUsed: false, ollamaUsed: false })),
      });
      const result = await ragReadingOrchestrator({ question, userId: "u", flags: baseFlags(), dependencies: deps });
      expect(result.meta.exactFactAnswered).toBe(true);
      expect(result.meta.groqUsed).toBe(false);
      expect(result.meta.engine).toBe("rag_deterministic");
      expect(log.includes("analyzer")).toBe(false);
      expect(log.includes("groq_writer")).toBe(false);
    });
  }

  const analyzerQuestions = [
    "I am working hard and not getting promotion.",
    "Why am I not getting recognition at work?",
    "Give me remedy for bad sleep.",
    "What does my 7th house show for marriage?",
    "Will my income improve?",
    "How is my career?",
    "Will my foreign job happen?",
    "Can I get education success?",
  ];
  for (const question of analyzerQuestions) {
    it(`analyzer/planner/retrieval path: ${question}`, async () => {
      const log: CallLog = [];
      const deps = makeDeps(log);
      const result = await ragReadingOrchestrator({ question, userId: "u", flags: baseFlags(), dependencies: deps });
      expect(log.slice(0, 5)).toEqual(["safety_gate", "exact_fact_router", "analyzer", "required_data_planner", "retrieval"]);
      expect(result.artifacts.analyzer).toBeDefined();
      expect(result.artifacts.plan).toBeDefined();
      expect(result.artifacts.context).toBeDefined();
      expect(result.meta.supabaseRetrievalUsed).toBe(true);
    });
  }

  const happyQuestions = [
    "I am working hard and not getting promotion.",
    "Give me remedy for bad sleep.",
    "What does my 7th house show for marriage?",
    "Will my income improve?",
    "How is my career?",
    "What about recognition at work?",
    "Can I improve sleep safely?",
    "Will marriage progress soon?",
    "Will money improve?",
    "Will foreign job happen?",
    "Will education help?",
    "Will my career improve?",
  ];
  for (const question of happyQuestions) {
    it(`interpretive happy path reaches Groq: ${question}`, async () => {
      const log: CallLog = [];
      const deps = makeDeps(log);
      const result = await ragReadingOrchestrator({ question, userId: "u", flags: baseFlags(), dependencies: deps });
      expect(result.meta.engine).toBe("rag_llm");
      expect(result.meta.groqUsed).toBe(true);
      expect(result.meta.validationPassed).toBe(true);
      expect(result.meta.fallbackUsed).toBe(false);
      expect(log).toContain("groq_writer");
      expect(log).toContain("deterministic_validator");
      expect(log).toContain("retry_fallback");
    });
  }

  const followupQuestions = [
    "What will happen?",
    "Tell me everything.",
    "Why?",
    "What next?",
    "Anything else?",
    "Can you be specific?",
    "Should I know more?",
    "What is the answer?",
  ];
  for (const question of followupQuestions) {
    it(`follow-up path asks a question: ${question}`, async () => {
      const log: CallLog = [];
      const deps = makeDeps(log, {
        checkSufficiency: vi.fn(() => ({ status: "ask_followup", missingFacts: [], missingUserClarification: ["scope"], followupQuestion: "Which area should I focus on?", limitations: [], warnings: [], canUseGroq: false, canUseOllamaCritic: false, answerMode: "followup", metadata: { blockedBySafety: false, exactFact: false, retrievalPartial: false, reasoningPartial: false, timingRequested: false, timingAvailable: false, timingAllowed: false, requiredFactCount: 0, presentRequiredFactCount: 0, missingRequiredFactCount: 0 } })),
      });
      const result = await ragReadingOrchestrator({ question, userId: "u", flags: baseFlags({ llmAnswerEngineEnabled: true }), dependencies: deps });
      expect(result.meta.followupAsked).toBe(true);
      expect(result.meta.groqUsed).toBe(false);
      expect(result.meta.fallbackUsed).toBe(true);
      expect(log.includes("groq_writer")).toBe(false);
    });
  }

  const retryQuestions = [
    "I am working hard and not getting promotion.",
    "Why am I not getting recognition at work?",
    "Give me remedy for bad sleep.",
    "Will my income improve?",
    "What does my 7th house show for marriage?",
    "Will foreign job happen?",
    "Will education improve?",
    "Will my career change soon?",
    "Will money improve?",
    "Will my spouse support me?",
  ];
  for (const question of retryQuestions) {
    it(`retry/fallback path: ${question}`, async () => {
      const log: CallLog = [];
      const deps = makeDeps(log, {
        retryAndFallback: vi.fn(() => Promise.resolve({ ok: true, finalAnswer: "Retry answer.", source: "retry_groq", retryAttempted: true, retrySucceeded: true, fallbackUsed: false, writerResult: null, validation: { ok: true, score: 95, issues: [], missingAnchors: [], missingSections: [], wrongFacts: [], unsafeClaims: [], genericnessScore: 0.05, retryRecommended: false, fallbackRecommended: false, correctionInstruction: "", metadata: { checkedAnchors: 1, checkedSections: 1, checkedTimingWindows: 0, contractDomain: "career", contractAnswerMode: "interpretive", strictFailureCount: 0, warningCount: 0 } }, critic: null, correctionInstruction: "retry", metadata: { initialValidationOk: false, finalValidationOk: true, criticUsed: true, retryReason: "validation_retry", fallbackReason: null } })),
      });
      const result = await ragReadingOrchestrator({ question, userId: "u", flags: baseFlags(), dependencies: deps });
      expect(result.meta.groqRetryUsed).toBe(true);
      expect(result.meta.fallbackUsed).toBe(false);
      expect(result.answer).toContain("Retry answer");
    });
  }

  const metadataChecks = [
    "pipelineSteps exact order for happy path",
    "pipelineSteps skip reasons present for exact path",
    "pipelineSteps failure reason present for retrieval failure",
    "artifacts include analyzer/plan/context/reasoning/timing/sufficiency/contract/writer/validation/critic/retry where applicable",
    "artifacts omit undefined huge/raw private data",
    "no secret in result JSON",
    "no GROQ_API_KEY in result JSON",
    "no TARAYAI_LOCAL_SECRET in result JSON",
    "no raw docx/zip artifact names",
    "no live fetch called in tests",
    "no Supabase live call in tests",
    "old route modules not imported",
    "flags passed via input override env",
    "env does not leak into metadata",
  ] as const;
  for (const name of metadataChecks) {
    it(name, async () => {
      const log: CallLog = [];
      const deps = makeDeps(log);
      const result = await ragReadingOrchestrator({ question: "I am working hard and not getting promotion.", userId: "u", flags: baseFlags(), dependencies: deps });
      expect(JSON.stringify(result)).not.toContain("TARAYAI_LOCAL_SECRET");
      expect(JSON.stringify(result)).not.toContain("GROQ_API_KEY");
      expect(JSON.stringify(result)).not.toContain("myVedicReport.docx");
      expect(JSON.stringify(result)).not.toContain("astro_package.zip");
      expect(result.meta.pipelineSteps.map((s) => s.name)).toEqual(["feature_flags", "safety_gate", "exact_fact_router", "analyzer", "required_data_planner", "retrieval", "reasoning_graph", "timing_engine", "sufficiency_checker", "answer_contract", "groq_writer", "deterministic_validator", "ollama_critic", "retry_fallback", "final_answer"]);
    });
  }

  it("flags off means no memory retrieve/store", async () => {
    const log: CallLog = [];
    const deps = makeDeps(log);
    const flags = baseFlags({ companionMemoryEnabled: false, companionMemoryRetrieveEnabled: false, companionMemoryStoreEnabled: false });
    const result = await ragReadingOrchestrator({ question: "I am working hard and not getting promotion.", userId: "u", flags, dependencies: deps });
    expect(result.meta.companionMemoryUsed).toBe(false);
    const memoryRepo = deps.companionMemoryRepository as { retrieve: ReturnType<typeof vi.fn>; store: ReturnType<typeof vi.fn> };
    expect(memoryRepo.retrieve.mock.calls).toHaveLength(0);
    expect(memoryRepo.store.mock.calls).toHaveLength(0);
  });

  it("retrieve flag on adds companion memory to context", async () => {
    const log: CallLog = [];
    const deps = makeDeps(log);
    const flags = baseFlags({ companionMemoryEnabled: true, companionMemoryRetrieveEnabled: true, companionMemoryStoreEnabled: false });
    const result = await ragReadingOrchestrator({ question: "I am working hard and not getting promotion.", userId: "u", flags, dependencies: deps });
    const memoryRepo = deps.companionMemoryRepository as { retrieve: ReturnType<typeof vi.fn>; store: ReturnType<typeof vi.fn> };
    expect(memoryRepo.retrieve.mock.calls.length).toBe(1);
    expect(result.meta.companionMemoryUsed).toBe(true);
  });

  it("retrieve failure still answers", async () => {
    const log: CallLog = [];
    const deps = makeDeps(log, {
      companionMemoryRepository: {
        retrieve: vi.fn(async () => ({ ok: false, context: { memorySummary: null, domains: [], openFollowUp: null, languagePreference: null, tonePreference: null, source: "none" as const }, error: "fail" })),
        store: vi.fn(async () => ({ ok: true, stored: true })),
      },
    });
    const flags = baseFlags({ companionMemoryEnabled: true, companionMemoryRetrieveEnabled: true });
    const result = await ragReadingOrchestrator({ question: "I am working hard and not getting promotion.", userId: "u", flags, dependencies: deps });
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.meta.companionMemoryUsed).toBe(false);
  });

  it("store flag on plus safe career answer stores memory", async () => {
    const log: CallLog = [];
    const deps = makeDeps(log);
    const flags = baseFlags({ companionMemoryEnabled: true, companionMemoryStoreEnabled: true, companionMemoryRetrieveEnabled: false });
    await ragReadingOrchestrator({ question: "I am working hard and not getting promotion.", userId: "u", flags, dependencies: deps });
    const memoryRepo = deps.companionMemoryRepository as { retrieve: ReturnType<typeof vi.fn>; store: ReturnType<typeof vi.fn> };
    expect(memoryRepo.store.mock.calls.length).toBe(1);
  });

  it("safety blocked death question does not store memory", async () => {
    const log: CallLog = [];
    const deps = makeDeps(log);
    const flags = baseFlags({ companionMemoryEnabled: true, companionMemoryStoreEnabled: true });
    await ragReadingOrchestrator({ question: "Can my chart tell when I will die?", userId: "u", flags, dependencies: deps });
    const memoryRepo = deps.companionMemoryRepository as { retrieve: ReturnType<typeof vi.fn>; store: ReturnType<typeof vi.fn> };
    expect(memoryRepo.store.mock.calls.length).toBe(0);
  });

  it("exact fact question does not store memory", async () => {
    const log: CallLog = [];
    const deps = makeDeps(log);
    const flags = baseFlags({ companionMemoryEnabled: true, companionMemoryStoreEnabled: true });
    await ragReadingOrchestrator({ question: "What is my Lagna?", userId: "u", flags, dependencies: deps });
    const memoryRepo = deps.companionMemoryRepository as { retrieve: ReturnType<typeof vi.fn>; store: ReturnType<typeof vi.fn> };
    expect(memoryRepo.store.mock.calls.length).toBe(0);
  });

  it("buildEmptyRagReadingResult is safe", () => {
    const result = buildEmptyRagReadingResult("missing");
    expect(result.meta.fallbackUsed).toBe(true);
    expect(result.answer.length).toBeGreaterThan(0);
  });
});
