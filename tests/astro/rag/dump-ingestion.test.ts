import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ingestAstroDump, normalizeDumpRecord, parseDumpLine, verifyAstroDumpCounts } from "../../../scripts/ingest-astro-dump";
import { retrieveAstroRagContext } from "../../../lib/astro/rag/retrieval-service";

function fixturePath() {
  return join(process.cwd(), "tests", "fixtures", "astro-dump-small.jsonl");
}

describe("astro dump ingestion", () => {
  it("parses all dump record types", async () => {
    const lines = readFileSync(fixturePath(), "utf8").trim().split("\n");
    const types = new Set<string>();
    for (const line of lines) {
      const parsed = parseDumpLine(line);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        const normalized = normalizeDumpRecord(parsed.value);
        expect(normalized).toBeTruthy();
        const record = JSON.parse(line) as { record_type: string };
        types.add(record.record_type);
      }
    }
    expect(types).toEqual(new Set(["source_note", "retrieval_tag", "rule", "example", "validation_check", "answer_log_schema"]));
  });

  it("reports malformed line numbers", async () => {
    const badPath = join(process.cwd(), "tests", "fixtures", "astro-dump-bad.jsonl");
    const report = await ingestAstroDump({ filePath: badPath, validateOnly: true });
    expect(report.invalidLines).toBeGreaterThan(0);
    expect(report.errors[0].line).toBe(2);
  });

  it("streams the fixture without writing", async () => {
    const report = await ingestAstroDump({ filePath: fixturePath(), validateOnly: true });
    expect(report.validLines).toBe(7);
    expect(report.recordCounts.rule).toBe(2);
    expect(report.recordCounts.validation_check).toBe(1);
    expect(report.skippedCounts.answer_log_schema).toBe(1);
  });

  it("supports verify-counts mode", async () => {
    const calls: string[] = [];
    const supabase = {
      from(table: string) {
        calls.push(table);
        return {
          select() {
            return {
              limit() {
                return Promise.resolve({ data: [], error: null, count: 0 });
              },
            };
          },
        };
      },
    };
    const counts = await verifyAstroDumpCounts(supabase as never);
    expect(calls).toEqual([
      "astro_reasoning_rules",
      "astro_benchmark_examples",
      "astro_source_notes",
      "astro_retrieval_tags",
      "astro_validation_checks",
    ]);
    expect(counts.astro_reasoning_rules).toBe(0);
  });

  it("backfills only normalized rule columns by rule_id", async () => {
    const updates: Array<{ table: string; values: Record<string, unknown>; ruleKey: string }> = [];
    const supabase = {
      from(table: string) {
        return {
          update(values: Record<string, unknown>) {
            return {
              eq(column: string, value: string) {
                updates.push({ table, values, ruleKey: `${column}:${value}` });
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      },
    };

    const report = await ingestAstroDump({
      filePath: fixturePath(),
      mode: "backfill-normalized",
      supabase: supabase as never,
    });

    expect(report.writtenCounts.astro_reasoning_rules).toBe(2);
    expect(report.errors).toEqual([]);
    expect(updates).toHaveLength(2);
    expect(updates[0].table).toBe("astro_reasoning_rules");
    expect(updates[0].ruleKey).toBe("rule_key:rule_1");
    expect(Object.keys(updates[0].values).sort()).toEqual([
      "aspect_type",
      "dasha_condition",
      "dignity",
      "divisional_chart",
      "house",
      "lordship",
      "normalized_condition",
      "normalized_embedding_text",
      "normalized_interpretation",
      "normalized_prompt_compact_summary",
      "normalized_source_reference",
      "normalized_source_reliability",
      "normalized_source_text",
      "normalized_updated_at",
      "primary_planet",
      "secondary_planet",
      "sign",
      "target_house",
      "transit_condition",
      "yoga_name",
    ].sort());
    expect(updates[0].values).not.toHaveProperty("metadata");
  });

  it("keeps exact facts isolated from dump knowledge", async () => {
    const result = await retrieveAstroRagContext({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      } as never,
      userId: "u1",
      plan: {
        domain: "general",
        answerType: "exact_fact",
        requiredFacts: [],
        optionalFacts: [],
        requiredItems: [],
        optionalItems: [],
        retrievalTags: [],
        reasoningRuleDomains: [],
        benchmarkDomains: [],
        needsTiming: false,
        needsRemedy: false,
        requiresTimingSource: false,
        timingAllowed: false,
        remedyAllowed: false,
        blockedBySafety: false,
        safetyRestrictions: [],
        missingPlanningWarnings: [],
        metadata: { analyzerSource: "deterministic_fallback", analyzerConfidence: 1, safetySeverity: "allow", llmAllowed: false },
      },
    });
    expect(result.reasoningRules).toEqual([]);
    expect(result.benchmarkExamples).toEqual([]);
    expect(result.sourceNotes).toEqual([]);
    expect(result.validationChecks).toEqual([]);
  });
});
