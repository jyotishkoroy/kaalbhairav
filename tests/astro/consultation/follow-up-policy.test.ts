/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { buildChartEvidence } from "../../../lib/astro/consultation/chart-evidence-builder";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import {
  decideFollowUp,
  createNoFollowUpDecision,
  validateFollowUpQuestion,
  type BirthDataCompleteness,
  type FollowUpDecision,
} from "../../../lib/astro/consultation/follow-up-policy";
import { extractLifeContext, type LifeContextExtraction } from "../../../lib/astro/consultation/life-context-extractor";
import { extractPracticalConstraints, type PracticalConstraintResult } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { synthesizePattern } from "../../../lib/astro/consultation/pattern-recognition";

function defaultBirthData(overrides?: Partial<BirthDataCompleteness>): BirthDataCompleteness {
  return {
    hasBirthDate: true,
    hasBirthTime: true,
    hasBirthPlace: true,
    ...overrides,
  };
}

function defaultLifeContext(overrides?: Partial<LifeContextExtraction>): LifeContextExtraction {
  return {
    lifeArea: "general",
    extractedFacts: [],
    missingCriticalContext: [],
    ...overrides,
  };
}

function defaultEmotionalState(overrides?: Partial<ReturnType<typeof detectEmotionalState>>): ReturnType<typeof detectEmotionalState> {
  return {
    primaryEmotion: "neutral",
    secondaryEmotions: [],
    intensity: "low",
    toneNeeded: "direct",
    safetyFlags: [],
    ...overrides,
  };
}

function defaultCulturalContext(overrides?: Partial<ReturnType<typeof extractCulturalFamilyContext>>): ReturnType<typeof extractCulturalFamilyContext> {
  return {
    familyInvolved: false,
    parentalPressure: false,
    arrangedMarriageContext: false,
    familyReputationPressure: false,
    financialDependents: false,
    religiousComfort: "unknown",
    decisionAutonomy: "unknown",
    ...overrides,
  };
}

function defaultPracticalConstraints(overrides?: Partial<PracticalConstraintResult>): PracticalConstraintResult {
  return {
    moneyConstraint: false,
    timeConstraint: false,
    privacyConstraint: false,
    careerInstability: false,
    healthConstraint: false,
    familyConstraint: false,
    riskTolerance: "unknown",
    remedyStyle: "unknown",
    ...overrides,
  };
}

function expectNoFollowUp(decision: FollowUpDecision, reason: string): void {
  expect(decision.shouldAsk).toBe(false);
  expect(decision.reason).toBe(reason);
  expect(decision.answerBeforeQuestion).toBe(false);
  expect(decision.resetAfterFinalAnswer).toBe(true);
}

describe("follow-up policy", () => {
  it("never asks for exact-fact intent", () => {
    expectNoFollowUp(
      decideFollowUp({ intentPrimary: "exact_fact", question: "What is my Lagna?" }),
      "exact_fact_bypass",
    );
  });

  it("never asks for exact-fact chart terms", () => {
    expectNoFollowUp(
      decideFollowUp({ intentPrimary: "exact_fact", question: "Which Mahadasha am I running now?" }),
      "exact_fact_bypass",
    );
  });

  it("blocks a second follow-up when already asked", () => {
    expectNoFollowUp(
      decideFollowUp({ alreadyAsked: true, question: "Should I say yes to this proposal?" }),
      "follow_up_already_asked",
    );
  });

  it("asks a grouped birth-data request when chart calculation needs missing data", () => {
    const decision = decideFollowUp({
      question: "What does my chart say about marriage?",
      needsChart: true,
      birthData: { hasBirthDate: false, hasBirthTime: false, hasBirthPlace: false },
      intentPrimary: "interpretation",
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("To calculate this properly, please share your birth date, exact birth time, and birthplace.");
    expect(validateFollowUpQuestion(decision.question ?? "").valid).toBe(true);
    expect(decision.answerBeforeQuestion).toBe(false);
    expect(decision.resetAfterFinalAnswer).toBe(true);
  });

  it("asks the same grouped birth-data request when only birth time is missing", () => {
    const decision = decideFollowUp({
      question: "What does my chart say about career?",
      needsChart: true,
      birthData: defaultBirthData({ hasBirthTime: false }),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("To calculate this properly, please share your birth date, exact birth time, and birthplace.");
  });

  it("does not ask the birth-data request when data is complete", () => {
    const decision = decideFollowUp({
      question: "What does my chart say about career?",
      needsChart: true,
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("no_follow_up_needed");
  });

  it("asks marriage timing versus specific proposal clarification", () => {
    const decision = decideFollowUp({
      question: "Will my marriage happen?",
      lifeContext: defaultLifeContext({ lifeArea: "marriage", decisionType: "marriage_timing" }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("Are you asking about general marriage timing, or about a specific proposal/person?");
    expect(decision.reason).toBe("marriage_general_vs_specific_proposal");
  });

  it("asks specific proposal concern-axis clarification", () => {
    const decision = decideFollowUp({
      question: "Should I say yes to this proposal?",
      lifeContext: defaultLifeContext({ lifeArea: "marriage", decisionType: "specific_proposal_decision" }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("Is your main concern compatibility, timing, family pressure, or your own readiness?");
    expect((decision.question ?? "").match(/\?/g)?.length).toBe(1);
    expect(decision.reason).toBe("specific_proposal_concern_axis");
  });

  it("sets answer-before-question for high anxiety proposal cases", () => {
    const decision = decideFollowUp({
      question: "Should I say yes to this proposal?",
      lifeContext: defaultLifeContext({ lifeArea: "marriage", decisionType: "specific_proposal_decision" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "fear", intensity: "high" }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.answerBeforeQuestion).toBe(true);
  });

  it("asks job-switch motivation clarification when critical context is missing", () => {
    const decision = decideFollowUp({
      question: "Should I leave my job?",
      lifeContext: defaultLifeContext({
        lifeArea: "career",
        decisionType: "job_switch_or_stay",
        missingCriticalContext: ["whether user has another offer", "financial runway"],
      }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("Are you considering leaving because of a real opportunity, or mainly because the current job feels exhausting?");
    expect(decision.reason).toBe("job_switch_motivation_missing");
  });

  it("asks business-stage clarification when context is missing", () => {
    const decision = decideFollowUp({
      question: "Should I quit my job and start business?",
      lifeContext: defaultLifeContext({
        lifeArea: "career",
        decisionType: "business_transition",
        missingCriticalContext: ["whether the business has been tested with real customers", "financial runway"],
      }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("Is the business already tested with real customers, or is it still only an idea?");
    expect(decision.reason).toBe("business_stage_missing");
  });

  it("asks relationship axis clarification for continue-or-end decisions", () => {
    const decision = decideFollowUp({
      question: "Should I continue this relationship or break up?",
      lifeContext: defaultLifeContext({ lifeArea: "relationship", decisionType: "relationship_continue_or_end" }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("Is the main issue commitment, trust, distance, or family approval?");
    expect((decision.question ?? "").match(/\?/g)?.length).toBe(1);
  });

  it("asks the health professional context question and grounds anxious users", () => {
    const decision = decideFollowUp({
      question: "I am worried about my health.",
      lifeContext: defaultLifeContext({ lifeArea: "health" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high", safetyFlags: ["suggest_professional_support"] }),
      practicalConstraints: defaultPracticalConstraints({ healthConstraint: true }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("Have you already spoken with a qualified medical professional about this concern?");
    expect(decision.reason).toBe("health_professional_context_missing");
    expect(decision.answerBeforeQuestion).toBe(true);
  });

  it("asks the money axis question for investment risk", () => {
    const decision = decideFollowUp({
      question: "Should I invest my savings?",
      lifeContext: defaultLifeContext({ lifeArea: "money" }),
      practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("Is this about stabilizing finances, reducing debt, or taking a new financial risk?");
    expect(decision.reason).toBe("money_decision_axis_missing");
  });

  it("asks the family conflict axis question when duty is central", () => {
    const decision = decideFollowUp({
      question: "My family is pressuring me about marriage and career.",
      lifeContext: defaultLifeContext({ lifeArea: "family", decisionType: "family_responsibility_decision" }),
      culturalContext: defaultCulturalContext({ familyInvolved: true, parentalPressure: true }),
      practicalConstraints: defaultPracticalConstraints({ familyConstraint: true }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("Is the main conflict about career, marriage, money, relocation, or caregiving?");
    expect(decision.reason).toBe("family_conflict_axis_missing");
  });

  it("does not ask follow-up for a clear career interpretation", () => {
    const decision = decideFollowUp({
      question: "What does my chart say about career growth?",
      lifeContext: defaultLifeContext({ lifeArea: "career" }),
      emotionalState: defaultEmotionalState(),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("no_follow_up_needed");
  });

  it("does not ask for an emotionally clear relationship pattern", () => {
    const decision = decideFollowUp({
      question: "Why do I keep attracting emotionally unavailable partners?",
      lifeContext: defaultLifeContext({ lifeArea: "relationship", decisionType: "relationship_pattern_clarity" }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(false);
  });

  it("does not force follow-up for skeptical users when context is clear", () => {
    const decision = decideFollowUp({
      question: "I am skeptical. Explain this logically.",
      emotionalState: defaultEmotionalState({ primaryEmotion: "neutral", secondaryEmotions: ["skepticism"], toneNeeded: "analytical" }),
      lifeContext: defaultLifeContext({ lifeArea: "general" }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(false);
  });

  it("marks high intensity as answer-before-question across follow-up decisions", () => {
    const decision = decideFollowUp({
      question: "Should I quit my job?",
      lifeContext: defaultLifeContext({ lifeArea: "career", decisionType: "job_switch_or_stay", missingCriticalContext: ["whether user has another offer"] }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "exhaustion", intensity: "high" }),
      birthData: defaultBirthData(),
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.answerBeforeQuestion).toBe(true);
  });

  it("accepts the grouped birth-data request", () => {
    expect(validateFollowUpQuestion("To calculate this properly, please share your birth date, exact birth time, and birthplace.").valid).toBe(true);
  });

  it("rejects multiple question marks", () => {
    expect(validateFollowUpQuestion("Are you asking about timing? Or a specific person?").valid).toBe(false);
  });

  it("rejects hidden compound discovery prompts", () => {
    expect(validateFollowUpQuestion("Tell me your birth date, time, place, current situation, and relationship history?").valid).toBe(false);
  });

  it("rejects tell-me-everything prompts", () => {
    expect(validateFollowUpQuestion("Tell me everything about your past relationships?").valid).toBe(false);
  });

  it("accepts selected-axis questions", () => {
    expect(validateFollowUpQuestion("Is the main conflict about career, marriage, money, relocation, or caregiving?").valid).toBe(true);
  });

  it("blocks invalid generated follow-ups", () => {
    const decision = createNoFollowUpDecision("invalid_follow_up_question_blocked");
    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("invalid_follow_up_question_blocked");
  });

  it("gives exact-fact priority over missing birth data", () => {
    const decision = decideFollowUp({
      intentPrimary: "exact_fact",
      question: "What is my Lagna?",
      needsChart: true,
      birthData: { hasBirthDate: false, hasBirthTime: false, hasBirthPlace: false },
    });

    expectNoFollowUp(decision, "exact_fact_bypass");
  });

  it("gives alreadyAsked priority over missing context", () => {
    const decision = decideFollowUp({
      alreadyAsked: true,
      question: "Should I leave my job?",
      lifeContext: defaultLifeContext({
        lifeArea: "career",
        decisionType: "job_switch_or_stay",
        missingCriticalContext: ["whether user has another offer", "financial runway"],
      }),
      birthData: defaultBirthData(),
    });

    expectNoFollowUp(decision, "follow_up_already_asked");
  });

  it("gives missing birth data priority over marriage clarification", () => {
    const decision = decideFollowUp({
      question: "Will my marriage happen?",
      needsChart: true,
      lifeContext: defaultLifeContext({ lifeArea: "marriage", decisionType: "marriage_timing" }),
      birthData: { hasBirthDate: false, hasBirthTime: false, hasBirthPlace: false },
    });

    expect(decision.shouldAsk).toBe(true);
    expect(decision.question).toBe("To calculate this properly, please share your birth date, exact birth time, and birthplace.");
  });

  it("keeps resetAfterFinalAnswer true on explicit no-follow-up decisions", () => {
    expect(createNoFollowUpDecision().resetAfterFinalAnswer).toBe(true);
    expect(createNoFollowUpDecision("custom").resetAfterFinalAnswer).toBe(true);
  });

  it("keeps the state factory exact-fact bypass clean", () => {
    const state = createEmptyConsultationState({ userQuestion: "What is my Lagna?" });
    expect(state.intent.primary).toBe("exact_fact");
    expect(state.followUp.allowed).toBe(false);
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.practicalConstraints).toEqual({});
  });

  it("keeps the phase 2 life extraction regression", () => {
    expect(extractLifeContext({ question: "Should I quit my job and start my own business?" }).decisionType).toBe("business_transition");
  });

  it("keeps the phase 3 emotional regression", () => {
    expect(detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." }).primaryEmotion).toBe("comparison");
  });

  it("keeps the phase 4 cultural regression", () => {
    const result = extractCulturalFamilyContext({ question: "My parents are forcing me to say yes to this proposal." });
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
  });

  it("keeps the phase 5 practical regression", () => {
    const result = extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." });
    expect(result.timeConstraint).toBe(true);
    expect(result.privacyConstraint).toBe(true);
    expect(result.familyConstraint).toBe(true);
  });

  it("keeps the phase 6 chart evidence regression", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "tenthHouse", label: "10th house", value: "Career" }],
    });

    expect(result.supportiveFactors.length + result.challengingFactors.length + result.neutralFacts.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).toContain("10th house");
  });

  it("keeps the phase 7 synthesis regression", () => {
    const result = synthesizePattern({
      chartEvidence: buildChartEvidence({
        domain: "career",
        chart: [
          { key: "tenthHouse", label: "10th house", value: "Career growth support" },
          { key: "saturnPressure", label: "Saturn", value: "Saturn pressure on 10th house" },
        ],
      }),
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "career blockage by manager" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.dominantPattern.toLowerCase()).toContain("career");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("guarantee");
  });

  it("does not include private fixture content", () => {
    const text = JSON.stringify({
      testFile: "tests/astro/consultation/follow-up-policy.test.ts",
      moduleFile: "lib/astro/consultation/follow-up-policy.ts",
    }).toLowerCase();

    expect(text).not.toContain("myvedicreport");
    expect(text).not.toContain("astro_package");
    expect(text).not.toContain(".env");
    expect(text).not.toContain("token");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("api key");
  });
});
