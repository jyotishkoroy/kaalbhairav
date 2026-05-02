import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ingestAstroDump, normalizeDumpRecord, parseDumpLine } from "../../../scripts/ingest-astro-dump";
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
