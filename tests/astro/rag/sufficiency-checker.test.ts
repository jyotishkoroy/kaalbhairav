import { describe, expect, it } from "vitest";
import { buildDeterministicAnalyzerResult } from "../../../lib/astro/rag/analyzer-schema";
import { checkSufficiency, buildDefaultFollowupQuestion, collectPresentFactKeys, getMissingRequiredFacts, isTimingOnlyQuestion, normalizeFactRequirement } from "../../../lib/astro/rag/sufficiency-checker";
import type { AnalyzerResult } from "../../../lib/astro/rag/analyzer-schema";
import type { RequiredDataPlan } from "../../../lib/astro/rag/required-data-planner";
import type { ReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
import type { ChartFact } from "../../../lib/astro/rag/chart-fact-extractor";
import type { RetrievalContext, SafeRemedy } from "../../../lib/astro/rag/retrieval-types";
import type { RagSafetyGateResult, RagSafetyRiskFlag } from "../../../lib/astro/rag/safety-gate";
import type { TimingContext } from "../../../lib/astro/rag/timing-engine";

function analyzer(partial: Partial<AnalyzerResult> = {}): AnalyzerResult {
  return {
    language: "en",
    topic: "general",
    questionType: "general",
    riskFlags: [],
    needsTiming: false,
    needsRemedy: false,
    requiredFacts: [],
    retrievalTags: [],
    shouldAskFollowup: false,
    followupQuestion: null,
    confidence: 0.5,
    source: "deterministic_fallback",
    ...partial,
  };
}

function safetyAllowed(): RagSafetyGateResult {
  return {
    allowed: true,
    severity: "allow",
    riskFlags: [],
    restrictions: [],
    blockedReason: null,
    safeResponse: null,
    source: "deterministic",
    metadata: {
      exactFactAllowed: true,
      timingClaimsAllowed: true,
      remedyClaimsAllowed: true,
      llmAllowed: false,
      shouldAskFollowup: false,
    },
  };
}

function safetyBlocked(flag: RagSafetyRiskFlag, blockedReason = "blocked", safeResponse: string | null = null): RagSafetyGateResult {
  const restrictionMap: Record<string, string> = {
    death: "Do not provide death-date, lifespan, or fatal accident predictions.",
    medical: "Do not diagnose medical conditions or advise stopping medication.",
    self_harm: "Do not provide self-harm guidance.",
    legal: "Do not provide legal advice or guaranteed legal outcomes.",
    financial_guarantee: "Do not provide financial guarantees or investment instructions.",
    gemstone_guarantee: "Do not claim gemstones guarantee outcomes.",
    expensive_puja_pressure: "Do not pressure the user into expensive puja or fear-based remedies.",
  };
  return {
    ...safetyAllowed(),
    allowed: false,
    riskFlags: [flag],
    restrictions: [restrictionMap[flag] ?? flag],
    blockedReason,
    safeResponse,
  };
}

function chartFact(key: string, type = "chart_fact", tags: string[] = [], extras: Partial<ChartFact> = {}): ChartFact {
  return {
    factType: type,
    factKey: key,
    factValue: key,
    planet: null,
    house: null,
    sign: null,
    degreeNumeric: null,
    source: "chart_json",
    confidence: "deterministic",
    tags,
    metadata: {},
    ...extras,
  };
}

function timingWindow(): TimingContext["windows"][number] {
  return { label: "window", startsOn: "2026-01-01", endsOn: "2026-06-30", domain: "career", interpretation: "i", source: "dasha", confidence: "strong", tags: ["timing"], factKeys: ["current_mahadasha"], metadata: {} };
}

function storedTimingWindow(): RetrievalContext["timingWindows"][number] {
  return { id: "t1", userId: "u", profileId: null, domain: "career", label: "window", startsOn: "2026-01-01", endsOn: "2026-06-30", interpretation: "i", source: "dasha", confidence: "strong", tags: ["timing"], metadata: {} };
}

function timing(partial: Partial<TimingContext> = {}): TimingContext {
  return {
    available: false,
    windows: [],
    requested: false,
    allowed: true,
    limitation: undefined,
    missingSources: [],
    warnings: [],
    metadata: {
      domain: "career",
      sourceCounts: { dasha: 0, varshaphal: 0, python_transit: 0, stored: 0, user_provided: 0 },
      usedStoredWindows: false,
      usedDashaFacts: false,
      usedVarshaphalFacts: false,
      usedPythonAdapter: false,
      usedUserProvidedDates: false,
      partial: false,
    },
    ...partial,
  };
}

function reasoningPath(partial: Partial<ReasoningPath> = {}): ReasoningPath {
  return {
    domain: "career",
    steps: [],
    selectedRuleKeys: [],
    selectedRuleIds: [],
    missingAnchors: [],
    warnings: [],
    summary: "ok",
    metadata: { factCount: 0, ruleCount: 0, partial: false, stored: false },
    ...partial,
  };
}

function plan(partial: Partial<RequiredDataPlan> = {}): RequiredDataPlan {
  return {
    domain: "career",
    answerType: "interpretive",
    requiredFacts: ["lagna", "house_10", "lord_10", "sun_placement", "house_11", "current_dasha"],
    optionalFacts: [],
    requiredItems: [],
    optionalItems: [],
    retrievalTags: ["career"],
    reasoningRuleDomains: ["career"],
    benchmarkDomains: ["career"],
    needsTiming: false,
    needsRemedy: false,
    requiresTimingSource: false,
    timingAllowed: true,
    remedyAllowed: true,
    blockedBySafety: false,
    safetyRestrictions: [],
    missingPlanningWarnings: [],
    metadata: { analyzerSource: "deterministic_fallback", analyzerConfidence: 1, safetySeverity: "allow", llmAllowed: false },
    ...partial,
  };
}

function context(partial: Partial<RetrievalContext> = {}): RetrievalContext {
  return {
    chartFacts: [
      chartFact("lagna", "lagna", ["lagna"]),
      chartFact("house_10", "house", ["house_10"], { house: 10 }),
      chartFact("lord_10", "house_lord", ["lord_10"], { planet: "Venus", house: 10 }),
      chartFact("sun_placement", "planet_placement", ["sun", "house_10"], { planet: "Sun", house: 10 }),
      chartFact("house_11", "house", ["house_11"], { house: 11 }),
      chartFact("current_mahadasha", "dasha", ["dasha"], { factValue: "Jupiter Mahadasha" }),
      chartFact("house_12", "house", ["house_12"], { house: 12 }),
      chartFact("moon_placement", "planet_placement", ["moon"], { planet: "Moon", house: 12 }),
      chartFact("house_6", "house", ["house_6"], { house: 6 }),
      chartFact("house_7", "house", ["house_7"], { house: 7 }),
      chartFact("lord_7", "house_lord", ["lord_7"], { planet: "Saturn", house: 7 }),
      chartFact("venus_placement", "planet_placement", ["venus"], { planet: "Venus", house: 7 }),
      chartFact("house_2", "house", ["house_2"], { house: 2 }),
      chartFact("lord_2", "house_lord", ["lord_2"], { planet: "Mercury", house: 2 }),
    ],
    reasoningRules: [],
    benchmarkExamples: [],
    timingWindows: [],
    safeRemedies: [],
    metadata: { userId: "u", profileId: null, domain: "career", requestedFactKeys: [], retrievalTags: ["career"], errors: [], partial: false },
    ...partial,
  };
}

function safeRemedies(): SafeRemedy[] {
  return [{ id: "r1", domain: "sleep", title: "routine", description: "routine", tags: ["sleep"], restrictions: ["low-cost"], source: "deterministic" }];
}

function baseDecision(input: Partial<{ question: string; analyzer: AnalyzerResult; safety: RagSafetyGateResult; plan: RequiredDataPlan; context: RetrievalContext; reasoningPath: ReasoningPath; timing: TimingContext }>) {
  return checkSufficiency({
    question: input.question,
    analyzer: input.analyzer ?? analyzer(),
    safety: input.safety ?? safetyAllowed(),
    plan: input.plan ?? plan(),
    context: input.context ?? context(),
    reasoningPath: input.reasoningPath,
    timing: input.timing,
  });
}

describe("sufficiency checker", () => {
  describe("default and missing input", () => {
    it("checkSufficiency() no args returns fallback", () => {
      expect(() => checkSufficiency()).not.toThrow();
      expect(checkSufficiency()).toMatchObject({ status: "fallback", canUseGroq: false });
    });
    it("missing plan returns fallback", () => {
      expect(checkSufficiency({ context: context() })).toMatchObject({ status: "fallback" });
    });
    it("missing context returns fallback", () => {
      expect(checkSufficiency({ plan: plan() })).toMatchObject({ status: "fallback" });
    });
    it("missing both returns canUseGroq false", () => {
      expect(checkSufficiency({})).toMatchObject({ canUseGroq: false, canUseOllamaCritic: false });
    });
    it("fallback limitation includes missing pipeline context", () => {
      expect(checkSufficiency({})).toMatchObject({ limitations: expect.arrayContaining(["Sufficiency could not be checked because required pipeline context is missing."]) });
    });
  });

  describe("safety", () => {
    const cases = [
      ["death", "Can my chart tell when I will die?"],
      ["medical", "Do I have cancer according to chart?"],
      ["self_harm", "I want to die."],
      ["legal", "Will I win my court case?"],
      ["financial_guarantee", "Will my chart guarantee profit?"],
    ] as const;
    for (const [flag, question] of cases) {
      it(`${flag} blocked returns safety answer`, () => {
        const result = baseDecision({ question, safety: safetyBlocked(flag) });
        expect(result.status).toBe("answer_now");
        expect(result.answerMode).toBe("safety");
        expect(result.canUseGroq).toBe(false);
        expect(result.canUseOllamaCritic).toBe(false);
      });
    }
    it("blocked plan has no missingFacts", () => {
      expect(baseDecision({ safety: safetyBlocked("medical") }).missingFacts).toEqual([]);
    });
    it("safety restrictions are preserved", () => {
      expect(baseDecision({ safety: safetyBlocked("death") }).limitations.join(" ")).toContain("death-date");
    });
    it("safety safeResponse is preserved", () => {
      const result = baseDecision({ safety: safetyBlocked("medical", "blocked", "safe") });
      expect(result.limitations).toContain("safe");
    });
  });

  describe("exact facts", () => {
    it("present lagna answers now", () => {
      expect(baseDecision({ plan: plan({ answerType: "exact_fact", requiredFacts: ["lagna"] }) })).toMatchObject({ status: "answer_now", answerMode: "exact_fact" });
    });
    it("missing lagna falls back", () => {
      const result = baseDecision({ plan: plan({ answerType: "exact_fact", requiredFacts: ["lagna"] }), context: context({ chartFacts: [] }) });
      expect(result.status).toBe("fallback");
      expect(result.fallbackReason).toBe("missing_required_facts");
    });
    it("missing exact fact limitation present", () => {
      expect(baseDecision({ plan: plan({ answerType: "exact_fact", requiredFacts: ["lagna"] }), context: context({ chartFacts: [] }) }).limitations.join(" ")).toContain("exact chart fact");
    });
    it("exact fact with analyzer followup asks follow-up", () => {
      const result = baseDecision({ plan: plan({ answerType: "exact_fact", requiredFacts: [] }), analyzer: analyzer({ questionType: "exact_fact", shouldAskFollowup: true, followupQuestion: "Which exact chart fact do you want?" }) });
      expect(result.status).toBe("ask_followup");
      expect(result.followupQuestion).toContain("Which exact chart fact");
    });
    it("sun alias satisfies planet_placement:sun", () => {
      expect(baseDecision({ plan: plan({ answerType: "exact_fact", requiredFacts: ["planet_placement:sun"] }) }).status).toBe("answer_now");
    });
    it("current_mahadasha satisfies current_dasha", () => {
      expect(baseDecision({ plan: plan({ answerType: "exact_fact", requiredFacts: ["current_dasha"] }) }).status).toBe("answer_now");
    });
    it("empty exact fact requirements without followup falls back", () => {
      expect(baseDecision({ plan: plan({ answerType: "exact_fact", requiredFacts: [] }), analyzer: analyzer({ questionType: "exact_fact" }) }).status).toBe("fallback");
    });
    it("exact fact does not permit Ollama critic", () => {
      expect(baseDecision({ plan: plan({ answerType: "exact_fact", requiredFacts: ["lagna"] }) }).canUseOllamaCritic).toBe(false);
    });
  });

  describe("follow-up", () => {
    it("shouldAskFollowup true asks follow-up", () => {
      expect(baseDecision({ analyzer: analyzer({ shouldAskFollowup: true, followupQuestion: "Please narrow it down." }) }).status).toBe("ask_followup");
    });
    it("followupQuestion preserved", () => {
      expect(baseDecision({ analyzer: analyzer({ shouldAskFollowup: true, followupQuestion: "Focus on career?" }) }).followupQuestion).toBe("Focus on career?");
    });
    it("default general follow-up is stable", () => {
      expect(buildDefaultFollowupQuestion({ question: "What will happen?", analyzer: analyzer() })).toContain("career, marriage, money, health, sleep, education, or foreign travel");
    });
    it("career follow-up asks promotion/job/salary/recognition", () => {
      expect(buildDefaultFollowupQuestion({ question: "I am working hard and not getting promotion." })).toContain("promotion timing, job change, salary, or workplace recognition");
    });
    it("marriage follow-up asks timing/pattern/support", () => {
      expect(buildDefaultFollowupQuestion({ question: "Will I get married?" })).toContain("timing, relationship pattern, or spouse support");
    });
    it("money follow-up asks income/savings/debt/business", () => {
      expect(buildDefaultFollowupQuestion({ question: "Will my income improve?" })).toContain("income, savings, debt, or business");
    });
    it("vague follow-up canUseGroq false", () => {
      expect(baseDecision({ analyzer: analyzer({ shouldAskFollowup: true }) }).canUseGroq).toBe(false);
    });
  });

  describe("required facts", () => {
    it("career with all required facts answers now", () => {
      expect(baseDecision({ plan: plan({ requiredFacts: ["lagna", "house_10", "lord_10", "sun_placement", "house_11", "current_dasha"] }) }).status).toBe("answer_now");
    });
    it("career missing house_10 falls back", () => {
      const result = baseDecision({ plan: plan({ requiredFacts: ["lagna", "house_10", "lord_10"] }), context: context({ chartFacts: [chartFact("lagna", "lagna")] }) });
      expect(result.status).toBe("fallback");
      expect(result.fallbackReason).toBe("missing_required_facts");
    });
    it("career missing current_dasha falls back", () => {
      const result = baseDecision({ plan: plan({ requiredFacts: ["lagna", "house_10", "current_dasha"] }), context: context({ chartFacts: [chartFact("lagna", "lagna"), chartFact("house_10", "house", [], { house: 10 })] }) });
      expect(result.status).toBe("fallback");
    });
    it("missing required limitation present", () => {
      expect(baseDecision({ plan: plan({ requiredFacts: ["lagna", "house_10"] }), context: context({ chartFacts: [] }) }).limitations.join(" ")).toContain("Required chart facts");
    });
    it("lord:10 alias works", () => {
      expect(normalizeFactRequirement("lord:10")).toBe("lord_10");
    });
    it("house:10 alias works", () => {
      expect(normalizeFactRequirement("house:10")).toBe("house_10");
    });
    it("planet_placement:sun alias works", () => {
      expect(normalizeFactRequirement("planet_placement:sun")).toBe("sun_placement");
    });
    it("retrieval partial with required facts present answers now", () => {
      expect(baseDecision({ context: context({ metadata: { ...context().metadata, partial: true } }) }).status).toBe("answer_now");
    });
    it("retrieval partial and required missing falls back", () => {
      expect(baseDecision({ context: context({ chartFacts: [], metadata: { ...context().metadata, partial: true } }) }).status).toBe("fallback");
    });
    it("benchmark example requirement is satisfied by benchmarkExamples", () => {
      const ctx = context({ benchmarkExamples: [{ id: "b1", exampleKey: "career_benchmark_examples", domain: "career", question: "q", answer: "a", reasoning: null, accuracyClass: null, readingStyle: null, followUpQuestion: null, tags: [], metadata: {}, enabled: true }] });
      expect(collectPresentFactKeys(ctx)).toContain("career_benchmark_examples");
    });
  });

  describe("timing", () => {
    it("timing available answers now", () => {
      expect(baseDecision({ question: "When will promotion happen?", plan: plan({ needsTiming: true, requiresTimingSource: true, answerType: "timing" }), timing: timing({ available: true, requested: true, allowed: true, windows: [timingWindow()] }) }).status).toBe("answer_now");
    });
    it("timing-only without source falls back", () => {
      const result = baseDecision({ question: "Exact date of marriage?", plan: plan({ needsTiming: true, requiresTimingSource: true, answerType: "timing" }), timing: timing({ available: false, requested: true, allowed: true, limitation: "No grounded timing source is available yet." }) });
      expect(result.status).toBe("fallback");
      expect(result.answerMode).toBe("timing_limited");
    });
    it("interpretive question can answer without timing source", () => {
      const result = baseDecision({ question: "I am working hard and not getting promotion.", plan: plan({ needsTiming: true, requiresTimingSource: true, answerType: "interpretive" }), timing: timing({ available: false, requested: true, allowed: true }) });
      expect(result.status).toBe("answer_now");
      expect(result.limitations.join(" ")).toContain("No grounded timing source");
    });
    it("timingAllowed false blocks timing windows", () => {
      expect(baseDecision({ question: "When will promotion happen?", plan: plan({ needsTiming: true, requiresTimingSource: true, timingAllowed: false, answerType: "timing" }), timing: timing({ available: true, requested: true, allowed: false }) }).status).toBe("fallback");
    });
    it("timing limitation is preserved", () => {
      expect(baseDecision({ question: "When will promotion happen?", plan: plan({ needsTiming: true, requiresTimingSource: true, answerType: "timing" }), timing: timing({ available: false, requested: true, allowed: true, limitation: "custom timing limitation" }) }).limitations.join(" ")).toContain("custom timing limitation");
    });
    it("exact date without timing source falls back", () => {
      expect(baseDecision({ question: "Exact date of marriage?", plan: plan({ needsTiming: true, requiresTimingSource: true, answerType: "timing" }), context: context({ chartFacts: [] }) }).status).toBe("fallback");
    });
    it("next month second half without timing source does not invent timing", () => {
      expect(baseDecision({ question: "Will I get promoted next month second half?", plan: plan({ needsTiming: true, requiresTimingSource: true, answerType: "timing" }), timing: timing({ available: false, requested: true, allowed: true }) }).status).toBe("fallback");
    });
    it("timing_source requirement satisfied by timing available", () => {
      expect(getMissingRequiredFacts(plan({ answerType: "timing", requiredFacts: ["timing_source"] }), context(), timing({ available: true, requested: true, allowed: true, windows: [timingWindow()] }))).toEqual([]);
    });
    it("timing_source missing appears when unavailable", () => {
      expect(getMissingRequiredFacts(plan({ answerType: "timing", requiredFacts: ["timing_source"] }), context(), timing({ available: false, requested: true, allowed: true }))).toContain("timing_source");
    });
    it("safety restricted timing returns safety or fallback", () => {
      const result = baseDecision({ question: "When will I die?", plan: plan({ needsTiming: true, requiresTimingSource: true, answerType: "timing" }), safety: safetyBlocked("death"), timing: timing({ available: false, requested: true, allowed: false }) });
      expect(["answer_now", "fallback"]).toContain(result.status);
    });
  });

  describe("reasoning path", () => {
    it("empty reasoning path with facts present answers conservatively", () => {
      expect(baseDecision({ reasoningPath: reasoningPath({ steps: [] }) }).status).toBe("answer_now");
    });
    it("reasoning missing required anchors falls back", () => {
      expect(baseDecision({ reasoningPath: reasoningPath({ missingAnchors: ["house_10"] }) }).status).toBe("fallback");
    });
    it("reasoning partial warning is preserved", () => {
      expect(baseDecision({ reasoningPath: reasoningPath({ metadata: { factCount: 1, ruleCount: 0, partial: true, stored: false } }) }).warnings.join(" ")).toContain("Reasoning rules are incomplete");
    });
    it("career reasoning complete answers now", () => {
      expect(baseDecision({ reasoningPath: reasoningPath({ steps: [{ id: "1", label: "x", factKeys: ["lagna"], ruleKeys: [], explanation: "x", confidence: "deterministic", tags: [] }] }) }).status).toBe("answer_now");
    });
    it("exact fact ignores reasoning path", () => {
      expect(baseDecision({ plan: plan({ answerType: "exact_fact", requiredFacts: ["lagna"] }), reasoningPath: reasoningPath({ missingAnchors: ["house_10"] }) }).answerMode).toBe("exact_fact");
    });
    it("safety ignores reasoning path", () => {
      expect(baseDecision({ safety: safetyBlocked("legal"), reasoningPath: reasoningPath({ missingAnchors: ["house_10"] }) }).answerMode).toBe("safety");
    });
    it("no reasoning path and missing facts falls back", () => {
      expect(baseDecision({ plan: plan({ requiredFacts: ["lagna"] }), context: context({ chartFacts: [] }), reasoningPath: undefined }).status).toBe("fallback");
    });
  });

  describe("remedies", () => {
    it("sleep remedy with safe remedies answers now", () => {
      expect(baseDecision({ question: "Give me remedy for bad sleep.", plan: plan({ domain: "sleep", answerType: "remedy", needsRemedy: true, requiredFacts: ["house_12", "moon_placement", "house_6", "safe_remedy_rules"] }), context: context({ metadata: { ...context().metadata, domain: "sleep" }, safeRemedies: safeRemedies() }) }).status).toBe("answer_now");
    });
    it("sleep remedy missing safe remedy rules falls back", () => {
      expect(baseDecision({ question: "Give me remedy for bad sleep.", plan: plan({ domain: "sleep", answerType: "remedy", needsRemedy: true, requiredFacts: ["house_12", "moon_placement", "house_6", "safe_remedy_rules"] }), context: context({ metadata: { ...context().metadata, domain: "sleep" }, chartFacts: [] }) }).status).toBe("fallback");
    });
    it("remedyAllowed false answers without remedy", () => {
      const result = baseDecision({ plan: plan({ domain: "career", answerType: "interpretive", needsRemedy: true, remedyAllowed: false }) });
      expect(result.status).toBe("answer_now");
      expect(result.limitations.join(" ")).toContain("Remedy guidance is restricted");
    });
    it("medical sleep question is safety blocked", () => {
      expect(baseDecision({ question: "Do I have cancer according to chart?", safety: safetyBlocked("medical") }).answerMode).toBe("safety");
    });
    it("spirituality remedy with safeRemedies answers now", () => {
      const ctx = context({
        metadata: { ...context().metadata, domain: "spirituality" },
        safeRemedies: safeRemedies(),
        chartFacts: [
          chartFact("house_9", "house", ["house_9"], { house: 9 }),
          chartFact("house_12", "house", ["house_12"], { house: 12 }),
          chartFact("jupiter_placement", "planet_placement", ["jupiter"], { planet: "Jupiter" }),
          chartFact("ketu_placement", "planet_placement", ["ketu"], { planet: "Ketu" }),
        ],
      });
      expect(baseDecision({ plan: plan({ domain: "spirituality", answerType: "remedy", needsRemedy: true, requiredFacts: ["house_9", "house_12", "jupiter_placement", "ketu_placement", "safe_remedy_rules"] }), context: ctx }).status).toBe("answer_now");
    });
    it("gemstone guarantee blocked by safety", () => {
      expect(baseDecision({ question: "Which gemstone guarantees money?", safety: safetyBlocked("gemstone_guarantee") }).answerMode).toBe("safety");
    });
    it("expensive puja pressure blocked by safety", () => {
      expect(baseDecision({ question: "Is expensive puja mandatory?", safety: safetyBlocked("expensive_puja_pressure") }).answerMode).toBe("safety");
    });
    it("safe remedy rules missing limitation present", () => {
      const ctx = context({ chartFacts: [chartFact("house_12", "house", ["house_12"], { house: 12 }), chartFact("moon_placement", "planet_placement", ["moon"], { planet: "Moon" }), chartFact("house_6", "house", ["house_6"], { house: 6 })] });
      expect(baseDecision({ plan: plan({ domain: "sleep", answerType: "remedy", needsRemedy: true, requiredFacts: ["house_12", "moon_placement", "house_6", "safe_remedy_rules"] }), context: ctx }).limitations.join(" ")).toContain("Safe remedy rules are missing");
    });
  });

  describe("integration contract", () => {
    it("collectPresentFactKeys returns normalized aliases", () => {
      const keys = collectPresentFactKeys(context({ chartFacts: [chartFact("sun", "planet_placement", ["sun"], { planet: "Sun" })] }));
      expect(keys).toEqual(expect.arrayContaining(["sun_placement", "sun"]));
    });
    it("collectPresentFactKeys includes safe remedy rules", () => {
      expect(collectPresentFactKeys(context({ safeRemedies: safeRemedies() }))).toContain("safe_remedy_rules");
    });
    it("collectPresentFactKeys includes timing source from timing windows", () => {
      expect(collectPresentFactKeys(context({ timingWindows: [storedTimingWindow()] }))).toContain("timing_source");
    });
    it("buildDefaultFollowupQuestion stable for unknown domain", () => {
      expect(buildDefaultFollowupQuestion({ question: "Any problem in my life?" })).toBe("Which area should I focus on — career, marriage, money, health, sleep, education, or foreign travel?");
    });
    it("canUseOllamaCritic only follows canUseGroq", () => {
      const result = baseDecision({ plan: plan({ requiredFacts: ["lagna"] }) });
      expect(result.canUseOllamaCritic).toBe(result.canUseGroq);
    });
    it("isTimingOnlyQuestion detects exact timing asks", () => {
      expect(isTimingOnlyQuestion({ question: "When will I get promoted next month second half?" })).toBe(true);
    });
    it("isTimingOnlyQuestion stays false for interpretive career questions", () => {
      expect(isTimingOnlyQuestion({ question: "I am working hard and not getting promotion." })).toBe(false);
    });
    it("buildDeterministicAnalyzerResult still produces analyzer input", () => {
      expect(buildDeterministicAnalyzerResult({ question: "What is my Lagna?" }).source).toBe("deterministic_fallback");
    });
  });
});
