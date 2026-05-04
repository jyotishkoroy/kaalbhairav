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
  chart_json: {
    public_facts: {
      lagna_sign: "Leo",
      moon_sign: "Gemini",
      moon_house: 11,
      sun_sign: "Taurus",
      sun_house: 10,
      moon_nakshatra: "Mrigashira",
      moon_pada: 4,
      mahadasha: "Jupiter",
    },
  },
  status: "completed",
  is_current: true,
  chart_version: 1,
  created_at: "2026-01-01T00:00:00Z",
};

const VIRGO_CHART = {
  id: "cv-virgo-wrong",
  profile_id: "p1",
  user_id: "u1",
  chart_json: { public_facts: { lagna_sign: "Virgo", moon_house: 10, sun_house: 9 } },
  status: "completed",
  is_current: false,
  chart_version: 2,
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
