/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveConsultationFeatureFlags } from "../../../lib/astro/consultation/consultation-feature-flags";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { runConsultationProductionWrapper } from "../../../lib/astro/consultation/consultation-production-wrapper";
import {
  runConsultationOrchestration,
  type ConsultationOrchestratorResult,
} from "../../../lib/astro/consultation/consultation-orchestrator";
import { composeFinalConsultationAnswer } from "../../../lib/astro/consultation/final-consultation-answer";
import type { ResolvedConsultationFeatureFlags } from "../../../lib/astro/consultation/consultation-feature-flags";

vi.mock("../../../lib/astro/consultation/consultation-orchestrator", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/astro/consultation/consultation-orchestrator")>("../../../lib/astro/consultation/consultation-orchestrator");
  return {
    ...actual,
    runConsultationOrchestration: vi.fn(),
  };
});

vi.mock("../../../lib/astro/consultation/final-consultation-answer", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/astro/consultation/final-consultation-answer")>("../../../lib/astro/consultation/final-consultation-answer");
  return {
    ...actual,
    composeFinalConsultationAnswer: vi.fn(),
  };
});

const orchestrateMock = vi.mocked(runConsultationOrchestration);
const composeMock = vi.mocked(composeFinalConsultationAnswer);

function allTrueConsultationFlags(): ResolvedConsultationFeatureFlags {
  return resolveConsultationFeatureFlags({
    ASTRO_CONSULTATION_STATE_ENABLED: "true",
    ASTRO_LIFE_CONTEXT_ENABLED: "true",
    ASTRO_EMOTIONAL_STATE_ENABLED: "true",
    ASTRO_CULTURAL_CONTEXT_ENABLED: "true",
    ASTRO_PRACTICAL_CONSTRAINTS_ENABLED: "true",
    ASTRO_CHART_EVIDENCE_ENABLED: "true",
    ASTRO_PATTERN_RECOGNITION_ENABLED: "true",
    ASTRO_ONE_FOLLOWUP_ENABLED: "true",
    ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED: "true",
    ASTRO_TIMING_JUDGEMENT_ENABLED: "true",
    ASTRO_REMEDY_PROPORTIONALITY_ENABLED: "true",
    ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED: "true",
    ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED: "true",
    ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED: "true",
    ASTRO_CONSULTATION_VALIDATOR_ENABLED: "true",
    ASTRO_CONSULTATION_MONITORING_ENABLED: "true",
  });
}

function syntheticEvidence() {
  return {
    domain: "career" as const,
    supportiveFactors: [
      {
        factor: "Supplied 10th house career indicator supports responsibility and visibility",
        source: "rashi" as const,
        confidence: "high" as const,
        interpretationHint: "synthetic",
      },
    ],
    challengingFactors: [
      {
        factor: "Supplied Saturn pressure on career indicators can show delay, authority pressure, or slow recognition",
        source: "derived_rule" as const,
        confidence: "medium" as const,
        interpretationHint: "synthetic",
      },
    ],
    neutralFacts: [],
    birthTimeSensitivity: "medium" as const,
  };
}

function baseOrchestratorResult(overrides: Partial<ConsultationOrchestratorResult> = {}): ConsultationOrchestratorResult {
  const state = createEmptyConsultationState({
    userQuestion: "Should I change jobs?",
    sessionId: "session-1",
  }) as ConsultationOrchestratorResult["state"];
  return {
    status: "response_plan_ready",
    state,
    memoryState: { status: "idle" } as ConsultationOrchestratorResult["memoryState"],
    followUpDecision: { shouldAsk: false, answerBeforeQuestion: false, resetAfterFinalAnswer: true },
    responsePlan: {
      mode: "answer_now",
      userNeed: "career guidance",
      tone: { primary: "direct", avoid: [], mustInclude: [] },
      sections: [],
      safetyGuardrails: [],
      evidenceSummary: { supportive: [], challenging: [], neutral: [] },
      resetAfterFinalAnswer: true,
    } as ConsultationOrchestratorResult["responsePlan"],
    resetAfterFinalAnswer: true,
    warnings: [],
    lifeContext: { currentIssue: "career", lifeArea: "career", extractedFacts: [], missingCriticalContext: [] } as never,
    emotionalState: { primaryEmotion: "neutral", intensity: "medium", toneNeeded: "direct", secondaryEmotions: [], safetyFlags: [] } as never,
    culturalContext: { familyInvolved: false, parentalPressure: false, arrangedMarriageContext: false, familyReputationPressure: false, financialDependents: false, religiousComfort: "unknown", socialExpectations: false } as never,
    practicalConstraints: { moneyConstraint: false, timeConstraint: false, privacyConstraint: false, careerInstability: false, familyConstraint: false, healthConstraint: false, relocationConstraint: false, riskTolerance: "medium", remedyStyle: "unknown" } as never,
    chartEvidence: syntheticEvidence(),
    patternRecognition: { dominantPattern: "synthetic", confidence: "medium", growthDirection: "focus", likelyLifeExpression: "synthetic" } as never,
    timingJudgement: { status: "mixed", currentPeriodMeaning: "synthetic", recommendedAction: "review", reasoning: ["synthetic"], confidence: "medium", birthTimeSensitivity: "medium" },
    remedyPlan: { level: 1, levelMeaning: "behavioral", remedies: [], avoid: [] },
    ...overrides,
  };
}

function baseFinalAnswerResult(overrides: Partial<ReturnType<typeof composeFinalConsultationAnswer>> = {}) {
  return {
    mode: "answer_now" as const,
    answer: "A safe consultation answer that stays grounded in supplied evidence.",
    validation: { passed: true, failures: [], warnings: [] },
    passed: true,
    resetAfterFinalAnswer: true,
    warnings: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  orchestrateMock.mockReset();
  composeMock.mockReset();
  vi.stubGlobal("fetch", vi.fn());
});

describe("runConsultationProductionWrapper", () => {
  it("all flags false returns fallback for non-exact", () => {
    const result = runConsultationProductionWrapper({ userQuestion: "Should I change jobs?" });
    expect(result.mode).toBe("fallback");
    expect(result.shouldUseFallback).toBe(true);
  });

  it("all flags false returns exact_fact_bypass for exact fact", () => {
    const result = runConsultationProductionWrapper({ userQuestion: "What is my Lagna?" });
    expect(result.mode).toBe("exact_fact_bypass");
    expect(result.shouldUseFallback).toBe(true);
  });

  it("exact fact does not return consultation answer even if all flags true", () => {
    const result = runConsultationProductionWrapper({
      userQuestion: "What is my Lagna?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(result.mode).toBe("exact_fact_bypass");
    expect(result.answer).toBeUndefined();
  });

  it("full flags true but no structured evidence returns insufficient_structured_evidence", () => {
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
    });
    expect(result.mode).toBe("insufficient_structured_evidence");
    expect(result.shouldUseFallback).toBe(true);
  });

  it("full flags true with supplied career chart evidence returns consultation_answer", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult());
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
      chartFacts: { source: "test_fixture", facts: [{ key: "career", label: "career", value: "supportive" }] },
    });
    expect(result.mode).toBe("consultation_answer");
    expect(result.answer).toContain("grounded");
    expect(result.shouldUseFallback).toBe(false);
  });

  it("consultation answer has passed validation", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult());
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(result.answer).toBeDefined();
    expect(result.monitoringEvent?.validationPassed).toBe(true);
  });

  it("consultation answer contains no debug JSON or internal fields", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult({ answer: "Public answer only." }));
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(JSON.stringify(result)).not.toMatch(/"responsePlan"|"chartEvidence"|"remedyPlan"|"timingJudgement"|"state"|"debug"/i);
  });

  it("monitoring event, if present, is privacy safe", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult());
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(JSON.stringify(result.monitoringEvent) ?? "").not.toMatch(/rawQuestion|rawAnswer|birthDate|birthTime|birthPlace|token|secret|api key/i);
  });

  it("wrapper never throws on empty or malformed input", () => {
    expect(() => runConsultationProductionWrapper({ userQuestion: "" })).not.toThrow();
    expect(() => runConsultationProductionWrapper({ userQuestion: "   ", message: undefined })).not.toThrow();
  });

  it("wrapper handles missing userQuestion and message safely", () => {
    const result = runConsultationProductionWrapper({ userQuestion: undefined as unknown as string, message: undefined });
    expect(result.shouldUseFallback).toBe(true);
  });

  it("validation failure returns validation_blocked and shouldUseFallback true", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult({ passed: false, validation: { passed: false, failures: ["gemstone_recommended_without_caution"], warnings: [] } }));
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(result.mode).toBe("validation_blocked");
    expect(result.shouldUseFallback).toBe(true);
  });

  it("unsafe gemstone style result does not leak as answer", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult({ passed: false, answer: "Wear blue sapphire." }));
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(result.answer).toBeUndefined();
    expect(result.mode).toBe("validation_blocked");
  });

  it("unsupported timing style result falls back or is blocked", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult({ passed: false, answer: "The next 6 months will be decisive." }));
    const result = runConsultationProductionWrapper({
      userQuestion: "When should I move?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(result.shouldUseFallback).toBe(true);
  });

  it("one-follow-up output has at most one question", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult({ responsePlan: { ...(baseOrchestratorResult().responsePlan), mode: "ask_follow_up", followUp: { question: "One question?", answerBeforeQuestion: false, reason: "missing_context" } } as never }));
    composeMock.mockReturnValue(baseFinalAnswerResult({ answer: "One question?" }));
    const result = runConsultationProductionWrapper({ userQuestion: "Should I change jobs?", featureFlags: allTrueConsultationFlags(), chartEvidence: syntheticEvidence() });
    expect((result.answer?.match(/\?/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("exact-fact route fallback remains independent from all consultation flags", () => {
    const result = runConsultationProductionWrapper({
      userQuestion: "What is my Lagna?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(result.mode).toBe("exact_fact_bypass");
  });

  it("explicit featureFlags input overrides env", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult());
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(result.mode).toBe("consultation_answer");
  });

  it("missing env values do not crash wrapper", () => {
    expect(() => runConsultationProductionWrapper({ userQuestion: "Should I change jobs?" })).not.toThrow();
  });

  it("wrapper does not store raw user text in monitoring event", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult());
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(JSON.stringify(result.monitoringEvent) ?? "").not.toContain("Should I change jobs?");
  });

  it("wrapper does not call LLM API fetch", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult());
    runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("wrapper does not calculate dasha transit or chart facts", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult());
    runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(orchestrateMock).toHaveBeenCalledWith(expect.objectContaining({
      suppliedChartEvidence: syntheticEvidence(),
      timingFacts: undefined,
    }));
  });

  it("wrapper preserves resetAfterFinalAnswer from final answer result when answer is returned", () => {
    orchestrateMock.mockReturnValue(baseOrchestratorResult());
    composeMock.mockReturnValue(baseFinalAnswerResult({ resetAfterFinalAnswer: false }));
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartEvidence: syntheticEvidence(),
    });
    expect(result.resetAfterFinalAnswer).toBe(false);
  });

  it("wrapper falls back on incomplete evidence rather than inventing chart facts", () => {
    const result = runConsultationProductionWrapper({
      userQuestion: "Should I change jobs?",
      featureFlags: allTrueConsultationFlags(),
      chartFacts: { source: "test_fixture", facts: [] },
    });
    expect(result.mode).toBe("insufficient_structured_evidence");
  });
});
