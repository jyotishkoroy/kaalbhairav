import { describe, expect, it } from "vitest";
import { fetchChartFacts, buildSafeRemedies, retrieveAstroRagContext } from "../../../lib/astro/rag/retrieval-service";
import { planRequiredData } from "../../../lib/astro/rag/required-data-planner";
import type { RequiredDataPlan } from "../../../lib/astro/rag/required-data-planner";

type Response = { data?: unknown[]; error?: { message: string } | null };

function makePlan(overrides: Partial<RequiredDataPlan> = {}): RequiredDataPlan {
  return {
    domain: "career",
    answerType: "interpretive",
    requiredFacts: ["lagna", "house_10", "lord_10", "sun_placement", "house_11", "current_dasha"],
    optionalFacts: ["varshaphal", "timing_windows"],
    requiredItems: [],
    optionalItems: [],
    retrievalTags: ["career", "house_10", "house_11", "dasha"],
    reasoningRuleDomains: ["career"],
    benchmarkDomains: ["career"],
    needsTiming: false,
    needsRemedy: true,
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

function createFakeSupabase(responseMap: Record<string, Response[]>) {
  const logs: Array<{ table: string; filters: unknown[]; select?: string; orders: unknown[]; limit?: number }> = [];
  const calls: Record<string, number> = {};
  const supabase = {
    from(table: string) {
      const callIndex = calls[table] ?? 0;
      calls[table] = callIndex + 1;
      const filters: unknown[] = [];
      const orders: unknown[] = [];
      const builder = {
        select(columns?: string) {
          logs.push({ table, filters, select: columns, orders });
          builder._select = columns;
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push(["eq", column, value]);
          return builder;
        },
        in(column: string, value: unknown[]) {
          filters.push(["in", column, value]);
          return builder;
        },
        contains(column: string, value: unknown) {
          filters.push(["contains", column, value]);
          return builder;
        },
        overlaps(column: string, value: unknown) {
          filters.push(["overlaps", column, value]);
          return builder;
        },
        or(value: string) {
          filters.push(["or", value]);
          return builder;
        },
        order(column: string, options?: unknown) {
          orders.push([column, options]);
          return builder;
        },
        limit(count: number) {
          logs.push({ table, filters, select: builder._select, orders, limit: count });
          const response = responseMap[table]?.[callIndex] ?? { data: [], error: null };
          return Promise.resolve(response);
        },
      } as {
        _select?: string;
        select(columns?: string): unknown;
        eq(column: string, value: unknown): unknown;
        in(column: string, value: unknown[]): unknown;
        contains(column: string, value: unknown): unknown;
        overlaps(column: string, value: unknown): unknown;
        or(value: string): unknown;
        order(column: string, options?: unknown): unknown;
        limit(count: number): Promise<Response>;
      };
      return builder;
    },
  };
  return { supabase: supabase as never, logs };
}

function chartRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    user_id: "user-1",
    profile_id: "profile-1",
    chart_version_id: "cv-1",
    fact_type: "house",
    fact_key: "house_10",
    fact_value: "Taurus",
    planet: null,
    house: 10,
    sign: "Taurus",
    degree_numeric: 12.5,
    source: "chart_json",
    confidence: "deterministic",
    tags: ["career"],
    metadata: { raw_report: "hidden" },
    ...overrides,
  };
}

describe("fetchChartFacts", () => {
  it("queries astro_chart_facts", async () => {
    const { supabase, logs } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }] });
    await fetchChartFacts({ supabase, userId: "user-1", requiredFacts: ["lagna"], optionalFacts: [], tags: [] });
    expect(logs[0].table).toBe("astro_chart_facts");
  });

  it("filters user_id", async () => {
    const { supabase, logs } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }] });
    await fetchChartFacts({ supabase, userId: "user-1", requiredFacts: ["lagna"], optionalFacts: [], tags: [] });
    expect(logs[0].filters).toContainEqual(["eq", "user_id", "user-1"]);
  });

  it("filters profile_id when provided", async () => {
    const { supabase, logs } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }] });
    await fetchChartFacts({ supabase, userId: "user-1", profileId: "profile-1", requiredFacts: ["lagna"], optionalFacts: [], tags: [] });
    expect(logs[0].filters).toContainEqual(["eq", "profile_id", "profile-1"]);
  });

  it("requests required + optional fact keys", async () => {
    const { supabase, logs } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }] });
    await fetchChartFacts({ supabase, userId: "user-1", requiredFacts: ["lagna"], optionalFacts: ["moon_placement"], tags: [] });
    expect(logs[0].filters).toContainEqual(["in", "fact_key", ["lagna", "moon_placement"]]);
  });

  it("uses tag overlap", async () => {
    const { supabase, logs } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }] });
    await fetchChartFacts({ supabase, userId: "user-1", requiredFacts: [], optionalFacts: [], tags: ["career"] });
    expect(logs[0].filters).toContainEqual(["overlaps", "tags", ["career"]]);
  });

  it("maps DB rows to ChartFact", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [chartRow()], error: null }] });
    const result = await fetchChartFacts({ supabase, userId: "user-1", requiredFacts: ["house_10"], optionalFacts: [], tags: [] });
    expect(result.data[0]).toMatchObject({ factType: "house", factKey: "house_10", userId: "user-1", profileId: "profile-1" });
  });

  it("dedupes duplicate factType+factKey", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [chartRow(), chartRow({ id: "2" })], error: null }] });
    const result = await fetchChartFacts({ supabase, userId: "user-1", requiredFacts: ["house_10"], optionalFacts: [], tags: [] });
    expect(result.data).toHaveLength(1);
  });

  it("sorts required facts first", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [chartRow({ fact_key: "moon_placement", fact_type: "planet_placement" }), chartRow()], error: null }] });
    const result = await fetchChartFacts({ supabase, userId: "user-1", requiredFacts: ["house_10"], optionalFacts: ["moon_placement"], tags: [] });
    expect(result.data[0].factKey).toBe("house_10");
  });

  it("handles empty results as ok true data []", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }] });
    const result = await fetchChartFacts({ supabase, userId: "user-1", requiredFacts: [], optionalFacts: [], tags: [] });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual([]);
  });
});

describe("retrieveAstroRagContext", () => {
  it("returns empty context when input missing", async () => {
    const result = await retrieveAstroRagContext();
    expect(result.chartFacts).toEqual([]);
    expect(result.metadata.partial).toBe(true);
  });

  it("returns empty context when supabase missing", async () => {
    const result = await retrieveAstroRagContext({ userId: "u1", plan: makePlan(), supabase: undefined as never });
    expect(result.metadata.errors).toContain("missing retrieval input");
  });

  it("carries memory summary only when provided", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }], astro_reasoning_rules: [{ data: [], error: null }], astro_benchmark_examples: [{ data: [], error: null }] });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan(), memorySummary: "summary" });
    expect(result.memorySummary).toBe("summary");
  });

  it("does not include memory summary when blank", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }], astro_reasoning_rules: [{ data: [], error: null }], astro_benchmark_examples: [{ data: [], error: null }] });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan(), memorySummary: " " });
    expect(result.memorySummary).toBeUndefined();
  });
});

describe("career retrieval", () => {
  const rows = [chartRow({ fact_key: "lagna", fact_value: "Leo" }), chartRow({ fact_key: "house_10", fact_value: "Taurus" }), chartRow({ fact_key: "lord_10", fact_value: "Venus", fact_type: "lord" }), chartRow({ fact_key: "sun_placement", fact_type: "planet_placement", fact_value: "Sun in Taurus" }), chartRow({ fact_key: "house_11", fact_value: "Gemini" }), chartRow({ fact_key: "current_dasha", fact_type: "timing", fact_value: "Venus" })];
  it("includes career chart facts", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: rows, error: null }],
      astro_reasoning_rules: [{ data: [], error: null }],
      astro_benchmark_examples: [{ data: [], error: null }],
    });
    const result = await retrieveAstroRagContext({ supabase, userId: "user-1", plan: makePlan(), includeTiming: false });
    expect(result.chartFacts.map((fact) => fact.factKey)).toEqual(expect.arrayContaining(["lagna", "house_10", "lord_10", "sun_placement", "house_11", "current_dasha"]));
  });

  it("includes career reasoning rules", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: rows, error: null }],
      astro_reasoning_rules: [{ data: [{ id: "1", rule_key: "career", domain: "career", title: "Career", description: "d", required_fact_types: [], required_tags: ["career"], reasoning_template: "t", weight: 1, safety_notes: [], enabled: true, metadata: {} }], error: null }],
      astro_benchmark_examples: [{ data: [], error: null }],
    });
    const result = await retrieveAstroRagContext({ supabase, userId: "user-1", plan: makePlan(), includeTiming: false });
    expect(result.reasoningRules[0].domain).toBe("career");
  });

  it("includes career benchmark examples", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: rows, error: null }],
      astro_reasoning_rules: [{ data: [], error: null }],
      astro_benchmark_examples: [{ data: [{ id: "1", example_key: "career-1", domain: "career", question: "Q", answer: "A", reasoning: null, accuracy_class: null, reading_style: null, follow_up_question: null, tags: ["career"], metadata: {}, enabled: true }], error: null }],
    });
    const result = await retrieveAstroRagContext({ supabase, userId: "user-1", plan: makePlan(), includeTiming: false });
    expect(result.benchmarkExamples[0].domain).toBe("career");
  });

  it("includes timing windows when allowed", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: rows, error: null }],
      astro_reasoning_rules: [{ data: [], error: null }],
      astro_benchmark_examples: [{ data: [], error: null }],
      astro_timing_windows: [{ data: [{ id: "1", user_id: "user-1", profile_id: null, domain: "career", label: "Window", starts_on: "2026-01-01", ends_on: null, interpretation: "i", source: "dasha", confidence: "strong", tags: ["career"], metadata: {} }], error: null }],
    });
    const result = await retrieveAstroRagContext({ supabase, userId: "user-1", plan: makePlan({ needsTiming: true, timingAllowed: true }), includeTiming: true });
    expect(result.timingWindows).toHaveLength(1);
  });

  it("includes safe remedies when allowed", async () => {
    const remedies = buildSafeRemedies(makePlan({ domain: "career" }));
    expect(remedies[0].restrictions).toContain("no guarantee");
  });

  it("marks metadata.partial false on success", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: rows, error: null }], astro_reasoning_rules: [{ data: [], error: null }], astro_benchmark_examples: [{ data: [], error: null }] });
    const result = await retrieveAstroRagContext({ supabase, userId: "user-1", plan: makePlan(), includeTiming: false });
    expect(result.metadata.partial).toBe(false);
  });
});

describe("sleep retrieval", () => {
  const rows = [chartRow({ fact_key: "house_12", fact_type: "house", fact_value: "Cancer" }), chartRow({ fact_key: "moon_placement", fact_type: "planet_placement", fact_value: "Gemini" }), chartRow({ fact_key: "house_6", fact_type: "house", fact_value: "Capricorn" }), chartRow({ fact_key: "rahu_placement", fact_type: "planet_placement", fact_value: "Cancer" }), chartRow({ fact_key: "ketu_placement", fact_type: "planet_placement", fact_value: "Capricorn" })];
  it("includes sleep facts", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: rows, error: null }], astro_reasoning_rules: [{ data: [], error: null }], astro_benchmark_examples: [{ data: [], error: null }] });
    const result = await retrieveAstroRagContext({ supabase, userId: "user-1", plan: makePlan({ domain: "sleep", requiredFacts: ["house_12", "moon_placement", "house_6"], optionalFacts: ["rahu_placement", "ketu_placement"], retrievalTags: ["sleep"], reasoningRuleDomains: ["sleep"], benchmarkDomains: ["sleep"], remedyAllowed: true }), includeTiming: false });
    expect(result.chartFacts.map((fact) => fact.factKey)).toEqual(expect.arrayContaining(["house_12", "moon_placement", "house_6"]));
  });

  it("builds low-cost safe remedies", async () => {
    const remedies = buildSafeRemedies(makePlan({ domain: "sleep" }));
    expect(remedies.map((item) => item.title)).toEqual(expect.arrayContaining(["Consistent sleep routine", "Gentle evening mantra or breath practice"]));
  });

  it("safe remedies are non-medical", async () => {
    const remedy = buildSafeRemedies(makePlan({ domain: "sleep" }))[0];
    expect(remedy.restrictions.join(" ")).toContain("not medical");
  });

  it("sleep benchmark examples remain compact", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: rows, error: null }],
      astro_reasoning_rules: [{ data: [], error: null }],
      astro_benchmark_examples: [{ data: [{ id: "1", example_key: "sleep-1", domain: "sleep", question: "Q", answer: "A".repeat(1400), reasoning: "R".repeat(900), accuracy_class: null, reading_style: null, follow_up_question: null, tags: ["sleep"], metadata: {}, enabled: true }], error: null }],
    });
    const result = await retrieveAstroRagContext({ supabase, userId: "user-1", plan: makePlan({ domain: "sleep", retrievalTags: ["sleep"], reasoningRuleDomains: ["sleep"], benchmarkDomains: ["sleep"], requiredFacts: ["house_12", "moon_placement", "house_6"], optionalFacts: [] }), includeTiming: false });
    expect(result.benchmarkExamples[0].answer.length).toBeLessThanOrEqual(1200);
  });

  it("does not include medical claims", async () => {
    const remedy = buildSafeRemedies(makePlan({ domain: "sleep" }))[0];
    expect(remedy.description.toLowerCase()).not.toContain("diagnosis");
  });
});

describe("safety blocked retrieval", () => {
  it("does not require chart facts", async () => {
    const safetyPlan = planRequiredData({
      analyzer: { source: "deterministic_fallback", confidence: 1, topic: "safety", questionType: "unsafe", retrievalTags: ["safety"], requiredFacts: [], needsTiming: false, needsRemedy: false, shouldAskFollowup: false } as never,
      safety: { allowed: false, severity: "high", restrictions: ["block"], riskFlags: ["death"], metadata: { timingClaimsAllowed: false, remedyClaimsAllowed: false } } as never,
    });
    expect(safetyPlan.requiredFacts).toEqual([]);
  });

  it("safe remedies are empty", async () => {
    expect(buildSafeRemedies(makePlan({ domain: "safety", blockedBySafety: true, remedyAllowed: false }))).toEqual([]);
  });

  it("reasoning rules can include safety", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }], astro_reasoning_rules: [{ data: [{ id: "1", rule_key: "safety", domain: "safety", title: "Safety", description: "d", required_fact_types: [], required_tags: ["safety"], reasoning_template: "t", weight: 1, safety_notes: [], enabled: true, metadata: {} }], error: null }], astro_benchmark_examples: [{ data: [], error: null }] });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan({ domain: "safety", requiredFacts: [], optionalFacts: [], reasoningRuleDomains: ["safety"], benchmarkDomains: ["safety"], retrievalTags: ["safety"], remedyAllowed: false, blockedBySafety: true }), includeTiming: false, includeRemedies: true });
    expect(result.reasoningRules[0].domain).toBe("safety");
  });

  it("metadata.partial false when repositories succeed", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }], astro_reasoning_rules: [{ data: [], error: null }], astro_benchmark_examples: [{ data: [], error: null }] });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan({ domain: "safety", requiredFacts: [], optionalFacts: [], reasoningRuleDomains: ["safety"], benchmarkDomains: ["safety"], retrievalTags: ["safety"], remedyAllowed: false, blockedBySafety: true }), includeTiming: false, includeRemedies: true });
    expect(result.metadata.partial).toBe(false);
  });
});

describe("partial failure", () => {
  it("chart facts success, rules fail", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: [chartRow()], error: null }],
      astro_reasoning_rules: [{ data: [], error: { message: "rules down" } }],
      astro_benchmark_examples: [{ data: [], error: null }],
    });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan(), includeTiming: false });
    expect(result.metadata.partial).toBe(true);
    expect(result.metadata.errors.join(" ")).toContain("rules down");
  });

  it("chart facts fail, rules success", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: [], error: { message: "facts down" } }],
      astro_reasoning_rules: [{ data: [], error: null }],
      astro_benchmark_examples: [{ data: [], error: null }],
    });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan(), includeTiming: false });
    expect(result.chartFacts).toEqual([]);
    expect(result.metadata.partial).toBe(true);
  });

  it("benchmark fail does not fail whole context", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: [chartRow()], error: null }],
      astro_reasoning_rules: [{ data: [], error: null }],
      astro_benchmark_examples: [{ data: [], error: { message: "bench down" } }],
    });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan(), includeTiming: false });
    expect(result.chartFacts).not.toEqual([]);
    expect(result.metadata.partial).toBe(true);
  });

  it("timing fail does not fail whole context", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: [chartRow()], error: null }],
      astro_reasoning_rules: [{ data: [], error: null }],
      astro_benchmark_examples: [{ data: [], error: null }],
      astro_timing_windows: [{ data: [], error: { message: "timing down" } }],
    });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan({ needsTiming: true, timingAllowed: true }), includeTiming: true });
    expect(result.metadata.partial).toBe(true);
  });

  it("one chart query error and one success returns partial true", async () => {
    const { supabase } = createFakeSupabase({
      astro_chart_facts: [{ data: [], error: { message: "keys down" } }, { data: [chartRow({ fact_key: "house_10" })], error: null }],
      astro_reasoning_rules: [{ data: [], error: null }],
      astro_benchmark_examples: [{ data: [], error: null }],
    });
    const result = await fetchChartFacts({ supabase, userId: "u1", requiredFacts: ["house_10"], optionalFacts: [], tags: ["career"] });
    expect(result.ok).toBe(true);
    expect(result.partial).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });
});

describe("compactness and security", () => {
  it("benchmark answer trimmed to max 1200", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [chartRow()], error: null }], astro_reasoning_rules: [{ data: [], error: null }], astro_benchmark_examples: [{ data: [{ id: "1", example_key: "k", domain: "career", question: "Q", answer: "a".repeat(2000), reasoning: null, accuracy_class: null, reading_style: null, follow_up_question: null, tags: [], metadata: {}, enabled: true }], error: null }] });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan(), includeTiming: false });
    expect(result.benchmarkExamples[0].answer.length).toBeLessThanOrEqual(1200);
  });

  it("benchmark reasoning trimmed to max 800", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [chartRow()], error: null }], astro_reasoning_rules: [{ data: [], error: null }], astro_benchmark_examples: [{ data: [{ id: "1", example_key: "k", domain: "career", question: "Q", answer: "A", reasoning: "r".repeat(2000), accuracy_class: null, reading_style: null, follow_up_question: null, tags: [], metadata: {}, enabled: true }], error: null }] });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan(), includeTiming: false });
    expect(result.benchmarkExamples[0].reasoning?.length).toBeLessThanOrEqual(800);
  });

  it("no raw report fields included in ChartFact metadata beyond compact metadata", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [chartRow()], error: null }], astro_reasoning_rules: [{ data: [], error: null }], astro_benchmark_examples: [{ data: [], error: null }] });
    const result = await fetchChartFacts({ supabase, userId: "u1", requiredFacts: ["house_10"], optionalFacts: [], tags: [] });
    expect(result.data[0].metadata).toEqual({ raw_report: "hidden" });
  });

  it("safe remedies do not mention private artifact names", async () => {
    const remedy = buildSafeRemedies(makePlan({ domain: "career" }))[0];
    expect(JSON.stringify(remedy)).not.toContain("docx");
    expect(JSON.stringify(remedy)).not.toContain("zip");
  });

  it("memorySummary included only if provided", async () => {
    const { supabase } = createFakeSupabase({ astro_chart_facts: [{ data: [], error: null }], astro_reasoning_rules: [{ data: [], error: null }], astro_benchmark_examples: [{ data: [], error: null }] });
    const result = await retrieveAstroRagContext({ supabase, userId: "u1", plan: makePlan(), includeTiming: false });
    expect(result.memorySummary).toBeUndefined();
  });
});
