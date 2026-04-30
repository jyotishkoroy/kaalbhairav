import { describe, expect, it, vi } from "vitest";
import { fetchTimingWindows } from "../../../lib/astro/rag/timing-repository";

function makeQuery(data: unknown[] = [], error: unknown = null) {
  const state: Record<string, unknown> = { selectColumns: "", filters: [], orders: [], limitCount: null };
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
    in(column: string, value: unknown[]) {
      (state.filters as unknown[]).push(["in", column, value]);
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
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
      (state.orders as unknown[]).push([column, options]);
      return query;
    },
    limit(count: number) {
      state.limitCount = count;
      return Promise.resolve({ data, error });
    },
  };
  return query;
}

describe("fetchTimingWindows", () => {
  it("queries astro_timing_windows", async () => {
    const from = vi.fn(() => makeQuery());
    await fetchTimingWindows({ supabase: { from } as never, userId: "u1" });
    expect(from).toHaveBeenCalledWith("astro_timing_windows");
  });

  it("filters user_id", async () => {
    const query = makeQuery();
    await fetchTimingWindows({ supabase: { from: vi.fn(() => query) } as never, userId: "u1" });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["eq", "user_id", "u1"]);
  });

  it("filters profile_id when provided", async () => {
    const query = makeQuery();
    await fetchTimingWindows({ supabase: { from: vi.fn(() => query) } as never, userId: "u1", profileId: "p1" });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["eq", "profile_id", "p1"]);
  });

  it("filters domain when provided", async () => {
    const query = makeQuery();
    await fetchTimingWindows({ supabase: { from: vi.fn(() => query) } as never, userId: "u1", domain: "career" });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["or", "domain.eq.career,domain.eq.general"]);
  });

  it("overlaps tags", async () => {
    const query = makeQuery();
    await fetchTimingWindows({ supabase: { from: vi.fn(() => query) } as never, userId: "u1", tags: ["career"] });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["overlaps", "tags", ["career"]]);
  });

  it("sorts startsOn asc and strong before partial", async () => {
    const result = await fetchTimingWindows({
      supabase: { from: vi.fn(() => makeQuery([
        { id: "2", user_id: "u1", profile_id: null, domain: "career", label: "B", starts_on: "2026-02-01", ends_on: null, interpretation: "b", source: "stored", confidence: "partial", tags: [], metadata: {} },
        { id: "1", user_id: "u1", profile_id: null, domain: "career", label: "A", starts_on: "2026-01-01", ends_on: null, interpretation: "a", source: "stored", confidence: "strong", tags: [], metadata: {} },
      ])) } as never,
      userId: "u1",
      domain: "career",
    });
    expect(result.data.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("maps rows to TimingWindow", async () => {
    const result = await fetchTimingWindows({
      supabase: { from: vi.fn(() => makeQuery([{ id: "1", user_id: "u1", profile_id: "p1", domain: "career", label: "Window", starts_on: null, ends_on: null, interpretation: "x", source: "dasha", confidence: "strong", tags: ["career"], metadata: { x: 1 } }])) } as never,
      userId: "u1",
    });
    expect(result.data[0]).toMatchObject({ userId: "u1", profileId: "p1", source: "dasha", tags: ["career"] });
  });

  it("handles error without throw", async () => {
    const result = await fetchTimingWindows({ supabase: { from: vi.fn(() => makeQuery([], { message: "boom" })) } as never, userId: "u1" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("boom");
  });

  it("does not invent windows when data empty", async () => {
    const result = await fetchTimingWindows({ supabase: { from: vi.fn(() => makeQuery([])) } as never, userId: "u1" });
    expect(result.data).toEqual([]);
  });
});
