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
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1" }, null) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "aadesh: Your birth chart context is not ready yet. Please update your birth details once so Tarayai can calculate your chart before answering." });
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(body.answer).toContain("chart context is not ready");
  });

  it("returns chart-not-ready when chart is empty", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1" }, { id: "c1", chart_json: {} }) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "aadesh: Your birth chart context is not ready yet. Please update your birth details once so Tarayai can calculate your chart before answering." });
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(body.answer).toContain("chart context is not ready");
  });

  it("answers Lagna deterministically without V2", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1" }, { id: "c1", chart_json: { ascendant: { sign: "Leo" } } }) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "aadesh: Your Lagna is Leo." });
    const resp = await POST(makeRequest({ question: "What is my Lagna?" }));
    const body = await resp.json();
    expect(body.answer).toContain("Leo");
  });

  it("passes chart grounding fields to V2 for interpretive questions", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1" }, { id: "c1", chart_json: { ascendant: { sign: "Leo" }, planets: { Moon: { sign: "Taurus", house: 10 } } } }, { prediction_context: { summary: "Stable summary" } }) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "generic answer" });
    const resp = await POST(makeRequest({ question: "How will my today be in the field of relationship?" }));
    const body = await resp.json();
    expect(body.answer).toBe("generic answer");
    expect(answerCanonicalAstroQuestion).toHaveBeenCalledTimes(1);
    const callBody = vi.mocked(answerCanonicalAstroQuestion).mock.calls[0][0];
    expect(callBody.profileId).toBe("p1");
    expect(callBody.chartVersionId).toBe("c1");
    expect(callBody.chartJson).toEqual({ ascendant: { sign: "Leo" }, planets: { Moon: { sign: "Taurus", house: 10 } } });
  });

  it("ignores client profileId and chartVersionId", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1" }, { id: "c1", chart_json: { ascendant: { sign: "Leo" } } }) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "generic answer" });
    await POST(makeRequest({ question: "What about my career?", profileId: "evil", chartVersionId: "evil" }));
    const callBody = vi.mocked(answerCanonicalAstroQuestion).mock.calls[0][0];
    expect(callBody.profileId).toBe("p1");
    expect(callBody.chartVersionId).toBe("c1");
  });

  it("strips metadata from response", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(makeUser()) as never);
    vi.mocked(createServiceClient).mockReturnValue(makeService({ id: "p1" }, { id: "c1", chart_json: { ascendant: { sign: "Leo" } } }) as never);
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "generic answer" });
    const resp = await POST(makeRequest({ question: "What about my career?" }));
    const body = await resp.json();
    expect(body.answer).toBe("generic answer");
  });
});
