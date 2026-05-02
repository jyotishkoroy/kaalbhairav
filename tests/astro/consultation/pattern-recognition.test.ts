/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { buildChartEvidence, type ChartEvidence } from "../../../lib/astro/consultation/chart-evidence-builder";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { extractLifeContext, type LifeContextExtraction } from "../../../lib/astro/consultation/life-context-extractor";
import { extractPracticalConstraints, type PracticalConstraintResult } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { synthesizePattern, type PatternRecognitionSynthesisResult } from "../../../lib/astro/consultation/pattern-recognition";

function careerEvidence(overrides?: Partial<ChartEvidence>): ChartEvidence {
  return {
    domain: "career",
    supportiveFactors: [{ factor: "Strong 10th house career indicator", source: "rashi", confidence: "high", interpretationHint: "Career indicator supplied by backend." }],
    challengingFactors: [{ factor: "Saturn pressure on 10th house indicates career delay", source: "derived_rule", confidence: "medium", interpretationHint: "Career pressure indicator supplied by backend." }],
    neutralFacts: [],
    birthTimeSensitivity: "medium",
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

function assertSafe(result: PatternRecognitionSynthesisResult): void {
  const text = JSON.stringify(result).toLowerCase();
  expect(text).not.toContain("guaranteed");
  expect(text).not.toContain("definitely");
  expect(text).not.toContain("will always");
  expect(text).not.toContain("will never");
  expect(text).not.toContain("fixed fate");
  expect(text).not.toContain("curse");
  expect(text).not.toContain("cursed");
  expect(text).not.toContain("remedy");
  expect(text).not.toContain("puja");
  expect(text).not.toContain("mantra");
  expect(text).not.toContain("gemstone");
  expect(text).not.toContain("donation");
  expect(text).not.toContain("fast");
  expect(text).not.toContain("death");
  expect(text).not.toContain("cure");
  expect(text).not.toContain("diagnose");
}

describe("synthesizePattern", () => {
  it("returns conservative default for insufficient evidence", () => {
    const result = synthesizePattern({
      chartEvidence: { domain: "general", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "low" },
      lifeContext: defaultLifeContext(),
      emotionalState: defaultEmotionalState(),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.dominantPattern).toBe("insufficient evidence for a specific consultation pattern");
    expect(result.confidence).toBe("low");
    expect(result.mixedSignal).toBeUndefined();
    assertSafe(result);
  });

  it("synthesizes career growth through pressure and responsibility", () => {
    const result = synthesizePattern({
      chartEvidence: careerEvidence(),
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "career blockage by manager", decisionType: "job_switch_or_stay" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", secondaryEmotions: ["comparison"], intensity: "high" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.dominantPattern).toContain("career growth through pressure");
    expect(result.supportivePattern).toBeDefined();
    expect(result.challengingPattern).toBeDefined();
    expect(result.mixedSignal).toBeDefined();
    expect(result.confidence === "high" || result.confidence === "medium").toBe(true);
    assertSafe(result);
  });

  it("identifies authority conflict blocking recognition", () => {
    const result = synthesizePattern({
      chartEvidence: careerEvidence({
        challengingFactors: [{ factor: "Saturn pressure on 10th house", source: "derived_rule", confidence: "high", interpretationHint: "pressure" }],
      }),
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "career blockage by manager", currentSituation: "user feels blocked at work" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "confusion", intensity: "high" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.dominantPattern).toContain("authority conflict");
    expect(result.likelyLifeExpression).toContain("manager");
    expect(result.growthDirection).toContain("visible proof");
    assertSafe(result);
  });

  it("synthesizes marriage pressure versus emotional readiness", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "marriage",
        supportiveFactors: [{ factor: "Venus supports partnership", source: "rashi", confidence: "high", interpretationHint: "support" }],
        challengingFactors: [{ factor: "Saturn pressure on relationship indicators", source: "derived_rule", confidence: "medium", interpretationHint: "pressure" }],
        neutralFacts: [],
        birthTimeSensitivity: "high",
      },
      lifeContext: defaultLifeContext({ lifeArea: "marriage", currentIssue: "family pressure for marriage despite inner unreadiness", decisionType: "marriage_readiness" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "fear", secondaryEmotions: ["confusion"], intensity: "high" }),
      culturalContext: defaultCulturalContext({ familyInvolved: true, parentalPressure: true, arrangedMarriageContext: true, decisionAutonomy: "low" }),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.dominantPattern).toContain("marriage pressure versus emotional readiness");
    expect(result.mixedSignal).toBeDefined();
    expect(result.mixedSignal?.promise).toMatch(/possible|may/i);
    expect(result.mixedSignal?.blockage).toMatch(/pressure|unreadiness/i);
    expect(result.mixedSignal?.synthesis).toMatch(/compatibility|readiness/i);
    assertSafe(result);
  });

  it("handles specific proposal confusion without advice", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "marriage",
        supportiveFactors: [],
        challengingFactors: [{ factor: "Saturn relationship pressure", source: "derived_rule", confidence: "medium", interpretationHint: "pressure" }],
        neutralFacts: [],
        birthTimeSensitivity: "high",
      },
      lifeContext: defaultLifeContext({ lifeArea: "marriage", currentIssue: "family pressure for marriage despite inner unreadiness", decisionType: "marriage_readiness" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "confusion", intensity: "high" }),
      culturalContext: defaultCulturalContext({ familyInvolved: true, parentalPressure: true, arrangedMarriageContext: true, decisionAutonomy: "low" }),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.dominantPattern).toContain("marriage pressure");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("marry");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("do not marry");
    assertSafe(result);
  });

  it("identifies emotionally unavailable partners", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "relationship",
        supportiveFactors: [],
        challengingFactors: [
          { factor: "Saturn pressure on Venus and Moon", source: "derived_rule", confidence: "high", interpretationHint: "relationship pressure" },
        ],
        neutralFacts: [],
        birthTimeSensitivity: "high",
      },
      lifeContext: defaultLifeContext({ lifeArea: "relationship", currentIssue: "repeated attraction to emotionally unavailable partners" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "confusion", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.dominantPattern).toContain("emotionally distant partners");
    expect(result.likelyLifeExpression).toContain("distance");
    expect(result.growthDirection).toContain("consistency");
    assertSafe(result);
  });

  it("keeps relationship uncertainty conservative without chart evidence", () => {
    const result = synthesizePattern({
      chartEvidence: { domain: "relationship", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "low" },
      lifeContext: defaultLifeContext({ lifeArea: "relationship", currentIssue: "relationship uncertainty" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.confidence === "low" || result.confidence === "medium").toBe(true);
    assertSafe(result);
  });

  it("identifies decision paralysis", () => {
    const result = synthesizePattern({
      chartEvidence: { domain: "general", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "low" },
      lifeContext: defaultLifeContext({ lifeArea: "general", currentIssue: "cannot decide", decisionType: "business_transition" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "confusion", secondaryEmotions: ["anxiety"], intensity: "high" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints({ riskTolerance: "low" }),
    });

    expect(result.dominantPattern).toContain("decision paralysis");
    expect(result.growthDirection).toContain("reversible next steps");
    assertSafe(result);
  });

  it("identifies family duty versus personal desire", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "family",
        supportiveFactors: [{ factor: "Family support is present", source: "rashi", confidence: "medium", interpretationHint: "support" }],
        challengingFactors: [{ factor: "Family duty pressure", source: "derived_rule", confidence: "medium", interpretationHint: "pressure" }],
        neutralFacts: [],
        birthTimeSensitivity: "low",
      },
      lifeContext: defaultLifeContext({ lifeArea: "family", currentIssue: "family duty versus personal desire" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "exhaustion", intensity: "medium" }),
      culturalContext: defaultCulturalContext({ familyInvolved: true, financialDependents: true }),
      practicalConstraints: defaultPracticalConstraints({ familyConstraint: true }),
    });

    expect(result.dominantPattern).toContain("family duty versus personal desire");
    expect(result.mixedSignal).toBeDefined();
    assertSafe(result);
  });

  it("identifies money retention pressure", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "money",
        supportiveFactors: [{ factor: "11th house gains potential", source: "rashi", confidence: "high", interpretationHint: "support" }],
        challengingFactors: [{ factor: "2nd and 8th house volatility", source: "derived_rule", confidence: "high", interpretationHint: "pressure" }],
        neutralFacts: [],
        birthTimeSensitivity: "medium",
      },
      lifeContext: defaultLifeContext({ lifeArea: "money", currentIssue: "cannot save because of debt and expenses" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints({ moneyConstraint: true }),
    });

    expect(result.dominantPattern).toContain("earning pressure and difficulty retaining resources");
    expect(result.mixedSignal).toBeDefined();
    assertSafe(result);
  });

  it("identifies fear of visibility", () => {
    const result = synthesizePattern({
      chartEvidence: careerEvidence({
        supportiveFactors: [{ factor: "Sun and 10th house support visibility", source: "rashi", confidence: "high", interpretationHint: "visibility" }],
        challengingFactors: [],
      }),
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "promotion and recognition" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "fear", intensity: "high" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.dominantPattern).toContain("fear of visibility");
    expect(result.likelyLifeExpression).toContain("recognition");
    expect(result.growthDirection).toContain("gradually");
    assertSafe(result);
  });

  it("identifies spiritual searching during material instability", () => {
    const result = synthesizePattern({
      chartEvidence: { domain: "general", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "low" },
      lifeContext: defaultLifeContext({ lifeArea: "spirituality", currentIssue: "spiritual confusion or loss of direction" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "confusion", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints({ careerInstability: true, moneyConstraint: true }),
    });

    expect(result.dominantPattern).toContain("spiritual searching during material instability");
    expect(result.growthDirection).toContain("grounding");
    assertSafe(result);
  });

  it("identifies sudden starts and stops in career", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "career",
        supportiveFactors: [],
        challengingFactors: [{ factor: "Rahu and Mars volatility in career factors", source: "derived_rule", confidence: "high", interpretationHint: "instability" }],
        neutralFacts: [],
        birthTimeSensitivity: "medium",
      },
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "business transition", decisionType: "business_transition" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints({ careerInstability: true }),
    });

    expect(result.dominantPattern).toContain("sudden starts and stops");
    expect(result.growthDirection).toContain("staged experiments");
    assertSafe(result);
  });

  it("keeps mixed signal absent when only supportive evidence exists", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "career",
        supportiveFactors: [{ factor: "Career growth potential", source: "rashi", confidence: "high", interpretationHint: "support" }],
        challengingFactors: [],
        neutralFacts: [],
        birthTimeSensitivity: "medium",
      },
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "career growth" }),
      emotionalState: defaultEmotionalState(),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.mixedSignal).toBeUndefined();
    assertSafe(result);
  });

  it("creates mixed signal when both supportive and challenging evidence exist", () => {
    const result = synthesizePattern({
      chartEvidence: careerEvidence(),
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "career blockage by manager" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.mixedSignal).toBeDefined();
    assertSafe(result);
  });

  it("does not return high confidence without context", () => {
    const result = synthesizePattern({
      chartEvidence: careerEvidence(),
      lifeContext: defaultLifeContext(),
      emotionalState: defaultEmotionalState(),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.confidence).not.toBe("high");
  });

  it("does not overstate repeated user-stated patterns without chart evidence", () => {
    const result = synthesizePattern({
      chartEvidence: { domain: "relationship", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "low" },
      lifeContext: defaultLifeContext({ lifeArea: "relationship", currentIssue: "repeated attraction to emotionally unavailable partners" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "confusion", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.confidence === "medium" || result.confidence === "low").toBe(true);
    assertSafe(result);
  });

  it("remains non-diagnostic for health-sensitive context", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "health",
        supportiveFactors: [],
        challengingFactors: [{ factor: "Health-sensitive pressure in chart evidence", source: "derived_rule", confidence: "high", interpretationHint: "reflective only" }],
        neutralFacts: [],
        birthTimeSensitivity: "medium",
      },
      lifeContext: defaultLifeContext({ lifeArea: "health", currentIssue: "health anxiety or health-related concern" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "high" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints({ healthConstraint: true }),
    });

    assertSafe(result);
    expect(result.dominantPattern.toLowerCase()).not.toContain("diagnose");
    expect(result.dominantPattern.toLowerCase()).not.toContain("disease");
  });

  it("does not create timing judgement language", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "career",
        supportiveFactors: [{ factor: "Dasha and transit evidence", source: "dasha", confidence: "high", interpretationHint: "timing input exists" }],
        challengingFactors: [{ factor: "Transit pressure", source: "transit", confidence: "high", interpretationHint: "timing input exists" }],
        neutralFacts: [],
        birthTimeSensitivity: "high",
      },
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "promotion and recognition" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "anxiety", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    const text = JSON.stringify(result).toLowerCase();
    expect(text).not.toContain("supportive period");
    expect(text).not.toContain("mixed period");
    expect(text).not.toContain("preparatory window");
    expect(text).not.toContain("exact window");
    expect(text).not.toContain("proceed/wait");
    assertSafe(result);
  });

  it("keeps evidence arrays grounded in supplied chart evidence", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "career",
        supportiveFactors: [{ factor: "Saturn pressure on 10th house", source: "derived_rule", confidence: "high", interpretationHint: "pressure" }],
        challengingFactors: [],
        neutralFacts: [],
        birthTimeSensitivity: "medium",
      },
      lifeContext: defaultLifeContext({ lifeArea: "career", currentIssue: "career blockage by manager" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "confusion", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    const evidence = JSON.stringify(result);
    expect(evidence).toContain("Saturn pressure on 10th house");
    expect(evidence).not.toContain("Rahu transit");
    expect(evidence).not.toContain("Mars aspect");
    assertSafe(result);
  });

  it("avoids unsupported unrelated chart evidence becoming a high-confidence relation pattern", () => {
    const result = synthesizePattern({
      chartEvidence: {
        domain: "money",
        supportiveFactors: [{ factor: "11th house gains", source: "rashi", confidence: "high", interpretationHint: "support" }],
        challengingFactors: [],
        neutralFacts: [],
        birthTimeSensitivity: "medium",
      },
      lifeContext: defaultLifeContext({ lifeArea: "relationship", currentIssue: "relationship uncertainty" }),
      emotionalState: defaultEmotionalState({ primaryEmotion: "confusion", intensity: "medium" }),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.confidence).not.toBe("high");
    assertSafe(result);
  });

  it("handles malformed inputs safely", () => {
    const result = synthesizePattern({
      chartEvidence: { domain: "general", supportiveFactors: [], challengingFactors: [], neutralFacts: [], birthTimeSensitivity: "low" },
      lifeContext: defaultLifeContext({ extractedFacts: [] }),
      emotionalState: defaultEmotionalState(),
      culturalContext: defaultCulturalContext(),
      practicalConstraints: defaultPracticalConstraints(),
    });

    expect(result.dominantPattern).toBeDefined();
    assertSafe(result);
  });

  it("preserves exact-fact state bypass", () => {
    const state = createEmptyConsultationState({ userQuestion: "What is my Lagna?" });
    expect(state.intent.primary).toBe("exact_fact");
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.practicalConstraints).toEqual({});
    expect(state.followUp.allowed).toBe(false);
  });

  it("preserves phase 2 through phase 6 regressions", () => {
    expect(extractLifeContext({ question: "Should I quit my job and start my own business?" }).decisionType).toBe("business_transition");
    expect(detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." }).primaryEmotion).toBe("comparison");
    expect(extractCulturalFamilyContext({ question: "My parents are forcing me to say yes to this proposal." }).arrangedMarriageContext).toBe(true);
    expect(extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." }).timeConstraint).toBe(true);
    expect(buildChartEvidence({ domain: "career", chart: [{ key: "tenthHouse", label: "10th house", value: "Career" }] }).supportiveFactors.length + buildChartEvidence({ domain: "career", chart: [{ key: "tenthHouse", label: "10th house", value: "Career" }] }).challengingFactors.length + buildChartEvidence({ domain: "career", chart: [{ key: "tenthHouse", label: "10th house", value: "Career" }] }).neutralFacts.length).toBeGreaterThan(0);
  });
});
