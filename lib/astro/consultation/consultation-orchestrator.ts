/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import {
  createEmptyConsultationState,
  type ConsultationInput,
  type ConsultationState,
} from "./consultation-state";
import {
  extractLifeContext,
  type LifeContextExtraction,
} from "./life-context-extractor";
import {
  detectEmotionalState,
  type EmotionalStateResult,
} from "./emotional-state-detector";
import {
  extractCulturalFamilyContext,
  type CulturalFamilyContextResult,
} from "./cultural-context-extractor";
import {
  extractPracticalConstraints,
  type PracticalConstraintResult,
} from "./practical-constraints-extractor";
import {
  buildChartEvidence,
  type ChartEvidence,
  type ChartEvidenceInput,
  type ChartEvidenceInputFact,
} from "./chart-evidence-builder";
import {
  synthesizePattern,
  type PatternRecognitionSynthesisResult,
} from "./pattern-recognition";
import {
  decideFollowUp,
  type BirthDataCompleteness,
  type FollowUpDecision,
} from "./follow-up-policy";
import {
  createEphemeralConsultationMemoryStore,
  type ConsultationMemoryState,
  type EphemeralConsultationMemoryStore,
} from "./ephemeral-consultation-memory";
import {
  judgeTiming,
  type TimingFact,
  type TimingJudgement,
} from "./timing-judgement";
import {
  buildProportionateRemedyPlan,
  type RemedyPlan,
  type RemedyProportionalityInput,
} from "./remedy-proportionality";
import {
  buildConsultationResponsePlan,
  type ConsultationResponsePlan as ConsultationResponsePlanBuilderResult,
} from "./response-plan-builder";
import type {
  ConsultationChartFactSet,
  ConsultationLifeArea,
  ConsultationIntentPrimary,
  ConsultationResponsePlan as ConsultationStateResponsePlan,
} from "./consultation-types";

export type ConsultationOrchestratorMode =
  | "initial_message"
  | "follow_up_answer"
  | "final_answer_delivered";

export type ConsultationOrchestratorInput = ConsultationInput & {
  readonly mode?: ConsultationOrchestratorMode;
  readonly message?: string;
  readonly sessionId?: string;
  readonly birthData?: BirthDataCompleteness;
  readonly chartFacts?: ConsultationChartFactSet;
  readonly chartEvidenceInput?: Partial<ChartEvidenceInput>;
  readonly chartEvidenceFacts?: readonly ChartEvidenceInputFact[];
  readonly suppliedChartEvidence?: ChartEvidence;
  readonly timingFacts?: readonly TimingFact[];
  readonly suppliedTimingJudgement?: TimingJudgement;
  readonly suppliedRemedyPlan?: RemedyPlan;
  readonly requestedRemedyType?: RemedyProportionalityInput["requestedRemedyType"];
  readonly memoryStore?: EphemeralConsultationMemoryStore;
  readonly markFinalAnswerReady?: boolean;
};

export type ConsultationOrchestratorResult = {
  readonly status:
    | "exact_fact_bypass"
    | "collecting_context"
    | "follow_up_needed"
    | "response_plan_ready"
    | "final_answer_recorded"
    | "reset_complete";
  readonly state: ConsultationState;
  readonly memoryState: ConsultationMemoryState;
  readonly lifeContext?: LifeContextExtraction;
  readonly emotionalState?: EmotionalStateResult;
  readonly culturalContext?: CulturalFamilyContextResult;
  readonly practicalConstraints?: PracticalConstraintResult;
  readonly chartEvidence?: ChartEvidence;
  readonly patternRecognition?: PatternRecognitionSynthesisResult;
  readonly timingJudgement?: TimingJudgement;
  readonly remedyPlan?: RemedyPlan;
  readonly followUpDecision: FollowUpDecision;
  readonly responsePlan: ConsultationResponsePlanBuilderResult;
  readonly resetAfterFinalAnswer: boolean;
  readonly warnings: readonly string[];
};

const DEFAULT_SESSION_ID = "anonymous-consultation-session";

export function runConsultationOrchestration(
  input: ConsultationOrchestratorInput,
): ConsultationOrchestratorResult {
  const question = normalizeQuestion(input);
  const sessionId = getSessionId(input);
  const store = input.memoryStore ?? createEphemeralConsultationMemoryStore();
  const warnings = new Set<string>();
  const mode = input.mode ?? "initial_message";
  const baseState = createEmptyConsultationState({
    ...input,
    userQuestion: question,
    sessionId,
  });

  if (mode === "final_answer_delivered") {
    const memoryBefore = store.get(sessionId);
    if (memoryBefore.status !== "idle") {
      store.markFinalAnswerReady(sessionId);
      store.clear(sessionId);
    }
    const finalState = createEmptyConsultationState({
      ...input,
      userQuestion: question || "final answer delivered",
      sessionId,
    });
    const followUpDecision = decideFollowUp({
      question,
      intentPrimary: finalState.intent.primary,
      alreadyAsked: true,
    });
    const responsePlan = buildConsultationResponsePlan({
      state: finalState,
      followUpDecision,
    });
    warnings.add("final_answer_delivered_reset_only");
    return {
      status: "reset_complete",
      state: finalState,
      memoryState: store.get(sessionId),
      followUpDecision,
      responsePlan,
      resetAfterFinalAnswer: true,
      warnings: Array.from(warnings),
    };
  }

  if (baseState.intent.primary === "exact_fact") {
    const followUpDecision = decideFollowUp({
      question,
      intentPrimary: baseState.intent.primary,
      alreadyAsked: true,
    });
    const responsePlan = buildConsultationResponsePlan({
      state: baseState,
      followUpDecision,
    });
    warnings.add("exact_fact_bypassed_consultation_pipeline");
    return {
      status: "exact_fact_bypass",
      state: baseState,
      memoryState: store.get(sessionId),
      followUpDecision,
      responsePlan,
      resetAfterFinalAnswer: responsePlan.resetAfterFinalAnswer,
      warnings: Array.from(warnings),
    };
  }

  const activeMemory = store.get(sessionId);
  const previousState =
    activeMemory.status === "collecting_context" ||
    activeMemory.status === "follow_up_asked" ||
    activeMemory.status === "final_answer_ready"
      ? activeMemory.state
      : undefined;
  const mergedState = mergeStateFromMemory(baseState, activeMemory, question);
  const lifeContext = extractLifeContext({ question, previousEphemeralContext: previousState });
  const emotionalState = detectEmotionalState({ question });
  const culturalContext = extractCulturalFamilyContext({ question, previousEphemeralContext: previousState });
  const practicalConstraints = extractPracticalConstraints({ question, previousEphemeralContext: previousState });
  const enrichedState = applyContextToState(mergedState, {
    lifeContext,
    emotionalState,
    culturalContext,
    practicalConstraints,
  });

  const chartEvidence = resolveChartEvidence(input, enrichedState, lifeContext, warnings);
  if (!hasAnyChartEvidence(chartEvidence)) {
    warnings.add("no_chart_evidence_supplied");
  }

  const patternRecognition = synthesizePattern({
    chartEvidence,
    lifeContext,
    emotionalState,
    culturalContext,
    practicalConstraints,
  });

  const timingJudgement =
    input.suppliedTimingJudgement ??
    judgeTiming({
      chartEvidence,
      lifeContext,
      emotionalState,
      practicalConstraints,
      timingFacts: input.timingFacts ?? [],
    });
  if (!input.suppliedTimingJudgement && (input.timingFacts ?? []).length === 0) {
    warnings.add("empty_timing_facts");
  }

  const remedyPlan =
    input.suppliedRemedyPlan ??
    buildProportionateRemedyPlan({
      chartEvidence,
      emotionalState,
      culturalContext,
      practicalConstraints,
      timingJudgement,
      requestedRemedyType: input.requestedRemedyType ?? inferRequestedRemedyType(question, enrichedState.intent.primary),
    });

  const alreadyAsked =
    activeMemory.status === "follow_up_asked" ||
    enrichedState.followUp.alreadyAsked ||
    mode === "follow_up_answer";
  const followUpDecision = decideFollowUp({
    question,
    intentPrimary: enrichedState.intent.primary,
    needsChart: enrichedState.intent.needsChart,
    birthData: input.birthData,
    lifeContext,
    emotionalState,
    culturalContext,
    practicalConstraints,
    patternRecognition,
    alreadyAsked,
  });

  let nextMemoryState = activeMemory;
  if (mode === "follow_up_answer" && activeMemory.status === "follow_up_asked") {
    nextMemoryState = store.mergeFollowUpAnswer({ sessionId, answer: question });
  } else if (followUpDecision.shouldAsk) {
    store.begin(sessionId, enrichedState);
    nextMemoryState = store.markFollowUpAsked(sessionId, followUpDecision.question ?? "");
  } else {
    nextMemoryState = store.begin(sessionId, enrichedState);
    if (input.markFinalAnswerReady === true) {
      nextMemoryState = store.markFinalAnswerReady(sessionId);
    }
  }

  const responsePlan = buildConsultationResponsePlan({
    state: enrichedState,
    lifeContext,
    emotionalState,
    culturalContext,
    practicalConstraints,
    chartEvidence,
    patternRecognition,
    followUpDecision,
    timingJudgement,
    remedyPlan,
  });

  if (mode === "follow_up_answer" && activeMemory.status !== "follow_up_asked") {
    warnings.add("follow_up_answer_without_active_memory");
  }

  const status =
    responsePlan.mode === "ask_follow_up"
      ? "follow_up_needed"
      : input.markFinalAnswerReady === true
        ? "final_answer_recorded"
        : "response_plan_ready";

  return {
    status,
    state: enrichStateForOutput(enrichedState, {
      lifeContext,
      emotionalState,
      culturalContext,
      practicalConstraints,
      patternRecognition,
      timingJudgement,
      remedyPlan,
      responsePlan,
      followUpDecision,
    }),
    memoryState: nextMemoryState,
    lifeContext,
    emotionalState,
    culturalContext,
    practicalConstraints,
    chartEvidence,
    patternRecognition,
    timingJudgement,
    remedyPlan,
    followUpDecision,
    responsePlan,
    resetAfterFinalAnswer: responsePlan.resetAfterFinalAnswer,
    warnings: Array.from(warnings),
  };
}

function normalizeQuestion(input: ConsultationOrchestratorInput): string {
  return String(input.userQuestion ?? input.message ?? "").trim().replace(/\s+/g, " ");
}

function getSessionId(input: ConsultationOrchestratorInput): string {
  const sessionId = String(input.sessionId ?? DEFAULT_SESSION_ID).trim();
  return sessionId.length > 0 ? sessionId : DEFAULT_SESSION_ID;
}

function mergeStateFromMemory(
  state: ConsultationState,
  memory: ConsultationMemoryState,
  question: string,
): ConsultationState {
  if (memory.status !== "collecting_context" && memory.status !== "follow_up_asked" && memory.status !== "final_answer_ready") {
    return state;
  }
  return {
    ...state,
    lifeStory: {
      ...memory.state.lifeStory,
      currentSituation:
        memory.status === "follow_up_asked"
          ? memory.state.lifeStory.currentSituation ?? `Follow-up answer: ${question}`
          : memory.state.lifeStory.currentSituation,
    },
    followUp: {
      ...memory.state.followUp,
      alreadyAsked: memory.status === "follow_up_asked" || memory.status === "final_answer_ready" ? true : memory.state.followUp.alreadyAsked,
      allowed: memory.status === "follow_up_asked" ? false : memory.state.followUp.allowed,
    },
  };
}

function applyContextToState(
  state: ConsultationState,
  input: {
    readonly lifeContext: LifeContextExtraction;
    readonly emotionalState: EmotionalStateResult;
    readonly culturalContext: CulturalFamilyContextResult;
    readonly practicalConstraints: PracticalConstraintResult;
  },
): ConsultationState {
  return {
    ...state,
    lifeStory: {
      ...state.lifeStory,
      currentIssue: input.lifeContext.currentIssue ?? state.lifeStory.currentIssue,
      lifeArea: input.lifeContext.lifeArea ?? state.lifeStory.lifeArea,
      currentSituation: input.lifeContext.currentSituation ?? state.lifeStory.currentSituation,
      desiredOutcome: input.lifeContext.desiredOutcome ?? state.lifeStory.desiredOutcome,
      decisionType: input.lifeContext.decisionType ?? state.lifeStory.decisionType,
    },
    emotionalState: {
      ...state.emotionalState,
      primary: input.emotionalState.primaryEmotion,
      intensity: input.emotionalState.intensity,
      toneNeeded: input.emotionalState.toneNeeded,
    },
    culturalFamilyContext: {
      ...state.culturalFamilyContext,
      parentalPressure: input.culturalContext.parentalPressure,
      familyInvolved: input.culturalContext.familyInvolved,
      arrangedMarriageContext: input.culturalContext.arrangedMarriageContext,
      financialDependents: input.culturalContext.financialDependents,
      religiousComfort: input.culturalContext.religiousComfort,
    },
    practicalConstraints: {
      ...state.practicalConstraints,
      moneyConstraint: input.practicalConstraints.moneyConstraint,
      timeConstraint: input.practicalConstraints.timeConstraint,
      privacyConstraint: input.practicalConstraints.privacyConstraint,
      careerInstability: input.practicalConstraints.careerInstability,
      familyRestriction: input.practicalConstraints.familyConstraint,
      riskTolerance: input.practicalConstraints.riskTolerance,
    },
  };
}

function resolveChartEvidence(
  input: ConsultationOrchestratorInput,
  state: ConsultationState,
  lifeContext: LifeContextExtraction,
  warnings: Set<string>,
): ChartEvidence {
  if (input.suppliedChartEvidence) return input.suppliedChartEvidence;

  const inferredDomain = inferEvidenceDomain(lifeContext.lifeArea);
  const evidenceInput: ChartEvidenceInput = {
    domain: inferredDomain,
    chartFacts: input.chartFacts,
    chart: input.chartEvidenceFacts ?? input.chartEvidenceInput?.chart,
    dasha: input.chartEvidenceInput?.dasha,
    transits: input.chartEvidenceInput?.transits,
  };
  const chartEvidence = buildChartEvidence(evidenceInput);
  if (!hasAnyChartEvidence(chartEvidence)) {
    warnings.add("no_chart_evidence_supplied");
  }
  return chartEvidence;
}

function inferEvidenceDomain(lifeArea: ConsultationLifeArea | undefined): ChartEvidence["domain"] {
  if (lifeArea === "career" || lifeArea === "marriage" || lifeArea === "relationship" || lifeArea === "money" || lifeArea === "health" || lifeArea === "family") {
    return lifeArea;
  }
  return "general";
}

function hasAnyChartEvidence(chartEvidence: ChartEvidence): boolean {
  return chartEvidence.supportiveFactors.length > 0 || chartEvidence.challengingFactors.length > 0 || chartEvidence.neutralFacts.length > 0;
}

function inferRequestedRemedyType(
  question: string,
  primaryIntent: ConsultationIntentPrimary,
): RemedyProportionalityInput["requestedRemedyType"] {
  const lower = question.toLowerCase();
  if (lower.includes("gemstone")) return "gemstone";
  if (/\b(remedy|upay|puja|mantra)\b/.test(lower)) return "general";
  if (lower.includes("health")) return "health";
  if (lower.includes("money")) return "money";
  if (lower.includes("career") || lower.includes("job") || lower.includes("work")) return "career";
  if (lower.includes("marriage") || lower.includes("proposal") || lower.includes("relationship")) return "relationship";
  if (primaryIntent === "remedy") return "general";
  return "unknown";
}

function enrichStateForOutput(
  state: ConsultationState,
  input: {
    readonly lifeContext: LifeContextExtraction;
    readonly emotionalState: EmotionalStateResult;
    readonly culturalContext: CulturalFamilyContextResult;
    readonly practicalConstraints: PracticalConstraintResult;
    readonly patternRecognition: PatternRecognitionSynthesisResult;
    readonly timingJudgement: TimingJudgement;
    readonly remedyPlan: RemedyPlan;
    readonly responsePlan: ConsultationResponsePlanBuilderResult;
    readonly followUpDecision: FollowUpDecision;
  },
): ConsultationState {
  return {
    ...state,
    lifeStory: {
      ...state.lifeStory,
      currentIssue: input.lifeContext.currentIssue ?? state.lifeStory.currentIssue,
      lifeArea: input.lifeContext.lifeArea ?? state.lifeStory.lifeArea,
      currentSituation: input.lifeContext.currentSituation ?? state.lifeStory.currentSituation,
      desiredOutcome: input.lifeContext.desiredOutcome ?? state.lifeStory.desiredOutcome,
      decisionType: input.lifeContext.decisionType ?? state.lifeStory.decisionType,
    },
    emotionalState: {
      ...state.emotionalState,
      primary: input.emotionalState.primaryEmotion,
      intensity: input.emotionalState.intensity,
      toneNeeded: input.emotionalState.toneNeeded,
    },
    culturalFamilyContext: {
      ...state.culturalFamilyContext,
      parentalPressure: input.culturalContext.parentalPressure,
      familyInvolved: input.culturalContext.familyInvolved,
      arrangedMarriageContext: input.culturalContext.arrangedMarriageContext,
      financialDependents: input.culturalContext.financialDependents,
      religiousComfort: input.culturalContext.religiousComfort,
    },
    practicalConstraints: {
      ...state.practicalConstraints,
      moneyConstraint: input.practicalConstraints.moneyConstraint,
      timeConstraint: input.practicalConstraints.timeConstraint,
      privacyConstraint: input.practicalConstraints.privacyConstraint,
      careerInstability: input.practicalConstraints.careerInstability,
      familyRestriction: input.practicalConstraints.familyConstraint,
      riskTolerance: input.practicalConstraints.riskTolerance,
    },
    patternRecognition: input.patternRecognition,
    timingJudgement: input.timingJudgement,
    remedyPlan: input.remedyPlan,
    followUp: {
      allowed: input.followUpDecision.shouldAsk ? false : state.followUp.allowed,
      alreadyAsked: state.followUp.alreadyAsked || input.followUpDecision.shouldAsk,
      question: input.followUpDecision.question,
      reason: input.followUpDecision.reason,
    },
    responsePlan: {
      mode: input.responsePlan.mode === "ask_follow_up" ? "decision_support" : input.responsePlan.mode === "exact_fact_only" ? "exact_fact" : "interpretive_consultation",
      userNeed: input.responsePlan.mode,
    } as ConsultationStateResponsePlan,
  };
}
