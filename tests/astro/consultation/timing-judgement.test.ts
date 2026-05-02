/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildChartEvidence, type ChartEvidenceFactor } from "../../../lib/astro/consultation/chart-evidence-builder";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { detectEmotionalState, type EmotionalStateResult } from "../../../lib/astro/consultation/emotional-state-detector";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { extractLifeContext, type LifeContextExtraction } from "../../../lib/astro/consultation/life-context-extractor";
import { createEphemeralConsultationMemoryStore, createIdleConsultationMemoryState } from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import { decideFollowUp } from "../../../lib/astro/consultation/follow-up-policy";
import { extractPracticalConstraints, type PracticalConstraintResult } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { synthesizePattern } from "../../../lib/astro/consultation/pattern-recognition";
import { judgeTiming, type TimingJudgement, type TimingJudgementInput, type TimingFact } from "../../../lib/astro/consultation/timing-judgement";

function chartEvidence(overrides?: Partial<ReturnType<typeof buildChartEvidence>>): ReturnType<typeof buildChartEvidence> {
  return {
    domain: "career",
    supportiveFactors: [],
    challengingFactors: [],
    neutralFacts: [],
    birthTimeSensitivity: "low",
    ...overrides,
  };
}

function factor(
  factorText: string,
  source: ChartEvidenceFactor["source"] = "dasha",
  confidence: ChartEvidenceFactor["confidence"] = "medium",
): ChartEvidenceFactor {
  return {
    factor: factorText,
    source,
    confidence,
    interpretationHint: "Synthetic supplied evidence for timing judgement tests.",
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

function timingInput(overrides?: Partial<TimingJudgementInput>): TimingJudgementInput {
  return {
    chartEvidence: chartEvidence(),
    ...overrides,
  };
}

function allGeneratedText(result: TimingJudgement): string {
  return [
    result.status,
    result.currentPeriodMeaning,
    result.recommendedAction,
    result.timeWindow?.label,
    result.timeWindow?.from,
    result.timeWindow?.to,
    ...result.reasoning,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

describe("judgeTiming", () => {
  it("returns a clarifying low-confidence default for empty input", () => {
    const result = judgeTiming({ chartEvidence: chartEvidence() });
    expect(result.status).toBe("clarifying");
    expect(result.recommendedAction).toBe("seek_more_information");
    expect(result.confidence).toBe("low");
    expect(result.birthTimeSensitivity).toBe("low");
    expect(result.timeWindow).toBeUndefined();
    expect(result.reasoning.join(" ")).toContain("No supplied dasha, transit, or timing evidence was available.");
  });

  it("permits proceed for supportive timing evidence", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [
            factor("Dasha opening for career movement", "dasha"),
            factor("Transit support for action and progress", "transit"),
          ],
        }),
        lifeContext: defaultLifeContext({ lifeArea: "career", decisionType: "job_switch_or_stay" }),
        emotionalState: defaultEmotionalState({ primaryEmotion: "hope", intensity: "low" }),
        practicalConstraints: defaultPracticalConstraints({ riskTolerance: "high" }),
        timingFacts: [
          { label: "supportive period", source: "dasha", polarity: "supportive", text: "supportive movement and opportunity" },
          { label: "jupiter support", source: "transit", polarity: "supportive", text: "active support and opening" },
        ],
      }),
    );
    expect(result.status).toBe("supportive");
    expect(result.recommendedAction).toBe("proceed");
    expect(["medium", "high"]).toContain(result.confidence);
    expect(JSON.stringify(result).toLowerCase()).not.toContain("guarantee");
  });

  it("does not proceed when supportive evidence meets high anxiety", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [factor("Supportive dasha opening", "dasha")],
        }),
        emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high" }),
      }),
    );
    expect(result.status).toBe("supportive");
    expect(result.recommendedAction).not.toBe("proceed");
    expect(result.currentPeriodMeaning).toContain("supportive");
  });

  it("classifies mixed supportive and challenging timing evidence", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [factor("Benefic support for progress", "dasha")],
          challengingFactors: [factor("Saturn pressure and caution", "transit")],
        }),
      }),
    );
    expect(result.status).toBe("mixed");
    expect(result.recommendedAction).toBe("avoid_impulsive_decision");
    expect(result.currentPeriodMeaning).toContain("mixed");
  });

  it("classifies heavy Saturn-like timing", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [
          { text: "Saturn responsibility, delay, structure, patience", source: "transit", polarity: "challenging" },
          { text: "heavy duty and slow maturation", source: "dasha", polarity: "challenging" },
        ],
      }),
    );
    expect(result.status).toBe("heavy");
    expect(["prepare", "review"]).toContain(result.recommendedAction);
    expect(result.currentPeriodMeaning).toContain("responsibility");
  });

  it("classifies unstable volatile timing", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [
          { text: "Rahu volatile sudden disruption and reversal", source: "transit", polarity: "challenging" },
          { text: "Mars pressure and risky erratic movement", source: "dasha", polarity: "challenging" },
        ],
      }),
    );
    expect(result.status).toBe("unstable");
    expect(result.recommendedAction).toBe("avoid_impulsive_decision");
    expect(result.currentPeriodMeaning.toLowerCase()).not.toContain("will happen");
  });

  it("classifies a clarifying period", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [{ text: "truth review sorting evaluation conversation", source: "context", polarity: "neutral" }],
      }),
    );
    expect(result.status).toBe("clarifying");
    expect(["review", "seek_more_information"]).toContain(result.recommendedAction);
    expect(result.currentPeriodMeaning).toContain("clarification");
  });

  it("classifies a delayed period", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [
          { text: "delayed slow maturation not immediate", source: "dasha", polarity: "challenging" },
          { text: "waiting and gradual movement", source: "transit", polarity: "neutral" },
        ],
      }),
    );
    expect(result.status).toBe("delayed");
    expect(["wait", "prepare"]).toContain(result.recommendedAction);
  });

  it("classifies a preparatory period", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [
          { text: "prepare groundwork build foundation backup plan", source: "context", polarity: "neutral" },
          { text: "skill-building and documentation", source: "context", polarity: "neutral" },
        ],
      }),
    );
    expect(result.status).toBe("preparatory");
    expect(result.recommendedAction).toBe("prepare");
  });

  it("becomes cautious for business transition with constraints", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [factor("Supportive opening for business movement", "dasha")],
        }),
        lifeContext: defaultLifeContext({ lifeArea: "career", decisionType: "business_transition" }),
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, riskTolerance: "low" }),
      }),
    );
    expect(result.recommendedAction).not.toBe("proceed");
    expect(["prepare", "avoid_impulsive_decision"]).toContain(result.recommendedAction);
  });

  it("avoids impulsive decisions for job switching with career instability", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [factor("Supportive dasha opening", "dasha")],
          challengingFactors: [factor("Saturn pressure", "transit")],
        }),
        lifeContext: defaultLifeContext({ lifeArea: "career", decisionType: "job_switch_or_stay" }),
        practicalConstraints: defaultPracticalConstraints({ careerInstability: true }),
      }),
    );
    expect(result.recommendedAction).toBe("avoid_impulsive_decision");
  });

  it("keeps marriage timing cautious under family pressure and anxiety", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [factor("Marriage support", "dasha")],
          challengingFactors: [factor("Pressure and delay around commitment", "transit")],
        }),
        lifeContext: defaultLifeContext({ lifeArea: "marriage", decisionType: "marriage_timing" }),
        emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high" }),
      }),
    );
    expect(result.status).not.toBe("supportive");
    expect(result.recommendedAction).not.toBe("proceed");
  });

  it("does not produce marry or divorce instructions for a specific proposal decision", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [factor("Proposal opening", "dasha")],
          challengingFactors: [factor("Saturn delay on commitment", "transit")],
        }),
        lifeContext: defaultLifeContext({ lifeArea: "marriage", decisionType: "specific_proposal_decision" }),
      }),
    );
    expect(allGeneratedText(result)).not.toContain("marry now");
    expect(allGeneratedText(result)).not.toContain("divorce");
    expect(allGeneratedText(result)).not.toContain("will marry");
  });

  it("never proceeds for health timing questions", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          domain: "health",
          supportiveFactors: [factor("Supportive transit", "transit")],
        }),
        lifeContext: defaultLifeContext({ lifeArea: "health", decisionType: "health_reflection" }),
      }),
    );
    expect(result.recommendedAction).not.toBe("proceed");
    expect(["seek_more_information", "review"]).toContain(result.recommendedAction);
    expect(allGeneratedText(result)).not.toContain("diagnosis");
    expect(allGeneratedText(result)).not.toContain("treatment");
  });

  it("does not recommend invest now for money risk questions", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [factor("Supportive gains", "dasha")],
        }),
        lifeContext: defaultLifeContext({ lifeArea: "money", decisionType: "financial_stability_guidance" }),
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, riskTolerance: "low" }),
      }),
    );
    expect(result.recommendedAction).not.toBe("proceed");
    expect(allGeneratedText(result)).not.toContain("invest now");
  });

  it("uses supplied ISO dates for the time window", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [{ label: "supplied Jupiter dasha window", from: "2026-01-01", to: "2026-12-31", source: "dasha" }],
      }),
    );
    expect(result.timeWindow?.from).toBe("2026-01-01");
    expect(result.timeWindow?.to).toBe("2026-12-31");
    expect(result.timeWindow?.label).toBe("supplied Jupiter dasha window");
  });

  it("does not emit invalid dates", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [{ label: "supplied timing context", from: "soon", to: "later", source: "dasha" }],
      }),
    );
    expect(result.timeWindow?.from).toBeUndefined();
    expect(result.timeWindow?.to).toBeUndefined();
  });

  it("allows a label-only supplied window", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [{ label: "next 6-9 months", source: "dasha" }],
      }),
    );
    expect(result.timeWindow?.label).toBe("next 6-9 months");
    expect(result.timeWindow?.from).toBeUndefined();
    expect(result.timeWindow?.to).toBeUndefined();
  });

  it("does not invent a next 6-9 months window", () => {
    const result = judgeTiming({ chartEvidence: chartEvidence(), timingFacts: [] });
    expect(JSON.stringify(result).toLowerCase()).not.toContain("next 6-9 months");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("next 6");
  });

  it("raises birth-time sensitivity from chart evidence", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          birthTimeSensitivity: "high",
          supportiveFactors: [factor("Supportive dasha opening", "dasha")],
        }),
      }),
    );
    expect(result.birthTimeSensitivity).toBe("high");
    expect(result.confidence).not.toBe("high");
  });

  it("raises birth-time sensitivity from pratyantardasha text", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [{ text: "pratyantardasha timing factor", source: "dasha", polarity: "neutral" }],
      }),
    );
    expect(result.birthTimeSensitivity).toBe("high");
  });

  it("raises birth-time sensitivity from degree or divisional timing", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [{ text: "D10 exact degree and cusp timing detail", source: "dasha", polarity: "neutral" }],
      }),
    );
    expect(result.birthTimeSensitivity).toBe("high");
  });

  it("returns high confidence only for strong clear evidence and low sensitivity", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [
            factor("Supportive movement and opening", "dasha"),
            factor("Benefic support for progress", "transit"),
          ],
        }),
        timingFacts: [
          { text: "supportive opportunity and progress", source: "dasha", polarity: "supportive" },
          { text: "active support and opening", source: "transit", polarity: "supportive" },
          { text: "growth and movement", source: "context", polarity: "supportive" },
        ],
      }),
    );
    expect(result.confidence).toBe("high");
  });

  it("returns low confidence when no timing evidence is present", () => {
    const result = judgeTiming({ chartEvidence: chartEvidence() });
    expect(result.confidence).toBe("low");
  });

  it("uses chart evidence dasha and transit factors as timing facts", () => {
    const result = judgeTiming(
      timingInput({
        chartEvidence: chartEvidence({
          supportiveFactors: [factor("Dasha window for action", "dasha"), factor("Transit opening for movement", "transit")],
        }),
      }),
    );
    expect(result.status).not.toBe("clarifying");
  });

  it("does not treat plain 10th-house evidence as timing", () => {
    const evidence = chartEvidence({
      supportiveFactors: [factor("10th house career fact", "rashi")],
    });
    const result = judgeTiming({ chartEvidence: evidence });
    expect(result.status).toBe("clarifying");
  });

  it("does not emit remedy output", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [{ text: "supportive movement and action", source: "dasha", polarity: "supportive" }],
      }),
    );
    const text = JSON.stringify(result).toLowerCase();
    expect(text).not.toContain("remedy");
    expect(text).not.toContain("puja");
    expect(text).not.toContain("mantra");
    expect(text).not.toContain("gemstone");
    expect(text).not.toContain("donation");
    expect(text).not.toContain("fast");
  });

  it("does not use deterministic prediction language", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [{ text: "supportive movement with caution", source: "dasha", polarity: "supportive" }],
      }),
    );
    const text = JSON.stringify(result).toLowerCase();
    expect(text).not.toContain("guarantee");
    expect(text).not.toContain("guaranteed");
    expect(text).not.toContain("definitely");
    expect(text).not.toContain("certain");
    expect(text).not.toContain("will happen");
    expect(text).not.toContain("will never");
    expect(text).not.toContain("destined");
    expect(text).not.toContain("fixed fate");
  });

  it("avoids medical, legal, and financial certainty language", () => {
    const result = judgeTiming(
      timingInput({
        lifeContext: defaultLifeContext({ lifeArea: "health", decisionType: "health_reflection" }),
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, riskTolerance: "low" }),
      }),
    );
    const text = JSON.stringify(result).toLowerCase();
    expect(text).not.toContain("diagnosis");
    expect(text).not.toContain("cure");
    expect(text).not.toContain("treatment");
    expect(text).not.toContain("invest now");
    expect(text).not.toContain("resign now");
    expect(text).not.toContain("quit now");
  });

  it("handles malformed timing facts without throwing", () => {
    const result = judgeTiming(
      timingInput({
        timingFacts: [
          { label: "", text: "", source: "dasha", polarity: "neutral" },
          { label: " ", from: "bad-date", to: "also-bad", source: "transit", polarity: "challenging" },
        ] as TimingFact[],
      }),
    );
    expect(result).toBeDefined();
  });

  it("keeps the phase 2 career transition regression intact", () => {
    expect(extractLifeContext({ question: "Should I quit my job and start my own business?" }).decisionType).toBe("business_transition");
  });

  it("keeps the phase 3 emotional comparison regression intact", () => {
    expect(detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." }).primaryEmotion).toBe("comparison");
  });

  it("keeps the phase 4 cultural family pressure regression intact", () => {
    const result = extractCulturalFamilyContext({ question: "My parents are forcing me to say yes to this proposal." });
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
  });

  it("keeps the phase 5 practical constraints regression intact", () => {
    const result = extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." });
    expect(result.timeConstraint).toBe(true);
    expect(result.privacyConstraint).toBe(true);
    expect(result.familyConstraint).toBe(true);
  });

  it("keeps the phase 6 chart evidence regression intact", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "tenthHouse", label: "10th house", value: "Career" }],
    });
    expect(result.supportiveFactors.length + result.challengingFactors.length + result.neutralFacts.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).toContain("10th house");
  });

  it("keeps the phase 7 synthesis regression intact", () => {
    const result = synthesizePattern({
      chartEvidence: buildChartEvidence({
        domain: "career",
        chart: [
          { key: "tenthHouse", label: "10th house", value: "Career growth support" },
          { key: "saturnPressure", label: "Saturn", value: "Saturn pressure on 10th house" },
        ],
      }),
      lifeContext: {
        lifeArea: "career",
        currentIssue: "career blockage by manager",
        extractedFacts: [],
        missingCriticalContext: [],
      },
      emotionalState: detectEmotionalState({ question: "I feel stuck at work." }),
      culturalContext: extractCulturalFamilyContext({ question: "My parents are supportive." }),
      practicalConstraints: extractPracticalConstraints({ question: "I have a stable job and some savings." }),
    });
    expect(result.dominantPattern.toLowerCase()).toContain("career");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("guarantee");
  });

  it("keeps the phase 8 follow-up policy regression intact", () => {
    const decision = decideFollowUp({
      alreadyAsked: true,
      question: "Should I say yes to this proposal?",
    });
    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("follow_up_already_asked");
  });

  it("keeps the phase 9 memory regression intact", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", createEmptyConsultationState({ userQuestion: "My parents are pressuring me for marriage." }));
    store.markFinalAnswerReady("s1");
    expect(store.clear("s1")).toEqual(createIdleConsultationMemoryState());
  });

  it("keeps exact-fact state bypass unaffected", () => {
    const state = createEmptyConsultationState({ userQuestion: "What is my Lagna?" });
    expect(state.intent.primary).toBe("exact_fact");
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.practicalConstraints).toEqual({});
    expect(state.followUp.allowed).toBe(false);
  });

  it("does not leak private content into the timing module surface", () => {
    const text = JSON.stringify({ file: "tests/astro/consultation/timing-judgement.test.ts" }).toLowerCase();
    expect(text).not.toContain("myvedicreport");
    expect(text).not.toContain("astro_package");
    expect(text).not.toContain("jyotishko");
    expect(text).not.toContain("birth time");
    expect(text).not.toContain("birth place");
    expect(text).not.toContain(".env");
    expect(text).not.toContain("token");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("api key");
  });
});
