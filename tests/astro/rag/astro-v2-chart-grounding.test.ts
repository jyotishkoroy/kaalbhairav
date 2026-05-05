/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/astro/reading/reading-orchestrator-v2", () => ({
  generateReadingV2: vi.fn(async () => ({
    answer: "generic fallback answer",
    meta: { followUpQuestion: null, followUpAnswer: null },
  })),
}));

vi.mock("@/lib/astro/rag/rag-reading-orchestrator", () => ({
  ragReadingOrchestrator: vi.fn(async () => ({
    status: "fallback",
    answer: "generic fallback answer",
    meta: { engine: "fallback", exactFactAnswered: false, safetyBlocked: false, followupAsked: false, fallbackUsed: true },
  })),
}));

vi.mock("@/lib/astro/rag/feature-flags", () => ({
  getAstroRagFlags: vi.fn(() => ({ ragEnabled: true, routingEnabled: true })),
}));

import { handleAstroV2ReadingRequest } from "@/lib/astro/rag/astro-v2-reading-handler";
import { generateReadingV2 } from "@/lib/astro/reading/reading-orchestrator-v2";
import { ragReadingOrchestrator } from "@/lib/astro/rag/rag-reading-orchestrator";

function request(body: unknown) {
  return new Request("https://www.tarayai.com/api/astro/v2/reading", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

const groundedChartContext = async () => ({
  publicFacts: {
    lagna: "Leo",
    moon: "Gemini / 11",
    sun: "Taurus / 10",
    nakshatra: "Mrigashira pada 4",
    mahadasha: "Jupiter",
  },
  chartContext: "Lagna: Leo. Moon: Gemini / 11. Sun: Taurus / 10.",
  chartVersionId: "test-chart-version",
});

describe("astro-v2 chart grounding", () => {
  it("threads chartContext into downstream input when grounded", async () => {
    const resp = await handleAstroV2ReadingRequest(request({
      question: "How will my today be in the field of relationship?",
      chartContext: "Chart basis: Leo Lagna.",
      metadata: { oneShot: true, disableFollowUps: true, disableMemory: true },
      chartVersionId: "chart-1",
      profileId: "profile-1",
    }), { loadCurrentChartContext: groundedChartContext });
    expect(resp.status).toBe(200);
    expect(ragReadingOrchestrator).toHaveBeenCalled();
    expect(generateReadingV2).toHaveBeenCalled();
  });

  it("keeps oneShot from exposing follow-ups", async () => {
    const resp = await handleAstroV2ReadingRequest(request({
      question: "How will my today be in the field of relationship?",
      chartContext: "Chart basis: Leo Lagna.",
      metadata: { oneShot: true, disableFollowUps: true, disableMemory: true },
    }), { loadCurrentChartContext: groundedChartContext });
    const body = await resp.json();
    expect(body.followUpQuestion).toBeNull();
    expect(body.followUpAnswer).toBeNull();
  });

  it("prefixes fallback answers with chart context when grounded", async () => {
    const resp = await handleAstroV2ReadingRequest(request({
      question: "How will my today be in the field of relationship?",
      chartContext: "Chart basis: Leo Lagna.",
      metadata: { oneShot: true, disableFollowUps: true, disableMemory: true, requireChartGrounding: true, publicChartBasis: "Chart basis: Leo Lagna." },
    }), { loadCurrentChartContext: groundedChartContext });
    const body = await resp.json();
    expect(body.answer).toContain("Chart basis: Leo Lagna.");
    expect(body.answer).toContain("aadesh:");
  });

  it("still blocks unsafe death and remedy certainty", async () => {
    const resp = await handleAstroV2ReadingRequest(request({
      question: "What is my exact death date?",
      chartContext: "Chart basis: Leo Lagna.",
      metadata: { oneShot: true, disableFollowUps: true, disableMemory: true, requireChartGrounding: true },
    }), { loadCurrentChartContext: groundedChartContext });
    const body = await resp.json();
    expect(String(body.answer)).not.toContain("exact death date");
  });
});
