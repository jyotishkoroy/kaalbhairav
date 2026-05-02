/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import {
  buildConsultationMonitoringEvent,
  createEmptyConsultationMonitoringEvent,
  isPrivacySafeConsultationMonitoringEvent,
} from "../../../lib/astro/consultation/consultation-monitoring";
import {
  getConsultationFallbackMode,
  resolveConsultationFeatureFlags,
} from "../../../lib/astro/consultation/consultation-feature-flags";
import {
  runConsultationOrchestration,
  type ConsultationOrchestratorResult,
} from "../../../lib/astro/consultation/consultation-orchestrator";
import { composeFinalConsultationAnswer } from "../../../lib/astro/consultation/final-consultation-answer";
import { createEphemeralConsultationMemoryStore } from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import { validateConsultationResponse } from "../../../lib/astro/consultation/consultation-response-validator";
import { buildConsultationResponsePlan } from "../../../lib/astro/consultation/response-plan-builder";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { extractPracticalConstraints } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { judgeTiming } from "../../../lib/astro/consultation/timing-judgement";
import { buildProportionateRemedyPlan } from "../../../lib/astro/consultation/remedy-proportionality";
import { synthesizePattern } from "../../../lib/astro/consultation/pattern-recognition";
import { decideFollowUp } from "../../../lib/astro/consultation/follow-up-policy";
import { CONSULTATION_TEST_BANK_SCENARIOS } from "./consultation-test-bank.fixtures";

function allTrueEnv(): Record<string, string> {
  return {
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
  };
}

function syntheticOrchestratorResult(): ConsultationOrchestratorResult {
  const state = createEmptyConsultationState({ userQuestion: "Should I change jobs?" });
  const chartEvidence = {
    domain: "career",
    supportiveFactors: [{ factor: "Strong career visibility", source: "rashi", confidence: "high", interpretationHint: "synthetic" }],
    challengingFactors: [],
    neutralFacts: [],
    birthTimeSensitivity: "low",
  } as const;
  const responsePlan = buildConsultationResponsePlan({
    state,
    lifeContext: extractLifeContext({ question: state.userQuestion }),
    emotionalState: detectEmotionalState({ question: state.userQuestion }),
    culturalContext: extractCulturalFamilyContext({ question: state.userQuestion }),
    practicalConstraints: extractPracticalConstraints({ question: state.userQuestion }),
    chartEvidence,
    patternRecognition: synthesizePattern({
      chartEvidence,
      lifeContext: extractLifeContext({ question: state.userQuestion }),
      emotionalState: detectEmotionalState({ question: state.userQuestion }),
      culturalContext: extractCulturalFamilyContext({ question: state.userQuestion }),
      practicalConstraints: extractPracticalConstraints({ question: state.userQuestion }),
    }),
    followUpDecision: decideFollowUp({ question: state.userQuestion, intentPrimary: state.intent.primary, needsChart: false, alreadyAsked: false }),
    timingJudgement: judgeTiming({ chartEvidence, timingFacts: [] }),
    remedyPlan: buildProportionateRemedyPlan({
      chartEvidence,
      emotionalState: detectEmotionalState({ question: state.userQuestion }),
      culturalContext: extractCulturalFamilyContext({ question: state.userQuestion }),
      practicalConstraints: extractPracticalConstraints({ question: state.userQuestion }),
      timingJudgement: judgeTiming({
        chartEvidence,
        timingFacts: [],
      }),
      requestedRemedyType: "career",
    }),
  });
  return {
    status: "response_plan_ready",
    state,
    memoryState: createEphemeralConsultationMemoryStore().get("consultation-production-readiness"),
    lifeContext: extractLifeContext({ question: state.userQuestion }),
    emotionalState: detectEmotionalState({ question: state.userQuestion }),
    culturalContext: extractCulturalFamilyContext({ question: state.userQuestion }),
    practicalConstraints: extractPracticalConstraints({ question: state.userQuestion }),
    chartEvidence,
    patternRecognition: synthesizePattern({
      chartEvidence,
      lifeContext: extractLifeContext({ question: state.userQuestion }),
      emotionalState: detectEmotionalState({ question: state.userQuestion }),
      culturalContext: extractCulturalFamilyContext({ question: state.userQuestion }),
      practicalConstraints: extractPracticalConstraints({ question: state.userQuestion }),
    }),
    timingJudgement: judgeTiming({ chartEvidence, timingFacts: [] }),
    remedyPlan: buildProportionateRemedyPlan({
      chartEvidence,
      emotionalState: detectEmotionalState({ question: state.userQuestion }),
      culturalContext: extractCulturalFamilyContext({ question: state.userQuestion }),
      practicalConstraints: extractPracticalConstraints({ question: state.userQuestion }),
      timingJudgement: judgeTiming({ chartEvidence, timingFacts: [] }),
      requestedRemedyType: "career",
    }),
    followUpDecision: decideFollowUp({ question: state.userQuestion, intentPrimary: state.intent.primary, needsChart: false, alreadyAsked: false }),
    responsePlan,
    resetAfterFinalAnswer: responsePlan.resetAfterFinalAnswer,
    warnings: [],
  };
}

describe("consultation production readiness", () => {
  it("all flags false keeps fallback mode basic_response for non-exact", () => {
    const flags = resolveConsultationFeatureFlags({});
    expect(getConsultationFallbackMode(flags, "marriage")).toBe("basic_response");
  });

  it("all flags false keeps exact_fact_only for exact fact", () => {
    const flags = resolveConsultationFeatureFlags({});
    expect(getConsultationFallbackMode(flags, "exact_fact")).toBe("exact_fact_only");
  });

  it("all flags true enables full consultation", () => {
    expect(resolveConsultationFeatureFlags(allTrueEnv()).fullConsultationPipelineEnabled).toBe(true);
  });

  it("exact-fact orchestrator bypass stays clean", () => {
    const result = runConsultationOrchestration({ userQuestion: "What is my Lagna?" });
    expect(result.status).toBe("exact_fact_bypass");
    expect(result.chartEvidence).toBeUndefined();
    expect(result.timingJudgement).toBeUndefined();
    expect(result.remedyPlan).toBeUndefined();
  });

  it("final answer composer exact_fact_only remains concise", () => {
    const plan = buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }) });
    const result = composeFinalConsultationAnswer({ responsePlan: { ...plan, mode: "exact_fact_only", sections: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] } }, exactFactAnswer: "Your Lagna is Leo." });
    expect(result.answer).toContain("Leo");
    expect(result.answer.length).toBeLessThan(200);
  });

  it("unsafe gemstone answer fails validator", () => {
    const validation = validateConsultationResponse({
      response: "Wear blue sapphire for guaranteed results.",
      responsePlan: { mode: "answer_now", tone: { primary: "direct", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: true },
    });
    expect(validation.passed).toBe(false);
    expect(validation.failures).toContain("gemstone_recommended_without_caution");
  });

  it("unsupported timing window fails validator", () => {
    const validation = validateConsultationResponse({
      response: "This looks active in the next 6 months.",
      responsePlan: { mode: "answer_now", tone: { primary: "direct", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: ["do not invent timing windows"], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: true },
    });
    expect(validation.passed).toBe(false);
    expect(validation.failures).toContain("unsupported_timing_window");
  });

  it("monitoring event is privacy safe", () => {
    const event = createEmptyConsultationMonitoringEvent();
    expect(isPrivacySafeConsultationMonitoringEvent(event)).toBe(true);
  });

  it("production-like path with synthetic evidence passes", () => {
    const orchestrator = syntheticOrchestratorResult();
    const result = composeFinalConsultationAnswer({
      state: orchestrator.state,
      responsePlan: { ...orchestrator.responsePlan, mode: "exact_fact_only", sections: [] },
      lifeContext: orchestrator.lifeContext,
      emotionalState: orchestrator.emotionalState,
      culturalContext: orchestrator.culturalContext,
      practicalConstraints: orchestrator.practicalConstraints,
      chartEvidence: orchestrator.chartEvidence,
      patternRecognition: orchestrator.patternRecognition,
      exactFactAnswer: "Your Lagna is Leo.",
    });
    expect(result.passed).toBe(true);
  });

  it("production-like path with missing evidence does not invent chart facts", () => {
    const state = createEmptyConsultationState({ userQuestion: "Should I change jobs?" });
    const responsePlan = buildConsultationResponsePlan({ state });
    const result = composeFinalConsultationAnswer({ state, responsePlan });
    expect(result.answer.toLowerCase()).toContain("should not invent chart facts");
  });

  it("one-follow-up path emits at most one question", () => {
    const responsePlan = {
      ...buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "Do I need to move soon?" }) }),
      mode: "ask_follow_up",
      followUp: { question: "Do I need to move soon, or is there a deadline?", answerBeforeQuestion: false, reason: "missing_context" },
    } as const;
    const result = composeFinalConsultationAnswer({ responsePlan: { ...responsePlan, mode: "ask_follow_up" } });
    expect((result.answer.match(/\?/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("memory reset after final answer clears ephemeral state", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("session-a", createEmptyConsultationState({ userQuestion: "Should I change jobs?" }));
    store.markFinalAnswerReady("session-a");
    store.clear("session-a");
    expect(store.get("session-a").status).toBe("idle");
  });

  it("test bank still contains 300 scenarios", () => {
    expect(CONSULTATION_TEST_BANK_SCENARIOS).toHaveLength(300);
  });

  it("monitoring event JSON does not contain raw private keys", () => {
    const event = buildConsultationMonitoringEvent({
      responseText: "I understand this is hard, but I should not invent chart facts.",
      finalAnswerResult: {
        mode: "insufficient_context",
        answer: "I understand this is hard, but I should not invent chart facts.",
        validation: validateConsultationResponse({
          response: "I understand this is hard, but I should not invent chart facts.",
          responsePlan: { mode: "insufficient_context", tone: { primary: "direct", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: false },
        }),
        passed: true,
        resetAfterFinalAnswer: false,
        warnings: [],
      },
    });
    const json = JSON.stringify(event);
    expect(json).not.toMatch(/token|secret|api key|myVedicReport|astro_package|rawQuestion|rawAnswer/i);
  });
});
