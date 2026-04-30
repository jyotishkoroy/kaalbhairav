import { describe, expect, it } from "vitest";
import { selectReasoningRules } from "../../../lib/astro/rag/reasoning-rule-selector";
import type { ChartFact } from "../../../lib/astro/rag/chart-fact-extractor";
import type { RequiredDataPlan } from "../../../lib/astro/rag/required-data-planner";
import type { ReasoningRule, RetrievalContext } from "../../../lib/astro/rag/retrieval-types";

function fact(overrides: Partial<ChartFact>): ChartFact {
  return {
    factType: "house",
    factKey: "lagna",
    factValue: "Leo",
    planet: null,
    house: null,
    sign: null,
    degreeNumeric: null,
    source: "chart_json",
    confidence: "deterministic",
    tags: [],
    metadata: {},
    ...overrides,
  };
}

function rule(overrides: Partial<ReasoningRule>): ReasoningRule {
  return {
    id: overrides.id ?? overrides.ruleKey ?? "rule-1",
    ruleKey: overrides.ruleKey ?? "rule-1",
    domain: overrides.domain ?? "career",
    title: "rule",
    description: "rule",
    requiredFactTypes: [],
    requiredTags: [],
    reasoningTemplate: "template",
    weight: 10,
    safetyNotes: [],
    enabled: true,
    metadata: {},
    ...overrides,
  };
}

function plan(overrides: Partial<RequiredDataPlan> = {}): RequiredDataPlan {
  return {
    domain: "career",
    answerType: "interpretive",
    requiredFacts: ["lagna", "house_10", "lord_10", "sun_placement", "current_dasha"],
    optionalFacts: [],
    requiredItems: [],
    optionalItems: [],
    retrievalTags: ["career", "house_10", "dasha"],
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
    ...overrides,
  };
}

function context(overrides: Partial<RetrievalContext> = {}): RetrievalContext {
  const baseFacts = [
    fact({ factType: "lagna", factKey: "lagna", factValue: "Leo", tags: ["lagna", "ascendant", "chart"] }),
    fact({ factType: "house", factKey: "house_10", factValue: "Taurus", house: 10, tags: ["career", "house", "house_10"] }),
    fact({ factType: "house_lord", factKey: "lord_10", factValue: "Venus", planet: "Venus", house: 10, tags: ["career", "house_lord", "lordship", "house_10", "venus"] }),
    fact({ factType: "planet_placement", factKey: "sun", factValue: "Taurus", planet: "Sun", house: 10, sign: "Taurus", tags: ["career", "authority", "planet_placement", "sun", "house_10"] }),
    fact({ factType: "planet_placement", factKey: "venus", factValue: "Cancer", planet: "Venus", house: 12, sign: "Cancer", tags: ["relationship", "comfort", "planet_placement", "venus", "house_12", "foreign"] }),
    fact({ factType: "planet_placement", factKey: "rahu", factValue: "Cancer", planet: "Rahu", house: 12, sign: "Cancer", tags: ["foreign", "unconventional", "planet_placement", "rahu", "house_12"] }),
    fact({ factType: "house", factKey: "house_11", factValue: "Gemini", house: 11, tags: ["gains", "network", "house_11"] }),
    fact({ factType: "planet_placement", factKey: "moon", factValue: "Gemini", planet: "Moon", house: 11, sign: "Gemini", tags: ["mind", "emotion", "moon", "house_11", "communication"] }),
    fact({ factType: "planet_placement", factKey: "mercury", factValue: "Gemini", planet: "Mercury", house: 11, sign: "Gemini", tags: ["communication", "mercury", "house_11", "gains"] }),
    fact({ factType: "dasha", factKey: "current_mahadasha", factValue: "Jupiter Mahadasha", tags: ["timing", "dasha", "jupiter"] }),
    fact({ factType: "house", factKey: "house_12", factValue: "Cancer", house: 12, tags: ["sleep", "foreign", "expense", "house_12"] }),
    fact({ factType: "house", factKey: "house_6", factValue: "Capricorn", house: 6, tags: ["health", "conflict", "service", "house_6"] }),
    fact({ factType: "house", factKey: "house_7", factValue: "Aquarius", house: 7, tags: ["marriage", "partnership", "house_7"] }),
    fact({ factType: "house_lord", factKey: "lord_7", factValue: "Saturn", planet: "Saturn", house: 7, tags: ["marriage", "lordship", "house_7", "saturn"] }),
    fact({ factType: "planet_placement", factKey: "jupiter", factValue: "Sagittarius", planet: "Jupiter", house: 5, sign: "Sagittarius", tags: ["education", "wisdom", "jupiter", "house_5"] }),
    fact({ factType: "house", factKey: "house_2", factValue: "Virgo", house: 2, tags: ["money", "family", "speech", "house_2"] }),
    fact({ factType: "house_lord", factKey: "lord_2", factValue: "Mercury", planet: "Mercury", house: 2, tags: ["money", "lordship", "house_2", "mercury"] }),
  ];
  return {
    chartFacts: baseFacts,
    reasoningRules: [
      rule({ id: "1", ruleKey: "career_promotion_delay_core", domain: "career", requiredFactTypes: ["lagna", "house_10", "lord_10", "sun_placement", "current_dasha"], requiredTags: ["career", "house_10", "dasha"], weight: 100 }),
      rule({ id: "2", ruleKey: "career_network_gains_core", domain: "career", requiredFactTypes: ["house_11", "moon_placement", "mercury_placement"], requiredTags: ["career", "house_11", "gains"], weight: 90 }),
      rule({ id: "3", ruleKey: "sleep_remedy_core", domain: "sleep", requiredFactTypes: ["house_12", "moon_placement", "house_6"], requiredTags: ["sleep", "moon", "house_12", "remedy"], weight: 100 }),
      rule({ id: "4", ruleKey: "marriage_core", domain: "marriage", requiredFactTypes: ["house_7", "lord_7", "venus_placement", "current_dasha"], requiredTags: ["marriage", "house_7", "venus"], weight: 100 }),
      rule({ id: "5", ruleKey: "money_income_core", domain: "money", requiredFactTypes: ["house_2", "house_11", "current_dasha"], requiredTags: ["money", "house_2", "house_11"], weight: 95 }),
      rule({ id: "6", ruleKey: "foreign_relocation_core", domain: "foreign", requiredFactTypes: ["house_12", "rahu_placement", "lord_12", "current_dasha"], requiredTags: ["foreign", "house_12", "rahu"], weight: 90 }),
      rule({ id: "7", ruleKey: "safety_no_certainty_core", domain: "safety", requiredFactTypes: [], requiredTags: ["safety"], weight: 100 }),
      rule({ id: "8", ruleKey: "generic_low_weight", domain: "general", requiredFactTypes: [], requiredTags: [], weight: 10 }),
    ],
    benchmarkExamples: [],
    timingWindows: [{ id: "t1", userId: "u", profileId: null, domain: "career", label: "d", startsOn: null, endsOn: null, interpretation: "timing", source: "dasha", confidence: "strong", tags: ["timing_source"], metadata: {} }],
    safeRemedies: [],
    metadata: {
      userId: "u",
      profileId: null,
      domain: "career",
      requestedFactKeys: ["lagna"],
      retrievalTags: ["career"],
      errors: [],
      partial: false,
    },
    ...overrides,
  };
}

describe("selectReasoningRules", () => {
  it("no-arg selectReasoningRules returns empty safely", () => {
    expect(selectReasoningRules()).toMatchObject({ selectedRules: [], rejectedRules: [], selectedRuleIds: [] });
  });

  it("selects career core rule", () => {
    expect(selectReasoningRules({ plan: plan(), context: context() }).selectedRules.map((match) => match.rule.ruleKey)).toContain("career_promotion_delay_core");
  });

  it("selects career network rule when 11th facts exist", () => {
    expect(selectReasoningRules({ plan: plan(), context: context() }).selectedRules.map((match) => match.rule.ruleKey)).toContain("career_network_gains_core");
  });

  it("ranks higher weight richer match first", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context() });
    expect(selection.selectedRules[0].rule.ruleKey).toBe("career_promotion_delay_core");
  });

  it("rejects sleep rule for career plan", () => {
    expect(selectReasoningRules({ plan: plan(), context: context() }).rejectedRules.map((match) => match.rule.ruleKey)).toContain("sleep_remedy_core");
  });

  it("missing requiredFactTypes lowers score", () => {
    const selection = selectReasoningRules({ plan: plan({ requiredFacts: ["missing_fact"] }), context: context() });
    expect(selection.selectedRules[0].reasons.join(" ")).toContain("template");
  });

  it("matching tags increase score", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context() });
    expect(selection.selectedRules[0].matchedTags).toEqual(expect.arrayContaining(["career", "house_10", "dasha"]));
  });

  it("retrievalTags can satisfy requiredTags", () => {
    const sleepSelection = selectReasoningRules({
      plan: plan({ domain: "sleep", retrievalTags: ["remedy"], reasoningRuleDomains: ["sleep"] }),
      context: context({
        metadata: { ...context().metadata, domain: "sleep", retrievalTags: ["remedy"] },
      }),
    });
    expect(sleepSelection.selectedRules.map((match) => match.rule.ruleKey)).toContain("sleep_remedy_core");
  });

  it("dasha fact satisfies current_dasha", () => {
    expect(selectReasoningRules({ plan: plan(), context: context() }).selectedRules[0].matchedFactKeys).toContain("current_dasha");
  });

  it("sun placement satisfies sun_placement", () => {
    expect(selectReasoningRules({ plan: plan(), context: context() }).selectedRules[0].matchedFactKeys).toContain("sun_placement");
  });

  it("moon placement satisfies moon_placement", () => {
    expect(selectReasoningRules({ plan: plan(), context: context() }).selectedRules[1].matchedFactKeys).toContain("moon_placement");
  });

  it("house fact house_10 satisfies house_10", () => {
    expect(selectReasoningRules({ plan: plan(), context: context() }).selectedRules[0].matchedFactKeys).toContain("house_10");
  });

  it("house lord fact lord_10 satisfies lord_10", () => {
    expect(selectReasoningRules({ plan: plan(), context: context() }).selectedRules[0].matchedFactKeys).toContain("lord_10");
  });

  it("context.metadata.partial adds warning", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context({ metadata: { ...context().metadata, partial: true } }) });
    expect(selection.metadata.warnings.join(" ")).toContain("partial");
  });

  it("no selected rules adds warning", () => {
    const selection = selectReasoningRules({ plan: plan({ answerType: "interpretive", requiredFacts: ["impossible"] }), context: context({ reasoningRules: [rule({ id: "x", ruleKey: "x", domain: "sleep", requiredFactTypes: ["impossible"] })] }) });
    expect(selection.metadata.warnings.join(" ")).toContain("No reasoning rules matched");
  });

  it("blocked safety plan selects safety rule and rejects non-safety", () => {
    const selection = selectReasoningRules({ plan: plan({ domain: "safety", blockedBySafety: true, retrievalTags: ["safety"] }), context: context() });
    expect(selection.selectedRules.map((match) => match.rule.ruleKey)).toContain("safety_no_certainty_core");
    expect(selection.selectedRules.every((match) => match.rule.domain === "safety")).toBe(true);
  });

  it("exact_fact plan does not select interpretive career rule", () => {
    const selection = selectReasoningRules({ plan: plan({ answerType: "exact_fact" }), context: context() });
    expect(selection.selectedRules.map((match) => match.rule.ruleKey)).not.toContain("career_promotion_delay_core");
  });

  it("maxRules limits selected count", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context(), maxRules: 1 });
    expect(selection.selectedRules).toHaveLength(1);
  });

  it("minScore filters weak rules", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context(), minScore: 500 });
    expect(selection.selectedRules).toHaveLength(0);
  });

  it("selected sorted score desc", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context() });
    expect(selection.selectedRules[0].score).toBeGreaterThanOrEqual(selection.selectedRules[1].score);
  });

  it("rejected rules retained", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context() });
    expect(selection.rejectedRules.length).toBeGreaterThan(0);
  });

  it("selected match includes matchedFactKeys", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context() });
    expect(selection.selectedRules[0].matchedFactKeys.length).toBeGreaterThan(0);
  });

  it("selected match includes matchedTags", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context() });
    expect(selection.selectedRules[0].matchedTags.length).toBeGreaterThan(0);
  });

  it("missing fact types listed", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context({ reasoningRules: [rule({ id: "x", ruleKey: "x", requiredFactTypes: ["house_99"], requiredTags: ["missing"] })] }), minScore: 1000 });
    expect(selection.rejectedRules[0].missingFactTypes).toContain("house_99");
    expect(selection.rejectedRules[0].missingTags).toContain("missing");
  });

  it("selection metadata candidateCount/selectedCount correct", () => {
    const selection = selectReasoningRules({ plan: plan(), context: context() });
    expect(selection.metadata.candidateCount).toBe(8);
    expect(selection.metadata.selectedCount).toBe(selection.selectedRules.length);
  });
});
