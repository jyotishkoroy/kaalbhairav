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
      currentChart: { id: "cv1", profile_id: "p1", chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigasira", moon_pada: 4, mahadasha: "Jupiter" } }, status: "completed", is_current: true },
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
