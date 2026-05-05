/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { loadCurrentAstroChartForUser } from "@/lib/astro/current-chart-version";

function computedSection(fields: Record<string, unknown> = {}) {
  return { status: "computed", source: "deterministic_calculation", fields };
}

function unavailableSection(requiredModule = "test", fieldKey = "test") {
  return {
    status: "unavailable",
    source: "none",
    reason: "insufficient_birth_data",
    fields: {
      value: {
        status: "unavailable",
        value: null,
        reason: "insufficient_birth_data",
        source: "none",
        requiredModule,
        fieldKey,
      },
    },
  };
}

function makeChartJson(chartVersionId: string, chartVersion: number) {
  return {
    schemaVersion: "chart_json_v2",
    metadata: {
      profileId: "p1",
      chartVersionId,
      chartVersion,
      inputHash: "input-hash",
      settingsHash: "settings-hash",
      engineVersion: "test-engine",
      ephemerisVersion: "test-ephemeris",
      ayanamsha: "lahiri",
      houseSystem: "whole_sign",
      runtimeClockIso: "2026-05-05T00:00:00.000Z",
    },
    sections: {
      timeFacts: computedSection({ utcDateTimeIso: "2026-05-05T02:00:00.000Z" }),
      planetaryPositions: computedSection({ byBody: { Sun: { sign: "Taurus" } } }),
      lagna: computedSection({ ascendant: { sign: "Leo" } }),
      houses: computedSection({ placements: { Moon: 11 } }),
      panchang: computedSection({ tithi: "test-tithi" }),
      d1Chart: computedSection({ lagnaSign: "Leo" }),
      d9Chart: computedSection({ byBody: {} }),
      shodashvarga: computedSection({ byBody: {} }),
      shodashvargaBhav: computedSection({ byBody: {} }),
      vimshottari: computedSection({ currentMahadasha: { lord: "Saturn" } }),
      kp: computedSection({ byBody: {} }),
      dosha: computedSection({ manglik: { isManglik: false } }),
      ashtakavarga: computedSection({ sarvashtakavargaTotal: { grandTotal: 292 } }),
      transits: unavailableSection("transits", "transits"),
      advanced: unavailableSection("advanced", "advanced"),
    },
  };
}

function makeServiceMock({ profile, currentChart, currentByFlag, completedByStatus, latest }: Record<string, unknown>) {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile ?? null, error: null }),
  };
  const chartQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  chartQuery.maybeSingle.mockImplementation(async () => {
    return { data: currentChart ?? currentByFlag ?? completedByStatus ?? latest ?? null, error: null };
  });
  return {
    from: vi.fn((table: string) => {
      if (table === "birth_profiles") return profileQuery;
      if (table === "chart_json_versions") return chartQuery;
      return profileQuery;
    }),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("loadCurrentAstroChartForUser", () => {
  it("recognizes existing valid current chart", async () => {
    const service = makeServiceMock({
      profile: { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" },
      currentChart: { id: "cv1", profile_id: "p1", user_id: "u1", chart_version: 1, chart_json: makeChartJson("cv1", 1), status: "completed", is_current: true, schema_version: "chart_json_v2" },
    }) as never;

    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.chartVersion.id).toBe("cv1");
    }
  });

  it("returns chart_not_ready when no chart exists", async () => {
    const service = makeServiceMock({
      profile: { id: "p1", user_id: "u1", status: "active" },
      latest: null,
    }) as never;
    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("chart_not_ready");
  });
});
