import { describe, expect, it, vi } from "vitest";
import { fetchBenchmarkExamples } from "../../../lib/astro/rag/benchmark-repository";

function makeQuery(data: unknown[] = [], error: unknown = null) {
  const state: Record<string, unknown> = { selectColumns: "", filters: [], limitCount: null };
  const query: Record<string, unknown> = {
    state,
    select(columns?: string) {
      state.selectColumns = columns ?? "";
      return query;
    },
    eq(column: string, value: unknown) {
      (state.filters as unknown[]).push(["eq", column, value]);
      return query;
    },
    in(column: string, values: unknown[]) {
      (state.filters as unknown[]).push(["in", column, values]);
      return query;
    },
    overlaps(column: string, value: unknown) {
      (state.filters as unknown[]).push(["overlaps", column, value]);
      return query;
    },
    contains(column: string, value: unknown) {
      (state.filters as unknown[]).push(["contains", column, value]);
      return query;
    },
    or(filters: string) {
      (state.filters as unknown[]).push(["or", filters]);
      return query;
    },
    order() {
      return query;
    },
    limit(count: number) {
      state.limitCount = count;
      return Promise.resolve({ data, error });
    },
  };
  return query;
}

describe("fetchBenchmarkExamples", () => {
  it("queries astro_benchmark_examples", async () => {
    const from = vi.fn(() => makeQuery());
    await fetchBenchmarkExamples({ supabase: { from } as never, domains: [], tags: [] });
    expect(from).toHaveBeenCalledWith("astro_benchmark_examples");
  });

  it("filters enabled true", async () => {
    const query = makeQuery();
    await fetchBenchmarkExamples({ supabase: { from: vi.fn(() => query) } as never, domains: [], tags: [] });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["eq", "enabled", true]);
  });

  it("filters domains", async () => {
    const query = makeQuery();
    await fetchBenchmarkExamples({ supabase: { from: vi.fn(() => query) } as never, domains: ["career"], tags: [] });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["in", "domain", ["career"]]);
  });

  it("overlaps tags", async () => {
    const query = makeQuery();
    await fetchBenchmarkExamples({ supabase: { from: vi.fn(() => query) } as never, domains: [], tags: ["career"] });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["overlaps", "tags", ["career"]]);
  });

  it("limits default 6", async () => {
    const query = makeQuery();
    await fetchBenchmarkExamples({ supabase: { from: vi.fn(() => query) } as never, domains: [], tags: [] });
    expect((query.state as Record<string, unknown>).limitCount).toBe(6);
  });

  it("trims long answer reasoning question", async () => {
    const result = await fetchBenchmarkExamples({
      supabase: { from: vi.fn(() => makeQuery([{ id: "1", example_key: "k", domain: "career", question: "x".repeat(400), answer: "a".repeat(1300), reasoning: "r".repeat(900), tags: [], metadata: {}, enabled: true }])) } as never,
      domains: [],
      tags: [],
    });
    expect(result.data[0].question.length).toBeLessThanOrEqual(300);
    expect(result.data[0].answer.length).toBeLessThanOrEqual(1200);
    expect(result.data[0].reasoning?.length).toBeLessThanOrEqual(800);
  });

  it("maps snake_case to camelCase", async () => {
    const result = await fetchBenchmarkExamples({
      supabase: { from: vi.fn(() => makeQuery([{ id: "1", example_key: "career-1", domain: "career", question: "Q", answer: "A", reasoning: null, accuracy_class: "mostly_accurate", reading_style: "direct", follow_up_question: "Next?", tags: ["career"], metadata: { x: 1 }, enabled: true }])) } as never,
      domains: [],
      tags: [],
    });
    expect(result.data[0]).toMatchObject({ exampleKey: "career-1", accuracyClass: "mostly_accurate", readingStyle: "direct" });
  });

  it("handles error without throw", async () => {
    const result = await fetchBenchmarkExamples({ supabase: { from: vi.fn(() => makeQuery([], { message: "boom" })) } as never, domains: [], tags: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("boom");
  });
});
