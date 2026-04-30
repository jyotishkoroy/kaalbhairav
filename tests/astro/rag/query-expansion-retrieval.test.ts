/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from "vitest";
import { retrieveAstroRagContext } from "../../../lib/astro/rag/retrieval-service";
import type { RequiredDataPlan } from "../../../lib/astro/rag/required-data-planner";

function makePlan(overrides: Partial<RequiredDataPlan> = {}): RequiredDataPlan {
  return {
    domain: "career",
    answerType: "interpretive",
    requiredFacts: ["lagna", "house_10", "lord_10"],
    optionalFacts: ["sun_placement", "house_11", "current_dasha"],
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

function fakeSupabase() {
  const logs: Array<{ table: string; filters: unknown[] }> = [];
  const supabase = {
    from(table: string) {
      const filters: unknown[] = [];
      return {
        select() {
          logs.push({ table, filters });
          return this;
        },
        eq(column: string, value: unknown) {
          filters.push(["eq", column, value]);
          return this;
        },
        in(column: string, value: unknown[]) {
          filters.push(["in", column, value]);
          return this;
        },
        contains(column: string, value: unknown) {
          filters.push(["contains", column, value]);
          return this;
        },
        overlaps(column: string, value: unknown) {
          filters.push(["overlaps", column, value]);
          return this;
        },
        or(value: string) {
          filters.push(["or", value]);
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return Promise.resolve({ data: [], error: null });
        },
      };
    },
  };
  return { supabase: supabase as never, logs };
}

describe("query expansion retrieval integration", () => {
  it("query expansion disabled by default preserves the old retrieval tags", async () => {
    const { supabase, logs } = fakeSupabase();
    await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?" });
    expect(logs.some((entry) => JSON.stringify(entry.filters).includes('"overlaps","tags"'))).toBe(true);
    expect(JSON.stringify(logs)).toContain("career");
  });

  it("ASTRO_RAG_ENABLED alone does not enable query expansion", async () => {
    const { supabase, logs } = fakeSupabase();
    await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?", env: { ASTRO_RAG_ENABLED: "true" } });
    expect(logs.some((entry) => JSON.stringify(entry.filters).includes('"overlaps","tags"'))).toBe(true);
  });

  it("enabled flag activates deterministic expansion", async () => {
    const { supabase, logs } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.mode).toBe("fallback");
    expect(result.queryExpansion?.searchTerms).toEqual(expect.arrayContaining(["promotion", "recognition", "authority"]));
    expect(JSON.stringify(logs)).toContain("promotion");
  });

  it("no client injected still uses deterministic expansion only", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.source).toBe("deterministic");
    expect(result.queryExpansion?.mode).toBe("fallback");
  });

  it("local client is not called when disabled", async () => {
    const { supabase } = fakeSupabase();
    const client = { expand: vi.fn().mockResolvedValue({ searchTerms: ["career"] }) };
    await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "false" }, queryExpansionClient: client });
    expect(client.expand).not.toHaveBeenCalled();
  });

  it("local client is not called when exact fact matched", async () => {
    const { supabase } = fakeSupabase();
    const client = { expand: vi.fn().mockResolvedValue({ searchTerms: ["career"] }) };
    await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "What is my Lagna?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" }, exactFactMatched: true, queryExpansionClient: client });
    expect(client.expand).not.toHaveBeenCalled();
  });

  it("expansion failure falls back to original retrieval", async () => {
    const { supabase, logs } = fakeSupabase();
    const client = { expand: vi.fn().mockRejectedValue(new Error("offline")) };
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" }, queryExpansionClient: client });
    expect(result.queryExpansion?.mode).toBe("fallback");
    expect(JSON.stringify(logs)).toContain("career");
  });

  it("career adds promotion recognition authority terms", async () => {
    const { supabase, logs } = fakeSupabase();
    await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Why no recognition at work?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(JSON.stringify(logs)).toContain("recognition");
  });

  it("career keeps the original question primary internally", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "I am working hard and not getting promotion.", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.metadata.requestedFactKeys).toEqual(["lagna", "house_10", "lord_10"]);
  });

  it("sleep remedy adds safe sleep terms", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan({ domain: "sleep", retrievalTags: ["sleep"], reasoningRuleDomains: ["sleep"], benchmarkDomains: ["sleep"] }), question: "Give me remedy for bad sleep.", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.searchTerms).toEqual(expect.arrayContaining(["sleep", "restlessness", "safe remedy"]));
  });

  it("marriage delay adds marriage and 7th house hints", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan({ domain: "marriage", retrievalTags: ["marriage"], reasoningRuleDomains: ["marriage"], benchmarkDomains: ["marriage"] }), question: "Is marriage delayed?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.chartAnchors).toEqual(expect.arrayContaining(["house_7", "venus"]));
  });

  it("money debt adds money and debt terms", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan({ domain: "money", retrievalTags: ["money"], reasoningRuleDomains: ["money"], benchmarkDomains: ["money"] }), question: "Will debt reduce?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.searchTerms).toEqual(expect.arrayContaining(["money", "debt", "business"]));
  });

  it("vague questions do not over-expand", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan({ domain: "general", retrievalTags: ["general"], reasoningRuleDomains: ["general"], benchmarkDomains: ["general"] }), question: "What will happen?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.used).toBe(false);
  });

  it("max terms are enforced", async () => {
    const { supabase } = fakeSupabase();
    const client = { expand: vi.fn().mockResolvedValue({ searchTerms: Array.from({ length: 50 }, (_, index) => `term-${index}`), chartAnchors: Array.from({ length: 50 }, (_, index) => `anchor-${index}`), requiredEvidence: [], safetyNotes: [], warnings: [], domains: ["career"], mode: "local_model", source: "ollama", shouldUseExpandedQuery: true }) };
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" }, queryExpansionClient: client });
    expect(result.expandedSearchTerms?.length).toBeLessThanOrEqual(12);
  });

  it("duplicate terms are deduped", async () => {
    const { supabase } = fakeSupabase();
    const client = { expand: vi.fn().mockResolvedValue({ searchTerms: ["career", "career", "promotion"], chartAnchors: [], requiredEvidence: [], safetyNotes: [], warnings: [], domains: ["career"], mode: "local_model", source: "ollama", shouldUseExpandedQuery: true }) };
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" }, queryExpansionClient: client });
    expect(result.expandedSearchTerms).toEqual(expect.arrayContaining(["career", "promotion"]));
    expect(new Set(result.expandedSearchTerms).size).toBe(result.expandedSearchTerms?.length);
  });

  it("unsafe and PII terms are stripped", async () => {
    const { supabase } = fakeSupabase();
    const client = { expand: vi.fn().mockResolvedValue({ searchTerms: ["abc@example.com", "08:30", "career"], chartAnchors: ["lagna", "sk_test_abc"], requiredEvidence: [], safetyNotes: [], warnings: [], domains: ["career"], mode: "local_model", source: "ollama", shouldUseExpandedQuery: true }) };
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" }, queryExpansionClient: client });
    expect(result.expandedSearchTerms).not.toEqual(expect.arrayContaining(["abc@example.com", "08:30"]));
  });

  it("death and lifespan expansion stays safety only", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan({ domain: "safety", retrievalTags: ["safety"], reasoningRuleDomains: ["safety"], benchmarkDomains: ["safety"], blockedBySafety: true, remedyAllowed: false }), question: "Can my chart tell when I will die?", safetyRisks: ["death"], env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.domains).toContain("safety");
    expect(result.queryExpansion?.searchTerms).toEqual(expect.arrayContaining(["safety boundary"]));
  });

  it("medical expansion does not add diagnosis or cure claims", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan({ domain: "safety", retrievalTags: ["safety"], reasoningRuleDomains: ["safety"], benchmarkDomains: ["safety"], blockedBySafety: true, remedyAllowed: false }), question: "Do I have cancer?", safetyRisks: ["medical"], env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.searchTerms).toEqual(expect.arrayContaining(["medical safety"]));
  });

  it("legal expansion stays conservative", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan({ domain: "safety", retrievalTags: ["safety"], reasoningRuleDomains: ["safety"], benchmarkDomains: ["safety"], blockedBySafety: true, remedyAllowed: false }), question: "Can I get a legal guarantee?", safetyRisks: ["legal"], env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.searchTerms).toEqual(expect.arrayContaining(["legal safety"]));
  });

  it("self-harm expansion stays safety-only", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan({ domain: "safety", retrievalTags: ["safety"], reasoningRuleDomains: ["safety"], benchmarkDomains: ["safety"], blockedBySafety: true, remedyAllowed: false }), question: "I want to die.", safetyRisks: ["self_harm"], env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.searchTerms).toEqual(expect.arrayContaining(["crisis support"]));
  });

  it("financial guarantee blocks profit style expansion terms", async () => {
    const { supabase } = fakeSupabase();
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan({ domain: "safety", retrievalTags: ["safety"], reasoningRuleDomains: ["safety"], benchmarkDomains: ["safety"], blockedBySafety: true, remedyAllowed: false }), question: "Which stock guarantees profit?", safetyRisks: ["financial_guarantee"], env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } });
    expect(result.queryExpansion?.searchTerms).toEqual(expect.arrayContaining(["financial safety", "no guarantee"]));
  });

  it("expanded metadata stays sanitized", async () => {
    const { supabase } = fakeSupabase();
    const client = { expand: vi.fn().mockResolvedValue({ searchTerms: ["career"], chartAnchors: ["house_10"], requiredEvidence: ["dasha_context"], safetyNotes: ["low risk"], warnings: ["note"], domains: ["career"], mode: "local_model", source: "ollama", shouldUseExpandedQuery: true }) };
    const result = await retrieveAstroRagContext({ supabase, userId: "u", plan: makePlan(), question: "Will I get promotion?", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" }, queryExpansionClient: client });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("token");
  });
});
