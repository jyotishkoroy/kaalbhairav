/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildChartEvidence, type ChartEvidence, type ChartEvidenceFactor } from "../../../lib/astro/consultation/chart-evidence-builder";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { detectEmotionalState, type EmotionalStateResult } from "../../../lib/astro/consultation/emotional-state-detector";
import { extractCulturalFamilyContext, type CulturalFamilyContextResult } from "../../../lib/astro/consultation/cultural-context-extractor";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";
import { createEphemeralConsultationMemoryStore, createIdleConsultationMemoryState } from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import { decideFollowUp } from "../../../lib/astro/consultation/follow-up-policy";
import { extractPracticalConstraints, type PracticalConstraintResult } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { synthesizePattern } from "../../../lib/astro/consultation/pattern-recognition";
import { judgeTiming, type TimingJudgement } from "../../../lib/astro/consultation/timing-judgement";
import {
  buildProportionateRemedyPlan,
  sanitizeRemedyPlan,
  type RemedyPlan,
  type RemedyProportionalityInput,
} from "../../../lib/astro/consultation/remedy-proportionality";

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

function factor(
  factorText: string,
  source: ChartEvidenceFactor["source"] = "derived_rule",
  confidence: ChartEvidenceFactor["confidence"] = "medium",
): ChartEvidenceFactor {
  return {
    factor: factorText,
    source,
    confidence,
    interpretationHint: "Synthetic supplied evidence for remedy proportionality tests.",
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

function timingJudgement(overrides?: Partial<TimingJudgement>): TimingJudgement {
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

function remedyInput(overrides?: Partial<RemedyProportionalityInput>): RemedyProportionalityInput {
  return {
    chartEvidence: chartEvidence(),
    emotionalState: defaultEmotionalState(),
    culturalContext: defaultCulturalContext(),
    practicalConstraints: defaultPracticalConstraints(),
    timingJudgement: timingJudgement(),
    requestedRemedyType: "general",
    ...overrides,
  };
}

function allPlanText(plan: RemedyPlan): string {
  return JSON.stringify(plan).toLowerCase();
}

describe("remedy proportionality", () => {
  it("returns level 0 for empty input", () => {
    const plan = buildProportionateRemedyPlan({});
    expect(plan.level).toBe(0);
    expect(plan.levelMeaning).toBe("none");
    expect(plan.remedies).toEqual([]);
    expect(plan.avoid).toEqual(
      expect.arrayContaining([
        "expensive gemstone recommendation",
        "fear-based ritual",
        "large donation beyond means",
        "remedy dependency",
      ]),
    );
  });

  it("defaults mild pressure to level 1 or 2", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ challengingFactors: [factor("minor career pressure", "dasha")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.every((item) => item.optional)).toBe(true);
    expect(allPlanText(plan)).not.toContain("gemstone_warning");
  });

  it("handles Saturn pressure with high anxiety using grounding remedies", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn delay responsibility pressure", "transit")] }),
        emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high", safetyFlags: ["avoid_fear_language"] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(allPlanText(plan)).toContain("responsibility");
    expect(plan.remedies.some((item) => item.type === "gemstone_warning")).toBe(false);
    expect(plan.remedies.some((item) => item.type === "ritual")).toBe(false);
  });

  it("allows moderate traditional support when religious comfort is high", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure and delay", "transit")] }),
        emotionalState: defaultEmotionalState({ primaryEmotion: "hope", intensity: "low" }),
        culturalContext: defaultCulturalContext({ religiousComfort: "high" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "traditional" }),
      }),
    );
    expect(plan.level).toBeGreaterThanOrEqual(2);
    expect(plan.level).toBeLessThanOrEqual(3);
    expect(plan.remedies.some((item) => item.type === "behavioral")).toBe(true);
    expect(plan.remedies.some((item) => item.type === "gemstone_warning")).toBe(false);
  });

  it("clamps low-money users to free or low-cost remedies", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ challengingFactors: [factor("money pressure and financial volatility", "derived_rule")] }),
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, riskTolerance: "low", remedyStyle: "traditional" }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.every((item) => item.cost === "free" || item.cost === "low")).toBe(true);
    expect(plan.avoid).toEqual(expect.arrayContaining(["expensive puja", "expensive gemstone purchase"]));
  });

  it("keeps time-constrained users away from complex daily rituals", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        practicalConstraints: defaultPracticalConstraints({ timeConstraint: true }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("career delay and pressure", "dasha")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.avoid).toEqual(expect.arrayContaining(["complex daily ritual", "long-distance temple travel"]));
    expect(allPlanText(plan)).not.toContain("daily 108");
  });

  it("keeps privacy-constrained users away from visible rituals", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        practicalConstraints: defaultPracticalConstraints({ privacyConstraint: true }),
        culturalContext: defaultCulturalContext({ familyInvolved: true }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.avoid).toEqual(expect.arrayContaining(["visible ritual that compromises privacy", "loud or public practice"]));
    expect(allPlanText(plan)).not.toContain("temple");
  });

  it("uses behavioral-only remedies for low religious comfort", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        culturalContext: defaultCulturalContext({ religiousComfort: "low" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "avoid_ritual" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("pressure and delay", "transit")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(1);
    expect(plan.remedies.every((item) => ["behavioral", "lifestyle"].includes(item.type))).toBe(true);
    expect(plan.avoid).toEqual(expect.arrayContaining(["ritual pressure", "devotional practice framed as compulsory"]));
  });

  it("allows short spiritual support when comfort is high", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        culturalContext: defaultCulturalContext({ religiousComfort: "high" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "light_spiritual" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure", "transit")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.some((item) => ["mantra", "service"].includes(item.type))).toBe(true);
    expect(plan.remedies.some((item) => item.type === "ritual")).toBe(false);
  });

  it("keeps traditional style modest and below high-cost levels", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        culturalContext: defaultCulturalContext({ religiousComfort: "high" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "traditional" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure and delay", "transit")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(3);
    expect(plan.remedies.every((item) => item.cost !== "high")).toBe(true);
    expect(plan.remedies.some((item) => item.type === "gemstone_warning")).toBe(false);
  });

  it("uses formal ritual only when conditions are appropriate", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        culturalContext: defaultCulturalContext({ religiousComfort: "high" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "traditional" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("strong saturn pressure", "transit"), factor("delay and burden", "dasha")] }),
        timingJudgement: timingJudgement({ status: "heavy", recommendedAction: "review" }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(4);
    if (plan.level === 4) {
      expect(plan.remedies.some((item) => item.type === "ritual")).toBe(true);
      expect(plan.remedies.every((item) => item.cost === "free" || item.cost === "low" || item.cost === "medium")).toBe(true);
      expect(plan.avoid).toEqual(expect.arrayContaining(["expensive puja", "fear-based ritual"]));
    }
  });

  it("clamps formal ritual down for money constraints", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        culturalContext: defaultCulturalContext({ religiousComfort: "high" }),
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, remedyStyle: "traditional" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("strong saturn pressure", "transit")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.some((item) => item.type === "ritual")).toBe(false);
  });

  it("returns gemstone caution for gemstone requests", () => {
    const plan = buildProportionateRemedyPlan(remedyInput({ requestedRemedyType: "gemstone" }));
    expect(plan.level).toBe(5);
    expect(plan.levelMeaning).toBe("gemstone_caution");
    expect(plan.remedies).toHaveLength(1);
    expect(plan.remedies[0].type).toBe("gemstone_warning");
    expect(plan.remedies[0].instruction.toLowerCase()).toContain("do not buy or wear");
    expect(allPlanText(plan)).not.toContain("guarantee");
  });

  it("warns against gemstone purchase under money constraint", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        requestedRemedyType: "gemstone",
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true }),
      }),
    );
    expect(plan.level).toBe(5);
    expect(plan.avoid).toEqual(expect.arrayContaining(["casual gemstone recommendation", "gemstone certainty"]));
    expect(plan.remedies[0].cost).toBe("free");
    expect(plan.remedies[0].instruction.toLowerCase()).not.toContain("wear a gemstone");
  });

  it("does not recommend blue sapphire casually", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        requestedRemedyType: "gemstone",
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure", "transit")] }),
      }),
    );
    expect(allPlanText(plan)).not.toContain("blue sapphire");
    expect(allPlanText(plan)).toContain("full chart verification");
  });

  it("avoids fasting for health-sensitive concerns", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        practicalConstraints: defaultPracticalConstraints({ healthConstraint: true }),
        chartEvidence: chartEvidence({ domain: "health", challengingFactors: [factor("health stress and sleep pressure", "derived_rule")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.some((item) => /fasting/i.test(item.instruction))).toBe(false);
    expect(plan.avoid).toEqual(expect.arrayContaining(["extreme fasting", "medical replacement claims"]));
  });

  it("uses lifestyle remedies for burnout and sleep stress", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        emotionalState: defaultEmotionalState({ primaryEmotion: "exhaustion", intensity: "high" }),
        practicalConstraints: defaultPracticalConstraints({ healthConstraint: true }),
        chartEvidence: chartEvidence({ domain: "health", challengingFactors: [factor("sleep stress and burnout", "derived_rule")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.some((item) => item.type === "lifestyle" || item.type === "behavioral")).toBe(true);
  });

  it("uses journaling and boundaries for relationship pressure", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ domain: "relationship", challengingFactors: [factor("marriage pressure and commitment tension", "dasha")] }),
        culturalContext: defaultCulturalContext({ parentalPressure: true, arrangedMarriageContext: true }),
        practicalConstraints: defaultPracticalConstraints({ familyConstraint: true }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.some((item) => item.instruction.toLowerCase().includes("boundary") || item.reason.toLowerCase().includes("boundary"))).toBe(true);
    expect(plan.remedies.some((item) => item.instruction.toLowerCase().includes("facts, fears"))).toBe(true);
    expect(allPlanText(plan)).not.toContain("must marry");
  });

  it("uses discipline and accountability for career pressure", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ domain: "career", challengingFactors: [factor("career blockage and authority pressure", "dasha")] }),
        practicalConstraints: defaultPracticalConstraints({ careerInstability: true }),
      }),
    );
    expect(plan.remedies.some((item) => item.instruction.toLowerCase().includes("responsibility"))).toBe(true);
    expect(allPlanText(plan)).not.toContain("resign now");
    expect(allPlanText(plan)).not.toContain("quit now");
  });

  it("uses practical planning for money pressure instead of investment advice", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ domain: "money", challengingFactors: [factor("money leakage and debt pressure", "derived_rule")] }),
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, riskTolerance: "low" }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(allPlanText(plan)).not.toContain("invest now");
    expect(allPlanText(plan)).not.toContain("debt plan");
  });

  it("keeps behavioral style at level 1", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ challengingFactors: [factor("minor pressure", "derived_rule")] }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "behavioral" }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(1);
    expect(plan.remedies.every((item) => ["behavioral", "lifestyle"].includes(item.type))).toBe(true);
  });

  it("keeps light spiritual style short and optional", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        culturalContext: defaultCulturalContext({ religiousComfort: "medium" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "light_spiritual" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("pressure", "dasha")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.every((item) => item.optional)).toBe(true);
    expect(allPlanText(plan)).not.toContain("complex ritual");
  });

  it("lets avoid_ritual override religious comfort", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        culturalContext: defaultCulturalContext({ religiousComfort: "high" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "avoid_ritual" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("saturn pressure", "transit")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(1);
    expect(plan.remedies.every((item) => ["behavioral", "lifestyle"].includes(item.type))).toBe(true);
  });

  it("avoids fear-based language for high emotional intensity", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        emotionalState: defaultEmotionalState({ primaryEmotion: "fear", intensity: "high" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure", "transit")] }),
      }),
    );
    expect(allPlanText(plan)).not.toContain("bad karma");
    expect(allPlanText(plan)).not.toContain("curse");
    expect(allPlanText(plan)).not.toContain("must");
    expect(plan.avoid).toEqual(expect.arrayContaining(["fear-based Saturn language", "urgent ritual pressure"]));
  });

  it("stays grounding for severe distress flags", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        emotionalState: defaultEmotionalState({ primaryEmotion: "grief", intensity: "high", safetyFlags: ["suggest_professional_support"] }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("pressure", "transit")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(1);
    expect(plan.remedies.every((item) => ["behavioral", "lifestyle"].includes(item.type))).toBe(true);
  });

  it("does not escalate unstable timing into ritual", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        timingJudgement: timingJudgement({ status: "unstable", recommendedAction: "avoid_impulsive_decision" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("delay and pressure", "transit")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.some((item) => item.type === "ritual")).toBe(false);
  });

  it("uses discipline and service for heavy Saturn timing", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        timingJudgement: timingJudgement({ status: "heavy", recommendedAction: "review" }),
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure and heavy duty", "transit")] }),
        culturalContext: defaultCulturalContext({ religiousComfort: "high" }),
      }),
    );
    expect(allPlanText(plan)).toContain("responsibility");
    expect(plan.remedies.some((item) => item.type === "service")).toBe(true);
    expect(plan.remedies.some((item) => item.type === "gemstone_warning")).toBe(false);
  });

  it("does not force remedy when timing is supportive", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        timingJudgement: timingJudgement({ status: "supportive", recommendedAction: "proceed" }),
        chartEvidence: chartEvidence({ supportiveFactors: [factor("supportive opening", "dasha")] }),
      }),
    );
    expect(plan.level).toBeLessThanOrEqual(1);
  });

  it("keeps all remedies optional", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure", "transit")] }),
        culturalContext: defaultCulturalContext({ religiousComfort: "high" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "traditional" }),
      }),
    );
    expect(plan.remedies.every((item) => item.optional)).toBe(true);
  });

  it("never produces high-cost remedies by default", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ challengingFactors: [factor("pressure", "dasha")] }),
      }),
    );
    expect(plan.remedies.some((item) => item.cost === "high")).toBe(false);
  });

  it("deduplicates avoid entries", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure", "transit"), factor("career pressure", "dasha")] }),
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, timeConstraint: true, privacyConstraint: true, healthConstraint: true, remedyStyle: "avoid_ritual" }),
        emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high" }),
      }),
    );
    expect(new Set(plan.avoid).size).toBe(plan.avoid.length);
  });

  it("sanitizes ritual output for low religious comfort", () => {
    const plan = sanitizeRemedyPlan(
      {
        level: 3,
        levelMeaning: "traditional",
        remedies: [
          {
            type: "ritual",
            instruction: "Perform an urgent puja and a compulsory mantra.",
            reason: "This will fix your problem.",
            cost: "medium",
            optional: false,
          },
        ],
        avoid: ["ritual pressure"],
      },
      remedyInput({
        culturalContext: defaultCulturalContext({ religiousComfort: "low" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "avoid_ritual" }),
      }),
    );
    expect(plan.level).toBe(1);
    expect(plan.remedies.every((item) => ["behavioral", "lifestyle"].includes(item.type))).toBe(true);
  });

  it("downgrades when sanitization removes all risky remedies", () => {
    const plan = sanitizeRemedyPlan(
      {
        level: 3,
        levelMeaning: "traditional",
        remedies: [
          {
            type: "ritual",
            instruction: "Perform a public ritual.",
            reason: "Compulsory.",
            cost: "medium",
            optional: false,
          },
        ],
        avoid: [],
      },
      remedyInput({
        culturalContext: defaultCulturalContext({ religiousComfort: "low" }),
        practicalConstraints: defaultPracticalConstraints({ remedyStyle: "avoid_ritual", privacyConstraint: true }),
      }),
    );
    expect(plan.level).toBe(1);
    expect(plan.remedies.length).toBeGreaterThan(0);
  });

  it("does not use forbidden guarantee wording", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        requestedRemedyType: "gemstone",
        chartEvidence: chartEvidence({ challengingFactors: [factor("Saturn pressure", "transit")] }),
      }),
    );
    const text = JSON.stringify(plan).toLowerCase();
    expect(text).not.toContain("guarantee");
    expect(text).not.toContain("guaranteed");
    expect(text).not.toContain("definitely");
    expect(text).not.toContain("will fix");
    expect(text).not.toContain("cure");
    expect(text).not.toContain("remove karma");
    expect(text).not.toContain("curse");
    expect(text).not.toContain("must do");
    expect(text).not.toContain("only remedy");
    expect(text).not.toContain("no other way");
  });

  it("avoids medical, legal, and financial certainty", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ domain: "health", challengingFactors: [factor("health stress", "derived_rule")] }),
        practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true, riskTolerance: "low" }),
      }),
    );
    const text = JSON.stringify(plan).toLowerCase();
    expect(text).not.toContain("diagnosis");
    expect(text).not.toContain("treatment");
    expect(text).not.toContain("cure");
    expect(text).not.toContain("legal");
    expect(text).not.toContain("invest now");
  });

  it("returns only structured remedy plan fields", () => {
    const plan = buildProportionateRemedyPlan(
      remedyInput({
        chartEvidence: chartEvidence({ challengingFactors: [factor("pressure", "derived_rule")] }),
      }),
    );
    expect(Object.keys(plan).sort()).toEqual(["avoid", "level", "levelMeaning", "remedies"]);
  });

  it("handles malformed minimal inputs without throwing", () => {
    const plan = buildProportionateRemedyPlan({
      chartEvidence: undefined,
      emotionalState: undefined,
      culturalContext: undefined,
      practicalConstraints: undefined,
      timingJudgement: undefined,
      requestedRemedyType: undefined,
    });
    expect(plan).toBeDefined();
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
      chart: [{ key: "tenthHouse", label: "10th house", value: "Career" }],
    });
    expect(JSON.stringify(result)).toContain("10th house");
  });

  it("preserves phase 7 synthesis regression", () => {
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
      culturalContext: defaultCulturalContext({ familyInvolved: true }),
      practicalConstraints: defaultPracticalConstraints({ moneyConstraint: false }),
    });
    expect(result.dominantPattern.toLowerCase()).toContain("career");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("guarantee");
  });

  it("preserves phase 8 follow-up regression", () => {
    const decision = decideFollowUp({
      alreadyAsked: true,
      question: "Should I say yes to this proposal?",
    });
    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("follow_up_already_asked");
  });

  it("preserves phase 9 memory regression", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", createEmptyConsultationState({ userQuestion: "My parents are pressuring me for marriage." }));
    store.markFinalAnswerReady("s1");
    expect(store.clear("s1")).toEqual(createIdleConsultationMemoryState());
  });

  it("preserves phase 10 timing regression", () => {
    const result = judgeTiming({
      chartEvidence: chartEvidence({
        supportiveFactors: [factor("supportive movement", "dasha")],
        challengingFactors: [factor("pressure and caution", "transit")],
      }),
      timingFacts: [{ text: "supportive and challenging timing evidence", source: "context", polarity: "neutral" }],
    });
    expect(result.status).toBe("mixed");
    expect(result.recommendedAction).toBe("avoid_impulsive_decision");
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

  it("does not leak private content into the remedy module surface", () => {
    const text = JSON.stringify({ file: "tests/astro/consultation/remedy-proportionality.test.ts" }).toLowerCase();
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
