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
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
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
    maybeSingle: vi.fn().mockResolvedValue({ data: chart ?? null, error: null }),
  };
  const summaryQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: predictionSummary ?? null, error: null }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "birth_profiles") return profileQuery;
      if (table === "chart_json_versions") return chartQuery;
      if (table === "prediction_ready_summaries") return summaryQuery;
      return profileQuery;
    }),
  };
}

const currentChartJson = {
  metadata: {
    schema_version: "29.0.0",
    chart_version_id: "chart-current",
  },
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
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "aadesh: canonical answer." });
});

describe("POST /api/astro/ask exact facts from strict current chart", () => {
  it("answers Lagna from strict current chart even when prediction summary exists", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", current_chart_version_id: "cv1" },
      chart: { id: "cv1", profile_id: "p1", user_id: "u1", status: "completed", is_current: true, chart_json: currentChartJson },
      predictionSummary: { id: "s1", prediction_context: { ready: true } },
    }) as never);

    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toContain("Leo");
    expect(body.answer).not.toMatch(/recalculat/i);
    expect(answerCanonicalAstroQuestion).not.toHaveBeenCalled();
  });

  it("answers Lagna when prediction summary is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", current_chart_version_id: "cv1" },
      chart: { id: "cv1", profile_id: "p1", user_id: "u1", status: "completed", is_current: true, chart_json: currentChartJson },
      predictionSummary: null,
    }) as never);

    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toContain("Leo");
    expect(body.answer).not.toMatch(/recalculat/i);
    expect(answerCanonicalAstroQuestion).not.toHaveBeenCalled();
  });

  it("returns safe chart-not-ready answer when pointer is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", current_chart_version_id: null },
      chart: null,
      predictionSummary: null,
    }) as never);

    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toMatch(/birth chart/i);
    expect(body.answer).toMatch(/recalculat|update your birth details/i);
  });

  it("returns safe chart-not-ready answer when current chart is not is_current", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", current_chart_version_id: "cv1" },
      chart: null,
      predictionSummary: null,
    }) as never);

    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toMatch(/birth chart/i);
    expect(body.answer).toMatch(/recalculat|update your birth details/i);
  });

  it("returns safe chart-not-ready answer when chart ownership mismatches", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", current_chart_version_id: "cv1" },
      chart: null,
      predictionSummary: null,
    }) as never);

    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toMatch(/birth chart/i);
    expect(body.answer).toMatch(/recalculat|update your birth details/i);
  });

  it("answers exact facts from schema 29 current chart JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", current_chart_version_id: "cv1" },
      chart: { id: "cv1", profile_id: "p1", user_id: "u1", status: "completed", is_current: true, chart_json: currentChartJson },
      predictionSummary: null,
    }) as never);

    const resp = await POST(makeRequest({ question: "What is my Moon sign?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toContain("Gemini");
    expect(answerCanonicalAstroQuestion).not.toHaveBeenCalled();
  });

  it("returns safe unavailable when lagna is missing from chart JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", current_chart_version_id: "cv1" },
      chart: { id: "cv1", profile_id: "p1", user_id: "u1", status: "completed", is_current: true, chart_json: { metadata: { schema_version: "29.0.0" }, public_facts: { moon_sign: "Gemini" } } },
      predictionSummary: null,
    }) as never);

    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toMatch(/not available|unable|insufficient/i);
    expect(body.answer).not.toMatch(/recalculat/i);
  });

  it("ignores client-supplied fake chart data", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", current_chart_version_id: "cv1" },
      chart: { id: "cv1", profile_id: "p1", user_id: "u1", status: "completed", is_current: true, chart_json: currentChartJson },
      predictionSummary: null,
    }) as never);

    const resp = await POST(makeRequest({
      question: "What is my Lagna?",
      chartContext: { public_facts: { lagna_sign: "Virgo" } },
      deterministicChartFacts: [{ factType: "lagna", factKey: "lagna", factValue: "Virgo" }],
    }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(body.answer).toContain("Leo");
    expect(body.answer).not.toContain("Virgo");
  });

  it("falls through to canonical handler for interpretive questions", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: "u1", email: "u1@example.com" }) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: "p1", current_chart_version_id: "cv1" },
      chart: { id: "cv1", profile_id: "p1", user_id: "u1", status: "completed", is_current: true, chart_json: currentChartJson },
      predictionSummary: { id: "s1", prediction_context: { ready: true } },
    }) as never);

    const resp = await POST(makeRequest({ question: "Tell me about my career" }));
    const body = await resp.json();
    expect(resp.status).toBe(200);
    expect(answerCanonicalAstroQuestion).toHaveBeenCalled();
    expect(body.answer).toContain("canonical answer");
  });
});
