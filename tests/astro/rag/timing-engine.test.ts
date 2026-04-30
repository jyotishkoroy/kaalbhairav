import { describe, expect, it, vi } from "vitest";
import { buildTimingContext, mapStoredTimingWindow } from "../../../lib/astro/rag/timing-engine";
import type { ChartFact } from "../../../lib/astro/rag/chart-fact-extractor";
import type { RequiredDataPlan } from "../../../lib/astro/rag/required-data-planner";
import type { RetrievalContext, TimingWindow } from "../../../lib/astro/rag/retrieval-types";

function plan(overrides: Partial<RequiredDataPlan> = {}): RequiredDataPlan {
  return {
    domain: "career",
    answerType: "timing",
    requiredFacts: [],
    optionalFacts: [],
    requiredItems: [],
    optionalItems: [],
    retrievalTags: [],
    reasoningRuleDomains: [],
    benchmarkDomains: [],
    needsTiming: true,
    needsRemedy: false,
    requiresTimingSource: true,
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
  return {
    chartFacts: [],
    reasoningRules: [],
    benchmarkExamples: [],
    timingWindows: [],
    safeRemedies: [],
    metadata: { userId: "u", profileId: null, domain: "career", requestedFactKeys: [], retrievalTags: [], errors: [], partial: false },
    ...overrides,
  };
}

function dashaFact(overrides: Partial<ChartFact> = {}): ChartFact {
  return {
    factType: "dasha",
    factKey: "current_mahadasha",
    factValue: "Saturn Mahadasha",
    source: "chart_json",
    confidence: "deterministic",
    tags: ["timing"],
    metadata: {},
    ...overrides,
  } as ChartFact;
}

function varshaphalFact(overrides: Partial<ChartFact> = {}): ChartFact {
  return {
    factType: "varshaphal",
    factKey: "varshaphal_2026",
    factValue: "2026",
    source: "chart_json",
    confidence: "deterministic",
    tags: ["timing"],
    metadata: {},
    ...overrides,
  } as ChartFact;
}

function storedWindow(overrides: Partial<TimingWindow> = {}): TimingWindow {
  return {
    id: "1",
    userId: "u",
    profileId: null,
    domain: "career",
    label: "stored",
    startsOn: "2026-01-01",
    endsOn: "2026-06-30",
    interpretation: "stored",
    source: "stored",
    confidence: "strong",
    tags: ["timing"],
    metadata: {},
    ...overrides,
  };
}

describe("timing-engine", () => {
  it("buildTimingContext() no args returns available false", async () => {
    await expect(buildTimingContext()).resolves.toMatchObject({ available: false });
  });
  it("plan requires timing but context empty -> missing timing_source", async () => {
    await expect(buildTimingContext({ plan: plan(), context: context() })).resolves.toMatchObject({ available: false, missingSources: ["timing_source"] });
  });
  it("plan timingAllowed false with stored windows -> restricted", async () => {
    await expect(buildTimingContext({ plan: plan({ timingAllowed: false, needsTiming: true }), context: context({ timingWindows: [storedWindow()] }) })).resolves.toMatchObject({ available: false, limitation: "Timing claims are restricted for this question." });
  });
  it("unsafe/death plan blocked by safety", async () => {
    await expect(buildTimingContext({ question: "Can I die?", plan: plan(), context: context() })).resolves.toMatchObject({ available: false });
  });
  it("vague no source does not invent timing", async () => {
    await expect(buildTimingContext({ question: "Will I get promoted soon?", plan: plan(), context: context() })).resolves.toMatchObject({ available: false });
  });
  it("next month second half question with no source does not produce window", async () => {
    await expect(buildTimingContext({ question: "Will I get promoted next month second half?", plan: plan(), context: context() })).resolves.toMatchObject({ available: false });
  });
  it("context partial adds warning", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ metadata: { ...context().metadata, partial: true } }) });
    expect(r.warnings.join(" ")).toContain("partial");
  });
  it("no timing requested and no windows -> requested false", async () => {
    const r = await buildTimingContext({ plan: { ...plan(), needsTiming: false, requiresTimingSource: false }, context: context() });
    expect(r.requested).toBe(false);
    expect(r.available).toBe(false);
  });

  it("current_mahadasha with metadata startsOn/endsOn creates strong dasha window", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [dashaFact({ metadata: { startsOn: "2020-01-01", endsOn: "2036-01-01" } })] }) });
    expect(r.windows[0]).toMatchObject({ source: "dasha", confidence: "strong", startsOn: "2020-01-01" });
  });
  it("current_antardasha with ISO range in factValue creates strong dasha window", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [dashaFact({ factKey: "current_antardasha", factValue: "2025-01-01 to 2027-01-01" })] }) });
    expect(r.windows[0]).toMatchObject({ source: "dasha", confidence: "strong" });
  });
  it("dasha fact with no dates creates partial backdrop", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [dashaFact({ metadata: {} })] }) });
    expect(r.windows[0]).toMatchObject({ source: "dasha", confidence: "partial" });
  });
  it("invalid date in dasha fact creates warning", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [dashaFact({ metadata: { startsOn: "2026-13-01" } })] }) });
    expect(r.warnings.join(" ")).toContain("invalid");
  });
  it("multiple dasha facts dedupe", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [dashaFact(), dashaFact()] }) });
    expect(r.windows.length).toBe(1);
  });
  it("dasha tags include timing/dasha", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [dashaFact()] }) });
    expect(r.windows[0].tags).toEqual(expect.arrayContaining(["timing", "dasha"]));
  });
  it("dasha factKeys include source factKey", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [dashaFact({ factKey: "current_mahadasha" })] }) });
    expect(r.windows[0].factKeys).toContain("current_mahadasha");
  });
  it("dasha windows counted in metadata", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [dashaFact()] }) });
    expect(r.metadata.sourceCounts.dasha).toBeGreaterThan(0);
  });

  it("varshaphal fact with metadata dates creates strong window", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [varshaphalFact({ metadata: { startsOn: "2026-01-01", endsOn: "2026-12-31" } })] }) });
    expect(r.windows[0]).toMatchObject({ source: "varshaphal", confidence: "strong" });
  });
  it("varshaphal fact with year 2026 creates full-year partial window", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [varshaphalFact()] }) });
    expect(r.windows[0]).toMatchObject({ startsOn: "2026-01-01", endsOn: "2026-12-31", confidence: "partial" });
  });
  it("varshaphal fact with no date/year creates partial backdrop", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [varshaphalFact({ factValue: "Varshaphal period", metadata: {} })] }) });
    expect(r.windows[0]).toMatchObject({ source: "varshaphal" });
  });
  it("invalid varshaphal date rejected", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [varshaphalFact({ metadata: { startsOn: "2026-99-01" } })] }) });
    expect(r.windows.length).toBe(0);
  });
  it("varshaphal source counted", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [varshaphalFact()] }) });
    expect(r.metadata.sourceCounts.varshaphal).toBeGreaterThan(0);
  });
  it("factKeys preserved", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [varshaphalFact({ factKey: "varshaphal_2026" })] }) });
    expect(r.windows[0].factKeys).toContain("varshaphal_2026");
  });
  it("does not invent monthly sub-window", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [varshaphalFact()] }) });
    expect(r.windows[0].startsOn).toBe("2026-01-01");
  });

  it("stored timing window maps correctly", () => {
    expect(mapStoredTimingWindow(storedWindow())).toMatchObject({ source: "stored", label: "stored" });
  });
  it("dasha source timing window maps correctly", () => {
    expect(mapStoredTimingWindow(storedWindow({ source: "dasha" }))).toMatchObject({ source: "dasha" });
  });
  it("strong confidence sorted before partial", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ timingWindows: [storedWindow({ confidence: "partial", label: "p", startsOn: "2026-02-01" }), storedWindow({ confidence: "strong", label: "s", startsOn: "2026-01-01" })] }) });
    expect(r.windows[0].label).toBe("s");
  });
  it("startsOn sorted ascending within confidence", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ timingWindows: [storedWindow({ label: "b", startsOn: "2026-02-01" }), storedWindow({ label: "a", startsOn: "2026-01-01" })] }) });
    expect(r.windows.map((w) => w.label)).toEqual(["a", "b"]);
  });
  it("invalid stored date range rejected", () => {
    expect(mapStoredTimingWindow(storedWindow({ startsOn: "2026-02-01", endsOn: "2026-01-01" }))).toBeNull();
  });
  it("domain preserved", () => {
    expect(mapStoredTimingWindow(storedWindow({ domain: "money" }))?.domain).toBe("money");
  });
  it("metadata usedStoredWindows true", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ timingWindows: [storedWindow()] }) });
    expect(r.metadata.usedStoredWindows).toBe(true);
  });
  it("sourceCounts stored increments", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ timingWindows: [storedWindow()] }) });
    expect(r.metadata.sourceCounts.stored).toBe(1);
  });

  it("explicit startsOn/endsOn creates user_provided window", async () => {
    const r = await buildTimingContext({ plan: plan(), explicitUserDates: [{ startsOn: "2026-01-01", endsOn: "2026-02-01" }] });
    expect(r.windows[0]).toMatchObject({ source: "user_provided" });
  });
  it("explicit startsOn only accepted", async () => {
    const r = await buildTimingContext({ plan: plan(), explicitUserDates: [{ startsOn: "2026-01-01" }] });
    expect(r.windows[0]).toMatchObject({ startsOn: "2026-01-01" });
  });
  it("invalid date rejected", async () => {
    const r = await buildTimingContext({ plan: plan(), explicitUserDates: [{ startsOn: "2026-13-01" }] });
    expect(r.windows).toHaveLength(0);
  });
  it("endsOn before startsOn rejected", async () => {
    const r = await buildTimingContext({ plan: plan(), explicitUserDates: [{ startsOn: "2026-02-01", endsOn: "2026-01-01" }] });
    expect(r.windows).toHaveLength(0);
  });
  it("user_provided counted", async () => {
    const r = await buildTimingContext({ plan: plan(), explicitUserDates: [{ startsOn: "2026-01-01" }] });
    expect(r.metadata.sourceCounts.user_provided).toBe(1);
  });

  it("oracleVmTimingEnabled true + adapter returns python window", async () => {
    const r = await buildTimingContext({ plan: plan(), flags: { oracleVmTimingEnabled: true, timingSource: "report_only" } as never, pythonAdapter: vi.fn(async () => [{ label: "p", domain: "career", interpretation: "i", source: "python_transit" as const, confidence: "strong" as const, tags: [], metadata: {} }]) as never });
    expect(r.windows[0].source).toBe("python_transit");
  });
  it("timingSource python_oracle + adapter returns python window", async () => {
    const r = await buildTimingContext({ plan: plan(), flags: { oracleVmTimingEnabled: false, timingSource: "python_oracle" } as never, pythonAdapter: vi.fn(async () => [{ label: "p", domain: "career", interpretation: "i", source: "python_transit" as const, confidence: "strong" as const, tags: [], metadata: {} }]) as never });
    expect(r.windows[0].source).toBe("python_transit");
  });
  it("flags disabled does not call adapter", async () => {
    const adapter = vi.fn(async () => [{ label: "p", domain: "career", interpretation: "i", source: "python_transit" as const, confidence: "strong" as const, tags: [], metadata: {} }]);
    await buildTimingContext({ plan: plan(), flags: { oracleVmTimingEnabled: false, timingSource: "report_only" } as never, pythonAdapter: adapter });
    expect(adapter).not.toHaveBeenCalled();
  });
  it("adapter failure adds warning and no throw", async () => {
    const r = await buildTimingContext({ plan: plan(), flags: { oracleVmTimingEnabled: true, timingSource: "report_only" } as never, pythonAdapter: vi.fn(async () => { throw new Error("x"); }) as never });
    expect(r.warnings.join(" ")).toContain("Python timing adapter failed");
  });
  it("python windows sorted with other sources", async () => {
    const r = await buildTimingContext({ plan: plan(), flags: { oracleVmTimingEnabled: true, timingSource: "report_only" } as never, context: context({ timingWindows: [storedWindow({ label: "stored", startsOn: "2026-02-01" })] }), pythonAdapter: vi.fn(async () => [{ label: "python", domain: "career", interpretation: "i", source: "python_transit" as const, confidence: "partial" as const, tags: [], metadata: {}, startsOn: "2026-01-01" }]) as never });
    expect(r.windows.map((w) => w.label)).toEqual(["stored", "python"]);
  });

  it("duplicate windows deduped", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ timingWindows: [storedWindow(), storedWindow()] }) });
    expect(r.windows).toHaveLength(1);
  });
  it("max 8 windows", async () => {
    const timingWindows = Array.from({ length: 10 }, (_, i) => storedWindow({ label: `w${i}`, startsOn: `2026-01-${String(i + 1).padStart(2, "0")}` }));
    const r = await buildTimingContext({ plan: plan(), context: context({ timingWindows }) });
    expect(r.windows.length).toBeLessThanOrEqual(8);
  });
  it("source priority applied", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ timingWindows: [storedWindow({ source: "user_provided", label: "u", startsOn: "2026-01-02" }), storedWindow({ source: "stored", label: "s", startsOn: "2026-01-02" })] }) });
    expect(r.windows[0].source).toBe("stored");
  });
  it("label fallback deterministic", () => {
    expect(mapStoredTimingWindow({ ...storedWindow(), label: "" } as never)?.label).toBe("Timing window");
  });

  it("required-data timing plan feeds into timing engine", async () => {
    const r = await buildTimingContext({ question: "when", plan: { ...plan(), requiresTimingSource: true }, context: context() });
    expect(r.missingSources).toContain("timing_source");
  });
  it("retrieval context timingWindows used", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ timingWindows: [storedWindow()] }) });
    expect(r.windows[0].source).toBe("stored");
  });
  it("reasoningPath partial warning preserved if provided", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context(), reasoningPath: { domain: "career", steps: [], selectedRuleKeys: [], selectedRuleIds: [], missingAnchors: [], warnings: ["partial"], summary: "", metadata: { factCount: 0, ruleCount: 0, partial: true, stored: false } } });
    expect(r.warnings).toContain("partial");
  });
  it("safety restricted timing plan blocks windows", async () => {
    const r = await buildTimingContext({ question: "court win", plan: { ...plan(), blockedBySafety: true }, context: context({ timingWindows: [storedWindow()] }) });
    expect(r.available).toBe(false);
  });
  it("exact fact plan does not require timing", async () => {
    const r = await buildTimingContext({ plan: { ...plan(), answerType: "exact_fact", needsTiming: false, requiresTimingSource: false }, context: context() });
    expect(r.requested).toBe(false);
  });

  it("manual no hallucinated timing prompt", async () => {
    const r = await buildTimingContext({ question: "Will I get promoted next month second half?", plan: plan(), context: context() });
    expect(JSON.stringify(r)).not.toContain("next month second half");
  });
  it("manual dasha no date stays backdrop", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [dashaFact({ metadata: {} })] }) });
    expect(r.windows[0].startsOn).toBeUndefined();
  });
  it("manual varshaphal year does not split monthly", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ chartFacts: [varshaphalFact()] }) });
    expect(r.windows[0]).toMatchObject({ startsOn: "2026-01-01", endsOn: "2026-12-31" });
  });
  it("manual stored strong career sorted", async () => {
    const r = await buildTimingContext({ plan: plan(), context: context({ timingWindows: [storedWindow({ label: "career", startsOn: "2026-01-01" })] }) });
    expect(r.windows[0].label).toBe("career");
  });
  it("manual safety restricted", async () => {
    const r = await buildTimingContext({ question: "death date", plan: plan(), context: context() });
    expect(r.available).toBe(false);
  });
});
