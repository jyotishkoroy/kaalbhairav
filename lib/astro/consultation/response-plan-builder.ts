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
import type { FollowUpDecision } from "./follow-up-policy";
import type { TimingJudgement } from "./timing-judgement";
import type { RemedyPlan } from "./remedy-proportionality";
import type { ConsultationToneNeeded } from "./consultation-types";

export type ConsultationResponsePlanMode =
  | "answer_now"
  | "ask_follow_up"
  | "exact_fact_only"
  | "insufficient_context";

export type ConsultationResponseSectionId =
  | "acknowledgement"
  | "direct_answer"
  | "chart_evidence"
  | "life_context"
  | "pattern_synthesis"
  | "timing"
  | "practical_guidance"
  | "remedies"
  | "follow_up"
  | "safety_note"
  | "reset_instruction";

export type ConsultationResponseSection = {
  readonly id: ConsultationResponseSectionId;
  readonly purpose: string;
  readonly include: boolean;
  readonly priority: number;
  readonly evidenceRefs: readonly string[];
  readonly guidance: readonly string[];
};

export type ConsultationResponsePlan = {
  readonly mode: ConsultationResponsePlanMode;
  readonly tone: {
    readonly primary: ConsultationToneNeeded;
    readonly avoid: readonly string[];
    readonly mustInclude: readonly string[];
  };
  readonly sections: readonly ConsultationResponseSection[];
  readonly followUp?: {
    readonly question: string;
    readonly answerBeforeQuestion: boolean;
    readonly reason?: string;
  };
  readonly safetyGuardrails: readonly string[];
  readonly evidenceSummary: {
    readonly supportive: readonly string[];
    readonly challenging: readonly string[];
    readonly neutral: readonly string[];
  };
  readonly resetAfterFinalAnswer: boolean;
};

export type ConsultationResponsePlanInput = {
  readonly state?: ConsultationState;
  readonly lifeContext?: LifeContextExtraction;
  readonly emotionalState?: EmotionalStateResult;
  readonly culturalContext?: CulturalFamilyContextResult;
  readonly practicalConstraints?: PracticalConstraintResult;
  readonly chartEvidence?: ChartEvidence;
  readonly patternRecognition?: PatternRecognitionSynthesisResult;
  readonly followUpDecision?: FollowUpDecision;
  readonly timingJudgement?: TimingJudgement;
  readonly remedyPlan?: RemedyPlan;
};

export function buildConsultationResponsePlan(
  input: ConsultationResponsePlanInput,
): ConsultationResponsePlan {
  const mode = determinePlanMode(input);
  const evidenceSummary = buildEvidenceSummary(input.chartEvidence);
  const tone = buildTone(input, evidenceSummary);
  const safetyGuardrails = buildSafetyGuardrails(input, tone, evidenceSummary);
  const sections = buildSections(input, mode, evidenceSummary);
  const followUp = buildFollowUp(input.followUpDecision);
  const resetAfterFinalAnswer = input.followUpDecision?.resetAfterFinalAnswer ?? true;

  return {
    mode,
    tone,
    sections,
    ...(followUp ? { followUp } : {}),
    safetyGuardrails,
    evidenceSummary,
    resetAfterFinalAnswer,
  };
}

function determinePlanMode(input: ConsultationResponsePlanInput): ConsultationResponsePlanMode {
  if (input.state?.intent.primary === "exact_fact") return "exact_fact_only";
  if (input.followUpDecision?.shouldAsk === true) return "ask_follow_up";
  if (!hasMeaningfulContext(input)) return "insufficient_context";
  return "answer_now";
}

function hasMeaningfulContext(input: ConsultationResponsePlanInput): boolean {
  return Boolean(
    input.lifeContext?.currentIssue ||
      input.lifeContext?.currentSituation ||
      input.lifeContext?.desiredOutcome ||
      input.lifeContext?.decisionType ||
      input.lifeContext?.extractedFacts?.length ||
      input.emotionalState?.primaryEmotion && input.emotionalState.primaryEmotion !== "neutral" ||
      input.emotionalState?.intensity === "medium" ||
      input.emotionalState?.intensity === "high" ||
      input.culturalContext?.familyInvolved ||
      input.culturalContext?.parentalPressure ||
      input.culturalContext?.arrangedMarriageContext ||
      input.culturalContext?.familyReputationPressure ||
      input.culturalContext?.financialDependents ||
      input.practicalConstraints?.moneyConstraint ||
      input.practicalConstraints?.timeConstraint ||
      input.practicalConstraints?.privacyConstraint ||
      input.practicalConstraints?.careerInstability ||
      input.practicalConstraints?.healthConstraint ||
      input.practicalConstraints?.familyConstraint ||
      input.chartEvidence?.supportiveFactors.length ||
      input.chartEvidence?.challengingFactors.length ||
      input.chartEvidence?.neutralFacts.length ||
      input.patternRecognition?.dominantPattern ||
      input.timingJudgement?.status ||
      input.remedyPlan?.level !== undefined,
  );
}

function buildTone(
  input: ConsultationResponsePlanInput,
  evidenceSummary: ConsultationResponsePlan["evidenceSummary"],
): ConsultationResponsePlan["tone"] {
  const emotionalState = input.emotionalState ?? input.state?.emotionalState;
  const primary: ConsultationToneNeeded =
    emotionalState?.toneNeeded ??
    input.state?.emotionalState?.toneNeeded ??
    (input.followUpDecision?.answerBeforeQuestion ? "grounding" : "direct");

  const safetyFlags = getSafetyFlags(emotionalState);
  const avoid = uniqueStrings([
    ...(safetyFlags.includes("avoid_fear_language") ? ["fear-based language"] : []),
    ...(safetyFlags.includes("avoid_absolute_prediction") ? ["absolute prediction"] : []),
    ...(safetyFlags.includes("avoid_harsh_karma_language") ? ["harsh karma language"] : []),
    ...(safetyFlags.includes("suggest_professional_support") ? ["replacing professional support"] : []),
    ...(emotionalState?.intensity === "high" ? ["interrogating before grounding", "fatalistic wording"] : []),
    ...(input.chartEvidence?.birthTimeSensitivity === "high" ? ["precise timing without birth-time caveat"] : []),
    ...(input.timingJudgement?.confidence === "low" ? ["overstated timing certainty"] : []),
    ...(input.remedyPlan?.avoid ?? []),
    ...(input.practicalConstraints?.moneyConstraint ? ["expensive recommendations"] : []),
    ...(input.practicalConstraints?.privacyConstraint ? ["visible or public ritual pressure"] : []),
    ...(input.practicalConstraints?.healthConstraint ? ["medical certainty claims"] : []),
    ...(input.practicalConstraints?.timeConstraint ? ["complex daily routines"] : []),
    ...(input.culturalContext?.parentalPressure ? ["simplistic advice to ignore family"] : []),
    ...(input.culturalContext?.decisionAutonomy === "low" ? ["advice that assumes full freedom"] : []),
    ...(input.culturalContext?.familyReputationPressure ? ["shaming or reputation-based fear"] : []),
    "unsupported chart claims",
    "certainty claims",
    "deterministic fate language",
  ]);

  const mustInclude = uniqueStrings([
    ...(emotionalState?.intensity === "high" ? ["grounding acknowledgement before analysis"] : []),
    ...(emotionalState?.toneNeeded === "analytical" ? ["clear evidence chain"] : []),
    ...(input.culturalContext?.parentalPressure ? ["balance personal agency with family reality"] : []),
    ...(input.practicalConstraints?.moneyConstraint ? ["keep guidance affordable"] : []),
    ...(input.practicalConstraints?.privacyConstraint ? ["keep practices discreet"] : []),
    ...(input.practicalConstraints?.healthConstraint ? ["professional support boundary for health concerns"] : []),
    ...(hasAnyEvidence(evidenceSummary) ? ["cite supplied chart evidence for every astrology claim"] : []),
    ...(input.timingJudgement ? ["frame timing as guidance, not certainty"] : []),
    ...(input.remedyPlan && input.remedyPlan.level > 0 ? ["state remedies are optional and supportive only"] : []),
    ...(input.chartEvidence?.birthTimeSensitivity === "high" || input.timingJudgement?.birthTimeSensitivity === "high"
      ? ["mention birth-time sensitivity when precise timing is used"]
      : []),
    "state uncertainty when evidence is limited",
  ]);

  return { primary, avoid, mustInclude };
}

function buildEvidenceSummary(chartEvidence?: ChartEvidence): ConsultationResponsePlan["evidenceSummary"] {
  if (!chartEvidence) return emptyEvidenceSummary();
  return {
    supportive: uniqueStrings(chartEvidence.supportiveFactors.map((factor) => factor.factor)).slice(0, 6),
    challenging: uniqueStrings(chartEvidence.challengingFactors.map((factor) => factor.factor)).slice(0, 6),
    neutral: uniqueStrings(chartEvidence.neutralFacts.map((fact) => fact.fact)).slice(0, 6),
  };
}

function getSafetyFlags(
  emotionalState?: EmotionalStateResult | ConsultationState["emotionalState"],
): readonly string[] {
  if (!emotionalState) return [];
  if ("safetyFlags" in emotionalState && Array.isArray(emotionalState.safetyFlags)) {
    return emotionalState.safetyFlags;
  }
  return [];
}

function buildSections(
  input: ConsultationResponsePlanInput,
  mode: ConsultationResponsePlanMode,
  evidenceSummary: ConsultationResponsePlan["evidenceSummary"],
): readonly ConsultationResponseSection[] {
  const hasEvidence = hasAnyEvidence(evidenceSummary);
  const hasLifeContext =
    Boolean(input.lifeContext?.currentIssue) ||
    Boolean(input.lifeContext?.currentSituation) ||
    Boolean(input.lifeContext?.decisionType) ||
    Boolean(input.lifeContext?.desiredOutcome) ||
    Boolean(input.lifeContext?.extractedFacts?.length);
  const hasPattern = Boolean(input.patternRecognition?.dominantPattern && input.patternRecognition.confidence !== "low");
  const hasTiming = Boolean(input.timingJudgement && (input.timingJudgement.confidence !== "low" || input.timingJudgement.reasoning.length > 0));
  const hasPracticalNeed =
    Boolean(input.practicalConstraints?.moneyConstraint) ||
    Boolean(input.practicalConstraints?.timeConstraint) ||
    Boolean(input.practicalConstraints?.privacyConstraint) ||
    Boolean(input.practicalConstraints?.careerInstability) ||
    Boolean(input.practicalConstraints?.healthConstraint) ||
    Boolean(input.practicalConstraints?.familyConstraint) ||
    input.timingJudgement?.recommendedAction === "avoid_impulsive_decision" ||
    input.timingJudgement?.recommendedAction === "review";
  const hasRemedies = Boolean(input.remedyPlan && input.remedyPlan.level > 0 && input.remedyPlan.remedies.length > 0 && mode === "answer_now");
  const showAcknowledgement =
    Boolean(
      input.emotionalState?.intensity === "medium" ||
        input.emotionalState?.intensity === "high" ||
        input.culturalContext?.parentalPressure ||
        input.culturalContext?.familyInvolved ||
        hasLifeContext ||
        input.followUpDecision?.answerBeforeQuestion,
    ) && mode !== "exact_fact_only";

  const sections: ConsultationResponseSection[] = [
    section("acknowledgement", "Acknowledge the user's stated situation without exaggerating it.", showAcknowledgement, 10, [], acknowledgementGuidance(input)),
    section(
      "direct_answer",
      mode === "exact_fact_only"
        ? "Answer only the requested exact fact using deterministic backend data."
        : "Give a concise direction based on supplied evidence and context; do not overstate certainty.",
      mode === "answer_now" || mode === "exact_fact_only",
      20,
      [],
      mode === "exact_fact_only"
        ? ["Answer only the requested exact fact using deterministic backend data."]
        : ["Give a concise direction based on supplied evidence and context; do not overstate certainty."],
    ),
    section(
      "chart_evidence",
      "Ground any astrology claim in supplied evidence only.",
      mode === "answer_now" || mode === "exact_fact_only" ? hasEvidence : false,
      30,
      evidenceRefsFromEvidence(evidenceSummary),
      [
        "Every astrology claim must point to supplied chart evidence.",
        "Do not invent placements, dashas, transits, yogas, degrees, or aspects.",
      ],
    ),
    section(
      "life_context",
      "Use only explicitly extracted life context.",
      mode === "answer_now" && hasLifeContext,
      40,
      lifeContextRefs(input.lifeContext),
      ["Use only explicitly extracted life context.", "Do not invent life events."],
    ),
    section(
      "pattern_synthesis",
      "Use the supplied pattern synthesis as a probabilistic framing layer.",
      mode === "answer_now" && hasPattern,
      50,
      input.patternRecognition ? uniqueStrings(patternRefs(input.patternRecognition)) : [],
      patternGuidance(input.patternRecognition),
    ),
    section(
      "timing",
      "Use only supplied timing judgement and avoid invented windows.",
      mode === "answer_now" && hasTiming,
      60,
      timingRefs(input.timingJudgement),
      timingGuidance(input.timingJudgement),
    ),
    section(
      "practical_guidance",
      "Shape advice around practical constraints and risk tolerance.",
      mode === "answer_now" && hasPracticalNeed,
      70,
      [],
      practicalGuidance(input),
    ),
    section(
      "remedies",
      "Include only the supplied remedy plan and keep it proportional.",
      mode === "answer_now" && hasRemedies,
      80,
      [],
      remedyGuidance(input.remedyPlan),
    ),
    section(
      "follow_up",
      "Ask at most one follow-up question and preserve the decision context.",
      mode === "ask_follow_up" && Boolean(input.followUpDecision?.question),
      90,
      [],
      followUpGuidance(input.followUpDecision),
    ),
    section(
      "safety_note",
      "Enforce safety boundaries and keep the response non-fatalistic.",
      true,
      100,
      [],
      safetyGuidance(input, evidenceSummary),
    ),
    section(
      "reset_instruction",
      "Propagate the reset instruction for ephemeral consultation state.",
      true,
      110,
      [],
      [
        mode === "ask_follow_up" ? "Do not reset yet; reset after the final answer." : "Reset ephemeral consultation memory after final answer.",
      ],
    ),
  ];

  const normalized = sections
    .sort((a, b) => a.priority - b.priority)
    .map((section) => ({
      ...section,
      evidenceRefs: uniqueStrings(section.evidenceRefs).slice(0, 6),
      guidance: uniqueStrings(section.guidance),
    }));

  if (mode === "ask_follow_up") {
    return normalized.map((section) =>
      section.id === "direct_answer" || section.id === "chart_evidence" || section.id === "life_context" || section.id === "pattern_synthesis" || section.id === "timing" || section.id === "practical_guidance" || section.id === "remedies"
        ? { ...section, include: false }
        : section,
    );
  }

  if (mode === "exact_fact_only") {
    return normalized.map((section) =>
      section.id === "life_context" || section.id === "pattern_synthesis" || section.id === "timing" || section.id === "practical_guidance" || section.id === "remedies" || section.id === "follow_up"
        ? { ...section, include: false }
        : section,
    );
  }

  if (mode === "insufficient_context") {
    return normalized.map((section) =>
      section.id === "acknowledgement" || section.id === "direct_answer" || section.id === "chart_evidence" || section.id === "life_context" || section.id === "pattern_synthesis" || section.id === "timing" || section.id === "practical_guidance" || section.id === "remedies" || section.id === "follow_up"
        ? { ...section, include: false }
        : section,
    );
  }

  return normalized;
}

function buildFollowUp(
  decision?: FollowUpDecision,
): ConsultationResponsePlan["followUp"] | undefined {
  if (!decision?.shouldAsk || !decision.question) return undefined;
  if (countQuestionMarks(decision.question) > 1) return undefined;
  return {
    question: decision.question,
    answerBeforeQuestion: decision.answerBeforeQuestion,
    ...(decision.reason ? { reason: decision.reason } : {}),
  };
}

function buildSafetyGuardrails(
  input: ConsultationResponsePlanInput,
  tone: ConsultationResponsePlan["tone"],
  evidenceSummary: ConsultationResponsePlan["evidenceSummary"],
): string[] {
  return uniqueStrings([
    ...tone.avoid,
    ...tone.mustInclude,
    ...safetyGuidance(input, evidenceSummary),
  ]);
}

function section(
  id: ConsultationResponseSectionId,
  purpose: string,
  include: boolean,
  priority: number,
  evidenceRefs: readonly string[],
  guidance: readonly string[],
): ConsultationResponseSection {
  return { id, purpose, include, priority, evidenceRefs, guidance };
}

function acknowledgementGuidance(input: ConsultationResponsePlanInput): string[] {
  const guidance = [
    "Acknowledge the user's stated situation without exaggerating it.",
    "Do not label the user or diagnose emotions.",
  ];
  if (input.emotionalState?.intensity === "high") {
    guidance.push("Ground the response before analysis.");
  }
  return guidance;
}

function patternGuidance(pattern?: PatternRecognitionSynthesisResult): string[] {
  if (!pattern) return [];
  const guidance = ["Keep pattern language probabilistic."];
  if (pattern.dominantPattern) guidance.unshift(`Include the supplied dominant pattern: ${pattern.dominantPattern}.`);
  if (pattern.likelyLifeExpression) guidance.push(`Include the supplied likely life expression: ${pattern.likelyLifeExpression}.`);
  if (pattern.mixedSignal) guidance.push("Include the supplied mixed signal without collapsing it into certainty.");
  return guidance;
}

function timingGuidance(timing?: TimingJudgement): string[] {
  if (!timing) return [];
  const guidance = [
    `Include the supplied status: ${timing.status}.`,
    `Include the supplied recommended action: ${timing.recommendedAction}.`,
    "Do not invent dates or windows.",
    "Do not treat timing as certainty.",
  ];
  if (timing.timeWindow) {
    guidance.push(`Include only the supplied time window label: ${timing.timeWindow.label}.`);
  }
  return guidance;
}

function practicalGuidance(input: ConsultationResponsePlanInput): string[] {
  const guidance = [
    "Avoid recommending quitting, investing, marrying, divorcing, or resigning as an instruction.",
  ];
  if (input.practicalConstraints?.moneyConstraint) guidance.push("Avoid expensive or high-risk recommendations.");
  if (input.practicalConstraints?.timeConstraint) guidance.push("Keep steps short and realistic.");
  if (input.practicalConstraints?.privacyConstraint) guidance.push("Keep practices discreet.");
  if (input.practicalConstraints?.riskTolerance === "low") guidance.push("Avoid irreversible or impulsive decisions.");
  if (input.practicalConstraints?.careerInstability) guidance.push("Prefer staged decisions and backup plans.");
  return guidance;
}

function remedyGuidance(remedyPlan?: RemedyPlan): string[] {
  if (!remedyPlan) return [];
  return uniqueStrings([
    `Include the supplied remedy level: ${remedyPlan.levelMeaning}.`,
    "Treat the supplied remedies as optional and supportive only.",
    "Do not pressure spending, gemstones, puja, donation, fasting, or ritual.",
    ...remedyPlan.avoid,
  ]);
}

function followUpGuidance(decision?: FollowUpDecision): string[] {
  if (!decision?.question) return [];
  return uniqueStrings([
    "Include exactly one validated follow-up question.",
    "Do not add a second question.",
    ...(decision.answerBeforeQuestion ? ["Give grounding acknowledgement before the question."] : []),
    ...(decision.reason ? [`Preserve the supplied reason: ${decision.reason}.`] : []),
  ]);
}

function safetyGuidance(
  input: ConsultationResponsePlanInput,
  evidenceSummary: ConsultationResponsePlan["evidenceSummary"],
): string[] {
  return uniqueStrings([
    "Do not invent chart facts.",
    "Do not invent timing windows.",
    "Do not make absolute predictions.",
    "Do not use fear-based or harsh karma language.",
    "Do not give medical, legal, or financial certainty.",
    "Do not recommend irreversible action as an instruction.",
    "Do not recommend expensive or coercive remedies.",
    "Keep remedies optional and proportional.",
    "Respect family/cultural context without stereotyping.",
    "Respect practical constraints.",
    ...(input.practicalConstraints?.healthConstraint || input.lifeContext?.lifeArea === "health"
      ? ["For health concerns, encourage professional support boundaries and avoid medical certainty claims."]
      : []),
    ...(input.emotionalState?.intensity === "high" || input.emotionalState?.primaryEmotion === "fear" || input.emotionalState?.primaryEmotion === "anxiety"
      ? ["Ground before analysis and avoid alarming language."]
      : []),
    ...(input.chartEvidence?.birthTimeSensitivity === "high" || input.timingJudgement?.birthTimeSensitivity === "high"
      ? ["Mention birth-time sensitivity before precise timing."]
      : []),
    ...(!hasAnyEvidence(evidenceSummary) ? ["State uncertainty when evidence is limited."] : []),
    ...(input.state?.intent.primary === "exact_fact" ? ["Answer only the exact fact; do not expand into unrelated consultation."] : []),
  ]);
}

function evidenceRefsFromEvidence(evidenceSummary: ConsultationResponsePlan["evidenceSummary"]): string[] {
  return uniqueStrings([...evidenceSummary.supportive, ...evidenceSummary.challenging, ...evidenceSummary.neutral]);
}

function lifeContextRefs(lifeContext?: LifeContextExtraction): string[] {
  if (!lifeContext) return [];
  return uniqueStrings([
    ...(lifeContext.currentIssue ? [lifeContext.currentIssue] : []),
    ...(lifeContext.currentSituation ? [lifeContext.currentSituation] : []),
    ...(lifeContext.decisionType ? [lifeContext.decisionType] : []),
    ...(lifeContext.desiredOutcome ? [lifeContext.desiredOutcome] : []),
    ...lifeContext.extractedFacts.map((fact) => fact.fact),
  ]);
}

function patternRefs(pattern: PatternRecognitionSynthesisResult): string[] {
  return uniqueStrings([
    pattern.dominantPattern,
    pattern.likelyLifeExpression,
    ...(pattern.supportivePattern ? [pattern.supportivePattern.summary, ...pattern.supportivePattern.evidence] : []),
    ...(pattern.challengingPattern ? [pattern.challengingPattern.summary, ...pattern.challengingPattern.evidence] : []),
    ...(pattern.mixedSignal ? [pattern.mixedSignal.promise, pattern.mixedSignal.blockage, pattern.mixedSignal.synthesis] : []),
    pattern.growthDirection,
  ]);
}

function timingRefs(timing?: TimingJudgement): string[] {
  if (!timing) return [];
  return uniqueStrings([
    timing.status,
    timing.currentPeriodMeaning,
    timing.recommendedAction,
    ...(timing.timeWindow ? [timing.timeWindow.label, timing.timeWindow.from ?? "", timing.timeWindow.to ?? ""] : []),
    ...timing.reasoning,
  ]);
}

function hasAnyEvidence(evidenceSummary?: ConsultationResponsePlan["evidenceSummary"]): boolean {
  if (!evidenceSummary) return false;
  return evidenceSummary.supportive.length > 0 || evidenceSummary.challenging.length > 0 || evidenceSummary.neutral.length > 0;
}

function emptyEvidenceSummary(): ConsultationResponsePlan["evidenceSummary"] {
  return { supportive: [], challenging: [], neutral: [] };
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter((value) => value.length > 0)));
}

function normalizeText(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function countQuestionMarks(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}
