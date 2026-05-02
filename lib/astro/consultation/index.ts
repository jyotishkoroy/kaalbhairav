/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type {
  ChartEvidenceDomain,
  ChartEvidenceFactorPolarity,
  ChartEvidenceSource,
  ConsultationChartFactSet,
  ConsultationConfidence,
  ConsultationEmotionalPrimary,
  ConsultationIntentPrimary,
  ConsultationLifeArea,
  ConsultationReligiousComfort,
  ConsultationRiskTolerance,
  ConsultationToneNeeded,
  PatternRecognitionResult,
  RemedyPlan,
  TimingJudgement,
} from "./consultation-types";
export * from "./consultation-state";
export * from "./ephemeral-consultation-memory";
export * from "./chart-evidence-builder";
export * from "./cultural-context-extractor";
export * from "./emotional-state-detector";
export * from "./follow-up-policy";
export * from "./life-context-extractor";
export * from "./pattern-recognition";
export {
  runConsultationOrchestration,
  type ConsultationOrchestratorInput,
  type ConsultationOrchestratorMode,
  type ConsultationOrchestratorResult,
} from "./consultation-orchestrator";
export * from "./practical-constraints-extractor";
export {
  composeFinalConsultationAnswer,
  type FinalConsultationAnswerInput,
  type FinalConsultationAnswerMode,
  type FinalConsultationAnswerResult,
} from "./final-consultation-answer";
export { buildConsultationResponsePlan } from "./response-plan-builder";
export {
  buildProportionateRemedyPlan,
  createNoRemedyPlan,
  sanitizeRemedyPlan,
  type RemedyCost,
  type RemedyItem,
  type RemedyLevel,
  type RemedyLevelMeaning,
  type RemedyProportionalityInput,
  type RemedyType,
} from "./remedy-proportionality";
export {
  containsForbiddenTimingOutput,
  judgeTiming,
  type TimingFact,
  type TimingJudgementInput,
  type TimingRecommendedAction,
  type TimingStatus,
  type TimingWindow,
} from "./timing-judgement";
export {
  CONSULTATION_FEATURE_FLAG_NAMES,
  CONSULTATION_ROLLBACK_ORDER,
  DEFAULT_CONSULTATION_FEATURE_FLAG_DEFAULTS,
  buildConsultationRolloutReadiness,
  getConsultationFallbackMode,
  parseConsultationFlagValue,
  resolveConsultationFeatureFlagValues,
  resolveConsultationFeatureFlags,
  type ConsultationFeatureFallbackMode,
  type ConsultationFeatureFlagDefaults,
  type ConsultationFeatureFlagName,
  type ConsultationFeatureFlagsInput,
  type ConsultationFeatureFlagValue,
  type ConsultationRolloutReadiness,
  type ResolvedConsultationFeatureFlags,
} from "./consultation-feature-flags";
export {
  countFollowUpQuestions,
  validateConsultationResponse,
  type ConsultationResponseValidationInput,
  type ConsultationValidationFailureCode,
  type ConsultationValidationResult,
  type ConsultationValidationWarningCode,
} from "./consultation-response-validator";
