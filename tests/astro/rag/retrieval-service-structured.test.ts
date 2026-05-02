import { describe, expect, it } from "vitest";
import { retrieveAstroRagContext } from "../../../lib/astro/rag/retrieval-service";
import { fetchStructuredReasoningRuleCandidates } from "../../../lib/astro/rag/reasoning-rule-repository";
import type { RetrievalServiceInput } from "../../../lib/astro/rag/retrieval-types";

function makeSupabase(rowsByTable: Record<string, unknown[]>) {
  const calls: Array<{ table: string; filters: Array<[string, string, unknown]>; limit?: number }> = [];
  return {
    calls,
    supabase: {
      from(table: string) {
        const filters: Array<[string, string, unknown]> = [];
        const query = {
          select() { return query; },
          eq(column: string, value: unknown) { filters.push(["eq", column, value]); return query; },
          in(column: string, value: unknown) { filters.push(["in", column, value]); return query; },
          overlaps(column: string, value: unknown) { filters.push(["overlaps", column, value]); return query; },
          order() { return query; },
          limit(count: number) {
            calls.push({ table, filters, limit: count });
            return Promise.resolve({ data: rowsByTable[table] ?? [], error: null });
          },
        };
        return query;
      },
    } as never,
  };
}

const ruleRow = {
  id: "1",
  rule_key: "r1",
  domain: "career",
  title: "Career rule",
  description: "desc",
  required_fact_types: [],
  required_tags: [],
  reasoning_template: "template",
  source_reference: "classical",
  source_reliability: "primary_classical",
  life_area_tags: ["career"],
  condition_tags: ["career"],
  retrieval_keywords: ["career"],
  weight: 10,
  safety_notes: [],
  enabled: true,
  metadata: {},
};

describe("structured retrieval", () => {
  it("applies structured filters and caps the candidate limit", async () => {
    const { supabase, calls } = makeSupabase({ astro_reasoning_rules: [ruleRow] });
    const rows = await fetchStructuredReasoningRuleCandidates(supabase, { domains: ["career"], candidateLimit: 999, limit: 5, lifeAreaTags: ["career"], conditionTags: ["career"], planets: ["Venus"], houses: [7], signs: ["Libra"], requiredTags: ["career"], chartFactTags: ["career"] });
    expect(rows).toHaveLength(1);
    expect(calls[0].limit).toBe(240);
  });

  it("returns no examples as rules", async () => {
    const { supabase } = makeSupabase({ astro_reasoning_rules: [], astro_benchmark_examples: [ruleRow] });
    const rows = await fetchStructuredReasoningRuleCandidates(supabase, { domains: ["career"], limit: 5 });
    expect(rows).toEqual([]);
  });

  it("falls back safely when structured retrieval is unavailable", async () => {
    const { supabase } = makeSupabase({ astro_chart_facts: [], astro_reasoning_rules: [] });
    const input: RetrievalServiceInput = {
      supabase,
      userId: "u1",
      plan: {
        domain: "career",
        answerType: "interpretive",
        requiredFacts: [],
        optionalFacts: [],
        requiredItems: [],
        optionalItems: [],
        retrievalTags: [],
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
      },
      env: { ASTRO_STRUCTURED_RAG_ENABLED: "false" },
    };
    const result = await retrieveAstroRagContext(input);
    expect(result.structuredRagUsed).toBeFalsy();
    expect(result.reasoningRules).toEqual([]);
  });

  it("does not expose ranking metadata in production context", async () => {
    const { supabase } = makeSupabase({ astro_reasoning_rules: [ruleRow], astro_chart_facts: [] });
    const result = await retrieveAstroRagContext({
      supabase,
      userId: "u1",
      plan: {
        domain: "career",
        answerType: "interpretive",
        requiredFacts: [],
        optionalFacts: [],
        requiredItems: [],
        optionalItems: [],
        retrievalTags: [],
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
      },
      env: { ASTRO_STRUCTURED_RAG_ENABLED: "true" },
    });
    expect(result.structuredRagFallbackReason ?? "").not.toContain("rankingReasons");
  });
});
