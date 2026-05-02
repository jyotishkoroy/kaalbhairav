/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ConsultationState } from "./consultation-state";
import type { LifeContextExtraction } from "./life-context-extractor";
import type { EmotionalStateResult } from "./emotional-state-detector";
import type { CulturalFamilyContextResult } from "./cultural-context-extractor";
import type { PracticalConstraintResult } from "./practical-constraints-extractor";
import type { PatternRecognitionSynthesisResult } from "./pattern-recognition";

export type BirthDataCompleteness = {
  readonly hasBirthDate: boolean;
  readonly hasBirthTime: boolean;
  readonly hasBirthPlace: boolean;
};

export type FollowUpPolicyInput = {
  readonly question: string;
  readonly intentPrimary?: ConsultationState["intent"]["primary"];
  readonly needsChart?: boolean;
  readonly birthData?: BirthDataCompleteness;
  readonly lifeContext?: LifeContextExtraction;
  readonly emotionalState?: EmotionalStateResult;
  readonly culturalContext?: CulturalFamilyContextResult;
  readonly practicalConstraints?: PracticalConstraintResult;
  readonly patternRecognition?: PatternRecognitionSynthesisResult;
  readonly alreadyAsked?: boolean;
};

export type FollowUpDecision = {
  readonly shouldAsk: boolean;
  readonly question?: string;
  readonly reason?: string;
  readonly answerBeforeQuestion: boolean;
  readonly resetAfterFinalAnswer: boolean;
};

const GROUPED_BIRTH_DATA_REQUEST =
  "To calculate this properly, please share your birth date, exact birth time, and birthplace.";

const MAX_QUESTION_LENGTH = 180;
const MAX_GROUPED_REQUEST_LENGTH = 140;

export function createNoFollowUpDecision(reason = "no_follow_up_needed"): FollowUpDecision {
  return {
    shouldAsk: false,
    reason,
    answerBeforeQuestion: false,
    resetAfterFinalAnswer: true,
  };
}

export function validateFollowUpQuestion(question: string): { readonly valid: boolean; readonly reason?: string } {
  const normalized = normalizeQuestion(question);
  if (normalized.length === 0) {
    return { valid: false, reason: "empty_follow_up_question" };
  }

  if (normalized.includes("\n")) {
    return { valid: false, reason: "newline_not_allowed" };
  }

  const lower = normalized.toLowerCase();
  if (lower === GROUPED_BIRTH_DATA_REQUEST.toLowerCase()) {
    return normalized.length <= MAX_GROUPED_REQUEST_LENGTH
      ? { valid: true }
      : { valid: false, reason: "follow_up_too_long" };
  }

  if (normalized.length > MAX_QUESTION_LENGTH) {
    return { valid: false, reason: "follow_up_too_long" };
  }

  if (countQuestionMarks(normalized) > 1) {
    return { valid: false, reason: "multiple_question_marks" };
  }

  if (hasCompoundDiscoveryPattern(lower)) {
    return { valid: false, reason: "compound_follow_up_blocked" };
  }

  return { valid: true };
}

export function decideFollowUp(input: FollowUpPolicyInput): FollowUpDecision {
  const normalizedQuestion = normalizeQuestion(input.question);
  const lowerQuestion = normalizedQuestion.toLowerCase();

  if (input.intentPrimary === "exact_fact") {
    return createNoFollowUpDecision("exact_fact_bypass");
  }

  if (input.alreadyAsked === true) {
    return createNoFollowUpDecision("follow_up_already_asked");
  }

  const birthData = input.birthData;
  if (input.needsChart === true && hasMissingBirthData(birthData)) {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: GROUPED_BIRTH_DATA_REQUEST,
      reason: "missing_birth_data_for_chart",
      answerBeforeQuestion: false,
      resetAfterFinalAnswer: true,
    });
  }

  const emotionalState = input.emotionalState;
  const answerBeforeQuestion = shouldAnswerBeforeQuestion(emotionalState);
  const lifeContext = input.lifeContext;
  const culturalContext = input.culturalContext;
  const practicalConstraints = input.practicalConstraints;

  const safetyDecision = decideSafetyOrHealthFollowUp({
    question: lowerQuestion,
    emotionalState,
    lifeContext,
    culturalContext,
    practicalConstraints,
    answerBeforeQuestion,
  });
  if (safetyDecision) return safetyDecision;

  const majorDecisionDecision = decideMajorDecisionFollowUp({
    question: lowerQuestion,
    lifeContext,
    birthData,
    answerBeforeQuestion,
  });
  if (majorDecisionDecision) return majorDecisionDecision;

  const meaningChangeDecision = decideMeaningChangeFollowUp({
    question: lowerQuestion,
    lifeContext,
    emotionalState,
    culturalContext,
    practicalConstraints,
    answerBeforeQuestion,
  });
  if (meaningChangeDecision) return meaningChangeDecision;

  return createNoFollowUpDecision();
}

export function applyFollowUpDecisionToState(
  state: ConsultationState,
  decision: FollowUpDecision,
): ConsultationState {
  return {
    ...state,
    followUp: {
      allowed: decision.shouldAsk,
      alreadyAsked: state.followUp.alreadyAsked,
      question: decision.question,
      reason: decision.reason,
    },
  };
}

function decideSafetyOrHealthFollowUp(input: {
  readonly question: string;
  readonly emotionalState?: EmotionalStateResult;
  readonly lifeContext?: LifeContextExtraction;
  readonly culturalContext?: CulturalFamilyContextResult;
  readonly practicalConstraints?: PracticalConstraintResult;
  readonly answerBeforeQuestion: boolean;
}): FollowUpDecision | undefined {
  const emotionalState = input.emotionalState;
  const healthContext = input.lifeContext?.lifeArea === "health" || input.practicalConstraints?.healthConstraint === true;
  const severeEmotionalDistress =
    emotionalState?.intensity === "high" ||
    emotionalState?.safetyFlags?.includes("suggest_professional_support") === true ||
    emotionalState?.primaryEmotion === "fear" ||
    emotionalState?.primaryEmotion === "grief" ||
    emotionalState?.primaryEmotion === "anxiety" ||
    emotionalState?.primaryEmotion === "exhaustion";

  if (!healthContext || !severeEmotionalDistress) return undefined;

  return ensureValidFollowUpDecision({
    shouldAsk: true,
    question: "Have you already spoken with a qualified medical professional about this concern?",
    reason: "health_professional_context_missing",
    answerBeforeQuestion: input.answerBeforeQuestion || severeEmotionalDistress,
    resetAfterFinalAnswer: true,
  });
}

function decideMajorDecisionFollowUp(input: {
  readonly question: string;
  readonly lifeContext?: LifeContextExtraction;
  readonly birthData?: BirthDataCompleteness;
  readonly practicalConstraints?: PracticalConstraintResult;
  readonly answerBeforeQuestion: boolean;
}): FollowUpDecision | undefined {
  const lifeContext = input.lifeContext;
  if (!lifeContext) return undefined;

  const decisionType = lifeContext.decisionType ?? "";
  const majorDecision = isMajorDecisionQuestion(input.question, decisionType);
  if (!majorDecision) return undefined;

  if (decisionType === "job_switch_or_stay") {
    const missing = new Set(lifeContext.missingCriticalContext);
    if (missing.has("whether user has another offer") || missing.has("financial runway")) {
      return ensureValidFollowUpDecision({
        shouldAsk: true,
        question: "Are you considering leaving because of a real opportunity, or mainly because the current job feels exhausting?",
        reason: "job_switch_motivation_missing",
        answerBeforeQuestion: input.answerBeforeQuestion,
        resetAfterFinalAnswer: true,
      });
    }
    return undefined;
  }

  if (decisionType === "business_transition") {
    const missing = new Set(lifeContext.missingCriticalContext);
    if (missing.has("whether the business has been tested with real customers") || missing.has("financial runway")) {
      return ensureValidFollowUpDecision({
        shouldAsk: true,
        question: "Is the business already tested with real customers, or is it still only an idea?",
        reason: "business_stage_missing",
        answerBeforeQuestion: input.answerBeforeQuestion,
        resetAfterFinalAnswer: true,
      });
    }
    return undefined;
  }

  if (decisionType === "family_responsibility_decision") {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: "Is the main conflict about career, marriage, money, relocation, or caregiving?",
      reason: "family_conflict_axis_missing",
      answerBeforeQuestion: input.answerBeforeQuestion,
      resetAfterFinalAnswer: true,
    });
  }

  if (decisionType === "relationship_continue_or_end") {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: "Is the main issue commitment, trust, distance, or family approval?",
      reason: "relationship_issue_axis_missing",
      answerBeforeQuestion: input.answerBeforeQuestion,
      resetAfterFinalAnswer: true,
    });
  }

  if (decisionType === "marriage_readiness" || decisionType === "marriage_timing") {
    const needBirthData = hasMissingBirthData(input.birthData);
    if (needBirthData) return undefined;
    if (decisionType === "marriage_timing" && /specific proposal|specific person|proposal/.test(input.question)) {
      return ensureValidFollowUpDecision({
        shouldAsk: true,
        question: "Is your main concern compatibility, timing, family pressure, or your own readiness?",
        reason: "specific_proposal_concern_axis",
        answerBeforeQuestion: input.answerBeforeQuestion,
        resetAfterFinalAnswer: true,
      });
    }
    if (decisionType === "marriage_timing") {
      return ensureValidFollowUpDecision({
        shouldAsk: true,
        question: "Are you asking about general marriage timing, or about a specific proposal/person?",
        reason: "marriage_general_vs_specific_proposal",
        answerBeforeQuestion: input.answerBeforeQuestion,
        resetAfterFinalAnswer: true,
      });
    }
  }

  if (decisionType === "decision_support" && hasMajorDecisionLanguage(input.question)) {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: "Is your main concern compatibility, timing, family pressure, or your own readiness?",
      reason: "major_decision_context_missing",
      answerBeforeQuestion: input.answerBeforeQuestion,
      resetAfterFinalAnswer: true,
    });
  }

  if (input.question.includes("should i invest") || input.question.includes("take a financial risk")) {
    if (input.lifeContext?.lifeArea === "money" || input.practicalConstraints?.moneyConstraint === true) {
      return ensureValidFollowUpDecision({
        shouldAsk: true,
        question: "Is this about stabilizing finances, reducing debt, or taking a new financial risk?",
        reason: "money_decision_axis_missing",
        answerBeforeQuestion: input.answerBeforeQuestion,
        resetAfterFinalAnswer: true,
      });
    }
  }

  if (input.question.includes("should i") || input.question.includes("should i quit") || input.question.includes("should i resign")) {
    if (decisionType === "family_responsibility_decision") {
      return ensureValidFollowUpDecision({
        shouldAsk: true,
        question: "Is the main conflict about career, marriage, money, relocation, or caregiving?",
        reason: "family_conflict_axis_missing",
        answerBeforeQuestion: input.answerBeforeQuestion,
        resetAfterFinalAnswer: true,
      });
    }
  }

  return undefined;
}

function decideMeaningChangeFollowUp(input: {
  readonly question: string;
  readonly lifeContext?: LifeContextExtraction;
  readonly emotionalState?: EmotionalStateResult;
  readonly culturalContext?: CulturalFamilyContextResult;
  readonly practicalConstraints?: PracticalConstraintResult;
  readonly answerBeforeQuestion: boolean;
}): FollowUpDecision | undefined {
  const lifeContext = input.lifeContext;
  const question = input.question;

  if (lifeContext?.decisionType === "marriage_timing" || question.includes("will my marriage happen")) {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: "Are you asking about general marriage timing, or about a specific proposal/person?",
      reason: "marriage_general_vs_specific_proposal",
      answerBeforeQuestion: input.answerBeforeQuestion,
      resetAfterFinalAnswer: true,
    });
  }

  if (lifeContext?.decisionType === "specific_proposal_decision") {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: "Is your main concern compatibility, timing, family pressure, or your own readiness?",
      reason: "specific_proposal_concern_axis",
      answerBeforeQuestion: input.answerBeforeQuestion,
      resetAfterFinalAnswer: true,
    });
  }

  if (lifeContext?.decisionType === "job_switch_or_stay" && hasMajorDecisionLanguage(question)) {
    const missingOffer = lifeContext.missingCriticalContext.includes("whether user has another offer");
    const missingRunway = lifeContext.missingCriticalContext.includes("financial runway");
    if (missingOffer || missingRunway) {
      return ensureValidFollowUpDecision({
        shouldAsk: true,
        question: "Are you considering leaving because of a real opportunity, or mainly because the current job feels exhausting?",
        reason: "job_switch_motivation_missing",
        answerBeforeQuestion: input.answerBeforeQuestion,
        resetAfterFinalAnswer: true,
      });
    }
  }

  if (lifeContext?.decisionType === "business_transition" && hasMajorDecisionLanguage(question)) {
    const missingTestedCustomers = lifeContext.missingCriticalContext.includes("whether the business has been tested with real customers");
    const missingRunway = lifeContext.missingCriticalContext.includes("financial runway");
    if (missingTestedCustomers || missingRunway) {
      return ensureValidFollowUpDecision({
        shouldAsk: true,
        question: "Is the business already tested with real customers, or is it still only an idea?",
        reason: "business_stage_missing",
        answerBeforeQuestion: input.answerBeforeQuestion,
        resetAfterFinalAnswer: true,
      });
    }
  }

  if (lifeContext?.decisionType === "relationship_continue_or_end") {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: "Is the main issue commitment, trust, distance, or family approval?",
      reason: "relationship_issue_axis_missing",
      answerBeforeQuestion: input.answerBeforeQuestion,
      resetAfterFinalAnswer: true,
    });
  }

  if (lifeContext?.decisionType === "family_responsibility_decision") {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: "Is the main conflict about career, marriage, money, relocation, or caregiving?",
      reason: "family_conflict_axis_missing",
      answerBeforeQuestion: input.answerBeforeQuestion,
      resetAfterFinalAnswer: true,
    });
  }

  if (input.practicalConstraints?.moneyConstraint === true && hasFinancialDecisionLanguage(question)) {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: "Is this about stabilizing finances, reducing debt, or taking a new financial risk?",
      reason: "money_decision_axis_missing",
      answerBeforeQuestion: input.answerBeforeQuestion,
      resetAfterFinalAnswer: true,
    });
  }

  if (input.culturalContext?.familyInvolved === true && input.culturalContext?.parentalPressure === true && hasMajorDecisionLanguage(question)) {
    return ensureValidFollowUpDecision({
      shouldAsk: true,
      question: "Is the main conflict about career, marriage, money, relocation, or caregiving?",
      reason: "family_conflict_axis_missing",
      answerBeforeQuestion: input.answerBeforeQuestion,
      resetAfterFinalAnswer: true,
    });
  }

  if (input.emotionalState?.primaryEmotion === "comparison") {
    return undefined;
  }

  return undefined;
}

function ensureValidFollowUpDecision(decision: FollowUpDecision): FollowUpDecision {
  if (!decision.shouldAsk) return createNoFollowUpDecision(decision.reason ?? "no_follow_up_needed");
  const validation = validateFollowUpQuestion(decision.question ?? "");
  if (!validation.valid) {
    return createNoFollowUpDecision("invalid_follow_up_question_blocked");
  }
  return {
    shouldAsk: true,
    question: decision.question,
    reason: decision.reason,
    answerBeforeQuestion: decision.answerBeforeQuestion,
    resetAfterFinalAnswer: true,
  };
}

function shouldAnswerBeforeQuestion(emotionalState?: EmotionalStateResult): boolean {
  if (!emotionalState) return false;
  if (emotionalState.intensity === "high") return true;
  if (emotionalState.safetyFlags.includes("suggest_professional_support")) return true;
  return emotionalState.primaryEmotion === "fear" || emotionalState.primaryEmotion === "grief" || emotionalState.primaryEmotion === "anxiety" || emotionalState.primaryEmotion === "exhaustion";
}

function hasMissingBirthData(birthData?: BirthDataCompleteness): boolean {
  if (!birthData) return true;
  return !birthData.hasBirthDate || !birthData.hasBirthTime || !birthData.hasBirthPlace;
}

function isMajorDecisionQuestion(question: string, decisionType: string): boolean {
  return hasMajorDecisionLanguage(question) || decisionType === "job_switch_or_stay" || decisionType === "business_transition" || decisionType === "relationship_continue_or_end" || decisionType === "marriage_readiness" || decisionType === "marriage_timing" || decisionType === "family_responsibility_decision";
}

function hasMajorDecisionLanguage(question: string): boolean {
  return /\b(should i quit|should i resign|should i leave my job|should i marry|should i divorce|should i move abroad|should i relocate|should i invest|should i start business|should i say yes to proposal|should i say yes to this proposal|should i leave|should i stay)\b/.test(
    question,
  );
}

function hasFinancialDecisionLanguage(question: string): boolean {
  return /\b(invest|financial risk|money risk|savings|debt|large commitment)\b/.test(question);
}

function hasCompoundDiscoveryPattern(question: string): boolean {
  return (
    question.includes("tell me everything") ||
    question.includes("relationship history") ||
    question.includes("full story") ||
    question.includes("all details") ||
    question.includes("and your") ||
    question.includes("and also") ||
    question.includes("date, time, place, current situation") ||
    question.includes("current situation, and relationship history") ||
    question.includes("birth date, time, place")
  );
}

function countQuestionMarks(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ");
}
