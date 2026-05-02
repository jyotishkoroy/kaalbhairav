/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ConsultationOrchestratorResult } from "./consultation-orchestrator";
import type { FinalConsultationAnswerResult } from "./final-consultation-answer";
import type { ConsultationValidationFailureCode, ConsultationValidationResult } from "./consultation-response-validator";
import { countFollowUpQuestions } from "./consultation-response-validator";
import type { RemedyCost } from "./remedy-proportionality";
import type { TimingJudgement } from "./timing-judgement";

export type ConsultationMonitoringMode =
  | "exact_fact"
  | "interpretive_consultation"
  | "decision_support"
  | "timing_guidance"
  | "remedy_guidance"
  | "emotional_support"
  | "insufficient_context"
  | "unknown";

export type ConsultationMonitoringRedFlag =
  | "follow_up_question_count_gt_one"
  | "exact_fact_answer_too_long"
  | "remedy_too_expensive"
  | "gemstone_without_caution"
  | "generic_professional_disclaimer_overuse"
  | "timing_without_practical_advice"
  | "pattern_without_chart_evidence"
  | "memory_not_reset_after_final_answer"
  | "validation_failed"
  | "high_validation_failure_rate"
  | "raw_sensitive_text_detected";

export type ConsultationMonitoringEvent = {
  readonly mode: ConsultationMonitoringMode;
  readonly exactFactBypassUsed: boolean;
  readonly lifeArea?: string;
  readonly lifeContextDetected: boolean;
  readonly emotionalStateDetected: boolean;
  readonly emotionalIntensity?: "low" | "medium" | "high";
  readonly culturalContextDetected: boolean;
  readonly familyPressure: boolean;
  readonly practicalConstraintsDetected: boolean;
  readonly patternRecognitionConfidence?: "low" | "medium" | "high";
  readonly chartEvidenceDetected: boolean;
  readonly finalAnswerDelivered: boolean;
  readonly followUpQuestionCount: number;
  readonly followUpPolicyResult?: string;
  readonly timingStatus?: TimingJudgement["status"];
  readonly remedyLevel?: number;
  readonly maxRemedyCost?: RemedyCost;
  readonly validationPassed: boolean;
  readonly validationFailures: readonly ConsultationValidationFailureCode[];
  readonly memoryResetSuccess: boolean;
  readonly responseLengthBucket: "empty" | "short" | "medium" | "long" | "very_long";
  readonly redFlags: readonly ConsultationMonitoringRedFlag[];
};

export type ConsultationMonitoringInput = {
  readonly orchestratorResult?: ConsultationOrchestratorResult;
  readonly finalAnswerResult?: FinalConsultationAnswerResult;
  readonly memoryResetSuccess?: boolean;
  readonly responseText?: string;
  readonly validationFailureRate?: number;
  readonly rawSensitiveTextDetected?: boolean;
};

export type ConsultationMonitoringAggregateReport = {
  readonly total: number;
  readonly validationPassed: number;
  readonly validationFailed: number;
  readonly exactFactBypassUsed: number;
  readonly averageFollowUpQuestionCount: number;
  readonly memoryResetSuccessRate: number;
  readonly redFlagCounts: Readonly<Record<ConsultationMonitoringRedFlag, number>>;
  readonly modeCounts: Readonly<Record<ConsultationMonitoringMode, number>>;
  readonly timingStatusCounts: Readonly<Record<string, number>>;
  readonly remedyLevelCounts: Readonly<Record<string, number>>;
};

const RED_FLAGS: readonly ConsultationMonitoringRedFlag[] = [
  "follow_up_question_count_gt_one",
  "exact_fact_answer_too_long",
  "remedy_too_expensive",
  "gemstone_without_caution",
  "generic_professional_disclaimer_overuse",
  "timing_without_practical_advice",
  "pattern_without_chart_evidence",
  "memory_not_reset_after_final_answer",
  "validation_failed",
  "high_validation_failure_rate",
  "raw_sensitive_text_detected",
] as const;

const MODES: readonly ConsultationMonitoringMode[] = [
  "exact_fact",
  "interpretive_consultation",
  "decision_support",
  "timing_guidance",
  "remedy_guidance",
  "emotional_support",
  "insufficient_context",
  "unknown",
] as const;

export function createEmptyConsultationMonitoringEvent(): ConsultationMonitoringEvent {
  return {
    mode: "unknown",
    exactFactBypassUsed: false,
    lifeContextDetected: false,
    emotionalStateDetected: false,
    culturalContextDetected: false,
    familyPressure: false,
    practicalConstraintsDetected: false,
    chartEvidenceDetected: false,
    finalAnswerDelivered: false,
    followUpQuestionCount: 0,
    validationPassed: true,
    validationFailures: [],
    memoryResetSuccess: false,
    responseLengthBucket: "empty",
    redFlags: [],
  };
}

export function buildConsultationMonitoringEvent(input: ConsultationMonitoringInput): ConsultationMonitoringEvent {
  const responseText = normalizeText(input.responseText ?? input.finalAnswerResult?.answer ?? "");
  const orchestrator = input.orchestratorResult;
  const finalAnswer = input.finalAnswerResult;
  const exactFactBypassUsed = orchestrator?.status === "exact_fact_bypass" || finalAnswer?.mode === "exact_fact_only";
  const lifeArea = orchestrator?.state.lifeStory.lifeArea;
  const emotionalIntensity = orchestrator?.emotionalState?.intensity ?? orchestrator?.state.emotionalState.intensity;
  const chartEvidenceDetected = Boolean(orchestrator?.chartEvidence && hasChartEvidence(orchestrator.chartEvidence));
  const followUpQuestionCount = countFollowUpQuestions(responseText);
  const validationFailures = finalAnswer?.validation.failures ?? [];
  const validationPassed = finalAnswer?.validation.passed ?? (validationFailures.length === 0);
  const remedyLevel = orchestrator?.remedyPlan?.level ?? inferRemedyLevel(finalAnswer?.validation, responseText);
  const maxRemedyCost = orchestrator?.remedyPlan ? maxCost(orchestrator.remedyPlan.remedies.map((item) => item.cost)) : undefined;
  const memoryResetSuccess = resolveMemoryResetSuccess(input);
  const event: ConsultationMonitoringEvent = {
    mode: normalizeMode(input),
    exactFactBypassUsed,
    lifeArea,
    lifeContextDetected: Boolean(orchestrator?.lifeContext),
    emotionalStateDetected: Boolean(orchestrator?.emotionalState),
    emotionalIntensity,
    culturalContextDetected: Boolean(orchestrator?.culturalContext),
    familyPressure: Boolean(orchestrator?.culturalContext?.parentalPressure),
    practicalConstraintsDetected: Boolean(orchestrator?.practicalConstraints),
    patternRecognitionConfidence: orchestrator?.patternRecognition?.confidence,
    chartEvidenceDetected,
    finalAnswerDelivered: Boolean(finalAnswer),
    followUpQuestionCount,
    followUpPolicyResult: orchestrator?.followUpDecision.reason,
    timingStatus: orchestrator?.timingJudgement?.status,
    remedyLevel: remedyLevel === undefined ? undefined : remedyLevel,
    maxRemedyCost,
    validationPassed,
    validationFailures,
    memoryResetSuccess,
    responseLengthBucket: bucketResponseLength(responseText),
    redFlags: [],
  };

  const redFlags = detectConsultationMonitoringRedFlags(event, {
    responseText,
    validationFailureRate: input.validationFailureRate,
    rawSensitiveTextDetected: input.rawSensitiveTextDetected || hasSensitiveRawTextKey(input),
  });
  return { ...event, redFlags };
}

export function detectConsultationMonitoringRedFlags(
  event: Omit<ConsultationMonitoringEvent, "redFlags">,
  options: {
    readonly responseText?: string;
    readonly validationFailureRate?: number;
    readonly rawSensitiveTextDetected?: boolean;
  } = {},
): readonly ConsultationMonitoringRedFlag[] {
  const redFlags: ConsultationMonitoringRedFlag[] = [];
  const responseText = normalizeText(options.responseText);

  if (event.followUpQuestionCount > 1) redFlags.push("follow_up_question_count_gt_one");
  if (event.mode === "exact_fact" && ["medium", "long", "very_long"].includes(event.responseLengthBucket)) redFlags.push("exact_fact_answer_too_long");
  if (event.maxRemedyCost === "high" || (event.remedyLevel ?? 0) >= 4) redFlags.push("remedy_too_expensive");
  if (event.validationFailures.includes("gemstone_recommended_without_caution")) redFlags.push("gemstone_without_caution");
  if (countDisclaimerHits(responseText) >= 3) redFlags.push("generic_professional_disclaimer_overuse");
  if (event.timingStatus && !containsAny(responseText, PRACTICAL_TIMING_CUES) && (event.validationFailures.includes("missing_required_practical_guidance") || responseText.length > 0)) {
    redFlags.push("timing_without_practical_advice");
  }
  if (event.patternRecognitionConfidence && !event.chartEvidenceDetected) redFlags.push("pattern_without_chart_evidence");
  if (event.finalAnswerDelivered && !event.memoryResetSuccess) redFlags.push("memory_not_reset_after_final_answer");
  if (!event.validationPassed) redFlags.push("validation_failed");
  if ((options.validationFailureRate ?? 0) >= 0.1) redFlags.push("high_validation_failure_rate");
  if (options.rawSensitiveTextDetected) redFlags.push("raw_sensitive_text_detected");

  return Array.from(new Set(redFlags));
}

export function buildConsultationMonitoringAggregateReport(
  events: readonly ConsultationMonitoringEvent[],
): ConsultationMonitoringAggregateReport {
  const redFlagCounts = Object.fromEntries(RED_FLAGS.map((flag) => [flag, 0])) as Record<ConsultationMonitoringRedFlag, number>;
  const modeCounts = Object.fromEntries(MODES.map((mode) => [mode, 0])) as Record<ConsultationMonitoringMode, number>;
  const timingStatusCounts: Record<string, number> = {};
  const remedyLevelCounts: Record<string, number> = Object.fromEntries(["0", "1", "2", "3", "4", "5", "unknown"].map((key) => [key, 0]));
  let validationPassed = 0;
  let validationFailed = 0;
  let exactFactBypassUsed = 0;
  let followUpTotal = 0;
  let memoryResetSuccess = 0;

  for (const event of events) {
    modeCounts[event.mode] += 1;
    followUpTotal += event.followUpQuestionCount;
    if (event.validationPassed) validationPassed += 1;
    else validationFailed += 1;
    if (event.exactFactBypassUsed) exactFactBypassUsed += 1;
    if (event.memoryResetSuccess) memoryResetSuccess += 1;
    for (const flag of event.redFlags) redFlagCounts[flag] += 1;
    if (event.timingStatus) timingStatusCounts[event.timingStatus] = (timingStatusCounts[event.timingStatus] ?? 0) + 1;
    remedyLevelCounts[String(event.remedyLevel ?? "unknown")] = (remedyLevelCounts[String(event.remedyLevel ?? "unknown")] ?? 0) + 1;
  }

  const total = events.length;
  return {
    total,
    validationPassed,
    validationFailed,
    exactFactBypassUsed,
    averageFollowUpQuestionCount: roundToTwo(total === 0 ? 0 : followUpTotal / total),
    memoryResetSuccessRate: roundToTwo(total === 0 ? 0 : memoryResetSuccess / total),
    redFlagCounts,
    modeCounts,
    timingStatusCounts,
    remedyLevelCounts,
  };
}

export function serializeConsultationMonitoringEvent(event: ConsultationMonitoringEvent): string {
  const safeEvent = isPrivacySafeConsultationMonitoringEvent(event)
    ? event
    : { ...createEmptyConsultationMonitoringEvent(), redFlags: ["raw_sensitive_text_detected"] };
  return JSON.stringify(safeEvent);
}

export function isPrivacySafeConsultationMonitoringEvent(event: ConsultationMonitoringEvent): boolean {
  const text = JSON.stringify(event);
  return !RAW_SENSITIVE_PATTERNS.some((pattern) => text.includes(pattern));
}

function normalizeMode(input: ConsultationMonitoringInput): ConsultationMonitoringMode {
  const mode = input.orchestratorResult?.responsePlan.mode ?? input.finalAnswerResult?.mode;
  if (input.orchestratorResult?.status === "exact_fact_bypass" || mode === "exact_fact_only") return "exact_fact";
  if (input.orchestratorResult?.responsePlan.mode === "ask_follow_up") {
    return input.orchestratorResult.timingJudgement ? "timing_guidance" : input.orchestratorResult.remedyPlan ? "remedy_guidance" : "decision_support";
  }
  if (input.orchestratorResult?.responsePlan.mode === "answer_now") {
    if (input.orchestratorResult.timingJudgement) return "timing_guidance";
    if (input.orchestratorResult.remedyPlan) return "remedy_guidance";
    if (input.orchestratorResult.state.intent.primary === "emotional_support") return "emotional_support";
    return input.orchestratorResult.state.lifeStory.lifeArea ? "decision_support" : "interpretive_consultation";
  }
  if (input.orchestratorResult?.status === "collecting_context") return "insufficient_context";
  return "unknown";
}

function bucketResponseLength(response: string): ConsultationMonitoringEvent["responseLengthBucket"] {
  if (!response.length) return "empty";
  if (response.length <= 450) return "short";
  if (response.length <= 1500) return "medium";
  if (response.length <= 3500) return "long";
  return "very_long";
}

function maxCost(costs: readonly RemedyCost[]): RemedyCost | undefined {
  const order: RemedyCost[] = ["free", "low", "medium", "high"];
  let best: RemedyCost | undefined;
  for (const cost of costs) {
    if (best === undefined || order.indexOf(cost) > order.indexOf(best)) best = cost;
  }
  return best;
}

function inferRemedyLevel(validation?: ConsultationValidationResult, responseText = ""): number | undefined {
  if (validation?.failures.includes("expensive_remedy_as_default")) return 4;
  if (validation?.failures.includes("gemstone_recommended_without_caution")) return 5;
  if (!responseText) return undefined;
  if (containsAny(responseText, ["gemstone"])) return 4;
  return undefined;
}

function hasChartEvidence(chartEvidence: NonNullable<ConsultationOrchestratorResult["chartEvidence"]>): boolean {
  return chartEvidence.supportiveFactors.length > 0 || chartEvidence.challengingFactors.length > 0 || chartEvidence.neutralFacts.length > 0;
}

function resolveMemoryResetSuccess(input: ConsultationMonitoringInput): boolean {
  if (input.memoryResetSuccess !== undefined) return input.memoryResetSuccess;
  if (input.orchestratorResult?.status === "reset_complete") return true;
  if (input.finalAnswerResult?.resetAfterFinalAnswer === true) return false;
  return false;
}

function countDisclaimerHits(responseText: string): number {
  if (!responseText) return 0;
  return DISCLAIMER_PHRASES.reduce((count, phrase) => count + (responseText.includes(phrase) ? 1 : 0), 0);
}

function containsAny(text: string, terms: readonly string[]): boolean {
  const lower = normalizeText(text);
  return terms.some((term) => lower.includes(normalizeText(term)));
}

function hasSensitiveRawTextKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (RAW_KEY_PATTERNS.some((pattern) => lower.includes(pattern))) return true;
  }
  return false;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

const DISCLAIMER_PHRASES = [
  "consult a professional",
  "seek professional advice",
  "this is not professional advice",
  "for entertainment purposes",
] as const;

const PRACTICAL_TIMING_CUES = [
  "practically",
  "next step",
  "prepare",
  "review",
  "avoid impulsive",
  "timeline",
  "plan",
  "discuss",
  "clarify",
] as const;

const RAW_KEY_PATTERNS = [
  "rawquestion",
  "rawanswer",
  "question",
  "answer",
  "usertext",
  "message",
  "birthdate",
  "birthtime",
  "birthplace",
  "email",
  "name",
  "token",
  "secret",
  "apikey",
  "reporttext",
  "chartreport",
  "fullresponse",
  "transcript",
] as const;

const RAW_SENSITIVE_PATTERNS = [
  "rawquestion",
  "rawanswer",
  "birthdate",
  "birthtime",
  "birthplace",
  "email",
  "token",
  "secret",
  "apikey",
  "myvedicreport",
  "astro_package",
  "jyotishko",
  "question:",
  "answer:",
] as const;
