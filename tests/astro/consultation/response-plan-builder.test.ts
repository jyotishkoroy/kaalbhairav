/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { buildChartEvidence, type ChartEvidence, type ChartEvidenceFactor } from "../../../lib/astro/consultation/chart-evidence-builder";
import { extractCulturalFamilyContext, type CulturalFamilyContextResult } from "../../../lib/astro/consultation/cultural-context-extractor";
import { detectEmotionalState, type EmotionalStateResult } from "../../../lib/astro/consultation/emotional-state-detector";
import { createEphemeralConsultationMemoryStore } from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import { decideFollowUp, type FollowUpDecision } from "../../../lib/astro/consultation/follow-up-policy";
import { extractLifeContext, type LifeContextExtraction } from "../../../lib/astro/consultation/life-context-extractor";
import { extractPracticalConstraints, type PracticalConstraintResult } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { synthesizePattern } from "../../../lib/astro/consultation/pattern-recognition";
import { judgeTiming, type TimingJudgement } from "../../../lib/astro/consultation/timing-judgement";
import { buildProportionateRemedyPlan, type RemedyPlan } from "../../../lib/astro/consultation/remedy-proportionality";
import {
  buildConsultationResponsePlan,
  type ConsultationResponsePlan,
  type ConsultationResponsePlanInput,
} from "../../../lib/astro/consultation/response-plan-builder";

function chartEvidence(overrides?: Partial<ChartEvidence>): ChartEvidence {
  return {
    domain: "career",
    supportiveFactors: [],
    challengingFactors: [],
    neutralFacts: [],
    birthTimeSensitivity: "low",
    ...overrides,
  };
}

function factor(text: string, source: ChartEvidenceFactor["source"] = "derived_rule", confidence: ChartEvidenceFactor["confidence"] = "medium"): ChartEvidenceFactor {
  return {
    factor: text,
    source,
    confidence,
    interpretationHint: "Synthetic supplied evidence for response plan tests.",
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

function defaultEmotionalState(overrides?: Partial<EmotionalStateResult>): EmotionalStateResult {
  return {
    primaryEmotion: "neutral",
    secondaryEmotions: [],
    intensity: "low",
    toneNeeded: "direct",
    safetyFlags: [],
    ...overrides,
  };
}

function defaultCulturalContext(overrides?: Partial<CulturalFamilyContextResult>): CulturalFamilyContextResult {
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

function defaultFollowUp(overrides?: Partial<FollowUpDecision>): FollowUpDecision {
  return {
    shouldAsk: false,
    answerBeforeQuestion: false,
    resetAfterFinalAnswer: true,
    reason: "no_follow_up_needed",
    ...overrides,
  };
}

function defaultTiming(overrides?: Partial<TimingJudgement>): TimingJudgement {
  return {
    status: "clarifying",
    currentPeriodMeaning: "Synthetic timing context.",
    recommendedAction: "review",
    reasoning: [],
    confidence: "low",
    birthTimeSensitivity: "low",
    ...overrides,
  };
}

function defaultRemedyPlan(overrides?: Partial<RemedyPlan>): RemedyPlan {
  return {
    level: 0,
    levelMeaning: "none",
    remedies: [],
    avoid: [
      "expensive gemstone recommendation",
      "fear-based ritual",
      "large donation beyond means",
      "remedy dependency",
    ],
    ...overrides,
  };
}

function allPlanText(plan: ConsultationResponsePlan): string {
  return JSON.stringify(plan).toLowerCase();
}

function section(plan: ConsultationResponsePlan, id: string) {
  return plan.sections.find((item) => item.id === id);
}

function baseInput(overrides?: Partial<ConsultationResponsePlanInput>): ConsultationResponsePlanInput {
  return {
    state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }),
    ...overrides,
  };
}

describe("buildConsultationResponsePlan", () => {
  it("returns a safe insufficient-context plan for empty input", () => {
    const plan = buildConsultationResponsePlan({});
    expect(plan.mode).toBe("insufficient_context");
    expect(plan.resetAfterFinalAnswer).toBe(true);
    expect(plan.evidenceSummary).toEqual({ supportive: [], challenging: [], neutral: [] });
    expect(plan.safetyGuardrails).toEqual(expect.arrayContaining(["Do not invent chart facts.", "Do not invent timing windows."]));
    expect(section(plan, "safety_note")?.include).toBe(true);
    expect(section(plan, "reset_instruction")?.include).toBe(true);
  });

  it("switches exact-fact state to exact_fact_only", () => {
    const plan = buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }) });
    expect(plan.mode).toBe("exact_fact_only");
    expect(plan.followUp).toBeUndefined();
    expect(section(plan, "direct_answer")?.include).toBe(true);
    expect(section(plan, "pattern_synthesis")?.include).toBe(false);
    expect(section(plan, "remedies")?.include).toBe(false);
    expect(section(plan, "timing")?.include).toBe(false);
  });

  it("builds ask_follow_up mode with copied question", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "Should I say yes to this proposal?" }),
      followUpDecision: defaultFollowUp({
        shouldAsk: true,
        question: "Is your main concern compatibility, timing, family pressure, or your own readiness?",
        reason: "specific_proposal_concern_axis",
      }),
    });
    expect(plan.mode).toBe("ask_follow_up");
    expect(plan.followUp?.question).toBe("Is your main concern compatibility, timing, family pressure, or your own readiness?");
    expect(section(plan, "follow_up")?.include).toBe(true);
    expect(section(plan, "pattern_synthesis")?.include).toBe(false);
    expect(section(plan, "timing")?.include).toBe(false);
    expect(section(plan, "remedies")?.include).toBe(false);
  });

  it("keeps one follow-up and grounding before the question", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "Should I say yes to this proposal?" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "fear", intensity: "high", toneNeeded: "gentle", safetyFlags: ["suggest_professional_support"] }),
      followUpDecision: defaultFollowUp({
        shouldAsk: true,
        answerBeforeQuestion: true,
        question: "Is your main concern compatibility, timing, family pressure, or your own readiness?",
      }),
    });
    expect(section(plan, "acknowledgement")?.include).toBe(true);
    expect(plan.followUp?.answerBeforeQuestion).toBe(true);
    expect(allPlanText(plan).match(/\?/g)?.length).toBe(1);
  });

  it("builds answer-now sections from the supplied layers", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "Should I quit my job and start my own business?" }),
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "job versus business transition decision", decisionType: "business_transition", desiredOutcome: "independent work and stable growth" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high", toneNeeded: "grounding", safetyFlags: ["avoid_fear_language"] }),
      culturalContext: defaultCulturalContext({ familyInvolved: true, parentalPressure: true, decisionAutonomy: "low" }),
      practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, timeConstraint: true, privacyConstraint: true, careerInstability: true, riskTolerance: "low" }),
      chartEvidence: chartEvidence({
        supportiveFactors: [factor("Strong 10th house career indicator", "rashi")],
        challengingFactors: [factor("Saturn delay and career pressure", "transit")],
      }),
      patternRecognition: synthesizePattern({
        chartEvidence: chartEvidence({
          supportiveFactors: [factor("Strong 10th house career indicator", "rashi")],
          challengingFactors: [factor("Saturn delay and career pressure", "transit")],
        }),
        lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "career blockage by manager", decisionType: "business_transition" }),
        emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high" }),
        culturalContext: defaultCulturalContext({ familyInvolved: true }),
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, careerInstability: true }),
      }),
      timingJudgement: defaultTiming({ status: "mixed", recommendedAction: "avoid_impulsive_decision", confidence: "medium", reasoning: ["supplied timing evidence"] }),
      remedyPlan: defaultRemedyPlan({
        level: 2,
        levelMeaning: "light_spiritual",
        remedies: [
          {
            type: "behavioral",
            instruction: "Use a short weekly review.",
            reason: "Keeps the plan grounded.",
            duration: "weekly",
            cost: "free",
            optional: true,
          },
        ],
      }),
    });

    expect(plan.mode).toBe("answer_now");
    expect(section(plan, "acknowledgement")?.include).toBe(true);
    expect(section(plan, "direct_answer")?.include).toBe(true);
    expect(section(plan, "life_context")?.include).toBe(true);
    expect(section(plan, "chart_evidence")?.include).toBe(true);
    expect(section(plan, "pattern_synthesis")?.include).toBe(true);
    expect(section(plan, "timing")?.include).toBe(true);
    expect(section(plan, "practical_guidance")?.include).toBe(true);
    expect(section(plan, "remedies")?.include).toBe(true);
    expect(section(plan, "safety_note")?.include).toBe(true);
    expect(section(plan, "reset_instruction")?.include).toBe(true);
  });

  it("summarizes only supplied chart evidence", () => {
    const plan = buildConsultationResponsePlan({
      chartEvidence: chartEvidence({
        supportiveFactors: [factor("Strong 10th house career indicator", "rashi"), factor("Another supplied factor", "dasha")],
        challengingFactors: [factor("Saturn delay and pressure", "transit")],
        neutralFacts: [{ fact: "Neutral supplied fact", source: "test" }],
      }),
    });
    expect(plan.evidenceSummary.supportive).toEqual(["Strong 10th house career indicator", "Another supplied factor"]);
    expect(plan.evidenceSummary.challenging).toEqual(["Saturn delay and pressure"]);
    expect(plan.evidenceSummary.neutral).toEqual(["Neutral supplied fact"]);
  });

  it("omits chart evidence section when no evidence is supplied", () => {
    const plan = buildConsultationResponsePlan(baseInput());
    expect(section(plan, "chart_evidence")?.include).toBe(false);
  });

  it("keeps pattern synthesis conservative for low confidence", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "Should I quit my job?" }),
      patternRecognition: {
        dominantPattern: "insufficient evidence for a specific consultation pattern",
        likelyLifeExpression: "The available context is too limited to identify a specific repeating pattern without overclaiming.",
        growthDirection: "Use this as a prompt for clearer context rather than a fixed conclusion.",
        confidence: "low",
      },
    });
    expect(section(plan, "pattern_synthesis")?.include).toBe(false);
  });

  it("includes timing only from supplied judgement", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "When is the right time?" }),
      timingJudgement: defaultTiming({
        status: "mixed",
        recommendedAction: "avoid_impulsive_decision",
        confidence: "medium",
        timeWindow: { label: "supplied window", from: "2026-06-01", to: "2026-09-01" },
        reasoning: ["supplied timing evidence"],
      }),
    });
    expect(section(plan, "timing")?.include).toBe(true);
    expect(allPlanText(plan)).toContain("supplied window");
    expect(allPlanText(plan)).not.toContain("next 6");
    expect(allPlanText(plan)).not.toContain("6-9 months");
  });

  it("keeps remedy guidance proportional and optional", () => {
    const plan = buildConsultationResponsePlan({
      remedyPlan: defaultRemedyPlan({
        level: 2,
        levelMeaning: "light_spiritual",
        remedies: [
          {
            type: "spiritual",
            instruction: "Repeat a simple prayer quietly.",
            reason: "Keeps the response grounded.",
            cost: "free",
            optional: true,
          },
        ],
      }),
    });
    expect(section(plan, "remedies")?.include).toBe(true);
    expect(allPlanText(plan)).toContain("optional and supportive only");
    expect(allPlanText(plan)).not.toContain("perform expensive puja");
  });

  it("shapes tone around high anxiety and fear", () => {
    const plan = buildConsultationResponsePlan({
      emotionalState: defaultEmotionalState({ primaryEmotion: "fear", intensity: "high", toneNeeded: "gentle", safetyFlags: ["avoid_fear_language", "avoid_absolute_prediction"] }),
    });
    expect(plan.tone.primary).toBe("gentle");
    expect(plan.tone.avoid).toEqual(expect.arrayContaining(["fear-based language", "absolute prediction", "fatalistic wording"]));
    expect(plan.tone.mustInclude).toEqual(expect.arrayContaining(["grounding acknowledgement before analysis"]));
  });

  it("uses analytical tone and evidence chain when requested", () => {
    const plan = buildConsultationResponsePlan({
      emotionalState: defaultEmotionalState({ primaryEmotion: "confusion", intensity: "medium", toneNeeded: "analytical" }),
      chartEvidence: chartEvidence({ supportiveFactors: [factor("Strong 10th house career indicator", "rashi")] }),
    });
    expect(plan.tone.primary).toBe("analytical");
    expect(plan.tone.mustInclude).toEqual(expect.arrayContaining(["clear evidence chain", "cite supplied chart evidence for every astrology claim"]));
  });

  it("aggregates emotional and practical safety constraints", () => {
    const plan = buildConsultationResponsePlan({
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high", safetyFlags: ["avoid_fear_language", "avoid_absolute_prediction", "avoid_harsh_karma_language", "suggest_professional_support"] }),
      culturalContext: defaultCulturalContext({ familyInvolved: true, parentalPressure: true, decisionAutonomy: "low", familyReputationPressure: true }),
      practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, timeConstraint: true, privacyConstraint: true, healthConstraint: true, riskTolerance: "low" }),
    });
    expect(plan.tone.avoid).toEqual(expect.arrayContaining(["fear-based language", "absolute prediction", "harsh karma language", "replacing professional support"]));
    expect(plan.safetyGuardrails).toEqual(expect.arrayContaining(["Do not invent chart facts.", "Do not give medical, legal, or financial certainty.", "Respect practical constraints."]));
  });

  it("adds cultural and money constraints to tone and practical guidance", () => {
    const plan = buildConsultationResponsePlan({
      culturalContext: defaultCulturalContext({ familyInvolved: true, parentalPressure: true, decisionAutonomy: "low" }),
      practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, timeConstraint: true, privacyConstraint: true }),
    });
    expect(plan.tone.avoid).toEqual(expect.arrayContaining(["simplistic advice to ignore family", "advice that assumes full freedom", "expensive recommendations", "complex daily routines", "visible or public ritual pressure"]));
    expect(plan.tone.mustInclude).toEqual(expect.arrayContaining(["balance personal agency with family reality", "keep guidance affordable", "keep practices discreet"]));
  });

  it("keeps health boundary language in safety guardrails", () => {
    const plan = buildConsultationResponsePlan({
      lifeContext: defaultLifeContext({ lifeArea: "health", currentIssue: "health concern" }),
      practicalConstraints: defaultPracticalConstraints({ healthConstraint: true }),
    });
    expect(plan.safetyGuardrails).toEqual(expect.arrayContaining(["For health concerns, encourage professional support boundaries and avoid medical certainty claims."]));
    expect(plan.tone.avoid).toContain("medical certainty claims");
  });

  it("keeps low-risk guidance away from irreversible instructions", () => {
    const plan = buildConsultationResponsePlan({
      practicalConstraints: defaultPracticalConstraints({ riskTolerance: "low", careerInstability: true }),
    });
    expect(plan.safetyGuardrails).toContain("Do not recommend irreversible action as an instruction.");
    expect(section(plan, "practical_guidance")?.guidance).toEqual(expect.arrayContaining(["Avoid irreversible or impulsive decisions.", "Prefer staged decisions and backup plans."]));
  });

  it("marks birth-time sensitivity for timing and tone", () => {
    const plan = buildConsultationResponsePlan({
      chartEvidence: chartEvidence({ birthTimeSensitivity: "high", supportiveFactors: [factor("D10 career factor", "dasha")] }),
      timingJudgement: defaultTiming({ birthTimeSensitivity: "high", confidence: "medium", reasoning: ["divisional timing supplied"] }),
    });
    expect(plan.tone.mustInclude).toContain("mention birth-time sensitivity when precise timing is used");
    expect(plan.safetyGuardrails).toContain("Mention birth-time sensitivity before precise timing.");
  });

  it("does not invent timing certainty when confidence is low", () => {
    const plan = buildConsultationResponsePlan({
      timingJudgement: defaultTiming({ confidence: "low", status: "clarifying", recommendedAction: "seek_more_information" }),
    });
    expect(plan.tone.avoid).toContain("overstated timing certainty");
    expect(section(plan, "timing")?.include).toBe(false);
  });

  it("deduplicates guardrails and tone avoids", () => {
    const plan = buildConsultationResponsePlan({
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high", safetyFlags: ["avoid_fear_language", "avoid_fear_language", "avoid_absolute_prediction"] }),
      practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, privacyConstraint: true, timeConstraint: true }),
    });
    expect(new Set(plan.safetyGuardrails).size).toBe(plan.safetyGuardrails.length);
    expect(new Set(plan.tone.avoid).size).toBe(plan.tone.avoid.length);
  });

  it("keeps section priorities stable", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "Should I quit my job and start my own business?" }),
      lifeContext: defaultLifeContext({ currentIssue: "career issue" }),
      chartEvidence: chartEvidence({ supportiveFactors: [factor("Strong 10th house career indicator", "rashi")] }),
      timingJudgement: defaultTiming({ confidence: "medium", reasoning: ["supplied"] }),
      remedyPlan: defaultRemedyPlan({ level: 1, remedies: [{ type: "behavioral", instruction: "Keep a short routine.", reason: "Grounded.", cost: "free", optional: true }] }),
    });
    const priorities = plan.sections.map((item) => item.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
    expect(new Set(priorities).size).toBe(priorities.length);
  });

  it("keeps all section ids stable", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "Should I quit my job and start my own business?" }),
      lifeContext: defaultLifeContext({ currentIssue: "career issue" }),
      chartEvidence: chartEvidence({ supportiveFactors: [factor("Strong 10th house career indicator", "rashi")] }),
      timingJudgement: defaultTiming({ confidence: "medium", reasoning: ["supplied"] }),
      remedyPlan: defaultRemedyPlan({ level: 1, remedies: [{ type: "behavioral", instruction: "Keep a short routine.", reason: "Grounded.", cost: "free", optional: true }] }),
    });
    expect(plan.sections.map((item) => item.id)).toEqual([
      "acknowledgement",
      "direct_answer",
      "chart_evidence",
      "life_context",
      "pattern_synthesis",
      "timing",
      "practical_guidance",
      "remedies",
      "follow_up",
      "safety_note",
      "reset_instruction",
    ]);
  });

  it("bypasses stale life context for exact-fact mode", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }),
      lifeContext: defaultLifeContext({ currentIssue: "stale issue", currentSituation: "stale situation" }),
    });
    expect(plan.mode).toBe("exact_fact_only");
    expect(section(plan, "life_context")?.include).toBe(false);
  });

  it("keeps follow-up reset instruction deferred until final answer", () => {
    const plan = buildConsultationResponsePlan({
      followUpDecision: defaultFollowUp({ shouldAsk: true, question: "Is your main concern compatibility, timing, family pressure, or your own readiness?", answerBeforeQuestion: false, resetAfterFinalAnswer: true }),
    });
    expect(plan.resetAfterFinalAnswer).toBe(true);
    expect(section(plan, "reset_instruction")?.guidance.join(" ")).toContain("Do not reset yet; reset after the final answer.");
  });

  it("does not expose final-answer prose fields", () => {
    const plan = buildConsultationResponsePlan({});
    expect(Object.keys(plan)).toEqual(["mode", "tone", "sections", "safetyGuardrails", "evidenceSummary", "resetAfterFinalAnswer"]);
    expect(allPlanText(plan)).not.toContain("paragraph");
    expect(allPlanText(plan)).not.toContain("markdown");
    expect(allPlanText(plan)).not.toContain("message");
  });

  it("stays free of forbidden instruction language", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "Should I say yes to this proposal?" }),
      followUpDecision: defaultFollowUp({ shouldAsk: true, question: "Is your main concern compatibility, timing, family pressure, or your own readiness?" }),
      remedyPlan: defaultRemedyPlan({
        level: 2,
        remedies: [{ type: "behavioral", instruction: "Keep a short weekly review.", reason: "Grounded.", cost: "free", optional: true }],
      }),
    });
    const text = allPlanText(plan);
    expect(text).not.toContain("guarantee");
    expect(text).not.toContain("guaranteed");
    expect(text).not.toContain("definitely");
    expect(text).not.toContain("fixed fate");
    expect(text).not.toContain("curse");
    expect(text).not.toContain("cursed");
    expect(text).not.toContain("death prediction");
    expect(text).not.toContain("cure");
    expect(text).not.toContain("diagnosis");
    expect(text).not.toContain("treatment");
    expect(text).not.toContain("wear blue sapphire");
    expect(text).not.toContain("buy gemstone");
    expect(text).not.toContain("perform expensive puja");
    expect(text).not.toContain("resign now");
    expect(text).not.toContain("quit now");
    expect(text).not.toContain("invest now");
    expect(text).not.toContain("marry now");
    expect(text).not.toContain("divorce now");
  });

  it("preserves phase 2 career transition regression", () => {
    expect(extractLifeContext({ question: "Should I quit my job and start my own business?" }).decisionType).toBe("business_transition");
  });

  it("preserves phase 3 comparison regression", () => {
    expect(detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." }).primaryEmotion).toBe("comparison");
  });

  it("preserves phase 4 family pressure regression", () => {
    const result = extractCulturalFamilyContext({ question: "My parents are forcing me to say yes to this proposal." });
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
  });

  it("preserves phase 5 practical constraints regression", () => {
    const result = extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." });
    expect(result.timeConstraint).toBe(true);
    expect(result.privacyConstraint).toBe(true);
    expect(result.familyConstraint).toBe(true);
  });

  it("preserves phase 6 chart evidence regression", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "tenthHouse", label: "10th house", value: "Strong 10th house career indicator" }],
    });
    expect(result.supportiveFactors.some((item) => item.factor.includes("10th house")) || result.neutralFacts.some((item) => item.fact.includes("10th house"))).toBe(true);
  });

  it("preserves phase 7 pattern regression", () => {
    const result = synthesizePattern({
      chartEvidence: chartEvidence({
        supportiveFactors: [factor("Strong 10th house career indicator", "rashi")],
        challengingFactors: [factor("Saturn pressure and delay", "transit")],
      }),
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "career blockage by manager", currentSituation: "user feels blocked at work" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });
    expect(result.dominantPattern.toLowerCase()).toContain("authority");
    expect(result.dominantPattern.toLowerCase()).not.toContain("guaranteed");
  });

  it("preserves phase 8 follow-up regression", () => {
    const decision = decideFollowUp({
      alreadyAsked: true,
      question: "Should I say yes to this proposal?",
      intentPrimary: "decision_support",
    });
    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("follow_up_already_asked");
  });

  it("preserves phase 9 memory regression", () => {
    const store = createEphemeralConsultationMemoryStore();
    const state = createEmptyConsultationState({ userQuestion: "Should I quit my job and start my own business?" });
    store.begin(state.sessionId, state);
    store.markFinalAnswerReady(state.sessionId);
    store.clear(state.sessionId);
    expect(store.get(state.sessionId).status).toBe("idle");
  });

  it("preserves phase 10 timing regression", () => {
    const result = judgeTiming({
      chartEvidence: chartEvidence({
        supportiveFactors: [factor("Supportive dasha opening for movement", "dasha")],
        challengingFactors: [factor("Saturn pressure and delay", "transit")],
      }),
      timingFacts: [
        { text: "supportive movement and opening", source: "dasha", polarity: "supportive" },
        { text: "pressure and caution with some opening", source: "transit", polarity: "challenging" },
      ],
    });
    expect(["mixed", "delayed"]).toContain(result.status);
    expect(["avoid_impulsive_decision", "wait"]).toContain(result.recommendedAction);
  });

  it("preserves phase 11 remedy regression", () => {
    const plan = buildProportionateRemedyPlan({
      chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure and delay", "transit")] }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high" }),
    });
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.some((item) => item.type === "gemstone_warning")).toBe(false);
  });
});
