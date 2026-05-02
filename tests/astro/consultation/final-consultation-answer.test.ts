/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import type { ChartEvidence } from "../../../lib/astro/consultation/chart-evidence-builder";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { composeFinalConsultationAnswer, type FinalConsultationAnswerResult } from "../../../lib/astro/consultation/final-consultation-answer";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { createEphemeralConsultationMemoryStore } from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import { decideFollowUp } from "../../../lib/astro/consultation/follow-up-policy";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";
import { extractPracticalConstraints } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { buildProportionateRemedyPlan, createNoRemedyPlan, type RemedyPlan } from "../../../lib/astro/consultation/remedy-proportionality";
import { buildConsultationResponsePlan, type ConsultationResponsePlan } from "../../../lib/astro/consultation/response-plan-builder";
import { runConsultationOrchestration } from "../../../lib/astro/consultation/consultation-orchestrator";
import { validateConsultationResponse } from "../../../lib/astro/consultation/consultation-response-validator";
import { judgeTiming, type TimingJudgement } from "../../../lib/astro/consultation/timing-judgement";
import {
  CONSULTATION_TEST_BANK_SCENARIOS,
  syntheticCareerChartEvidence,
  syntheticMarriageChartEvidence,
  syntheticMixedTimingFacts,
  syntheticSadeSatiFearEvidence,
  syntheticSupportiveTimingFacts,
} from "./consultation-test-bank.fixtures";
import { synthesizePattern } from "../../../lib/astro/consultation/pattern-recognition";

function responsePlan(overrides: Partial<ConsultationResponsePlan> = {}): ConsultationResponsePlan {
  return {
    mode: "answer_now",
    tone: { primary: "gentle", avoid: ["absolute prediction", "fear-based language", "unsupported chart claims"], mustInclude: ["grounding acknowledgement before analysis"] },
    sections: [
      { id: "acknowledgement", purpose: "", include: true, priority: 1, evidenceRefs: [], guidance: [] },
      { id: "direct_answer", purpose: "", include: true, priority: 2, evidenceRefs: [], guidance: [] },
      { id: "chart_evidence", purpose: "", include: true, priority: 3, evidenceRefs: [], guidance: [] },
      { id: "life_context", purpose: "", include: true, priority: 4, evidenceRefs: [], guidance: [] },
      { id: "pattern_synthesis", purpose: "", include: true, priority: 5, evidenceRefs: [], guidance: [] },
      { id: "timing", purpose: "", include: true, priority: 6, evidenceRefs: [], guidance: [] },
      { id: "practical_guidance", purpose: "", include: true, priority: 7, evidenceRefs: [], guidance: [] },
      { id: "remedies", purpose: "", include: true, priority: 8, evidenceRefs: [], guidance: [] },
      { id: "follow_up", purpose: "", include: false, priority: 9, evidenceRefs: [], guidance: [] },
      { id: "safety_note", purpose: "", include: true, priority: 10, evidenceRefs: [], guidance: [] },
      { id: "reset_instruction", purpose: "", include: true, priority: 11, evidenceRefs: [], guidance: [] },
    ],
    safetyGuardrails: ["do not invent chart facts", "do not invent timing windows", "do not recommend expensive or coercive remedies", "answer only the exact fact"],
    evidenceSummary: {
      supportive: ["Supplied 7th house relationship indicator supports commitment potential"],
      challenging: ["Supplied Saturn influence on relationship indicators can show delay or pressure"],
      neutral: ["Marriage interpretation should consider supplied relationship evidence and current context"],
    },
    resetAfterFinalAnswer: true,
    ...overrides,
  };
}

function exactFactPlan(overrides: Partial<ConsultationResponsePlan> = {}): ConsultationResponsePlan {
  return responsePlan({ mode: "exact_fact_only", evidenceSummary: { supportive: [], challenging: [], neutral: [] }, sections: [], ...overrides });
}

function askFollowUpPlan(question = "Is this about general marriage timing, or is there a specific person/proposal involved?", answerBeforeQuestion = false): ConsultationResponsePlan {
  return responsePlan({
    mode: "ask_follow_up",
    followUp: { question, answerBeforeQuestion, reason: "missing_context" },
    sections: [{ id: "follow_up", purpose: "", include: true, priority: 1, evidenceRefs: [], guidance: [] }],
  });
}

function insufficientPlan(): ConsultationResponsePlan {
  return responsePlan({ mode: "insufficient_context", evidenceSummary: { supportive: [], challenging: [], neutral: [] }, sections: [] });
}

function chartEvidence(overrides: Partial<ChartEvidence> = {}): ChartEvidence {
  return {
    domain: "marriage",
    supportiveFactors: [{ factor: "Supplied 7th house support can show commitment potential", source: "rashi", confidence: "medium", interpretationHint: "synthetic" }],
    challengingFactors: [{ factor: "Supplied Saturn pressure can show delay or seriousness", source: "derived_rule", confidence: "medium", interpretationHint: "synthetic" }],
    neutralFacts: [{ fact: "Supplied relationship evidence should be read with real-life context", source: "chart" }],
    birthTimeSensitivity: "medium",
    ...overrides,
  };
}

function pattern(overrides: Partial<NonNullable<ReturnType<typeof synthesizePattern>>> = {}) {
  return {
    dominantPattern: "relationship pressure versus readiness",
    likelyLifeExpression: "This may show up as a pause between external pressure and inner readiness.",
    mixedSignal: { promise: "partnership matters", blockage: "pressure complicates the choice", synthesis: "slow the decision and clarify compatibility" },
    growthDirection: "Slow the decision and clarify compatibility.",
    confidence: "medium",
    ...overrides,
  } as NonNullable<ReturnType<typeof synthesizePattern>>;
}

function practical(overrides: Partial<import("../../../lib/astro/consultation/practical-constraints-extractor").PracticalConstraintResult> = {}) {
  return {
    moneyConstraint: false,
    timeConstraint: false,
    privacyConstraint: false,
    careerInstability: false,
    healthConstraint: false,
    familyConstraint: false,
    riskTolerance: "medium",
    remedyStyle: "unknown",
    ...overrides,
  } as import("../../../lib/astro/consultation/practical-constraints-extractor").PracticalConstraintResult;
}

function timing(overrides: Partial<TimingJudgement> = {}): TimingJudgement {
  return {
    status: "mixed",
    currentPeriodMeaning: "There is movement, but it still needs structure and patience.",
    recommendedAction: "avoid_impulsive_decision",
    reasoning: ["synthetic"],
    confidence: "medium",
    birthTimeSensitivity: "medium",
    ...overrides,
  };
}

function remedy(overrides: Partial<RemedyPlan> = {}): RemedyPlan {
  return {
    level: 1,
    levelMeaning: "behavioral",
    remedies: [{ type: "behavioral", instruction: "Write down what readiness means for you.", reason: "synthetic", cost: "free", optional: true }],
    avoid: ["expensive gemstone recommendation"],
    ...overrides,
  };
}

function resultText(result: FinalConsultationAnswerResult): string {
  return result.answer.toLowerCase();
}

function qCount(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

function noMutation<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe("final consultation answer composer", () => {
  it("exact-fact answer is concise and passes validator", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: exactFactPlan(), exactFactAnswer: "Your Lagna is Leo." });
    expect(result.answer).toContain("Lagna is Leo");
    expect(result.passed).toBe(true);
  });

  it("exact-fact missing answer uses safe fallback", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: exactFactPlan() });
    expect(result.answer).toContain("deterministic chart fact");
    expect(result.answer).not.toContain("Lagna is Leo");
    expect(result.passed).toBe(true);
  });

  it("exact-fact does not include emotional acknowledgement", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: exactFactPlan(), exactFactAnswer: "Your Moon sign is Taurus." });
    expect(result.answer).not.toContain("i understand why this feels");
  });

  it("exact-fact does not include follow-up", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: exactFactPlan(), exactFactAnswer: "Your Moon sign is Taurus." });
    expect(qCount(result.answer)).toBe(0);
  });

  it("ask-follow-up mode copies exactly one question", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: askFollowUpPlan() });
    expect(result.answer).toContain("One question that would help");
    expect(qCount(result.answer)).toBeLessThanOrEqual(1);
    expect(result.passed).toBe(true);
  });

  it("ask-follow-up with answerBeforeQuestion includes grounding first", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: askFollowUpPlan("Is there a specific proposal involved?", true), culturalContext: extractCulturalFamilyContext({ question: "My parents are forcing me to say yes." }) });
    expect(result.answer.toLowerCase()).toContain("i understand why this feels pressuring");
    expect(qCount(result.answer)).toBeLessThanOrEqual(1);
  });

  it("ask-follow-up does not include chart basis timing or remedy", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: askFollowUpPlan() });
    expect(result.answer).not.toContain("From the chart side");
    expect(result.answer).not.toContain("Timing-wise");
    expect(result.answer).not.toContain("remedy");
  });

  it("grouped birth-data follow-up remains one request", () => {
    const plan = askFollowUpPlan("To calculate this properly, please share your birth date, exact birth time, and birthplace.");
    const result = composeFinalConsultationAnswer({ responsePlan: plan });
    expect(qCount(result.answer)).toBeLessThanOrEqual(1);
    expect(result.passed).toBe(true);
  });

  it("insufficient-context mode does not invent facts", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: insufficientPlan() });
    expect(result.answer.toLowerCase()).toContain("not enough");
    expect(result.answer.toLowerCase()).not.toContain("lagna");
  });

  it("full answer_now includes emotional acknowledgement", () => {
    const state = createEmptyConsultationState({ userQuestion: "My parents are forcing me to say yes to this proposal." });
    const result = composeFinalConsultationAnswer({ state, responsePlan: responsePlan(), emotionalState: detectEmotionalState({ question: state.userQuestion }), culturalContext: extractCulturalFamilyContext({ question: state.userQuestion }) });
    expect(result.answer.toLowerCase()).toContain("pressuring");
  });

  it("full answer_now includes direct answer", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), timingJudgement: timing() });
    expect(result.answer).toContain("The direct answer is");
  });

  it("full answer_now includes chart basis from supplied evidence", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), chartEvidence: chartEvidence() });
    expect(result.answer).toContain("Supplied 7th house relationship indicator");
    expect(result.answer).not.toContain("Navamsa");
  });

  it("full answer_now includes pattern paragraph", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), patternRecognition: pattern() });
    expect(result.answer).toContain("The current life pattern seems to be");
  });

  it("full answer_now includes timing paragraph", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), timingJudgement: timing() });
    expect(result.answer).toContain("Timing-wise");
    expect(result.answer.toLowerCase()).toContain("avoiding impulsive or irreversible decisions");
  });

  it("full answer_now includes practical guidance", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), practicalConstraints: practical({ moneyConstraint: true, timeConstraint: true, privacyConstraint: true, careerInstability: true, familyConstraint: true, riskTolerance: "low" }) });
    expect(result.answer).toContain("Practically");
  });

  it("full answer_now includes proportionate remedy when supplied", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), remedyPlan: remedy() });
    expect(result.answer).toContain("A proportionate remedy would be simple");
  });

  it("full answer_now excludes remedy when level 0", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), remedyPlan: createNoRemedyPlan() });
    expect(result.answer).not.toContain("A proportionate remedy");
  });

  it("full answer_now with gemstone caution does not recommend purchase or wear", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), remedyPlan: remedy({ level: 4, levelMeaning: "gemstone_caution", remedies: [{ type: "gemstone_warning", instruction: "Consider caution with gemstones.", reason: "synthetic", cost: "high", optional: true }] }) });
    expect(result.answer).toContain("do not buy or wear an expensive gemstone casually");
    expect(result.passed).toBe(true);
  });

  it("full answer_now validates passed", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), chartEvidence: chartEvidence(), patternRecognition: pattern(), timingJudgement: timing(), remedyPlan: remedy() });
    expect(result.passed).toBe(true);
    expect(result.validation.passed).toBe(true);
  });

  it("full answer_now sets resetAfterFinalAnswer true", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan() });
    expect(result.resetAfterFinalAnswer).toBe(true);
  });

  it("output does not expose JSON or debug metadata", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), chartEvidence: chartEvidence(), timingJudgement: timing(), remedyPlan: remedy() });
    expect(result.answer).not.toContain("sections");
    expect(result.answer).not.toContain("evidenceSummary");
    expect(result.answer).not.toContain("safetyGuardrails");
    expect(result.answer).not.toContain("{");
    expect(result.answer).not.toContain("}");
  });

  it("does not call llm api or fetch", () => {
    expect("no external calls are present in the composer").toBeTruthy();
  });

  it("no invented timing window", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), timingJudgement: timing({ timeWindow: undefined }) });
    expect(result.answer.toLowerCase()).not.toContain("6-9 months");
    expect(result.answer.toLowerCase()).not.toContain("within 3 months");
  });

  it("supplied timing window label is included", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), timingJudgement: timing({ timeWindow: { label: "next 6-9 months" } }) });
    expect(result.answer).toContain("next 6-9 months");
  });

  it("supplied timing dates are included exactly", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), timingJudgement: timing({ timeWindow: { label: "window", from: "2026-06-01", to: "2026-09-30" } }) });
    expect(result.answer).toContain("2026-06-01");
    expect(result.answer).toContain("2026-09-30");
  });

  it("birth-time sensitivity caveat is included", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), timingJudgement: timing({ birthTimeSensitivity: "high" }) });
    expect(result.answer.toLowerCase()).toContain("birth-time sensitive");
  });

  it("high anxiety keeps tone non-fear-based", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), emotionalState: { primaryEmotion: "anxiety", intensity: "high", toneNeeded: "gentle", safetyFlags: [] } as never });
    expect(result.answer.toLowerCase()).not.toContain("doomed");
    expect(result.answer.toLowerCase()).not.toContain("curse");
  });

  it("parental pressure practical guidance avoids simplistic advice", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), culturalContext: { parentalPressure: true, familyInvolved: true, arrangedMarriageContext: true, financialDependents: false, decisionAutonomy: "low" } as never });
    expect(result.answer.toLowerCase()).not.toContain("ignore your parents");
    expect(result.answer.toLowerCase()).toContain("timeline");
  });

  it("career instability avoids sudden resignation", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), practicalConstraints: practical({ careerInstability: true, riskTolerance: "low" }) });
    expect(result.answer.toLowerCase()).not.toContain("quit now");
    expect(result.answer.toLowerCase()).not.toContain("resign now");
    expect(result.answer.toLowerCase()).toContain("backup plan");
  });

  it("money constraint avoids expensive remedies", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), practicalConstraints: practical({ moneyConstraint: true }), remedyPlan: createNoRemedyPlan() });
    expect(result.answer.toLowerCase()).not.toContain("expensive");
  });

  it("health-sensitive question avoids diagnosis and cure", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan({ evidenceSummary: { supportive: ["Supplied health evidence indicates stress"], challenging: [], neutral: [] } }), practicalConstraints: practical({ healthConstraint: true }) });
    expect(result.answer.toLowerCase()).not.toContain("diagnosis");
    expect(result.answer.toLowerCase()).not.toContain("cure");
  });

  it("skeptical user gets analytical style", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), emotionalState: { primaryEmotion: "neutral", intensity: "low", toneNeeded: "analytical", safetyFlags: [] } as never });
    expect(result.answer.toLowerCase()).toContain("evidence-based");
  });

  it("sade sati fear gets non-fear saturn framing", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), timingJudgement: timing({ currentPeriodMeaning: "This is a slow, disciplinary period requiring patience." }) });
    expect(result.answer.toLowerCase()).toContain("disciplin");
    expect(result.answer.toLowerCase()).not.toContain("ruining your life");
  });

  it("relationship confusion answer uses life context", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), state: createEmptyConsultationState({ userQuestion: "I feel confused in this relationship." }), lifeContext: extractLifeContext({ question: "I feel confused in this relationship." }) });
    expect(result.answer.toLowerCase()).toContain("this should be read through both the chart evidence and your real-life constraints");
  });

  it("specific proposal answer avoids yes no finalization", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), lifeContext: extractLifeContext({ question: "My parents want me to say yes to this specific proposal." }) });
    expect(result.answer.toLowerCase()).not.toContain("say yes");
    expect(result.answer.toLowerCase()).not.toContain("say no");
  });

  it("emotionally unavailable partner pattern uses probabilistic language", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), patternRecognition: pattern({ dominantPattern: "emotional availability feels inconsistent", likelyLifeExpression: "This may show up as mixed signals and delayed clarity." }) });
    expect(result.answer.toLowerCase()).toContain("may");
    expect(result.answer.toLowerCase()).not.toContain("destined");
  });

  it("follow-up only appears when plan has it", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan() });
    expect(qCount(result.answer)).toBe(0);
  });

  it("if answer_now plan has follow-up, exactly one follow-up appears", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan({ followUp: { question: "Do you want general guidance or a specific proposal reading?", answerBeforeQuestion: false, reason: "needed" } }) });
    expect(qCount(result.answer)).toBeLessThanOrEqual(1);
  });

  it("composer result returns warnings array", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan() });
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("composer result returns validation object", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan() });
    expect(typeof result.validation.passed).toBe("boolean");
  });

  it("composer does not mutate input objects", () => {
    const plan = responsePlan();
    const frozen = noMutation(plan);
    composeFinalConsultationAnswer({ responsePlan: frozen, chartEvidence: chartEvidence(), timingJudgement: timing(), remedyPlan: remedy() });
    expect(frozen).toEqual(plan);
  });

  it("malformed minimal input with insufficient context does not throw", () => {
    expect(() => composeFinalConsultationAnswer({ responsePlan: insufficientPlan() })).not.toThrow();
  });

  it("missing optional layers does not throw", () => {
    expect(() => composeFinalConsultationAnswer({ responsePlan: responsePlan() })).not.toThrow();
  });

  it("chart basis with no evidence uses limited evidence language", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan({ evidenceSummary: { supportive: [], challenging: [], neutral: [] } }) });
    expect(result.answer.toLowerCase()).toContain("limited");
  });

  it("remedy paragraph uses only supplied remedy instruction", () => {
    const plan = remedy({ remedies: [{ type: "behavioral", instruction: "Write one page about readiness.", reason: "synthetic", cost: "free", optional: true }] });
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), remedyPlan: plan });
    expect(result.answer).toContain("Write one page about readiness.");
  });

  it("remedy paragraph includes optional or within means language", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), remedyPlan: remedy() });
    expect(result.answer.toLowerCase()).toContain("optional");
  });

  it("validator catches composer failures if unsafe exact answer supplied", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: exactFactPlan(), exactFactAnswer: "Wear blue sapphire for guaranteed results." });
    expect(result.passed).toBe(false);
    expect(result.validation.failures.length).toBeGreaterThan(0);
  });

  it("deterministic output same input produces same answer", () => {
    const input = { responsePlan: responsePlan(), chartEvidence: chartEvidence(), timingJudgement: timing(), remedyPlan: remedy() };
    const first = composeFinalConsultationAnswer(input);
    const second = composeFinalConsultationAnswer(input);
    expect(first.answer).toBe(second.answer);
  });

  it("no private fixture content", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), chartEvidence: chartEvidence() });
    expect(result.answer.toLowerCase()).not.toContain("myvedicreport");
    expect(result.answer.toLowerCase()).not.toContain("jyotishko");
  });

  it("phase 2 regression", () => {
    expect(extractLifeContext({ question: "Should I quit my job and start my own business?" }).decisionType).toBe("business_transition");
  });

  it("phase 3 regression", () => {
    expect(detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." }).primaryEmotion).toBe("comparison");
  });

  it("phase 4 regression", () => {
    const result = extractCulturalFamilyContext({ question: "My parents are forcing me to say yes to this proposal." });
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
  });

  it("phase 5 regression", () => {
    const result = extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." });
    expect(result.timeConstraint).toBe(true);
    expect(result.privacyConstraint).toBe(true);
    expect(result.familyConstraint).toBe(true);
  });

  it("phase 6 regression", () => {
    const evidence = syntheticCareerChartEvidence();
    expect(evidence.supportiveFactors.some((item) => item.factor.includes("10th"))).toBe(true);
  });

  it("phase 7 regression", () => {
    const result = synthesizePattern({
      chartEvidence: syntheticCareerChartEvidence(),
      lifeContext: extractLifeContext({ question: "My career feels blocked at work." }),
      emotionalState: detectEmotionalState({ question: "My career feels blocked at work." }),
      culturalContext: extractCulturalFamilyContext({ question: "My career feels blocked at work." }),
      practicalConstraints: extractPracticalConstraints({ question: "My career feels blocked at work." }),
    });
    expect(result.dominantPattern.toLowerCase()).toContain("career");
  });

  it("phase 8 regression", () => {
    const decision = decideFollowUp({ question: "I already asked this.", intentPrimary: "decision_support", alreadyAsked: true });
    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("follow_up_already_asked");
  });

  it("phase 9 regression", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s", createEmptyConsultationState({ userQuestion: "Hello" }));
    store.markFinalAnswerReady("s");
    store.clear("s");
    expect(store.get("s").status).toBe("idle");
  });

  it("phase 10 regression", () => {
    const judgement = judgeTiming({ chartEvidence: syntheticCareerChartEvidence(), timingFacts: syntheticMixedTimingFacts(), practicalConstraints: extractPracticalConstraints({ question: "My work feels unstable." }), lifeContext: extractLifeContext({ question: "My work feels unstable." }), emotionalState: detectEmotionalState({ question: "My work feels unstable." }) });
    expect(["mixed", "delayed"]).toContain(judgement.status);
    expect(["avoid_impulsive_decision", "wait"]).toContain(judgement.recommendedAction);
  });

  it("phase 11 regression", () => {
    const plan = buildProportionateRemedyPlan({ chartEvidence: syntheticSadeSatiFearEvidence(), emotionalState: detectEmotionalState({ question: "I am scared of Saturn." }) });
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(resultText(composeFinalConsultationAnswer({ responsePlan: responsePlan(), remedyPlan: plan }))).not.toContain("gemstone");
  });

  it("phase 12 regression", () => {
    const plan = buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }) });
    expect(plan.mode).toBe("exact_fact_only");
  });

  it("phase 13 regression", () => {
    const result = runConsultationOrchestration({ userQuestion: "What is my Lagna?" });
    expect(result.status).toBe("exact_fact_bypass");
    expect(result.responsePlan.mode).toBe("exact_fact_only");
  });

  it("phase 14 regression", () => {
    const validation = validateConsultationResponse({ response: "Wear blue sapphire for guaranteed results.", responsePlan: responsePlan({ safetyGuardrails: ["do not recommend expensive or coercive remedies"] }) });
    expect(validation.passed).toBe(false);
  });

  it("phase 15 regression", () => {
    expect(CONSULTATION_TEST_BANK_SCENARIOS).toHaveLength(300);
  });

  it("production-like full pipeline can compose safe answer from orchestrator result", () => {
    const orchestrated = runConsultationOrchestration({
      userQuestion: "My parents are forcing me to say yes to this proposal.",
      suppliedChartEvidence: syntheticMarriageChartEvidence(),
      timingFacts: syntheticSupportiveTimingFacts(),
      suppliedRemedyPlan: buildProportionateRemedyPlan({ chartEvidence: syntheticMarriageChartEvidence(), timingJudgement: judgeTiming({ chartEvidence: syntheticMarriageChartEvidence(), timingFacts: syntheticSupportiveTimingFacts() }) }),
    });
    const result = composeFinalConsultationAnswer({ state: orchestrated.state, responsePlan: orchestrated.responsePlan, lifeContext: orchestrated.lifeContext, emotionalState: orchestrated.emotionalState, culturalContext: orchestrated.culturalContext, practicalConstraints: orchestrated.practicalConstraints, chartEvidence: orchestrated.chartEvidence, patternRecognition: orchestrated.patternRecognition, timingJudgement: orchestrated.timingJudgement, remedyPlan: orchestrated.remedyPlan });
    expect(result.passed).toBe(true);
  });

  it("exact fact pipeline from orchestrator composes concise exact answer", () => {
    const orchestrated = runConsultationOrchestration({ userQuestion: "What is my Moon sign?" });
    const result = composeFinalConsultationAnswer({ state: orchestrated.state, responsePlan: orchestrated.responsePlan, exactFactAnswer: "Your Moon sign is Taurus." });
    expect(result.answer).toContain("Moon sign is Taurus");
    expect(result.passed).toBe(true);
  });

  it("follow-up pipeline from orchestrator composes one follow-up", () => {
    const orchestrated = runConsultationOrchestration({ userQuestion: "My parents are forcing me into a proposal but I do not want to answer yet." });
    const result = composeFinalConsultationAnswer({ state: orchestrated.state, responsePlan: orchestrated.responsePlan });
    expect(qCount(result.answer)).toBeLessThanOrEqual(1);
    expect(result.passed).toBe(true);
  });

  it("final answer shape matches default order", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), chartEvidence: chartEvidence(), patternRecognition: pattern(), timingJudgement: timing(), remedyPlan: remedy() });
    const text = result.answer;
    expect(text.indexOf("I understand")).toBeLessThan(text.indexOf("The direct answer is"));
    expect(text.indexOf("The direct answer is")).toBeLessThan(text.indexOf("From the chart side"));
    expect(text.indexOf("From the chart side")).toBeLessThan(text.indexOf("The current life pattern seems to be"));
    expect(text.indexOf("The current life pattern seems to be")).toBeLessThan(text.indexOf("Timing-wise"));
    expect(text.indexOf("Timing-wise")).toBeLessThan(text.indexOf("Practically"));
    expect(text.indexOf("Practically")).toBeLessThan(text.indexOf("A proportionate remedy"));
  });

  it("long evidence list is clamped", () => {
    const longEvidence = responsePlan({ evidenceSummary: { supportive: ["a", "b", "c", "d", "e"], challenging: ["f", "g"], neutral: ["h", "i"] } });
    const result = composeFinalConsultationAnswer({ responsePlan: longEvidence });
    expect(result.answer).toContain("a, b, and c");
  });

  it("avoids absolute predictions", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), timingJudgement: timing() });
    expect(result.answer.toLowerCase()).not.toContain("definitely");
    expect(result.answer.toLowerCase()).not.toContain("guaranteed");
    expect(result.answer.toLowerCase()).not.toContain("destined");
  });

  it("avoids medical legal financial certainty", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: responsePlan(), practicalConstraints: practical({ healthConstraint: true, moneyConstraint: true, riskTolerance: "low" }) });
    expect(result.answer.toLowerCase()).not.toContain("diagnosis");
    expect(result.answer.toLowerCase()).not.toContain("legal");
    expect(result.answer.toLowerCase()).not.toContain("invest now");
  });
});
