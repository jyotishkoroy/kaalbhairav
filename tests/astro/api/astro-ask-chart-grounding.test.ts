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
  const profileQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: profile }) };
  const chartQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: chart }) };
  const summaryQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: predictionSummary }) };
  return { from: vi.fn((table: string) => table === "birth_profiles" ? profileQuery : table === "chart_json_versions" ? chartQuery : summaryQuery) };
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
    expect(resp.status).toBe(404);
  });

  it("returns chart-not-ready when no chart exists", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    // Profile without current_chart_version_id → strict mode returns chart_not_ready immediately
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1", current_chart_version_id: null }, null) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(body.answer.toLowerCase()).toContain("chart");
  });

  it("returns chart-not-ready when chart is empty", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    // Chart row exists but strict filters (is_current=true, status=completed) return null
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1", current_chart_version_id: "c1" }, null) as never);
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(body.answer.toLowerCase()).toContain("chart");
  });

  it("answers Lagna deterministically without V2", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService(
      { id: "p1", current_chart_version_id: "c1" },
      { id: "c1", is_current: true, status: "completed", chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigasira", moon_pada: 4, mahadasha: "Jupiter" } } },
    ) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "aadesh: Your Lagna is Leo." });
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(body.answer).toContain("Leo");
    expect(answerCanonicalAstroQuestion).toHaveBeenCalledTimes(1);
  });

  it("passes public chart facts to the canonical handler for interpretive questions", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService(
      { id: "p1", current_chart_version_id: "c1" },
      { id: "c1", is_current: true, status: "completed", chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigasira", moon_pada: 4, mahadasha: "Jupiter", antardashaNow: "Jupiter-Ketu" } } },
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
      { id: "p1", current_chart_version_id: "c1" },
      { id: "c1", is_current: true, status: "completed", chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigasira", moon_pada: 4, mahadasha: "Jupiter" } } },
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
      { id: "p1", current_chart_version_id: "c1" },
      { id: "c1", is_current: true, status: "completed", chart_json: { public_facts: { lagna_sign: "Leo", moon_sign: "Gemini", moon_house: 11, sun_sign: "Taurus", sun_house: 10, moon_nakshatra: "Mrigasira", moon_pada: 4, mahadasha: "Jupiter" } } },
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
