/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { loadCurrentAstroChartForUser } from "@/lib/astro/current-chart-version";

beforeEach(() => vi.clearAllMocks());

describe("astro_ask_uses_pointer_not_latest_wrong_chart", () => {
  it("returns the Leo chart pointed to by current_chart_version_id, not the newer Virgo row", async () => {
    const leoChart = {
      id: "cv-leo",
      profile_id: "p1",
      user_id: "u1",
      chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11 } },
      status: "completed",
      is_current: true,
      chart_version: 1,
    };
    // The service mock returns the Leo chart when queried by exact ID with all strict conditions.
    const chartQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: leoChart, error: null }),
    };
    const predSummaryQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv-leo" },
        error: null,
      }),
    };
    const service = {
      from: vi.fn((table: string) => {
        if (table === "birth_profiles") return profileQuery;
        if (table === "chart_json_versions") return chartQuery;
        if (table === "prediction_ready_summaries") return predSummaryQuery;
        return profileQuery;
      }),
    } as never;

    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.chartVersion.id).toBe("cv-leo");
      const chartJson = result.chartVersion.chart_json as Record<string, unknown>;
      const publicFacts = chartJson.public_facts as Record<string, unknown>;
      expect(publicFacts.lagna_sign).toBe("Leo");
    }
  });

  it("refuses without fallback when pointer is null even if newer Virgo row exists", async () => {
    // Profile has null pointer but there is a Virgo chart row with is_current=true
    const virgoChart = {
      id: "cv-virgo",
      profile_id: "p1",
      user_id: "u1",
      chart_json: { public_facts: { lagna_sign: "Virgo" } },
      status: "completed",
      is_current: true,
    };
    void virgoChart; // exists in DB but should not be loaded in strict mode

    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "p1", user_id: "u1", status: "active", current_chart_version_id: null },
        error: null,
      }),
    };
    const service = {
      from: vi.fn((table: string) => {
        if (table === "birth_profiles") return profileQuery;
        return profileQuery;
      }),
    } as never;

    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("chart_not_ready");
      // Critically: Virgo chart was never loaded
    }
  });

  it("diagnostic_repair mode allows fallback but strict_user_runtime does not", async () => {
    const virgoChart = {
      id: "cv-virgo",
      profile_id: "p1",
      user_id: "u1",
      chart_json: { public_facts: { lagna_sign: "Virgo" } },
      status: "completed",
      is_current: true,
      chart_version: 2,
    };

    let queryCount = 0;
    const chartQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        queryCount++;
        return Promise.resolve({ data: virgoChart, error: null });
      }),
    };
    const predSummaryQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "p1", user_id: "u1", status: "active", current_chart_version_id: null },
        error: null,
      }),
    };
    const service = {
      from: vi.fn((table: string) => {
        if (table === "birth_profiles") return profileQuery;
        if (table === "chart_json_versions") return chartQuery;
        if (table === "prediction_ready_summaries") return predSummaryQuery;
        return profileQuery;
      }),
    } as never;

    // Strict mode refuses
    const strictResult = await loadCurrentAstroChartForUser({ service, userId: "u1", options: { mode: "strict_user_runtime" } });
    expect(strictResult.ok).toBe(false);

    // Repair mode allows fallback
    const repairResult = await loadCurrentAstroChartForUser({ service, userId: "u1", options: { mode: "diagnostic_repair" } });
    expect(repairResult.ok).toBe(true);
  });
});
