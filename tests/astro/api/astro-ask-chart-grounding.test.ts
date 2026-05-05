/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { NextRequest } from "next/server";
import { POST } from "@/app/api/astro/ask/route";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { answerCanonicalAstroQuestion } from "@/lib/astro/ask/answer-canonical-astro-question";
import { finalizeAstroAnswer } from "@/lib/astro/finalize-astro-answer";
import { buildPublicChartFacts } from "@/lib/astro/public-chart-facts";

function makeRequest(body: unknown) {
  return new NextRequest("https://www.tarayai.com/api/astro/ask", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.tarayai.com" },
    body: JSON.stringify(body),
  });
}

function makeUser() {
  return { id: "user-1", email: "u@example.com" };
}

function makeSupabase(user: unknown) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } };
}

function makeService(profile: unknown, chart: unknown, predictionSummary: unknown = null) {
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
  const profileQuery = makeQuery(profile);
  const chartQuery = makeQuery(chart);
  const summaryQuery = makeQuery(predictionSummary);
  return { from: vi.fn((table: string) => table === "birth_profiles" ? profileQuery : table === "chart_json_versions" ? chartQuery : summaryQuery) };
}

function makeCanonicalChartJson(chartVersionId: string, profileId = "p1", userId = "user-1") {
  return {
    schemaVersion: "chart_json_v2",
    metadata: {
      profileId,
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
      lagna: { status: "computed", source: "deterministic_calculation", fields: { ascendant: { sign: "Leo" } } },
      houses: { status: "computed", source: "deterministic_calculation", fields: { placements: { Moon: 11, Sun: 10 } } },
      panchang: { status: "computed", source: "deterministic_calculation", fields: { tithi: "test-tithi" } },
      d1Chart: { status: "computed", source: "deterministic_calculation", fields: { lagnaSign: "Leo", moonSign: "Gemini", sunSign: "Taurus" } },
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
    public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", sun_sign: "Taurus", moon_house: 11, sun_house: 10 },
    chart_json_v2: undefined,
    chartJsonV2: undefined,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "generic answer" });
});

describe("POST /api/astro/ask chart grounding", () => {
  it("returns unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService(null, null) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    expect(resp.status).toBe(401);
  });

  it("returns setup_required when no active profile", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService(null, null) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    expect(resp.status).toBe(200);
  });

  it("returns chart-not-ready when no chart exists", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1", user_id: "user-1", status: "active", current_chart_version_id: null }, null) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(body.answer.toLowerCase()).toContain("chart");
  });

  it("returns chart-not-ready when chart is empty", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    // Chart row exists but strict filters (is_current=true, status=completed) return null
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1", user_id: "user-1", status: "active", current_chart_version_id: "c1" }, null) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(body.answer.toLowerCase()).toContain("chart");
  });

  it("answers Lagna deterministically without V2", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService(
      { id: "p1", user_id: "user-1", status: "active", current_chart_version_id: "c1" },
      { id: "c1", profile_id: "p1", user_id: "user-1", chart_version: 1, schema_version: "chart_json_v2", is_current: true, status: "completed", chart_json: makeCanonicalChartJson("c1") },
    ) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "aadesh: Your Lagna is Leo." });
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(body.answer).toContain("Leo");
    expect(answerCanonicalAstroQuestion).not.toHaveBeenCalled();
  });

  it("passes public chart facts to the canonical handler for interpretive questions", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService(
      { id: "p1", user_id: "user-1", status: "active", current_chart_version_id: "c1" },
      { id: "c1", profile_id: "p1", user_id: "user-1", chart_version: 1, schema_version: "chart_json_v2", is_current: true, status: "completed", chart_json: makeCanonicalChartJson("c1") },
      { prediction_context: { summary: "Stable summary" } },
    ) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "aadesh: Based on Leo Lagna..." });
    const resp = await POST(makeRequest({ question: "How will my today be in the field of relationship?" }));
    const body = await resp.json();
    expect(body.answer).toContain("Leo");
    expect(answerCanonicalAstroQuestion).toHaveBeenCalledTimes(1);
    const callBody = vi.mocked(answerCanonicalAstroQuestion).mock.calls[0][0];
    expect(callBody.profileId).toBe("p1");
    expect(callBody.chartVersionId).toBe("c1");
    expect(callBody.publicChartFacts?.lagnaSign).toBe("Leo");
    expect(callBody.publicChartFacts?.moonSign).toBe("Gemini");
    expect(callBody.publicChartFacts?.sunSign).toBe("Taurus");
  });

  it("ignores client profileId and chartVersionId", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService(
      { id: "p1", user_id: "user-1", status: "active", current_chart_version_id: "c1" },
      { id: "c1", profile_id: "p1", user_id: "user-1", chart_version: 1, schema_version: "chart_json_v2", is_current: true, status: "completed", chart_json: makeCanonicalChartJson("c1") },
    ) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "generic answer" });
    await POST(makeRequest({ question: "What about my career?", profileId: "evil", chartVersionId: "evil" }));
    const callBody = vi.mocked(answerCanonicalAstroQuestion).mock.calls[0][0];
    expect(callBody.profileId).toBe("p1");
    expect(callBody.chartVersionId).toBe("c1");
  });

  it("strips metadata from response", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService(
      { id: "p1", user_id: "user-1", status: "active", current_chart_version_id: "c1" },
      { id: "c1", profile_id: "p1", user_id: "user-1", chart_version: 1, schema_version: "chart_json_v2", is_current: true, status: "completed", chart_json: makeCanonicalChartJson("c1") },
    ) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "generic answer" });
    const resp = await POST(makeRequest({ question: "What about my career?" }));
    const body = await resp.json();
    expect(body.answer).toBe("aadesh: generic answer");
  });
});

// ── finalizeAstroAnswer chart-grounding tests (Leo Lagna fixture) ─────────

const leoFacts = buildPublicChartFacts({
  profileId: "test-profile",
  chartVersionId: "test-v1",
  chartJson: {
    public_facts: {
      lagna_sign: "Leo",
      moon_sign: "Gemini",
      moon_house: 11,
      sun_sign: "Taurus",
      sun_house: 10,
      moon_nakshatra: "Mrigasira",
      moon_pada: 4,
      mahadasha: "Jupiter",
      mangal_dosha: false,
      kalsarpa_yoga: false,
    },
  },
});

const FORBIDDEN_PATTERNS = [
  /profile_id\s*[:=]/i,
  /chart_version_id\s*[:=]/i,
  /user_id\s*[:=]/i,
  /\bfact:\s*/i,
  /\bchart_fact:\s*/i,
  /\bprovider\s*[:=]/i,
  /\bmodel\s*[:=]/i,
  /\bserver\s*[:=]/i,
  /\bmetadata\s*[:=]/i,
  /\bdebugTrace\b/i,
  /Retrieval cue:/i,
];

const WRONG_CHART_PATTERNS = [
  /Virgo Lagna/i,
  /Gemini Moon in the 10th house/i,
  /Taurus Sun in the 9th house/i,
  /Saturn Mahadasha/i,
];

describe("finalizeAstroAnswer – Virgo Lagna in Leo chart", () => {
  it("violations contain wrong_lagna", () => {
    const result = finalizeAstroAnswer({ answer: "aadesh: Your Virgo Lagna is analytical.", facts: leoFacts });
    expect(result.violations).toContain("wrong_lagna");
  });
  it("answer is repaired or returns safe fallback (no Virgo Lagna)", () => {
    const result = finalizeAstroAnswer({ answer: "aadesh: Your Virgo Lagna is analytical.", facts: leoFacts });
    expect(result.answer).not.toMatch(/Virgo Lagna/i);
  });
});

describe("finalizeAstroAnswer – missing aadesh: prefix", () => {
  it("adds aadesh: prefix", () => {
    const result = finalizeAstroAnswer({ answer: "Your Lagna is Leo.", facts: leoFacts });
    expect(result.answer.toLowerCase()).toMatch(/^aadesh:/);
  });
});

describe("finalizeAstroAnswer – profile_id leak", () => {
  it("removes profile_id from answer", () => {
    const result = finalizeAstroAnswer({ answer: "aadesh: profile_id=abc123 Your Lagna is Leo.", facts: leoFacts });
    expect(result.answer).not.toMatch(/profile_id\s*[:=]/i);
  });
});

describe("finalizeAstroAnswer – Retrieval cue leak", () => {
  it("removes Retrieval cue:", () => {
    const result = finalizeAstroAnswer({ answer: "aadesh: Your Lagna is Leo.\nRetrieval cue: secret.", facts: leoFacts });
    expect(result.answer).not.toContain("Retrieval cue:");
  });
});

describe("finalizeAstroAnswer – correct answer", () => {
  it("ok=true for correct answer with no violations", () => {
    const result = finalizeAstroAnswer({ answer: "aadesh: Leo Lagna supports authority.", facts: leoFacts });
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

describe("finalizeAstroAnswer – no forbidden patterns in Leo answer", () => {
  const result = finalizeAstroAnswer({ answer: "aadesh: Leo Lagna, Jupiter Mahadasha.", facts: leoFacts });
  for (const pattern of FORBIDDEN_PATTERNS) {
    it(`no ${pattern.source}`, () => expect(result.answer).not.toMatch(pattern));
  }
});

describe("finalizeAstroAnswer – no wrong chart patterns in clean Leo answer", () => {
  const result = finalizeAstroAnswer({ answer: "aadesh: Leo Lagna, Gemini Moon in the 11th house.", facts: leoFacts });
  for (const pattern of WRONG_CHART_PATTERNS) {
    it(`no wrong pattern: ${pattern.source}`, () => expect(result.answer).not.toMatch(pattern));
  }
});
