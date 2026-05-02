/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/astro/consultation", () => ({
  resolveConsultationFeatureFlags: vi.fn(),
  runConsultationProductionWrapper: vi.fn(),
}));

vi.mock("../../../lib/astro/reading/reading-orchestrator-v2", () => ({
  generateReadingV2: vi.fn(async (input: { question?: string }) => ({
    answer: `old v2 answer: ${input.question}`,
    meta: {
      version: "v2",
      directV2Route: true,
      usedFallback: false,
      followUpQuestion: "old follow up?",
      followUpAnswer: "old follow up answer",
    },
  })),
}));

import { handleAstroV2ReadingRequest } from "../../../lib/astro/rag/astro-v2-reading-handler";
import { resolveConsultationFeatureFlags, runConsultationProductionWrapper } from "../../../lib/astro/consultation";
import { generateReadingV2 } from "../../../lib/astro/reading/reading-orchestrator-v2";

const resolveFlagsMock = vi.mocked(resolveConsultationFeatureFlags);
const wrapperMock = vi.mocked(runConsultationProductionWrapper);
const oldRouteMock = vi.mocked(generateReadingV2);

function createRequest(body: unknown): Request {
  return new Request("https://www.tarayai.com/api/astro/v2/reading", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

function allFalseFlags() {
  return {
    consultationState: false,
    lifeContext: false,
    emotionalState: false,
    culturalContext: false,
    practicalConstraints: false,
    chartEvidence: false,
    patternRecognition: false,
    oneFollowUp: false,
    ephemeralMemoryReset: false,
    timingJudgement: false,
    remedyProportionality: false,
    responsePlan: false,
    orchestrator: false,
    finalConsultationAnswer: false,
    validator: false,
    monitoring: false,
    exactFactBypassAlwaysOn: true as const,
    fullConsultationPipelineEnabled: false,
    disabledReasons: [],
  };
}

function allTrueFlags() {
  return {
    consultationState: true,
    lifeContext: true,
    emotionalState: true,
    culturalContext: true,
    practicalConstraints: true,
    chartEvidence: true,
    patternRecognition: true,
    oneFollowUp: true,
    ephemeralMemoryReset: true,
    timingJudgement: true,
    remedyProportionality: true,
    responsePlan: true,
    orchestrator: true,
    finalConsultationAnswer: true,
    validator: true,
    monitoring: true,
    exactFactBypassAlwaysOn: true as const,
    fullConsultationPipelineEnabled: true,
    disabledReasons: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveFlagsMock.mockReturnValue(allFalseFlags() as never);
  wrapperMock.mockReturnValue({
    mode: "fallback",
    shouldUseFallback: true,
    resetAfterFinalAnswer: false,
  });
});

describe("/api/astro/v2/reading consultation wiring", () => {
  it("all consultation flags false exact fact still returns old answer", async () => {
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "What is my Lagna?" }));
    const payload = await readJson(response);
    expect(response.status).toBe(200);
    expect(String(payload.answer)).toContain("old v2 answer");
    expect(oldRouteMock).toHaveBeenCalledTimes(1);
    expect(wrapperMock).toHaveBeenCalledTimes(1);
  });

  it("all consultation flags false non-exact request returns old fallback path", async () => {
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?" }));
    const payload = await readJson(response);
    expect(response.status).toBe(200);
    expect(String(payload.answer)).toContain("old v2 answer");
    expect(payload.meta).toMatchObject({ directV2Route: true });
  });

  it("missing env flags do not crash route", async () => {
    resolveFlagsMock.mockImplementation(() => allFalseFlags() as never);
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?" }));
    expect(response.status).toBe(200);
  });

  it("malformed request still handled as before", async () => {
    const response = await handleAstroV2ReadingRequest(new Request("https://www.tarayai.com/api/astro/v2/reading", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }));
    expect(response.status).toBe(400);
  });

  it("full consultation flags true but missing structured evidence falls back safely", async () => {
    resolveFlagsMock.mockReturnValue(allTrueFlags() as never);
    wrapperMock.mockReturnValue({ mode: "insufficient_structured_evidence", shouldUseFallback: true, resetAfterFinalAnswer: false, reason: "missing_structured_chart_evidence" });
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?" }));
    const payload = await readJson(response);
    expect(response.status).toBe(200);
    expect(String(payload.answer)).toContain("old v2 answer");
  });

  it("full consultation flags true with route-supported structured evidence returns consultation engine metadata only when supported", async () => {
    resolveFlagsMock.mockReturnValue(allTrueFlags() as never);
    wrapperMock.mockReturnValue({ mode: "consultation_answer", shouldUseFallback: false, resetAfterFinalAnswer: true, answer: "safe consultation answer" });
    const response = await handleAstroV2ReadingRequest(createRequest({
      question: "Should I change jobs?",
      chart: {
        domain: "career",
        supportiveFactors: [{ factor: "synthetic support", source: "rashi", confidence: "high", interpretationHint: "synthetic" }],
        challengingFactors: [],
        neutralFacts: [],
        birthTimeSensitivity: "medium",
      },
    }));
    const payload = await readJson(response);
    expect(payload.answer).toBe("safe consultation answer");
    expect(payload.meta).toMatchObject({ consultationEngine: true, directV2Route: true });
    expect(String(JSON.stringify(payload))).not.toMatch(/responsePlan|validation|monitoringEvent|chartEvidence|remedyPlan|timingJudgement|safetyGuardrails|state/i);
  });

  it("unsafe validation failure falls back, not unsafe output", async () => {
    resolveFlagsMock.mockReturnValue(allTrueFlags() as never);
    wrapperMock.mockReturnValue({ mode: "validation_blocked", shouldUseFallback: true, resetAfterFinalAnswer: false, reason: "consultation_validation_failed" });
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?" }));
    const payload = await readJson(response);
    expect(String(payload.answer)).toContain("old v2 answer");
  });

  it("response does not expose internal consultation fields", async () => {
    resolveFlagsMock.mockReturnValue(allTrueFlags() as never);
    wrapperMock.mockReturnValue({ mode: "consultation_answer", shouldUseFallback: false, resetAfterFinalAnswer: true, answer: "safe consultation answer" });
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?", chart: { domain: "career", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "medium" } }));
    const payload = await readJson(response);
    const json = JSON.stringify(payload);
    expect(json).not.toMatch(/responsePlan|validation|monitoringEvent|chartEvidence|remedyPlan|timingJudgement|safetyGuardrails|internal state/i);
  });

  it("route answer has at most one follow-up question", async () => {
    resolveFlagsMock.mockReturnValue(allTrueFlags() as never);
    wrapperMock.mockReturnValue({ mode: "consultation_answer", shouldUseFallback: false, resetAfterFinalAnswer: true, answer: "One question?" });
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?", chart: { domain: "career", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "medium" } }));
    const payload = await readJson(response);
    expect((String(payload.answer).match(/\?/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("route answer contains no unsafe remedy wording", async () => {
    resolveFlagsMock.mockReturnValue(allTrueFlags() as never);
    wrapperMock.mockReturnValue({ mode: "consultation_answer", shouldUseFallback: false, resetAfterFinalAnswer: true, answer: "safe consultation answer" });
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?", chart: { domain: "career", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "medium" } }));
    const payload = await readJson(response);
    expect(String(payload.answer).toLowerCase()).not.toMatch(/blue sapphire|buy gemstone|expensive puja|resign now|quit now|invest now|marry now|divorce now|cure|diagnosis|treatment|guaranteed/);
  });

  it("directV2Route meta remains true if previously expected", async () => {
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?" }));
    const payload = await readJson(response);
    expect(payload.meta).toMatchObject({ directV2Route: true });
  });

  it("exact fact after non-exact request is not contaminated by prior consultation context", async () => {
    resolveFlagsMock.mockReturnValue(allTrueFlags() as never);
    wrapperMock.mockReturnValue({ mode: "consultation_answer", shouldUseFallback: false, resetAfterFinalAnswer: true, answer: "safe consultation answer" });
    await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?", chart: { domain: "career", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "medium" } }));
    resolveFlagsMock.mockReturnValue(allFalseFlags() as never);
    wrapperMock.mockReturnValue({ mode: "exact_fact_bypass", shouldUseFallback: true, resetAfterFinalAnswer: false });
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "What is my Lagna?" }));
    const payload = await readJson(response);
    expect(String(payload.answer)).toContain("old v2 answer");
  });

  it("flags malformed values do not enable consultation accidentally", async () => {
    resolveFlagsMock.mockReturnValue(allFalseFlags() as never);
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?" }));
    const payload = await readJson(response);
    expect(String(payload.answer)).toContain("old v2 answer");
  });

  it("all flags false preserves fallback", async () => {
    resolveFlagsMock.mockReturnValue(allFalseFlags() as never);
    const response = await handleAstroV2ReadingRequest(createRequest({ question: "Should I change jobs?" }));
    expect(response.status).toBe(200);
  });
});
