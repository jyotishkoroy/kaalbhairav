/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 *
 * Production regression test: verifies that the known failure class
 * (newer Virgo chart overriding correct Leo chart) cannot happen with strict mode.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { loadCurrentAstroChartForUser } from "@/lib/astro/current-chart-version";
import { answerExactFactIfPossible } from "@/lib/astro/rag/exact-fact-router";
import type { ChartFact } from "@/lib/astro/rag/chart-fact-extractor";

beforeEach(() => vi.clearAllMocks());

const LEO_CHART = {
  id: "cv-leo-correct",
  profile_id: "p1",
  user_id: "u1",
  chart_version: 1,
  schema_version: "chart_json_v2",
    chart_json: {
    schemaVersion: "chart_json_v2",
    metadata: {
      profileId: "p1",
      chartVersionId: "cv-leo-correct",
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
      d1Chart: { status: "computed", source: "deterministic_calculation", fields: { lagnaSign: "Leo", moonSign: "Gemini", moonHouse: 11, sunSign: "Taurus", sunHouse: 10 } },
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
    public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10 },
  },
  status: "completed",
  is_current: true,
  created_at: "2026-01-01T00:00:00Z",
};

const VIRGO_CHART = {
  id: "cv-virgo-wrong",
  profile_id: "p1",
  user_id: "u1",
  chart_version: 2,
  schema_version: "chart_json_v2",
    chart_json: {
      schemaVersion: "chart_json_v2",
    metadata: {
      profileId: "p1",
      chartVersionId: "cv-virgo-wrong",
      chartVersion: 2,
      inputHash: "input-hash",
      settingsHash: "settings-hash",
      engineVersion: "test-engine",
      ephemerisVersion: "test-ephemeris",
      ayanamsha: "lahiri",
      houseSystem: "whole_sign",
      runtimeClockIso: "2026-05-05T00:00:00.000Z",
    },
    sections: { d1Chart: { status: "computed", source: "deterministic_calculation", fields: { lagnaSign: "Virgo", moonHouse: 10, sunHouse: 9 } } },
    public_facts: { lagna_sign: "Virgo", moon_sign: "Gemini", moon_house: 10, sun_sign: "Taurus", sun_house: 9 },
  },
  status: "completed",
  is_current: false,
  created_at: "2026-02-01T00:00:00Z",
};

describe("astro_production_replay_wrong_virgo_chart_selected_over_correct_leo", () => {
  it("correct Leo chart is returned when current_chart_version_id points to it", async () => {
    // Profile explicitly points to Leo chart
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv-leo-correct" },
        error: null,
      }),
    };
    // When queried by exact ID + user_id + profile_id + status + is_current, returns Leo chart
    const chartQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: LEO_CHART, error: null }),
    };
    const predSummaryQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
      expect(result.chartVersion.id).toBe("cv-leo-correct");
      const chartJson = result.chartVersion.chart_json as Record<string, unknown>;
      const facts = chartJson.public_facts as Record<string, unknown>;
      expect(facts.lagna_sign).toBe("Leo");
      expect(facts.lagna_sign).not.toBe("Virgo");
      expect(facts.moon_house).toBe(11);
      expect(facts.sun_house).toBe(10);
    }
  });

  it("Virgo chart is never selected when pointer is null (strict mode refuses)", async () => {
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
    // In strict mode the Virgo (newer wrong) chart is never loaded even though it exists
  });

  it("known wrong facts are never returned by exact-fact-router for Leo chart", () => {
    const facts: ChartFact[] = [
      { factType: "lagna", factKey: "lagna", factValue: "Leo", sign: "Leo", source: "chart_json", confidence: "deterministic", tags: [], metadata: {} },
      { factType: "planet_placement", factKey: "moon", factValue: "Gemini, house 11", sign: "Gemini", house: 11, planet: "Moon", source: "chart_json", confidence: "deterministic", tags: [], metadata: {} },
      { factType: "planet_placement", factKey: "sun", factValue: "Taurus, house 10", sign: "Taurus", house: 10, planet: "Sun", source: "chart_json", confidence: "deterministic", tags: [], metadata: {} },
    ];

    const lagnaResult = answerExactFactIfPossible("What is my Lagna?", facts);
    expect(lagnaResult.answer).not.toContain("Virgo");
    expect(lagnaResult.answer).toContain("Leo");

    const moonResult = answerExactFactIfPossible("Where is my Moon placed?", facts);
    expect(moonResult.answer).not.toContain("house 10");
    expect(moonResult.answer).toContain("11");
  });
});
