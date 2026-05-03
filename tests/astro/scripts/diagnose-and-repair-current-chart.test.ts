/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClientMock } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: createServiceClientMock,
}));

import { main } from "@/scripts/astro/diagnose-and-repair-current-chart";

type QueryResult = { data: unknown; error: { message: string } | null };

function makeResolvedChain(result: QueryResult) {
  return {
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: (value: QueryResult) => void) => Promise.resolve(result).then(resolve),
  };
}

function makeServiceMock(options: {
  birthProfileLookup?: QueryResult;
  birthProfileFallback?: QueryResult;
  authUsersLookup?: QueryResult;
  googleEmailLookup?: QueryResult;
  emailLookup?: QueryResult;
  userIdLookup?: QueryResult;
  chartRows?: unknown;
} = {}) {
  const birthProfileLookup = options.birthProfileLookup ?? { data: null, error: null };
  const birthProfileFallback = options.birthProfileFallback ?? { data: null, error: null };
  const authUsersLookup = options.authUsersLookup ?? { data: null, error: null };
  const googleEmailLookup = options.googleEmailLookup ?? { data: null, error: null };
  const emailLookup = options.emailLookup ?? { data: null, error: null };
  const userIdLookup = options.userIdLookup ?? { data: null, error: null };
  const chartRows = options.chartRows ?? [];
  const chartQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(chartRows) ? chartRows[0] ?? null : chartRows ?? null, error: null }),
    then: (resolve: (value: QueryResult) => void) => Promise.resolve({ data: chartRows, error: null }).then(resolve),
  };

  const birthProfilesSelect = vi.fn((select: string) => {
    const chainFor = (result: QueryResult) => makeResolvedChain(result);
    return {
      eq: vi.fn((column: string) => {
        if (column === "id") {
          return chainFor(select.includes("date_of_birth") || select.includes("time_of_birth") || select.includes("place_of_birth") ? birthProfileLookup : birthProfileFallback);
        }
        if (column === "google_email") return chainFor(googleEmailLookup);
        if (column === "email") return chainFor(emailLookup);
        if (column === "user_id") return chainFor(userIdLookup);
        return chainFor(birthProfileFallback);
      }),
      maybeSingle: vi.fn().mockResolvedValue(select.includes("date_of_birth") || select.includes("time_of_birth") || select.includes("place_of_birth") ? birthProfileLookup : birthProfileFallback),
    };
  });

  const birthProfilesQuery = {
    select: birthProfilesSelect,
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  const authUsersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnValue(makeResolvedChain(authUsersLookup)),
    maybeSingle: vi.fn().mockResolvedValue(authUsersLookup),
  };

  return {
    queries: { chartQuery, birthProfileLookup, birthProfileFallback, authUsersLookup, googleEmailLookup, emailLookup, userIdLookup },
    from: vi.fn((table: string) => {
      if (table === "birth_profiles") return birthProfilesQuery;
      if (table === "chart_json_versions") return chartQuery;
      if (table === "auth.users") return authUsersQuery;
      return birthProfilesQuery;
    }),
  };
}

type ServiceMock = ReturnType<typeof makeServiceMock>;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("diagnose-and-repair-current-chart", () => {
  it("loads birth_profiles.id directly for --profile-id", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: {
        data: {
          id: "p1",
          user_id: "u1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          current_chart_version_id: null,
          google_email: "jyotiskaroy25@gmail.com",
          date_of_birth: "1999-06-14",
          time_of_birth: "09:58",
          place_of_birth: "Kolkata",
          birth_timezone: "Asia/Kolkata",
          birth_latitude: 22.5726,
          birth_longitude: 88.3639,
          birth_time_unknown: false,
        },
        error: null,
      },
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
    });
    createServiceClientMock.mockReturnValue(service);

    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
    expect(service.from).toHaveBeenCalledWith("birth_profiles");
  });

  it("does not require email, google_email, or current_chart_version_id for direct profile lookup", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: {
        data: {
          id: "p1",
          user_id: "u1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          google_email: null,
          current_chart_version_id: null,
        },
        error: null,
      },
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
    });
    createServiceClientMock.mockReturnValue(service);

    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
  });

  it("query success with null returns profile_not_found", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    createServiceClientMock.mockReturnValue(makeServiceMock({
      birthProfileLookup: { data: null, error: null },
    }));

    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"])).rejects.toThrow("profile_not_found");
  });

  it("missing optional columns retries with base columns", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: null, error: { message: "column date_of_birth does not exist" } },
      birthProfileFallback: {
        data: {
          id: "p1",
          user_id: "u1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          current_chart_version_id: null,
          google_email: "jyotiskaroy25@gmail.com",
        },
        error: null,
      },
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
    });
    createServiceClientMock.mockReturnValue(service);

    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
    expect(service.from).toHaveBeenCalledWith("birth_profiles");
  });

  it("query error is not collapsed into profile_not_found", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    createServiceClientMock.mockReturnValue(makeServiceMock({
      birthProfileLookup: { data: null, error: { message: "permission denied" } },
    }));

    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"])).rejects.toThrow("profile_query_failed");
  });

  it("--find-email can resolve auth.users.email to birth_profiles.user_id", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      authUsersLookup: { data: { id: "u1", email: "jyotiskaroy25@gmail.com" }, error: null },
      userIdLookup: {
        data: [{
          id: "p1",
          user_id: "u1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          current_chart_version_id: null,
          google_email: "jyotiskaroy25@gmail.com",
        }],
        error: null,
      },
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
    });
    createServiceClientMock.mockReturnValue(service);

    const code = await main(["--find-email", "jyotiskaroy25@gmail.com", "--dry-run"]);
    expect(code).toBe(0);
    expect(service.from).toHaveBeenCalledWith("auth.users");
  });

  it("dry-run does not write", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: {
        data: {
          id: "p1",
          user_id: "u1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          current_chart_version_id: null,
          google_email: "jyotiskaroy25@gmail.com",
        },
        error: null,
      },
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
    });
    createServiceClientMock.mockReturnValue(service);

    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
    expect(service.queries.chartQuery.update).not.toHaveBeenCalled();
  });

  it("missing service env fails without exposing secrets", async () => {
    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"])).rejects.toThrow("missing_required_env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  });
});
