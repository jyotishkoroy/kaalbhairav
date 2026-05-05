/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { loadCurrentAstroChartForUser } from "@/lib/astro/current-chart-version";

function makeCanonicalChartJson(chartVersionId: string, lagnaSign: string) {
  return {
    schemaVersion: "chart_json_v2",
    metadata: {
      profileId: "p1",
      chartVersionId,
      chartVersion: lagnaSign === "Leo" ? 1 : 2,
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
      lagna: { status: "computed", source: "deterministic_calculation", fields: { ascendant: { sign: lagnaSign } } },
      houses: { status: "computed", source: "deterministic_calculation", fields: { placements: { Moon: lagnaSign === "Leo" ? 11 : 10, Sun: lagnaSign === "Leo" ? 10 : 9 } } },
      panchang: { status: "computed", source: "deterministic_calculation", fields: { tithi: "test-tithi" } },
      d1Chart: { status: "computed", source: "deterministic_calculation", fields: { lagnaSign, moonSign: "Gemini", moonHouse: lagnaSign === "Leo" ? 11 : 10 } },
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
    public_facts: { lagna_sign: lagnaSign, moon_sign: "Gemini", moon_house: lagnaSign === "Leo" ? 11 : 10, sun_sign: "Taurus", sun_house: lagnaSign === "Leo" ? 10 : 9 },
  };
}

function makeQuery<T>(data: T, error: unknown = null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
    single: vi.fn(async () => ({ data, error })),
  };
  return query;
}

beforeEach(() => vi.clearAllMocks());

describe("astro_ask_uses_pointer_not_latest_wrong_chart", () => {
  it("returns the Leo chart pointed to by current_chart_version_id, not the newer Virgo row", async () => {
    const leoChart = {
      id: "cv-leo",
      profile_id: "p1",
      user_id: "u1",
      chart_version: 1,
      schema_version: "chart_json_v2",
      chart_json: makeCanonicalChartJson("cv-leo", "Leo"),
      status: "completed",
      is_current: true,
    };
    const chartQuery = makeQuery(leoChart);
    const profileQuery = makeQuery({
      id: "p1",
      user_id: "u1",
      status: "active",
      current_chart_version_id: "cv-leo",
    });
    const service = {
      from: vi.fn((table: string) => {
        if (table === "birth_profiles") return profileQuery;
        if (table === "chart_json_versions") return chartQuery;
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
    const profileQuery = makeQuery({ id: "p1", user_id: "u1", status: "active", current_chart_version_id: null });
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
    }
  });

  it("diagnostic_repair mode allows fallback but strict_user_runtime does not", async () => {
    const virgoChart = {
      id: "cv-virgo",
      profile_id: "p1",
      user_id: "u1",
      chart_version: 2,
      schema_version: "chart_json_v2",
      chart_json: makeCanonicalChartJson("cv-virgo", "Virgo"),
      status: "completed",
      is_current: true,
    };
    const chartQuery = makeQuery(virgoChart);
    const profileQuery = makeQuery({ id: "p1", user_id: "u1", status: "active", current_chart_version_id: null });
    const service = {
      from: vi.fn((table: string) => {
        if (table === "birth_profiles") return profileQuery;
        if (table === "chart_json_versions") return chartQuery;
        return profileQuery;
      }),
    } as never;

    const strictResult = await loadCurrentAstroChartForUser({ service, userId: "u1", options: { mode: "strict_user_runtime" } });
    expect(strictResult.ok).toBe(false);

    const repairResult = await loadCurrentAstroChartForUser({ service, userId: "u1", options: { mode: "diagnostic_repair" } });
    expect(repairResult.ok).toBe(true);
  });
});
