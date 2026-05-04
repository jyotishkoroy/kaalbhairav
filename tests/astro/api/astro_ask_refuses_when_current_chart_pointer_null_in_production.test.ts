/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { loadCurrentAstroChartForUser } from "@/lib/astro/current-chart-version";

function makeServiceMock(profile: Record<string, unknown> | null, chartRow: Record<string, unknown> | null = null) {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
  };
  const chartQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: chartRow, error: null }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "birth_profiles") return profileQuery;
      if (table === "chart_json_versions") return chartQuery;
      if (table === "prediction_ready_summaries") return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      return profileQuery;
    }),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("astro_ask_refuses_when_current_chart_pointer_null_in_production", () => {
  it("returns chart_not_ready when current_chart_version_id is null (strict mode)", async () => {
    const service = makeServiceMock(
      { id: "p1", user_id: "u1", status: "active", current_chart_version_id: null },
      null,
    ) as never;

    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("chart_not_ready");
    }
  });

  it("returns chart_not_ready when pointer exists but chart row is invalid (wrong user)", async () => {
    const service = makeServiceMock(
      { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" },
      null, // .eq('user_id', userId) will filter it out
    ) as never;

    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("chart_not_ready");
    }
  });

  it("returns ok when strict pointer resolves a valid chart", async () => {
    const validChart = {
      id: "cv1",
      profile_id: "p1",
      user_id: "u1",
      chart_json: { public_facts: { lagna_sign: "Leo" } },
      status: "completed",
      is_current: true,
    };
    const service = makeServiceMock(
      { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" },
      validChart,
    ) as never;

    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.chartVersion.id).toBe("cv1");
    }
  });
});
