import { describe, expect, it, vi } from "vitest";
import { fetchReasoningRules } from "../../../lib/astro/rag/reasoning-rule-repository";

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

describe("fetchReasoningRules", () => {
  it("queries astro_reasoning_rules", async () => {
    const from = vi.fn(() => makeQuery());
    await fetchReasoningRules({ supabase: { from } as never, domains: [], tags: [] });
    expect(from).toHaveBeenCalledWith("astro_reasoning_rules");
  });

  it("selects expected columns", async () => {
    const query = makeQuery();
    const from = vi.fn(() => query);
    await fetchReasoningRules({ supabase: { from } as never, domains: [], tags: [] });
    expect((query.state as Record<string, unknown>).selectColumns).toContain("required_fact_types");
    expect((query.state as Record<string, unknown>).selectColumns).toContain("reasoning_template");
  });

  it("filters enabled true", async () => {
    const query = makeQuery();
    const from = vi.fn(() => query);
    await fetchReasoningRules({ supabase: { from } as never, domains: [], tags: [] });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["eq", "enabled", true]);
  });

  it("filters domain in provided domains", async () => {
    const query = makeQuery();
    const from = vi.fn(() => query);
    await fetchReasoningRules({ supabase: { from } as never, domains: ["career", "sleep"], tags: [] });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["in", "domain", ["career", "sleep"]]);
  });

  it("overlaps required_tags with tags", async () => {
    const query = makeQuery();
    const from = vi.fn(() => query);
    await fetchReasoningRules({ supabase: { from } as never, domains: [], tags: ["career"] });
    expect((query.state as Record<string, unknown>).filters).toContainEqual(["overlaps", "required_tags", ["career"]]);
  });

  it("orders by weight descending", async () => {
    const query = makeQuery();
    const from = vi.fn(() => query);
    await fetchReasoningRules({ supabase: { from } as never, domains: [], tags: [] });
    expect((query.state as Record<string, unknown>).orders).toContainEqual(["weight", { ascending: false }]);
  });

  it("maps snake_case to camelCase", async () => {
    const from = vi.fn(() =>
      makeQuery([
        {
          id: "1",
          rule_key: "career_rule",
          domain: "career",
          title: "Career",
          description: "Desc",
          required_fact_types: ["house"],
          required_tags: ["career"],
          reasoning_template: "Template",
          weight: 10,
          safety_notes: ["note"],
          enabled: true,
          metadata: { x: 1 },
        },
      ]),
    );
    const result = await fetchReasoningRules({ supabase: { from } as never, domains: [], tags: [] });
    expect(result.data[0]).toMatchObject({ ruleKey: "career_rule", requiredFactTypes: ["house"], safetyNotes: ["note"] });
  });

  it("handles Supabase error without throw", async () => {
    const result = await fetchReasoningRules({ supabase: { from: vi.fn(() => makeQuery([], { message: "boom" })) } as never, domains: [], tags: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("boom");
  });
});
