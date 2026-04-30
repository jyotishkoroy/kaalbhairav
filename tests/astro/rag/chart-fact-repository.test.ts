import { describe, expect, it, vi } from "vitest";
import { toChartFactRow, upsertChartFacts } from "../../../lib/astro/rag/chart-fact-repository";

describe("chart fact repository", () => {
  it("returns early for empty facts", async () => {
    const supabase = { from: vi.fn() };
    const result = await upsertChartFacts({ supabase: supabase as never, facts: [], userId: "user-1" });
    expect(result).toEqual({ ok: true, insertedOrUpdated: 0, facts: [] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires a user id", async () => {
    const supabase = { from: vi.fn() };
    const result = await upsertChartFacts({ supabase: supabase as never, facts: [{ factType: "x", factKey: "y", factValue: "z", source: "chart_json", confidence: "deterministic", tags: [], metadata: {} }], userId: "" });
    expect(result.ok).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("maps rows to snake case with defaults", () => {
    const row = toChartFactRow(
      {
        userId: "fact-user",
        profileId: null,
        chartVersionId: null,
        factType: "planet_placement",
        factKey: "sun",
        factValue: "sign=Taurus",
        planet: "Sun",
        house: 10,
        sign: "Taurus",
        degreeNumeric: 28.5,
        source: "chart_json",
        confidence: "deterministic",
        tags: ["planet_placement"],
        metadata: { sourcePath: "planets.Sun" },
      },
      { userId: "default-user", profileId: "profile-1", chartVersionId: "chart-1" },
    );
    expect(row).toMatchObject({
      user_id: "fact-user",
      profile_id: "profile-1",
      chart_version_id: "chart-1",
      fact_type: "planet_placement",
      fact_key: "sun",
      fact_value: "sign=Taurus",
      planet: "Sun",
      house: 10,
      sign: "Taurus",
      degree_numeric: 28.5,
      source: "chart_json",
      confidence: "deterministic",
      tags: ["planet_placement"],
      metadata: { sourcePath: "planets.Sun" },
    });
  });

  it("deduplicates facts before upsert", async () => {
    const rows: Array<Record<string, unknown>> = [];
    const supabase = {
      from: vi.fn(() => ({
        upsert: vi.fn((inputRows: Array<Record<string, unknown>>) => {
          rows.push(...inputRows);
          return Promise.resolve({ data: inputRows, error: null });
        }),
      })),
    };
    const facts = [
      { factType: "planet_placement", factKey: "sun", factValue: "a", source: "chart_json", confidence: "deterministic", tags: [], metadata: {} },
      { factType: "planet_placement", factKey: "sun", factValue: "b", source: "chart_json", confidence: "deterministic", tags: [], metadata: {} },
    ];
    const result = await upsertChartFacts({ supabase: supabase as never, facts: facts as never, userId: "user-1" });
    expect(result.ok).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it("passes the expected table and onConflict string and handles success", async () => {
    const upsert = vi.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null }));
    const supabase = { from: vi.fn(() => ({ upsert })) };
    const result = await upsertChartFacts({
      supabase: supabase as never,
      userId: "user-1",
      facts: [{ factType: "lagna", factKey: "lagna", factValue: "Leo", source: "chart_json", confidence: "deterministic", tags: [], metadata: {} }],
    });
    expect(supabase.from).toHaveBeenCalledWith("astro_chart_facts");
    expect(upsert).toHaveBeenCalledWith(expect.any(Array), {
      onConflict: "user_id,profile_id,chart_version_id,fact_type,fact_key",
    });
    expect(result.ok).toBe(true);
    expect(result.insertedOrUpdated).toBe(1);
  });

  it("returns a concise error on supabase failure", async () => {
    const upsert = vi.fn(() => Promise.resolve({ data: null, error: { message: "boom" } }));
    const supabase = { from: vi.fn(() => ({ upsert })) };
    const result = await upsertChartFacts({
      supabase: supabase as never,
      userId: "user-1",
      facts: [{ factType: "lagna", factKey: "lagna", factValue: "Leo", source: "chart_json", confidence: "deterministic", tags: [], metadata: {} }],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("boom");
  });

  it("supports select-chain compatibility", async () => {
    const select = vi.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null }));
    const upsert = vi.fn(() => ({ select }));
    const supabase = { from: vi.fn(() => ({ upsert })) };
    const result = await upsertChartFacts({
      supabase: supabase as never,
      userId: "user-1",
      facts: [{ factType: "lagna", factKey: "lagna", factValue: "Leo", source: "chart_json", confidence: "deterministic", tags: [], metadata: {} }],
    });
    expect(select).toHaveBeenCalledWith("*");
    expect(result.ok).toBe(true);
  });
});
