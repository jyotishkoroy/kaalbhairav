/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }));
vi.mock("@/lib/astro/ask/answer-canonical-astro-question", () => ({ answerCanonicalAstroQuestion: vi.fn() }));
vi.mock("@/lib/astro/public-chart-facts", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/astro/public-chart-facts")>()), buildPublicChartFacts: vi.fn(), validatePublicChartFacts: vi.fn(() => ({ ok: true })) }));

import { POST } from "@/app/api/astro/ask/route";
import { answerCanonicalAstroQuestion } from "@/lib/astro/ask/answer-canonical-astro-question";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildPublicChartFacts } from "@/lib/astro/public-chart-facts";
import { validateAstroAnswerAgainstPublicFacts } from "@/lib/astro/rag/answer-validator";
import { answerExactFactFromPublicFacts } from "@/lib/astro/exact-chart-facts";

function req(body: unknown) {
  return new NextRequest("https://www.tarayai.com/api/astro/ask", { method: "POST", headers: { "content-type": "application/json", origin: "https://www.tarayai.com" }, body: JSON.stringify(body) });
}

function user() {
  return { id: "u1", email: "u1@example.com" };
}

function supabase(u: unknown) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: u } }) } };
}

function service(profile: unknown, chart: unknown) {
  const q = (data: unknown) => ({ select: vi.fn(() => q(data)), eq: vi.fn(() => q(data)), order: vi.fn(() => q(data)), limit: vi.fn(() => q(data)), maybeSingle: vi.fn(async () => ({ data, error: null })), single: vi.fn(async () => ({ data, error: null })) });
  const profileQ = q(profile);
  const chartQ = q(chart);
  return { from: vi.fn((table: string) => table === "birth_profiles" ? profileQ : chartQ) };
}

function chartJson(lagna = "Leo") {
  return {
    schemaVersion: "chart_json_v2",
    metadata: { profileId: "p1", chartVersionId: "cv1", chartVersion: 16, inputHash: "i", settingsHash: "s", engineVersion: "e", ephemerisVersion: "ep", ayanamsha: "lahiri", houseSystem: "whole_sign", runtimeClockIso: "2026-05-05T00:00:00.000Z" },
    sections: {
      timeFacts: { status: "computed", source: "deterministic_calculation", fields: {} },
      planetaryPositions: { status: "computed", source: "deterministic_calculation", fields: { byBody: { Sun: { sign: "Taurus", house: 10 }, Moon: { sign: "Gemini", house: 11, nakshatra: "Ardra", pada: 2 } } } },
      lagna: lagna ? { status: "computed", source: "deterministic_calculation", fields: { sign: lagna, ascendant: { sign: lagna } } } : { status: "unavailable", source: "none", reason: "missing", fields: {} },
      houses: { status: "computed", source: "deterministic_calculation", fields: {} },
      panchang: { status: "computed", source: "deterministic_calculation", fields: { weekday: "Tuesday" } },
      d1Chart: { status: "computed", source: "deterministic_calculation", fields: { lagnaSign: lagna, moonSign: "Gemini", sunSign: "Taurus", moonHouse: 11, sunHouse: 10 } },
      d9Chart: { status: "computed", source: "deterministic_calculation", fields: {} },
      shodashvarga: { status: "computed", source: "deterministic_calculation", fields: {} },
      shodashvargaBhav: { status: "computed", source: "deterministic_calculation", fields: {} },
      vimshottari: { status: "computed", source: "deterministic_calculation", fields: { currentMahadasha: { lord: "Saturn" }, currentAntardasha: { lord: "Mercury" } } },
      kp: { status: "computed", source: "deterministic_calculation", fields: { byBody: { Moon: { rashiLord: "Mercury", subLord: "Saturn" } }, significators: { status: "unavailable", value: null, reason: "module_not_implemented", source: "none", requiredModule: "kp-significators", fieldKey: "sections.kp.fields.significators" } } },
      dosha: { status: "computed", source: "deterministic_calculation", fields: { manglik: { isManglik: false }, kalsarpa: { isKalsarpa: false } } },
      ashtakavarga: { status: "computed", source: "deterministic_calculation", fields: { sarvashtakavargaTotal: { grandTotal: 292 } } },
      transits: { status: "unavailable", source: "none", reason: "missing", fields: {} },
      advanced: { status: "unavailable", source: "none", reason: "missing", fields: {} },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "aadesh: generic" });
  vi.mocked(buildPublicChartFacts).mockImplementation(() => ({ lagnaSign: "Leo", moonSign: "Gemini", sunSign: "Taurus", moonHouse: 11, sunHouse: 10, confidence: "complete", warnings: [] } as never));
});

describe("astro unavailable exact fact enforcement", () => {
  it("allows deterministic lagna and skips orchestrator", async () => {
    vi.mocked(createClient).mockResolvedValue(supabase(user()) as never);
    vi.mocked(createServiceClient).mockReturnValue(service({ id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" }, { id: "cv1", profile_id: "p1", user_id: "u1", chart_version: 16, schema_version: "chart_json_v2", status: "completed", is_current: true, chart_json: chartJson() }) as never);
    const resp = await POST(req({ question: "What is my Lagna?" }));
    expect((await resp.json()).answer).toContain("Leo");
    expect(answerCanonicalAstroQuestion).not.toHaveBeenCalled();
  });

  it("allows deterministic lagna data but refuses KP significators", async () => {
    vi.mocked(createClient).mockResolvedValue(supabase(user()) as never);
    vi.mocked(createServiceClient).mockReturnValue(service({ id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" }, { id: "cv1", profile_id: "p1", user_id: "u1", chart_version: 16, schema_version: "chart_json_v2", status: "completed", is_current: true, chart_json: chartJson() }) as never);
    const exact = answerExactFactFromPublicFacts("What is my Lagna?", { lagnaSign: "Leo", moonSign: "Gemini", sunSign: "Taurus", moonHouse: 11, sunHouse: 10, confidence: "complete", warnings: [], profileId: "p1", chartVersionId: "cv1", source: "merged", placements: {}, unavailableFacts: {} } as never);
    expect(exact.matched).toBe(true);
    if (exact.matched) expect(exact.answer).toContain("Leo");
    const refused = await POST(req({ question: "What are my KP significators?" }));
    expect((await refused.json()).answer.toLowerCase()).toContain("unavailable");
  });

  it("rejects unsupported shadbala claims in validation", () => {
    const result = validateAstroAnswerAgainstPublicFacts({
      answer: "Your Shadbala score is 87.",
      publicFacts: { profileId: "p1", chartVersionId: "cv1", source: "merged", confidence: "complete", warnings: [], lagnaSign: "Leo", moonSign: "Gemini", sunSign: "Taurus", moonHouse: 11, sunHouse: 10, placements: {}, unavailableFacts: {} } as never,
    });
    expect(result.ok).toBe(false);
  });

  it("refuses unsupported module questions when chart data is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(supabase(user()) as never);
    vi.mocked(createServiceClient).mockReturnValue(service({ id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" }, { id: "cv1", profile_id: "p1", user_id: "u1", chart_version: 16, schema_version: "chart_json_v2", status: "completed", is_current: true, chart_json: chartJson() }) as never);
    const resp = await POST(req({ question: "What is my Yogini Dasha?" }));
    expect((await resp.json()).answer.toLowerCase()).toContain("unavailable");
    expect(answerCanonicalAstroQuestion).not.toHaveBeenCalled();
  });

  it("ignores spoofed advanced facts from the client body", async () => {
    vi.mocked(createClient).mockResolvedValue(supabase(user()) as never);
    vi.mocked(createServiceClient).mockReturnValue(service({ id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" }, { id: "cv1", profile_id: "p1", user_id: "u1", chart_version: 16, schema_version: "chart_json_v2", status: "completed", is_current: true, chart_json: chartJson() }) as never);
    const resp = await POST(req({ question: "What is my Shadbala?", chart: { shadbala: 87 }, publicFacts: { shadbala: 87 } }));
    expect((await resp.json()).answer.toLowerCase()).toContain("unavailable");
  });
});
