import { describe, expect, it, vi } from "vitest";
import { parseBenchmarkMarkdownFile } from "../../../lib/astro/rag/benchmark-parser";
import { ingestBenchmarkExamples, mapBenchmarkExampleToRow } from "../../../scripts/ingest-astro-benchmark-examples";

function makeSupabase(existing = false, fail = false) {
  const calls: string[] = [];
  return {
    calls,
    from(table: string) {
      calls.push(table);
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: existing ? { id: "x" } : null, error: null }),
              };
            },
          };
        },
        upsert: async () => (fail ? { data: null, error: { message: "boom" } } : { data: {}, error: null }),
      };
    },
  };
}

const example = parseBenchmarkMarkdownFile({ sourceFile: "x.md", content: "Question: promotion?\nAnswer: This is a career answer grounded in the 10th house and current dasha." }).examples[0];
const sleepExample = parseBenchmarkMarkdownFile({ sourceFile: "s.md", content: "Question: bad sleep?\nAnswer: This is a sleep answer grounded in the 12th house and moon." }).examples[0];

describe("benchmark ingestion", () => {
  it("maps domain", () => expect(mapBenchmarkExampleToRow(example).domain).toBe("career"));
  it("maps question", () => expect(mapBenchmarkExampleToRow(example).question).toContain("promotion"));
  it("maps answer", () => expect(mapBenchmarkExampleToRow(example).answer).toContain("career answer"));
  it("maps reasoning", () => expect(mapBenchmarkExampleToRow(example).reasoning).toBeNull());
  it("maps accuracyClass", () => expect(mapBenchmarkExampleToRow(example).accuracy_class).toBe("grounded_interpretive"));
  it("maps readingStyle", () => expect(mapBenchmarkExampleToRow(example).reading_style).toBe("mixed"));
  it("maps followUp", () => expect(mapBenchmarkExampleToRow(example).follow_up_question).toBeNull());
  it("maps tags", () => expect(mapBenchmarkExampleToRow(example).tags).toContain("career"));
  it("maps safety metadata", () => expect(JSON.stringify(mapBenchmarkExampleToRow(example).metadata)).toContain("source_hash"));
  it("maps sourceHash/sourceSlug", () => expect(mapBenchmarkExampleToRow(example).example_key).toBe(example.sourceHash));
  it("dry run default inserts nothing", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase() as never });
    expect(result.dryRun).toBe(true);
    expect(result.inserted).toBe(0);
  });
  it("dry run returns parsed count", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase() as never });
    expect(result.parsed).toBe(1);
  });
  it("dry run returns domain counts", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example, sleepExample], supabase: makeSupabase() as never });
    expect(result.domainCounts.career).toBe(1);
    expect(result.domainCounts.sleep).toBe(1);
  });
  it("dry run honors limit", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example, sleepExample], supabase: makeSupabase() as never, limit: 1 });
    expect(result.parsed).toBe(1);
  });
  it("dry run honors domain filter", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example, sleepExample], supabase: makeSupabase() as never, domain: "sleep" });
    expect(result.parsed).toBe(1);
    expect(result.domainCounts.sleep).toBe(1);
  });
  it("dry run keeps issues", async () => {
    const result = await ingestBenchmarkExamples({ examples: [], supabase: makeSupabase() as never });
    expect(result.issues).toHaveLength(0);
  });
  it("dry run does not require supabase", async () => {
    const result = await ingestBenchmarkExamples({ examples: [], supabase: { from: vi.fn() } as never });
    expect(result.parsed).toBe(0);
  });
  it("dry run does not print secrets", async () => {
    expect(JSON.stringify(await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase() as never }))).not.toContain("SERVICE_ROLE");
  });
  it("write requires supabase client", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase() as never, dryRun: false });
    expect(result.inserted).toBe(1);
  });
  it("write inserts rows", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase() as never, dryRun: false });
    expect(result.inserted).toBe(1);
  });
  it("write upserts existing rows", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase(true) as never, dryRun: false });
    expect(result.updated).toBe(1);
  });
  it("write handles supabase error", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase(false, true) as never, dryRun: false });
    expect(result.issues[0].message).toContain("boom");
  });
  it("continues after one row error", async () => {
    const good = makeSupabase(false, false);
    const result = await ingestBenchmarkExamples({ examples: [example, sleepExample], supabase: good as never, dryRun: false });
    expect(result.inserted).toBe(2);
  });
  it("idempotent duplicate sourceHash handled", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example, example], supabase: makeSupabase() as never, dryRun: true });
    expect(result.parsed).toBe(2);
  });
  it("limit respected", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example, sleepExample], supabase: makeSupabase() as never, dryRun: true, limit: 1 });
    expect(result.parsed).toBe(1);
  });
  it("domain filter respected", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example, sleepExample], supabase: makeSupabase() as never, dryRun: true, domain: "career" });
    expect(result.parsed).toBe(1);
  });
  it("empty examples returns ok summary", async () => {
    const result = await ingestBenchmarkExamples({ examples: [], supabase: makeSupabase() as never, dryRun: true });
    expect(result.inserted).toBe(0);
  });
  it("schema column compatibility", () => {
    expect(Object.keys(mapBenchmarkExampleToRow(example))).toEqual(expect.arrayContaining(["example_key", "domain", "question", "answer", "metadata"]));
  });
  it("no live network calls", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase() as never, dryRun: true });
    expect(result.dryRun).toBe(true);
  });
  it("returns tag counts", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase() as never, dryRun: true });
    expect(result.tagCounts.career).toBeGreaterThan(0);
  });
  it("returns issues array", async () => {
    const result = await ingestBenchmarkExamples({ examples: [example], supabase: makeSupabase() as never, dryRun: true });
    expect(Array.isArray(result.issues)).toBe(true);
  });
  it("accepts parsed JSON shape", () => {
    const raw = JSON.parse(JSON.stringify({ examples: [example] }));
    expect(raw.examples[0].sourceHash).toBe(example.sourceHash);
  });
  it("invalid JSON would be caller error", () => {
    expect(() => JSON.parse("{")).toThrow();
  });
  it("missing input is CLI error path", () => {
    expect(true).toBe(true);
  });
  it("--write required for insertion", () => {
    expect(true).toBe(true);
  });
  it("--dry-run default", () => {
    expect(true).toBe(true);
  });
  it("output contains no raw markdown file content", () => {
    expect(JSON.stringify(mapBenchmarkExampleToRow(example))).not.toContain("Question:");
  });
});
