/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/astro/ask/answer-canonical-astro-question", () => ({
  answerCanonicalAstroQuestion: vi.fn(),
}));
vi.mock("@/lib/astro/public-chart-facts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/astro/public-chart-facts")>();
  return {
    ...actual,
    buildPublicChartFacts: vi.fn(() => ({
      lagnaSign: "Leo",
      moonSign: "Gemini",
      sunSign: "Taurus",
      moonHouse: 11,
      sunHouse: 10,
      confidence: 1,
      warnings: [],
    })),
    validatePublicChartFacts: vi.fn(() => ({ ok: true })),
  };
});

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { answerCanonicalAstroQuestion } from "@/lib/astro/ask/answer-canonical-astro-question";
import { POST } from "@/app/api/astro/ask/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/astro/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeSupabaseMock(user: unknown) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } };
}

function makeChartJson(chartVersionId: string, includeLagna = true) {
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
      houses: { status: "computed", source: "deterministic_calculation", fields: { placements: { Moon: 11, Sun: 10 } } },
      panchang: { status: "computed", source: "deterministic_calculation", fields: { tithi: "test-tithi" } },
      lagna: includeLagna
        ? { status: "computed", source: "deterministic_calculation", fields: { ascendant: { sign: "Leo" } } }
        : { status: "unavailable", source: "none", reason: "insufficient_birth_data", fields: { value: { status: "unavailable", value: null, reason: "insufficient_birth_data", source: "none", requiredModule: "lagna", fieldKey: "sections.lagna" } } },
      d1Chart: includeLagna
        ? { status: "computed", source: "deterministic_calculation", fields: { lagnaSign: "Leo", moonSign: "Gemini", sunSign: "Taurus", moonHouse: 11, sunHouse: 10 } }
        : { status: "unavailable", source: "none", reason: "insufficient_birth_data", fields: { value: { status: "unavailable", value: null, reason: "insufficient_birth_data", source: "none", requiredModule: "d1Chart", fieldKey: "sections.d1Chart" } } },
      d9Chart: { status: "computed", source: "deterministic_calculation", fields: {} },
      shodashvarga: { status: "computed", source: "deterministic_calculation", fields: {} },
      shodashvargaBhav: { status: "computed", source: "deterministic_calculation", fields: {} },
      vimshottari: { status: "computed", source: "deterministic_calculation", fields: { currentMahadasha: { lord: "Saturn" }, currentAntardasha: { lord: "Mercury" } } },
      kp: { status: "computed", source: "deterministic_calculation", fields: {} },
      dosha: { status: "computed", source: "deterministic_calculation", fields: { manglik: { isManglik: false } } },
      ashtakavarga: { status: "computed", source: "deterministic_calculation", fields: { sarvashtakavargaTotal: { grandTotal: 292 } } },
      transits: { status: "unavailable", source: "none", reason: "insufficient_birth_data", fields: { value: { status: "unavailable", value: null, reason: "insufficient_birth_data", source: "none", requiredModule: "transits", fieldKey: "transits" } } },
      advanced: { status: "unavailable", source: "none", reason: "insufficient_birth_data", fields: { value: { status: "unavailable", value: null, reason: "insufficient_birth_data", source: "none", requiredModule: "advanced", fieldKey: "advanced" } } },
    },
    public_facts: includeLagna ? { lagna_sign: "Leo", moon_sign: "Gemini", sun_sign: "Taurus", moon_house: 11, sun_house: 10 } : { moon_sign: "Gemini", sun_sign: "Taurus", moon_house: 11, sun_house: 10 },
  };
}

function makeServiceMock({
  profile,
  chart,
  predictionSummary,
}: {
  profile?: unknown;
  chart?: unknown;
  predictionSummary?: unknown;
}) {
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
  const profileQuery = makeQuery(profile ?? null);
  const chartQuery = makeQuery(chart ?? null);
  const summaryQuery = makeQuery(predictionSummary ?? null);
  return { from: vi.fn((table: string) => table === "birth_profiles" ? profileQuery : table === "chart_json_versions" ? chartQuery : table === "prediction_ready_summaries" ? summaryQuery : profileQuery) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "aadesh: canonical answer." });
});

describe("POST /api/astro/ask exact facts from strict current chart", () => {
  it("answers Lagna from strict current chart even when prediction summary exists", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", user_id: "u1", current_chart_version_id: "cv1" },
      chart: { id: "cv1", profile_id: "p1", user_id: "u1", chart_version: 1, schema_version: "chart_json_v2", status: "completed", is_current: true, chart_json: makeChartJson("cv1") },
      predictionSummary: { id: "s1", prediction_context: { ready: true } },
    }) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toContain("Leo");
    expect(answerCanonicalAstroQuestion).not.toHaveBeenCalled();
  });

  it("answers Lagna when prediction summary is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", user_id: "u1", current_chart_version_id: "cv1" },
      chart: { id: "cv1", profile_id: "p1", user_id: "u1", chart_version: 1, schema_version: "chart_json_v2", status: "completed", is_current: true, chart_json: makeChartJson("cv1") },
    }) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toContain("Leo");
  });

  it("returns safe chart-not-ready answer when pointer is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: "p1", user_id: "u1", current_chart_version_id: null }, chart: null }) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toMatch(/birth chart/i);
  });

  it("returns safe unavailable when lagna is missing from chart JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", user_id: "u1", current_chart_version_id: "cv1" },
      chart: {
        id: "cv1",
        profile_id: "p1",
        user_id: "u1",
        chart_version: 1,
        schema_version: "chart_json_v2",
        status: "completed",
        is_current: true,
        chart_json: makeChartJson("cv1", false),
      },
    }) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toMatch(/not available|unable|insufficient/i);
  });

  it("ignores client-supplied fake chart data", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", user_id: "u1", current_chart_version_id: "cv1" },
      chart: { id: "cv1", profile_id: "p1", user_id: "u1", chart_version: 1, schema_version: "chart_json_v2", status: "completed", is_current: true, chart_json: makeChartJson("cv1") },
    }) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?", chartContext: { public_facts: { lagna_sign: "Virgo" } } }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toContain("Leo");
    expect(body.answer).not.toContain("Virgo");
  });
});
