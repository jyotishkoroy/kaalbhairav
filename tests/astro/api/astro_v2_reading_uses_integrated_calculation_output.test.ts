/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }));
vi.mock("@/lib/astro/consultation", () => ({ resolveConsultationFeatureFlags: vi.fn(() => ({})), runConsultationProductionWrapper: vi.fn(() => ({ shouldUseFallback: true, answer: "", metadata: {} })) }));
vi.mock("@/lib/astro/current-chart-version", () => ({ loadCurrentAstroChartForUser: vi.fn() }));
vi.mock("@/lib/astro/rag/rag-routing", () => ({ routeAstroRagRequest: vi.fn(() => ({ kind: "rag" })) }));
vi.mock("@/lib/astro/rag/feature-flags", () => ({ getAstroRagFlags: vi.fn(() => ({ ragEnabled: true, routingEnabled: true, llmAnswerEngineEnabled: true })) }));
vi.mock("@/lib/astro/public-chart-facts", () => ({ buildPublicChartFacts: vi.fn(() => ({ lagnaSign: "Leo", moonSign: "Gemini", sunSign: "Taurus", moonHouse: 11, sunHouse: 10, confidence: "complete", warnings: [] })) }));
vi.mock("@/lib/astro/exact-chart-facts", () => ({ answerExactFactFromPublicFacts: vi.fn(() => ({ matched: true, answer: "aadesh: Your Lagna is Leo." })) }));
vi.mock("@/lib/astro/rag/rag-reading-orchestrator", () => ({ ragReadingOrchestrator: vi.fn() }));

import { POST } from "@/app/api/astro/v2/reading/route";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { loadCurrentAstroChartForUser } from "@/lib/astro/current-chart-version";
import { ragReadingOrchestrator } from "@/lib/astro/rag/rag-reading-orchestrator";
import { answerExactFactFromPublicFacts } from "@/lib/astro/exact-chart-facts";

function req(body: unknown) { return new NextRequest("https://www.tarayai.com/api/astro/v2/reading", { method: "POST", headers: { "content-type": "application/json", origin: "https://www.tarayai.com" }, body: JSON.stringify(body) }); }
function supabase(user: unknown) { return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }; }
function user() { return { id: "u1" }; }
function chart(lagna = "Leo") { return { ok: true, profile: { id: "p1", user_id: "u1", status: "active", current_chart_version_id: "cv1" }, chartVersion: { id: "cv1", profile_id: "p1", user_id: "u1", chart_version: 16, schema_version: "chart_json_v2", status: "completed", is_current: true, chart_json: { schemaVersion: "chart_json_v2", metadata: { profileId: "p1", chartVersionId: "cv1", chartVersion: 16, inputHash: "i", settingsHash: "s", engineVersion: "e", ephemerisVersion: "ep", ayanamsha: "lahiri", houseSystem: "whole_sign", runtimeClockIso: "2026-05-05T00:00:00.000Z" }, sections: { timeFacts: { status: "computed", source: "deterministic_calculation", fields: {} }, planetaryPositions: { status: "computed", source: "deterministic_calculation", fields: { byBody: { Sun: { sign: "Taurus", house: 10 }, Moon: { sign: "Gemini", house: 11, nakshatra: "Ardra", pada: 2 } } } }, lagna: lagna ? { status: "computed", source: "deterministic_calculation", fields: { sign: lagna, ascendant: { sign: lagna } } } : { status: "unavailable", source: "none", reason: "missing", fields: {} }, houses: { status: "computed", source: "deterministic_calculation", fields: {} }, panchang: { status: "computed", source: "deterministic_calculation", fields: { weekday: "Tuesday" } }, d1Chart: { status: "computed", source: "deterministic_calculation", fields: { lagnaSign: lagna, moonSign: "Gemini", sunSign: "Taurus", moonHouse: 11, sunHouse: 10 } }, d9Chart: { status: "computed", source: "deterministic_calculation", fields: {} }, shodashvarga: { status: "computed", source: "deterministic_calculation", fields: {} }, shodashvargaBhav: { status: "computed", source: "deterministic_calculation", fields: {} }, vimshottari: { status: "computed", source: "deterministic_calculation", fields: { currentMahadasha: { lord: "Saturn" }, currentAntardasha: { lord: "Mercury" } } }, kp: { status: "computed", source: "deterministic_calculation", fields: {} }, dosha: { status: "computed", source: "deterministic_calculation", fields: {} }, ashtakavarga: { status: "computed", source: "deterministic_calculation", fields: {} }, transits: { status: "unavailable", source: "none", reason: "missing", fields: {} }, advanced: { status: "unavailable", source: "none", reason: "missing", fields: {} } } } }, predictionSummary: null }; }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(createClient).mockResolvedValue(supabase(user()) as never); vi.mocked(createServiceClient).mockReturnValue({} as never); vi.mocked(loadCurrentAstroChartForUser).mockResolvedValue(chart() as never); });

describe("astro v2 reading uses integrated calculation output", () => {
  it("answers exact fact without orchestrator", async () => {
    const resp = await POST(req({ question: "What is my Lagna?" }));
    expect((await resp.json()).answer).toContain("Leo");
    expect(ragReadingOrchestrator).not.toHaveBeenCalled();
    expect(answerExactFactFromPublicFacts).toHaveBeenCalled();
  });
  it("ignores spoofed client chart data", async () => {
    await POST(req({ question: "What is my Lagna?", chart: { lagna: { sign: "Virgo" } }, publicFacts: { lagnaSign: "Virgo" } }));
    expect(answerExactFactFromPublicFacts).toHaveBeenCalled();
  });
  it("returns validation error for malformed body", async () => {
    const resp = await POST(req({}));
    expect(resp.status).toBe(400);
  });
  it("returns unavailable when lagna missing", async () => {
    vi.mocked(loadCurrentAstroChartForUser).mockResolvedValue(chart("") as never);
    vi.mocked(answerExactFactFromPublicFacts).mockReturnValueOnce({ matched: true, answer: "aadesh: That exact chart fact is unavailable because the deterministic Lagna calculation is not implemented. I will not guess it." } as never);
    const resp = await POST(req({ question: "What is my Lagna?" }));
    expect((await resp.json()).answer.toLowerCase()).toContain("unavailable");
  });
  it("passes server facts to orchestrator for interpretive requests", async () => {
    vi.mocked(answerExactFactFromPublicFacts).mockReturnValueOnce({ matched: false } as never);
    vi.mocked(loadCurrentAstroChartForUser).mockResolvedValueOnce(chart() as never);
    vi.mocked(ragReadingOrchestrator).mockResolvedValue({ answer: "interpretive", followUpQuestion: null, followUpAnswer: null, status: "answer_now", meta: { engine: "rag_deterministic", ragEnabled: true, exactFactAnswered: false, safetyGatePassed: true, safetyBlocked: false, ollamaAnalyzerUsed: false, deterministicAnalyzerUsed: true, supabaseRetrievalUsed: false, reasoningGraphUsed: false, timingEngineUsed: false, sufficiencyStatus: null, answerContractBuilt: false, groqUsed: false, groqRetryUsed: false, ollamaCriticUsed: false, validationPassed: true, fallbackUsed: false, followupAsked: false, timingsAvailable: false, pipelineSteps: [] }, artifacts: {} } as never);
    await POST(req({ question: "How should I think about my career?" }));
    expect(ragReadingOrchestrator).toHaveBeenCalled();
  });
});
