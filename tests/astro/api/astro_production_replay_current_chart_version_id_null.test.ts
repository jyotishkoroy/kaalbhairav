/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { loadCurrentAstroChartForUser } from "@/lib/astro/current-chart-version";

beforeEach(() => vi.clearAllMocks());

describe("astro_production_replay_current_chart_version_id_null", () => {
  it("null pointer refuses in strict mode — does not fall back to latest chart", async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "p1",
          user_id: "u1",
          status: "active",
          current_chart_version_id: null, // Null pointer — known production failure scenario
        },
        error: null,
      }),
    };
    const chartQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const chartQueryFallback = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    void chartQueryFallback;

    const service = {
      from: vi.fn((table: string) => {
        if (table === "birth_profiles") return profileQuery;
        if (table === "chart_json_versions") return chartQuery;
        return profileQuery;
      }),
    } as never;

    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("chart_not_ready");
    }
  });

  it("null pointer in strict mode returns chart_not_ready error code", async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "p1", user_id: "u1", status: "active", current_chart_version_id: null },
        error: null,
      }),
    };
    const service = {
      from: vi.fn(() => profileQuery),
    } as never;

    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("chart_not_ready");
    }
  });
});
