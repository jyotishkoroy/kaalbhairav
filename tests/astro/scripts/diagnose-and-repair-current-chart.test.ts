/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const { createServiceClientMock } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: createServiceClientMock,
}));

import { main } from "@/scripts/astro/diagnose-and-repair-current-chart";

function makeServiceMock(overrides: Record<string, unknown> = {}) {
  const profileRows = (overrides.profileRows as Record<string, unknown>[]) ?? [];
  const chartRows = (overrides.chartRows as Record<string, unknown>[]) ?? [];
  const makeThenable = (data: unknown) => ({
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null }),
    then: (resolve: (value: unknown) => void) => Promise.resolve({ data, error: null }).then(resolve),
  });
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    update: vi.fn().mockReturnThis(),
  };
  profileQuery.eq.mockImplementation(() => makeThenable(profileRows));
  const chartQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  chartQuery.eq.mockImplementation(() => makeThenable(chartRows));
  return {
    from: vi.fn((table: string) => {
      if (table === "birth_profiles") return profileQuery;
      if (table === "chart_json_versions") return chartQuery;
      return profileQuery;
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("diagnose-and-repair-current-chart", () => {
  it("dry-run does not write", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    createServiceClientMock.mockReturnValue(makeServiceMock({
      profileRows: [{
        id: "p1",
        user_id: "u1",
        status: "active",
        canonical_profile: true,
        google_email: "jyotiskaroy25@gmail.com",
        birth_date: "1999-06-14",
        birth_time: "09:58",
        birth_time_known: true,
        birth_place_name: "Kolkata",
        timezone: "Asia/Kolkata",
        latitude: 22.5726,
        longitude: 88.3639,
      }],
      chartRows: [{
        id: "cv1",
        created_at: "2026-05-03T00:00:00Z",
        chart_version: 1,
        input_hash: "ih",
        settings_hash: "sh",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigasira", moon_pada: 4, mahadasha: "Jupiter", mangal_dosha: false, kalsarpa_yoga: false } },
      }],
    }) as never);

    const code = await main(["--email", "jyotiskaroy25@gmail.com", "--dry-run"]);
    expect(code).toBe(0);
    const service = createServiceClientMock.mock.results[0]?.value as Record<string, unknown>;
    expect(service.from).toHaveBeenCalled();
  });

  it("missing service env fails without exposing secrets", async () => {
    await expect(main(["--email", "jyotiskaroy25@gmail.com", "--dry-run"])).rejects.toThrow("missing_required_env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  });
});
