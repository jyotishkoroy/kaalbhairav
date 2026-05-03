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
type InsertResult = QueryResult;

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
  predictionSummaryRows?: unknown;
  chartSelectError?: (select: string) => QueryResult | null;
  summarySelectError?: (select: string) => QueryResult | null;
  tableDiscovery?: Record<string, string[] | null>;
  insertResult?: (payload: Record<string, unknown>) => InsertResult;
} = {}) {
  const birthProfileLookup = options.birthProfileLookup ?? { data: null, error: null };
  const birthProfileFallback = options.birthProfileFallback ?? { data: null, error: null };
  const authUsersLookup = options.authUsersLookup ?? { data: null, error: null };
  const googleEmailLookup = options.googleEmailLookup ?? { data: null, error: null };
  const emailLookup = options.emailLookup ?? { data: null, error: null };
  const userIdLookup = options.userIdLookup ?? { data: null, error: null };
  const chartRows = options.chartRows ?? [];
  const predictionSummaryRows = options.predictionSummaryRows ?? [];
  const tableDiscovery = options.tableDiscovery ?? {};
  const chartQuery = {
    select: vi.fn((select: string) => {
      const errorResult = options.chartSelectError?.(select);
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(errorResult ?? { data: chartRows, error: null }),
        update: vi.fn(() => ({ eq: vi.fn().mockReturnThis() })),
        insert: vi.fn((payload: Record<string, unknown>) => ({
          payload,
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(options.insertResult?.(payload) ?? { data: { id: "new-chart-version-id" }, error: null }),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(chartRows) ? chartRows[0] ?? null : chartRows ?? null, error: null }),
        then: (resolve: (value: QueryResult) => void) => Promise.resolve(errorResult ?? { data: chartRows, error: null }).then(resolve),
      };
    }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn(() => ({ eq: vi.fn().mockReturnThis() })),
    insert: vi.fn((payload: Record<string, unknown>) => ({
      payload,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(options.insertResult?.(payload) ?? { data: { id: "new-chart-version-id" }, error: null }),
    })),
    maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(chartRows) ? chartRows[0] ?? null : chartRows ?? null, error: null }),
    then: (resolve: (value: QueryResult) => void) => Promise.resolve({ data: chartRows, error: null }).then(resolve),
  };
  const predictionSummaryQuery = {
    select: vi.fn((select: string) => {
      const errorResult = options.summarySelectError?.(select);
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(errorResult ?? { data: predictionSummaryRows, error: null }),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(predictionSummaryRows) ? predictionSummaryRows[0] ?? null : predictionSummaryRows ?? null, error: null }),
        then: (resolve: (value: QueryResult) => void) => Promise.resolve(errorResult ?? { data: predictionSummaryRows, error: null }).then(resolve),
      };
    }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(predictionSummaryRows) ? predictionSummaryRows[0] ?? null : predictionSummaryRows ?? null, error: null }),
    then: (resolve: (value: QueryResult) => void) => Promise.resolve({ data: predictionSummaryRows, error: null }).then(resolve),
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
    update: vi.fn(() => ({ eq: vi.fn().mockReturnThis() })),
  };

  const authUsersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnValue(makeResolvedChain(authUsersLookup)),
    maybeSingle: vi.fn().mockResolvedValue(authUsersLookup),
  };

  return {
    queries: { chartQuery, birthProfileLookup, birthProfileFallback, authUsersLookup, googleEmailLookup, emailLookup, userIdLookup },
    from: vi.fn((table: string) => {
      if (table === "information_schema.columns") {
        const handleTableName = (selectColumns: string, value: string) => {
          const rows = tableDiscovery[value];
          const selectedColumns = selectColumns.split(",").map((column) => column.trim());
          const buildRows = (columnNames: string[] | null) => (columnNames ?? []).map((column_name) => {
            const row: Record<string, unknown> = { column_name };
            if (selectedColumns.includes("is_nullable")) row.is_nullable = column_name === "user_id" ? "NO" : "YES";
            if (selectedColumns.includes("column_default")) row.column_default = column_name === "user_id" ? null : "nextval()";
            if (selectedColumns.includes("is_generated")) row.is_generated = "NEVER";
            return row;
          });
          if (rows === null) {
            return {
              eq: vi.fn().mockReturnThis(),
              then: (resolve: (value: QueryResult) => void) => Promise.resolve({ data: null, error: { message: "relation does not exist" } }).then(resolve),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "relation does not exist" } }),
            };
          }
          return {
            eq: vi.fn().mockReturnThis(),
            then: (resolve: (value: QueryResult) => void) => Promise.resolve({ data: buildRows(rows), error: null }).then(resolve),
            maybeSingle: vi.fn().mockResolvedValue({ data: buildRows(rows), error: null }),
          };
        };
        return {
          select: vi.fn((selectColumns: string) => ({
            eq: vi.fn((column: string, value: string) => {
              if (column === "table_schema") {
                return {
                  eq: vi.fn((nextColumn: string, nextValue: string) => {
                    if (nextColumn !== "table_name") {
                      return {
                        eq: vi.fn().mockReturnThis(),
                        then: (resolve: (value: QueryResult) => void) => Promise.resolve({ data: null, error: null }).then(resolve),
                        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                      };
                    }
                    return handleTableName(selectColumns, nextValue);
                  }),
                  then: (resolve: (value: QueryResult) => void) => Promise.resolve({ data: null, error: null }).then(resolve),
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                };
              }
              if (column === "table_name") return handleTableName(selectColumns, value);
              return {
                eq: vi.fn().mockReturnThis(),
                then: (resolve: (value: QueryResult) => void) => Promise.resolve({ data: null, error: null }).then(resolve),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }),
          })),
        };
      }
      if (table === "birth_profiles") return birthProfilesQuery;
      if (table === "chart_json_versions") return chartQuery;
      if (table === "prediction_ready_summaries") return predictionSummaryQuery;
      if (table === "auth.users") return authUsersQuery;
      return birthProfilesQuery;
    }),
  };
}

type ServiceMock = ReturnType<typeof makeServiceMock>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
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
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4, mahadasha: "Jupiter" }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
    });
    createServiceClientMock.mockReturnValue(service);
    await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(service.queries.chartQuery.insert).not.toHaveBeenCalled();
  });

  it("loads dasha from chart_json_versions.prediction_summary when present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "p1", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4, mahadasha: "Jupiter" }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
        prediction_summary: { public_facts: { mahadasha: "Jupiter" } },
      }],
    });
    createServiceClientMock.mockReturnValue(service);
    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
  });

  it("does not select chart_json_versions.updated_at when absent", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "p1", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"] },
    });
    createServiceClientMock.mockReturnValue(service);
    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
    const chartSelect = service.queries.chartQuery.select.mock.calls[0]?.[0] as string;
    expect(chartSelect).toBe("id, profile_id, created_at, chart_json");
  });

  it("missing chart_json_versions.updated_at does not crash dry-run", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "p1", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4, mahadasha: "Jupiter" }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"], prediction_ready_summaries: null },
    });
    createServiceClientMock.mockReturnValue(service);
    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
  });

  it("schema discovery failure falls back to required chart_json_versions columns", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "p1", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4, mahadasha: "Jupiter" } },
      }],
      tableDiscovery: { chart_json_versions: null, prediction_ready_summaries: null },
    });
    createServiceClientMock.mockReturnValue(service);
    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
    expect(service.queries.chartQuery.select.mock.calls[0]?.[0]).toBe("id, profile_id, created_at, chart_json");
  });

  it("missing prediction_ready_summaries table does not crash dry-run", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "b64406d3-04b2-431b-a7f6-cb9b728fc4da", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "417a1855-3f37-46aa-945c-13bf15d51870",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"], prediction_ready_summaries: null },
    });
    createServiceClientMock.mockReturnValue(service);
    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"])).resolves.toBe(0);
  });

  it("missing optional prediction_ready_summaries columns do not crash dry-run", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "p1", user_id: "u1", display_name: "Other", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "417a1855-3f37-46aa-945c-13bf15d51870",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4, mahadasha: "Jupiter" }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      predictionSummaryRows: [{
        id: "s1",
        profile_id: "p1",
        created_at: "2026-05-03T00:00:00Z",
        chart_version_id: "417a1855-3f37-46aa-945c-13bf15d51870",
        current_timing_summary: "Mahadasha: Jupiter. Antardasha: Ketu",
      }],
      tableDiscovery: {
        chart_json_versions: ["id", "profile_id", "created_at", "chart_json"],
        prediction_ready_summaries: ["id", "profile_id", "created_at"],
      },
    });
    createServiceClientMock.mockReturnValue(service);
    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
  });

  it("repair-only fallback succeeds only for the exact approved profile and chart facts", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "b64406d3-04b2-431b-a7f6-cb9b728fc4da", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "417a1855-3f37-46aa-945c-13bf15d51870",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"] },
    });
    createServiceClientMock.mockReturnValue(service);
    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"])).resolves.toBe(0);
  });

  it("repair-only fallback refuses different profile", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "other-profile", user_id: "u1", display_name: "Other", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "417a1855-3f37-46aa-945c-13bf15d51870",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"] },
    });
    createServiceClientMock.mockReturnValue(service);
    await expect(main(["--profile-id", "different-profile", "--dry-run"])).rejects.toThrow();
  });

  it("repair-only fallback refuses different chart version", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "b64406d3-04b2-431b-a7f6-cb9b728fc4da", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "different-chart-version",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"] },
    });
    createServiceClientMock.mockReturnValue(service);
    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"])).rejects.toThrow();
  });

  it("repair-only fallback refuses Virgo chart", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "b64406d3-04b2-431b-a7f6-cb9b728fc4da", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "417a1855-3f37-46aa-945c-13bf15d51870",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Virgo", moon_sign: "Gemini", moon_house: 10, sun_sign: "Taurus", sun_house: 9 } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"] },
    });
    createServiceClientMock.mockReturnValue(service);
    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"])).rejects.toThrow();
  });

  it("apply marks exactly one chart current and updates profile pointer", async () => {
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
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
    });
    createServiceClientMock.mockReturnValue(service);
    await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"]);
    expect(service.queries.chartQuery.insert).toHaveBeenCalledTimes(1);
  });

  it("dry-run reports insertUserId true when chart_json_versions.user_id exists", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: {
        data: {
          id: "p1",
          user_id: "u1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          current_chart_version_id: null,
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "user_id", "created_at", "chart_json"], birth_profiles: ["id", "user_id", "current_chart_version_id"] },
    });
    createServiceClientMock.mockReturnValue(service);

    const result = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(result).toBe(0);
    const printed = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(printed).toContain('"insertUserId": true');
  });

  it("dry-run sets insertUserId true when chart_json_versions discovery is unavailable and profile.user_id exists", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: {
        data: {
          id: "p1",
          user_id: "u1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          current_chart_version_id: null,
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: null, prediction_ready_summaries: null },
    });
    createServiceClientMock.mockReturnValue(service);

    const result = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(result).toBe(0);
    const printed = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(printed).toContain('"insertUserId": true');
    expect(printed).toContain("assuming_required_column:chart_json_versions.user_id");
  });

  it("dry-run throws missing_required_insert_value when discovery is unavailable and profile.user_id is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    createServiceClientMock.mockReturnValue(makeServiceMock({
      birthProfileLookup: {
        data: {
          id: "p1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          current_chart_version_id: null,
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: null, prediction_ready_summaries: null },
    }));

    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"])).rejects.toThrow("missing_required_insert_value:chart_json_versions.user_id");
  });

  it("apply includes user_id when chart_json_versions.user_id exists", async () => {
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
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "user_id", "created_at", "chart_json", "is_current", "status"], birth_profiles: ["id", "user_id", "current_chart_version_id"] },
    });
    createServiceClientMock.mockReturnValue(service);

    await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"]);
    const payload = service.queries.chartQuery.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ profile_id: "p1", user_id: "u1" });
  });

  it("apply includes user_id when chart_json_versions discovery is unavailable", async () => {
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
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: null, birth_profiles: ["id", "user_id", "current_chart_version_id"], prediction_ready_summaries: null },
    });
    createServiceClientMock.mockReturnValue(service);

    await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"]);
    const payload = service.queries.chartQuery.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ profile_id: "p1", user_id: "u1" });
  });

  it("apply retries without user_id only when the error says the user_id column is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const insertResults = [
      { data: null, error: { message: "column chart_json_versions.user_id does not exist" } },
      { data: { id: "new-chart-version-id" }, error: null },
    ];
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: {
        data: {
          id: "p1",
          user_id: "u1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          current_chart_version_id: null,
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: null, birth_profiles: ["id", "user_id", "current_chart_version_id"], prediction_ready_summaries: null },
      insertResult: () => insertResults.shift() ?? { data: { id: "unused" }, error: null },
    });
    createServiceClientMock.mockReturnValue(service);

    await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"]);
    expect(service.queries.chartQuery.insert).toHaveBeenCalledTimes(2);
    expect(service.queries.chartQuery.insert.mock.calls[1]?.[0]).not.toHaveProperty("user_id");
  });

  it("apply does not retry when user_id fails with NOT NULL violation", async () => {
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
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: null, birth_profiles: ["id", "user_id", "current_chart_version_id"], prediction_ready_summaries: null },
      insertResult: () => ({ data: null, error: { message: "null value in column \"user_id\" of relation \"chart_json_versions\" violates not-null constraint" } }),
    });
    createServiceClientMock.mockReturnValue(service);

    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"])).rejects.toThrow(/not-null constraint/);
    expect(service.queries.chartQuery.insert).toHaveBeenCalledTimes(1);
  });

  it("apply does not retry on permission error", async () => {
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
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: null, birth_profiles: ["id", "user_id", "current_chart_version_id"], prediction_ready_summaries: null },
      insertResult: () => ({ data: null, error: { message: "permission denied for table chart_json_versions" } }),
    });
    createServiceClientMock.mockReturnValue(service);

    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"])).rejects.toThrow(/permission denied/i);
    expect(service.queries.chartQuery.insert).toHaveBeenCalledTimes(1);
  });

  it("apply fails before insert when chart_json_versions.user_id exists but profile.user_id is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: {
        data: {
          id: "p1",
          display_name: "Jyotishko Roy",
          canonical_profile: true,
          current_chart_version_id: null,
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "user_id", "created_at", "chart_json"], birth_profiles: ["id", "current_chart_version_id"] },
    });
    createServiceClientMock.mockReturnValue(service);

    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"])).rejects.toThrow("missing_required_insert_value:chart_json_versions.user_id");
    expect(service.queries.chartQuery.insert).not.toHaveBeenCalled();
  });

  it("apply still works when chart_json_versions.user_id does not exist", async () => {
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
        },
        error: null,
      },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"], birth_profiles: ["id", "user_id", "current_chart_version_id"] },
    });
    createServiceClientMock.mockReturnValue(service);

    await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"]);
    const payload = service.queries.chartQuery.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("user_id");
  });

  it("apply only writes optional chart_json_versions columns when present", async () => {
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
        created_at: "2026-04-27T00:00:00Z",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"], birth_profiles: ["id", "user_id", "current_chart_version_id"] },
    });
    createServiceClientMock.mockReturnValue(service);
    await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"]);
    const payload = service.queries.chartQuery.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ profile_id: "p1", created_at: expect.any(String), chart_json: expect.any(Object) });
    expect(payload).not.toHaveProperty("chart_version");
    expect(payload).not.toHaveProperty("input_hash");
    expect(payload).not.toHaveProperty("settings_hash");
    expect(payload).not.toHaveProperty("is_current");
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("updated_at");
  });

  it("does not print raw chart_json or secrets", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "p1", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
      }],
    });
    createServiceClientMock.mockReturnValue(service);
    await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    const printed = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(printed).not.toMatch(/"chart_json"\s*:/i);
    expect(printed).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|secret/i);
  });

  it("does not print raw chart_json, tokens, or report text", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const service: ServiceMock = makeServiceMock({
      birthProfileLookup: { data: { id: "p1", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "cv1",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } }, raw_report_text: "token=abc123" },
      }],
      tableDiscovery: { chart_json_versions: ["id", "profile_id", "created_at", "chart_json"] },
    });
    createServiceClientMock.mockReturnValue(service);
    await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    const printed = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(printed).not.toMatch(/token=|raw_report_text|chart_json/i);
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

  it("rejects Virgo Lagna candidate even if newest and selects older Leo repair candidate", async () => {
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
      chartRows: [
        {
          id: "cv-new",
          created_at: "2026-04-30T00:00:00Z",
          chart_version: 23,
          input_hash: "ih23",
          settings_hash: "sh23",
          is_current: false,
          status: "completed",
          chart_json: { public_facts: { lagna_sign: "Virgo", moon_sign: "Gemini", moon_house: 10, sun_sign: "Taurus", sun_house: 9 } },
        },
        {
          id: "cv-old",
          created_at: "2026-04-27T00:00:00Z",
          chart_version: 8,
          input_hash: "ih8",
          settings_hash: "sh8",
          is_current: false,
          status: "completed",
          chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 }, dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } } },
        },
      ],
    });
    createServiceClientMock.mockReturnValue(service);
    const code = await main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--dry-run"]);
    expect(code).toBe(0);
  });

  it("refuses apply if Mahadasha remains missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    createServiceClientMock.mockReturnValue(makeServiceMock({
      birthProfileLookup: { data: { id: "p1", user_id: "u1", display_name: "Jyotishko Roy", canonical_profile: true, current_chart_version_id: null }, error: null },
      chartRows: [{
        id: "cv-old",
        created_at: "2026-04-27T00:00:00Z",
        chart_version: 8,
        input_hash: "ih8",
        settings_hash: "sh8",
        is_current: false,
        status: "completed",
        chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigashira", moon_pada: 4 } },
      }],
    }));
    await expect(main(["--profile-id", "b64406d3-04b2-431b-a7f6-cb9b728fc4da", "--apply"])).rejects.toThrow(/calculation_or_source_validation_failed/);
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
