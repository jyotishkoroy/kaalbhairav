/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import {
  buildConsultationMonitoringEvent,
  type ConsultationMonitoringEvent,
} from "./consultation-monitoring";
import {
  composeFinalConsultationAnswer,
} from "./final-consultation-answer";
import {
  getConsultationFallbackMode,
  resolveConsultationFeatureFlags,
  type ResolvedConsultationFeatureFlags,
} from "./consultation-feature-flags";
import {
  runConsultationOrchestration,
} from "./consultation-orchestrator";
import { createEmptyConsultationState } from "./consultation-state";
import type { BirthDataCompleteness } from "./follow-up-policy";
import type { ChartEvidence } from "./chart-evidence-builder";
import type { TimingFact } from "./timing-judgement";
import type { ConsultationChartFactSet } from "./consultation-types";

export type ConsultationProductionMode =
  | "fallback"
  | "exact_fact_bypass"
  | "consultation_answer"
  | "validation_blocked"
  | "insufficient_structured_evidence"
  | "error_fallback";

export type ConsultationProductionWrapperInput = {
  readonly userQuestion: string;
  readonly message?: string;
  readonly sessionId?: string;
  readonly requestMode?: string;
  readonly birthData?: BirthDataCompleteness;
  readonly chartFacts?: ConsultationChartFactSet;
  readonly chartEvidence?: ChartEvidence;
  readonly timingFacts?: readonly TimingFact[];
  readonly exactFactAnswer?: string;
  readonly featureFlags?: ResolvedConsultationFeatureFlags;
};

export type ConsultationProductionWrapperResult = {
  readonly mode: ConsultationProductionMode;
  readonly answer?: string;
  readonly shouldUseFallback: boolean;
  readonly resetAfterFinalAnswer: boolean;
  readonly monitoringEvent?: ConsultationMonitoringEvent;
  readonly reason?: string;
};

export function runConsultationProductionWrapper(
  input: ConsultationProductionWrapperInput,
): ConsultationProductionWrapperResult {
  try {
    const question = normalizeQuestion(input);
    const state = createEmptyConsultationState({
      userQuestion: question,
      sessionId: input.sessionId,
    });

    const flags = input.featureFlags ?? resolveConsultationFeatureFlags();
    const fallbackMode = getConsultationFallbackMode(flags, state.intent.primary);

    if (state.intent.primary === "exact_fact") {
      return {
        mode: "exact_fact_bypass",
        shouldUseFallback: true,
        resetAfterFinalAnswer: false,
        reason: "exact_fact_uses_existing_deterministic_route",
      };
    }

    if (fallbackMode !== "full_consultation") {
      return {
        mode: "fallback",
        shouldUseFallback: true,
        resetAfterFinalAnswer: false,
        reason: "consultation_flags_not_enabled",
      };
    }

    if (!hasUsableStructuredEvidence(input)) {
      return {
        mode: "insufficient_structured_evidence",
        shouldUseFallback: true,
        resetAfterFinalAnswer: false,
        reason: "missing_structured_chart_evidence",
      };
    }

    const orchestratorResult = runConsultationOrchestration({
      userQuestion: question,
      message: input.message,
      sessionId: input.sessionId,
      birthData: input.birthData,
      chartFacts: input.chartFacts,
      suppliedChartEvidence: input.chartEvidence,
      timingFacts: input.timingFacts,
      mode: "initial_message",
    });

    const finalAnswerResult = composeFinalConsultationAnswer({
      state: orchestratorResult.state,
      responsePlan: orchestratorResult.responsePlan,
      lifeContext: orchestratorResult.lifeContext,
      emotionalState: orchestratorResult.emotionalState,
      culturalContext: orchestratorResult.culturalContext,
      practicalConstraints: orchestratorResult.practicalConstraints,
      chartEvidence: orchestratorResult.chartEvidence,
      patternRecognition: orchestratorResult.patternRecognition,
      timingJudgement: orchestratorResult.timingJudgement,
      remedyPlan: orchestratorResult.remedyPlan,
      exactFactAnswer: input.exactFactAnswer,
    });

    const monitoringEvent = buildConsultationMonitoringEvent({
      orchestratorResult,
      finalAnswerResult,
      memoryResetSuccess: finalAnswerResult.resetAfterFinalAnswer === false,
    });

    if (!finalAnswerResult.passed) {
      return {
        mode: "validation_blocked",
        shouldUseFallback: true,
        resetAfterFinalAnswer: finalAnswerResult.resetAfterFinalAnswer,
        monitoringEvent,
        reason: "consultation_validation_failed",
      };
    }

    return {
      mode: "consultation_answer",
      answer: finalAnswerResult.answer,
      shouldUseFallback: false,
      resetAfterFinalAnswer: finalAnswerResult.resetAfterFinalAnswer,
      monitoringEvent,
    };
  } catch {
    return {
      mode: "error_fallback",
      shouldUseFallback: true,
      resetAfterFinalAnswer: false,
      reason: "consultation_wrapper_error",
    };
  }
}

function hasUsableStructuredEvidence(input: ConsultationProductionWrapperInput): boolean {
  if (input.requestMode === "exact_fact") return true;
  if (input.chartEvidence) {
    const { supportiveFactors, challengingFactors, neutralFacts } = input.chartEvidence;
    if (supportiveFactors.length > 0 || challengingFactors.length > 0 || neutralFacts.length > 0) {
      return true;
    }
  }
  if (input.chartFacts?.facts.length) {
    return true;
  }
  return false;
}

function normalizeQuestion(input: ConsultationProductionWrapperInput): string {
  return (input.userQuestion || input.message || "").trim().replace(/\s+/g, " ");
}
