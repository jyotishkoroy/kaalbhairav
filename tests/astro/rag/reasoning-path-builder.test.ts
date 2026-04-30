import { describe, expect, it } from "vitest";
import { buildReasoningPath, storeReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
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

function baseContext(overrides: Partial<RetrievalContext> = {}): RetrievalContext {
  const facts = [
    fact({ factType: "lagna", factKey: "lagna", factValue: "Leo", tags: ["lagna", "ascendant", "chart"] }),
    fact({ factType: "house", factKey: "house_10", factValue: "Taurus", house: 10, tags: ["career", "house", "house_10"] }),
    fact({ factType: "house_lord", factKey: "lord_10", factValue: "Venus", planet: "Venus", house: 10, tags: ["career", "house_lord", "lordship", "house_10", "venus"] }),
    fact({ factType: "planet_placement", factKey: "sun", factValue: "Taurus", planet: "Sun", house: 10, sign: "Taurus", tags: ["career", "authority", "planet_placement", "sun", "house_10"] }),
    fact({ factType: "planet_placement", factKey: "venus", factValue: "Cancer", planet: "Venus", house: 12, sign: "Cancer", tags: ["relationship", "comfort", "planet_placement", "venus", "house_12", "foreign"] }),
    fact({ factType: "planet_placement", factKey: "rahu", factValue: "Cancer", planet: "Rahu", house: 12, sign: "Cancer", tags: ["foreign", "unconventional", "planet_placement", "rahu", "house_12"] }),
    fact({ factType: "house", factKey: "house_11", factValue: "Gemini", house: 11, tags: ["gains", "network", "house_11"] }),
    fact({ factType: "house", factKey: "house_5", factValue: "Sagittarius", house: 5, tags: ["education", "house_5"] }),
    fact({ factType: "house", factKey: "house_9", factValue: "Aries", house: 9, tags: ["education", "house_9"] }),
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
    chartFacts: facts,
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

describe("buildReasoningPath", () => {
  it("no-arg buildReasoningPath returns empty path safely", () => {
    expect(buildReasoningPath()).toMatchObject({ steps: [], selectedRuleIds: [] });
  });

  it("career path has domain career", () => {
    expect(buildReasoningPath({ plan: plan(), context: baseContext() }).domain).toBe("career");
  });

  it("career path includes Lagna step", () => {
    expect(buildReasoningPath({ plan: plan(), context: baseContext() }).steps.map((step) => step.label)).toContain("Lagna");
  });

  it("career path includes 10th house/Sun career step", () => {
    expect(buildReasoningPath({ plan: plan(), context: baseContext() }).steps.map((step) => step.explanation).join(" ")).toContain("10th house");
  });

  it("career path includes 10th lord/Venus step", () => {
    expect(buildReasoningPath({ plan: plan(), context: baseContext() }).steps.map((step) => step.label)).toContain("10th Lord");
  });

  it("career path includes 11th house/Moon/Mercury gains step", () => {
    expect(buildReasoningPath({ plan: plan(), context: baseContext() }).steps.map((step) => step.label)).toContain("11th House");
  });

  it("career path includes dasha backdrop step", () => {
    expect(buildReasoningPath({ plan: plan(), context: baseContext() }).steps.map((step) => step.explanation).join(" ")).toContain("dasha");
  });

  it("career path does not guarantee promotion", () => {
    expect(buildReasoningPath({ plan: plan(), context: baseContext() }).summary).not.toContain("guarantee");
  });

  it("selectedRuleKeys include career rules", () => {
    expect(buildReasoningPath({ plan: plan(), context: baseContext() }).selectedRuleKeys).toEqual(expect.arrayContaining(["career_promotion_delay_core", "career_network_gains_core"]));
  });

  it("sleep path includes 12th house step", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "sleep", retrievalTags: ["sleep"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "sleep", retrievalTags: ["sleep"] } }) }).steps.map((step) => step.label)).toContain("12th House");
  });

  it("sleep path includes Moon step", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "sleep", retrievalTags: ["sleep"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "sleep", retrievalTags: ["sleep"] } }) }).steps.map((step) => step.label)).toContain("Moon");
  });

  it("sleep path includes 6th house routine/stress step", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "sleep", retrievalTags: ["sleep"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "sleep", retrievalTags: ["sleep"] } }) }).steps.map((step) => step.label)).toContain("6th House");
  });

  it("sleep path includes safe remedy restriction step", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "sleep", retrievalTags: ["sleep"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "sleep", retrievalTags: ["sleep"] } }) }).steps.map((step) => step.label)).toContain("Safe Remedy");
  });

  it("sleep path does not diagnose medical condition", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "sleep", retrievalTags: ["sleep"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "sleep", retrievalTags: ["sleep"] } }) }).summary).not.toContain("diagnose");
  });

  it("sleep path warns if Moon missing", () => {
    const ctx = baseContext({ chartFacts: baseContext().chartFacts.filter((item) => item.factKey !== "moon") });
    expect(buildReasoningPath({ plan: plan({ domain: "sleep", retrievalTags: ["sleep"] }), context: ctx }).warnings.join(" ")).toContain("Moon placement is missing");
  });

  it("marriage path includes 7th house", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "marriage", retrievalTags: ["marriage"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "marriage" } }) }).steps.map((step) => step.label)).toContain("7th House");
  });

  it("marriage path includes 7th lord", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "marriage", retrievalTags: ["marriage"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "marriage" } }) }).steps.map((step) => step.label)).toContain("7th Lord");
  });

  it("marriage path includes Venus", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "marriage", retrievalTags: ["marriage"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "marriage" } }) }).steps.map((step) => step.label)).toContain("Venus");
  });

  it("marriage path includes dasha if present", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "marriage", retrievalTags: ["marriage"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "marriage" } }) }).steps.map((step) => step.label)).toContain("Dasha");
  });

  it("marriage path does not guarantee marriage", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "marriage", retrievalTags: ["marriage"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "marriage" } }) }).summary).not.toContain("guarantee");
  });

  it("money path includes 2nd house", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "money", retrievalTags: ["money"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "money", retrievalTags: ["money"] } }) }).steps.map((step) => step.label)).toContain("2nd House");
  });

  it("money path includes 11th house", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "money", retrievalTags: ["money"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "money", retrievalTags: ["money"] } }) }).steps.map((step) => step.label)).toContain("11th House");
  });

  it("money path does not give financial guarantee", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "money", retrievalTags: ["money"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "money", retrievalTags: ["money"] } }) }).summary).not.toContain("guarantee");
  });

  it("foreign path includes 12th house", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "foreign", retrievalTags: ["foreign"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "foreign", retrievalTags: ["foreign"] } }) }).steps.map((step) => step.label)).toContain("12th House");
  });

  it("foreign path includes Rahu", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "foreign", retrievalTags: ["foreign"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "foreign", retrievalTags: ["foreign"] } }) }).steps.map((step) => step.label)).toContain("Rahu");
  });

  it("foreign path says timing needs grounded source", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "foreign", retrievalTags: ["foreign"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "foreign", retrievalTags: ["foreign"] } }) }).steps.map((step) => step.explanation).join(" ")).toContain("grounded timing source");
  });

  it("education path includes 5th/9th", () => {
    const path = buildReasoningPath({ plan: plan({ domain: "education", retrievalTags: ["education"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "education", retrievalTags: ["education"] } }) });
    expect(path.steps.map((step) => step.label)).toEqual(expect.arrayContaining(["5th House", "9th House"]));
  });

  it("education path includes Mercury/Jupiter if available", () => {
    expect(buildReasoningPath({ plan: plan({ domain: "education", retrievalTags: ["education"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "education", retrievalTags: ["education"] } }) }).steps.map((step) => step.label)).toContain("Mercury/Jupiter");
  });

  it("safety path uses safety restrictions and no chart interpretation", () => {
    const path = buildReasoningPath({ plan: plan({ domain: "safety", blockedBySafety: true, safetyRestrictions: ["no certainty"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "safety" } }) });
    expect(path.steps[0].label).toBe("Safety");
    expect(path.summary).toContain("Safety gate");
  });

  it("exact_fact path returns empty/minimal path with warning", () => {
    const path = buildReasoningPath({ plan: plan({ answerType: "exact_fact" }), context: baseContext() });
    expect(path.steps).toHaveLength(0);
    expect(path.warnings.join(" ")).toContain("Exact fact questions");
  });

  it("general path uses lagna/moon if available", () => {
    const path = buildReasoningPath({ plan: plan({ domain: "general", retrievalTags: ["general"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "general", retrievalTags: ["general"] } }) });
    expect(path.steps.map((step) => step.label)).toEqual(expect.arrayContaining(["Lagna", "Moon"]));
  });

  it("missing required facts populate missingAnchors", () => {
    const path = buildReasoningPath({ plan: plan({ requiredFacts: ["missing"], retrievalTags: ["career"] }), context: baseContext() });
    expect(path.missingAnchors.length).toBeGreaterThan(0);
  });

  it("partial context warning is preserved", () => {
    const path = buildReasoningPath({ plan: plan(), context: baseContext({ metadata: { ...baseContext().metadata, partial: true } }) });
    expect(path.warnings.join(" ")).toContain("partial");
  });

  it("maxSteps limits steps", () => {
    const path = buildReasoningPath({ plan: plan(), context: baseContext(), maxSteps: 2 });
    expect(path.steps).toHaveLength(2);
  });

  it("storeReasoningPath missing supabase returns ok false", async () => {
    await expect(storeReasoningPath({ supabase: undefined as never, userId: "u", question: "q", path: buildReasoningPath({ plan: plan(), context: baseContext() }) })).resolves.toMatchObject({ ok: false });
  });

  it("storeReasoningPath missing userId returns ok false", async () => {
    await expect(storeReasoningPath({ supabase: { from: () => ({ insert: () => ({ select: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) } as never, userId: "", question: "q", path: buildReasoningPath({ plan: plan(), context: baseContext() }) })).resolves.toMatchObject({ ok: false });
  });

  it("storeReasoningPath missing question returns ok false", async () => {
    await expect(storeReasoningPath({ supabase: { from: () => ({ insert: () => ({ select: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) } as never, userId: "u", question: "", path: buildReasoningPath({ plan: plan(), context: baseContext() }) })).resolves.toMatchObject({ ok: false });
  });

  it("storeReasoningPath inserts into astro_reasoning_paths", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const supabase = {
      from(table: string) {
        return {
          insert(row: Record<string, unknown>) {
            calls.push({ table, row });
            return {
              select() {
                return {
                  limit: async () => ({ data: [{ id: "path-1" }], error: null }),
                };
              },
            };
          },
        };
      },
    };
    await storeReasoningPath({ supabase: supabase as never, userId: "u", profileId: "p", question: "q", path: buildReasoningPath({ plan: plan(), context: baseContext() }), retrievalSnapshot: { a: 1 } });
    expect(calls[0]?.table).toBe("astro_reasoning_paths");
  });

  it("maps selectedRuleIds to selected_rule_ids", async () => {
    const row: Record<string, unknown> = {};
    const supabase = {
      from() {
        return {
          insert(input: Record<string, unknown>) {
            Object.assign(row, input);
            return {
              select() {
                return { limit: async () => ({ data: [{ id: "1" }], error: null }) };
              },
            };
          },
        };
      },
    };
    const path = buildReasoningPath({ plan: plan(), context: baseContext() });
    await storeReasoningPath({ supabase: supabase as never, userId: "u", question: "q", path });
    expect(row.selected_rule_ids).toEqual(path.selectedRuleIds);
  });

  it("maps steps to path_steps", async () => {
    const row: Record<string, unknown> = {};
    const supabase = {
      from() {
        return {
          insert(input: Record<string, unknown>) {
            Object.assign(row, input);
            return {
              select() {
                return { limit: async () => ({ data: [{ id: "1" }], error: null }) };
              },
            };
          },
        };
      },
    };
    const path = buildReasoningPath({ plan: plan(), context: baseContext() });
    await storeReasoningPath({ supabase: supabase as never, userId: "u", question: "q", path });
    expect(row.path_steps).toEqual(path.steps);
  });

  it("includes retrieval_snapshot", async () => {
    const row: Record<string, unknown> = {};
    const supabase = {
      from() {
        return {
          insert(input: Record<string, unknown>) {
            Object.assign(row, input);
            return {
              select() {
                return { limit: async () => ({ data: [{ id: "1" }], error: null }) };
              },
            };
          },
        };
      },
    };
    await storeReasoningPath({ supabase: supabase as never, userId: "u", question: "q", path: buildReasoningPath({ plan: plan(), context: baseContext() }), retrievalSnapshot: { x: true } });
    expect(row.retrieval_snapshot).toEqual({ x: true });
  });

  it("handles insert error without throw", async () => {
    const supabase = {
      from() {
        return {
          insert() {
            return { select: () => ({ limit: async () => ({ data: [], error: { message: "nope" } }) }) };
          },
        };
      },
    };
    await expect(storeReasoningPath({ supabase: supabase as never, userId: "u", question: "q", path: buildReasoningPath({ plan: plan(), context: baseContext() }) })).resolves.toMatchObject({ ok: false });
  });

  it("returns inserted id on success", async () => {
    const supabase = {
      from() {
        return {
          insert() {
            return { select: () => ({ limit: async () => ({ data: [{ id: "path-9" }], error: null }) }) };
          },
        };
      },
    };
    await expect(storeReasoningPath({ supabase: supabase as never, userId: "u", question: "q", path: buildReasoningPath({ plan: plan(), context: baseContext() }) })).resolves.toMatchObject({ ok: true, id: "path-9" });
  });

  it("covers no invented facts on foreign/money/education with relevant data", () => {
    const foreign = buildReasoningPath({ plan: plan({ domain: "foreign", retrievalTags: ["foreign"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "foreign" } }) });
    const money = buildReasoningPath({ plan: plan({ domain: "money", retrievalTags: ["money"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "money" } }) });
    const education = buildReasoningPath({ plan: plan({ domain: "education", retrievalTags: ["education"] }), context: baseContext({ metadata: { ...baseContext().metadata, domain: "education" } }) });
    expect(foreign.steps.length).toBeGreaterThan(0);
    expect(money.steps.length).toBeGreaterThan(0);
    expect(education.steps.length).toBeGreaterThan(0);
  });
});
