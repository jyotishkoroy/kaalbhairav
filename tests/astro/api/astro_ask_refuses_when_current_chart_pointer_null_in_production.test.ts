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

function makeChartJson(chartVersionId: string) {
  return {
    schemaVersion: "chart_json_v2",
    metadata: {
      profileId: "p1",
      chartVersionId,
      chartVersion: 1,
      inputHash: "input-hash",
      settingsHash: "settings-hash",
      engineVersion: "test-engine",
      ephemerisVersion: "test-ephemeris",
      ayanamsha: "lahiri",
      houseSystem: "whole_sign",
      runtimeClockIso: "2026-05-05T00:00:00.000Z",
    },
    sections: {
      timeFacts: { status: "computed", source: "deterministic_calculation", fields: { utcDateTimeIso: "2026-05-05T02:00:00.000Z" } },
      planetaryPositions: { status: "computed", source: "deterministic_calculation", fields: { byBody: { Sun: { sign: "Taurus" }, Moon: { sign: "Gemini" } } } },
      lagna: { status: "computed", source: "deterministic_calculation", fields: { ascendant: { sign: "Leo" } } },
      houses: { status: "computed", source: "deterministic_calculation", fields: { placements: { Moon: 11, Sun: 10 } } },
      panchang: { status: "computed", source: "deterministic_calculation", fields: { tithi: "test-tithi" } },
      d1Chart: { status: "computed", source: "deterministic_calculation", fields: { lagnaSign: "Leo" } },
      d9Chart: { status: "computed", source: "deterministic_calculation", fields: {} },
      shodashvarga: { status: "computed", source: "deterministic_calculation", fields: {} },
      shodashvargaBhav: { status: "computed", source: "deterministic_calculation", fields: {} },
      vimshottari: { status: "computed", source: "deterministic_calculation", fields: { currentMahadasha: { lord: "Saturn" } } },
      kp: { status: "computed", source: "deterministic_calculation", fields: {} },
      dosha: { status: "computed", source: "deterministic_calculation", fields: { manglik: { isManglik: false } } },
      ashtakavarga: { status: "computed", source: "deterministic_calculation", fields: { sarvashtakavargaTotal: { grandTotal: 292 } } },
      transits: { status: "unavailable", source: "none", reason: "insufficient_birth_data", fields: { value: { status: "unavailable", value: null, reason: "insufficient_birth_data", source: "none", requiredModule: "transits", fieldKey: "transits" } } },
      advanced: { status: "unavailable", source: "none", reason: "insufficient_birth_data", fields: { value: { status: "unavailable", value: null, reason: "insufficient_birth_data", source: "none", requiredModule: "advanced", fieldKey: "advanced" } } },
    },
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
      chart_version: 1,
      schema_version: "chart_json_v2",
      chart_json: makeChartJson("cv1"),
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
