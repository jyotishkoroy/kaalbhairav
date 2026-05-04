/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { loadCurrentAstroChartForUser } from "@/lib/astro/current-chart-version";

beforeEach(() => vi.clearAllMocks());

function makeService(profile: Record<string, unknown> | null, chart: Record<string, unknown> | null) {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
  };
  const chartQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: chart, error: null }),
  };
  const predQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "birth_profiles") return profileQuery;
      if (table === "chart_json_versions") return chartQuery;
      if (table === "prediction_ready_summaries") return predQuery;
      return profileQuery;
    }),
  } as never;
}

describe("astro_current_chart_loader_strict_ownership", () => {
  it("returns chart_not_ready when profile has null pointer (strict mode)", async () => {
    const service = makeService(
      { id: "p1", user_id: "u1", status: "active", current_chart_version_id: null },
      null,
    );
    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("chart_not_ready");
  });

  it("returns chart_not_ready when pointer exists but chart row not found (wrong ownership)", async () => {
    const service = makeService(
      { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv-other" },
      null, // Supabase returns null because user_id/profile_id/is_current/status filters eliminate it
    );
    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("chart_not_ready");
  });

  it("returns chart_not_ready when chart row has is_current=false", async () => {
    const service = makeService(
      { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" },
      null, // Supabase returns null because is_current=true filter rejects it
    );
    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("chart_not_ready");
  });

  it("returns chart_not_ready when chart status is not completed", async () => {
    const service = makeService(
      { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" },
      null, // Supabase returns null because status='completed' filter rejects it
    );
    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("chart_not_ready");
  });

  it("succeeds when all strict conditions are met", async () => {
    const service = makeService(
      { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" },
      { id: "cv1", profile_id: "p1", user_id: "u1", status: "completed", is_current: true, chart_json: {} },
    );
    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(true);
  });

  it("setup_required when no active profile exists", async () => {
    const service = makeService(null, null);
    const result = await loadCurrentAstroChartForUser({ service, userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("setup_required");
  });
});
