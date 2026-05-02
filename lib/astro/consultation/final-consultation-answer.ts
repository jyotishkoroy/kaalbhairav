/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ConsultationState } from "./consultation-state";
import type { ChartEvidence } from "./chart-evidence-builder";
import type { LifeContextExtraction } from "./life-context-extractor";
import type { EmotionalStateResult } from "./emotional-state-detector";
import type { CulturalFamilyContextResult } from "./cultural-context-extractor";
import type { PracticalConstraintResult } from "./practical-constraints-extractor";
import type { PatternRecognitionSynthesisResult } from "./pattern-recognition";
import type { TimingJudgement } from "./timing-judgement";
import type { RemedyPlan } from "./remedy-proportionality";
import type { ConsultationResponsePlan } from "./response-plan-builder";
import {
  validateConsultationResponse,
  type ConsultationValidationResult,
} from "./consultation-response-validator";

export type FinalConsultationAnswerMode =
  | "exact_fact_only"
  | "ask_follow_up"
  | "answer_now"
  | "insufficient_context";

export type FinalConsultationAnswerResult = {
  readonly mode: FinalConsultationAnswerMode;
  readonly answer: string;
  readonly validation: ConsultationValidationResult;
  readonly passed: boolean;
  readonly resetAfterFinalAnswer: boolean;
  readonly warnings: readonly string[];
};

export type FinalConsultationAnswerInput = {
  readonly state?: ConsultationState;
  readonly responsePlan: ConsultationResponsePlan;
  readonly lifeContext?: LifeContextExtraction;
  readonly emotionalState?: EmotionalStateResult;
  readonly culturalContext?: CulturalFamilyContextResult;
  readonly practicalConstraints?: PracticalConstraintResult;
  readonly chartEvidence?: ChartEvidence;
  readonly patternRecognition?: PatternRecognitionSynthesisResult;
  readonly timingJudgement?: TimingJudgement;
  readonly remedyPlan?: RemedyPlan;
  readonly exactFactAnswer?: string;
};

export function composeFinalConsultationAnswer(
  input: FinalConsultationAnswerInput,
): FinalConsultationAnswerResult {
  const mode = getComposerMode(input.responsePlan);
  const answer =
    mode === "exact_fact_only"
      ? composeExactFactAnswer(input)
      : mode === "ask_follow_up"
        ? composeFollowUpAnswer(input)
        : mode === "answer_now"
          ? composeAnswerNow(input)
          : composeInsufficientContextAnswer(input);

  const validation = validateConsultationResponse({
    response: answer,
    responsePlan: input.responsePlan,
    state: input.state,
    chartEvidence: input.chartEvidence,
    timingJudgement: input.timingJudgement,
    remedyPlan: input.remedyPlan,
    expectedMemoryReset: input.responsePlan.resetAfterFinalAnswer,
  });

  return {
    mode,
    answer,
    validation,
    passed: validation.passed,
    resetAfterFinalAnswer: input.responsePlan.resetAfterFinalAnswer,
    warnings: validation.warnings,
  };
}

function getComposerMode(plan: ConsultationResponsePlan): FinalConsultationAnswerMode {
  if (plan.mode === "exact_fact_only") return "exact_fact_only";
  if (plan.mode === "ask_follow_up") return "ask_follow_up";
  if (plan.mode === "answer_now") return "answer_now";
  return "insufficient_context";
}

function composeExactFactAnswer(input: FinalConsultationAnswerInput): string {
  const value = normalizeText(input.exactFactAnswer);
  if (value) return clampParagraph(cleanSentence(value), 450);
  return "I can answer this as an exact chart fact once the deterministic chart fact is supplied.";
}

function composeFollowUpAnswer(input: FinalConsultationAnswerInput): string {
  const question = input.responsePlan.followUp?.question ? normalizeText(input.responsePlan.followUp.question) : "";
  if (!question) return "I need one specific clarification before reading this safely.";
  const acknowledgement = buildAcknowledgement(input);
  const lead = input.responsePlan.followUp?.answerBeforeQuestion ? `${acknowledgement ?? "I understand why this needs care."} ` : "";
  return clampParagraph(`${lead}One question that would help: ${ensureSingleQuestionMark(question)}`);
}

function composeInsufficientContextAnswer(input: FinalConsultationAnswerInput): string {
  const acknowledgement = buildAcknowledgement(input);
  const base = "The supplied context is not enough for a grounded consultation answer. I should not invent chart facts, timing, or remedies.";
  const next = "A safe next step is to clarify the exact question and supply deterministic chart evidence before interpreting it.";
  return joinParagraphs([acknowledgement, base, next].filter((part): part is string => Boolean(part)));
}

function composeAnswerNow(input: FinalConsultationAnswerInput): string {
  const paragraphs = [
    buildAcknowledgement(input),
    buildDirectAnswer(input),
    buildChartBasis(input),
    buildPatternParagraph(input),
    buildTimingParagraph(input),
    buildPracticalGuidance(input),
    buildRemedyParagraph(input),
    buildFollowUpParagraph(input),
  ].filter((part): part is string => Boolean(part));
  return joinParagraphs(paragraphs);
}

function buildAcknowledgement(input: FinalConsultationAnswerInput): string | undefined {
  const emotional = input.emotionalState ?? input.state?.emotionalState;
  const life = input.lifeContext ?? input.state?.lifeStory;
  const emotionalPrimary = getPrimaryEmotion(emotional);
  const topic = normalizeText(life?.currentIssue ?? life?.currentSituation ?? life?.lifeArea ?? "");
  const context =
    normalizeText(life?.currentSituation ?? life?.desiredOutcome ?? "") ||
    normalizeText(input.culturalContext?.parentalPressure ? "family expectations and readiness" : "");

  if (emotionalPrimary === "fear" || emotionalPrimary === "anxiety" || emotional?.intensity === "high") {
    return cleanSentence(`I understand why this feels heavy. This is not only about ${topic || "the question"}; it is also about ${context || "your current situation"}.`);
  }
  if (input.culturalContext?.parentalPressure) {
    return cleanSentence(`I understand why this feels pressuring. This is not only about ${topic || "the question"}; it is also about family expectations, timing, and your own readiness.`);
  }
  if (life?.decisionType === "business_transition" || topic.includes("career")) {
    return cleanSentence(`I understand why this feels frustrating. This is not only about career progress; it is also about recognition, pressure, and whether the current path still gives you room to grow.`);
  }
  if (emotional?.toneNeeded === "analytical") {
    return "I will keep this clear and evidence-based rather than mystical.";
  }
  return "I understand why this question matters.";
}

function buildDirectAnswer(input: FinalConsultationAnswerInput): string | undefined {
  const judgement = input.timingJudgement;
  if (!judgement) {
    return "The direct answer is: this should be read through both the chart evidence and your real-life constraints, not as a blind yes/no.";
  }
  const map: Record<TimingJudgement["recommendedAction"], string> = {
    proceed: "The direct answer is: this can support measured action, but not impulsive action.",
    prepare: "The direct answer is: prepare first; the chart context supports groundwork more than immediate finalization.",
    wait: "The direct answer is: wait before making the irreversible move, and use the period to clarify facts.",
    review: "The direct answer is: review the situation carefully before committing.",
    avoid_impulsive_decision: "The direct answer is: do not treat this as a yes/no decision to rush. Read it as a decision that needs structure, evidence, and emotional steadiness.",
    seek_more_information: "The direct answer is: more context is needed before a responsible judgement can be made.",
  };
  return map[judgement.recommendedAction];
}

function buildChartBasis(input: FinalConsultationAnswerInput): string | undefined {
  const evidence = input.responsePlan.evidenceSummary;
  const factors = uniqueStrings([
    ...(evidence.supportive ?? []),
    ...(evidence.challenging ?? []),
    ...(evidence.neutral ?? []),
  ]).slice(0, 3);
  if (factors.length === 0) {
    return "From the chart side, the supplied evidence is limited, so I would not invent placements, dashas, transits, or timing.";
  }
  return cleanSentence(`From the chart side, the supplied evidence points to ${joinEnglishList(factors)}. I would read this together with your current situation, not as a blind yes/no.`);
}

function buildPatternParagraph(input: FinalConsultationAnswerInput): string | undefined {
  const pattern = input.patternRecognition;
  if (!pattern) return undefined;
  const parts = [
    `The current life pattern seems to be: ${pattern.dominantPattern}.`,
    pattern.likelyLifeExpression ? `In real life, this may show up as ${pattern.likelyLifeExpression}.` : "",
    `The useful direction is ${pattern.growthDirection}.`,
  ].filter(Boolean);
  if (pattern.mixedSignal) {
    parts.push(`The mixed signal is: ${pattern.mixedSignal.promise}. The blockage is ${pattern.mixedSignal.blockage}. The synthesis is ${pattern.mixedSignal.synthesis}.`);
  }
  return cleanSentence(parts.join(" "));
}

function buildTimingParagraph(input: FinalConsultationAnswerInput): string | undefined {
  const judgement = input.timingJudgement;
  if (!judgement) return undefined;
  const actionPhrase: Record<TimingJudgement["recommendedAction"], string> = {
    proceed: "measured action, not impulsive action",
    prepare: "preparation and groundwork",
    wait: "waiting before irreversible decisions",
    review: "reviewing the facts and emotional readiness",
    avoid_impulsive_decision: "avoiding impulsive or irreversible decisions",
    seek_more_information: "getting more information before deciding",
  };
  const windowText = judgement.timeWindow
    ? judgement.timeWindow.from && judgement.timeWindow.to
      ? ` The supplied timing window runs from ${judgement.timeWindow.from} to ${judgement.timeWindow.to}.`
      : ` The supplied timing window is ${judgement.timeWindow.label}.`
    : "";
  const caveat = judgement.birthTimeSensitivity === "high"
    ? " Because the timing is birth-time sensitive, treat the timing as approximate unless the birth time is verified."
    : "";
  return cleanSentence(`Timing-wise, this looks like a ${judgement.status} period. ${judgement.currentPeriodMeaning} The wiser action is ${actionPhrase[judgement.recommendedAction]}.${windowText}${caveat}`);
}

function buildPracticalGuidance(input: FinalConsultationAnswerInput): string | undefined {
  const constraints = input.practicalConstraints ?? input.state?.practicalConstraints;
  const familyConstraint = Boolean((constraints && "familyConstraint" in constraints ? constraints.familyConstraint : false) || (constraints && "familyRestriction" in constraints ? constraints.familyRestriction : false));
  const guidance: string[] = [];
  if (constraints?.moneyConstraint) guidance.push("Practically, keep this affordable and avoid any decision that creates financial strain.");
  if (constraints?.timeConstraint) guidance.push("Practically, use short, realistic steps rather than complicated routines.");
  if (constraints?.privacyConstraint) guidance.push("Practically, choose discreet actions that do not create more pressure at home.");
  if (constraints?.careerInstability) guidance.push("Practically, do not make sudden career moves without a backup plan, documentation, and a clear timeline.");
  if (familyConstraint || input.culturalContext?.parentalPressure) guidance.push("Practically, do not say yes only to reduce pressure. Set a discussion timeline and define what readiness means for you.");
  if (constraints?.riskTolerance === "low") guidance.push("Practically, avoid irreversible decisions until the facts are clearer.");
  if (guidance.length === 0) guidance.push("Practically, choose one grounded next step: clarify the facts, set a timeline, and avoid acting from fear.");
  return cleanSentence(guidance[0]);
}

function buildRemedyParagraph(input: FinalConsultationAnswerInput): string | undefined {
  const plan = input.remedyPlan;
  if (!plan || plan.level === 0 || plan.remedies.length === 0) return undefined;
  const remedies = plan.remedies.slice(0, 2).map((item) => item.instruction).filter(Boolean);
  if (remedies.length === 0) return undefined;
  if (plan.levelMeaning === "gemstone_caution" || plan.remedies.some((item) => item.type === "gemstone_warning")) {
    return cleanSentence(`For gemstones, the proportionate answer is caution: do not buy or wear an expensive gemstone casually. Consider it only after full chart verification and affordability checks.`);
  }
  if (remedies.length === 1) {
    return cleanSentence(`A proportionate remedy would be simple: ${remedies[0]}. This is optional and should support discipline or reflection, not fear.`);
  }
  return cleanSentence(`A proportionate remedy would be simple: ${remedies[0]}. If comfortable, also ${remedies[1]}. Both should stay optional and within your means.`);
}

function buildFollowUpParagraph(input: FinalConsultationAnswerInput): string | undefined {
  const question = normalizeText(input.responsePlan.followUp?.question);
  if (!question) return undefined;
  return `One question that would help: ${ensureSingleQuestionMark(question)}`;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cleanSentence(value: string): string {
  return normalizeText(value).replace(/\s+([,.;:?])/g, "$1").replace(/\s+/g, " ");
}

function joinParagraphs(paragraphs: readonly string[]): string {
  return paragraphs.map((paragraph) => cleanSentence(paragraph)).filter(Boolean).join("\n\n");
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
}

function getPrimaryEmotion(
  emotional:
    | EmotionalStateResult
    | (ConsultationState["emotionalState"] & { readonly primary?: ConsultationState["emotionalState"]["primary"] })
    | undefined,
): ConsultationState["emotionalState"]["primary"] | "neutral" | undefined {
  if (!emotional) return undefined;
  if ("primaryEmotion" in emotional) return emotional.primaryEmotion;
  return emotional.primary;
}

function clampParagraph(value: string, maxChars = 480): string {
  const text = cleanSentence(value);
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function joinEnglishList(values: readonly string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values[0]}, ${values[1]}, and ${values[2]}`;
}

function ensureSingleQuestionMark(value: string): string {
  const cleaned = normalizeText(value);
  const questionMarks = cleaned.match(/\?/g)?.length ?? 0;
  return questionMarks <= 1 ? cleaned : cleaned.replace(/\?/g, "").trim();
}
