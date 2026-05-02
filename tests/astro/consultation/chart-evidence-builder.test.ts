/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";
import {
  buildChartEvidence,
  type ChartEvidenceInputFact,
} from "../../../lib/astro/consultation/chart-evidence-builder";
import { extractPracticalConstraints } from "../../../lib/astro/consultation/practical-constraints-extractor";

describe("buildChartEvidence", () => {
  it("returns empty evidence for empty input", () => {
    const result = buildChartEvidence({ domain: "career" });
    expect(result).toEqual({
      domain: "career",
      supportiveFactors: [],
      challengingFactors: [],
      neutralFacts: [],
      birthTimeSensitivity: "low",
    });
  });

  it("includes career supportive factors with confidence preserved", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [
        {
          key: "tenthHouse",
          label: "10th house",
          value: "Strong 10th house career indicator",
          source: "rashi",
          polarity: "supportive",
          confidence: "high",
        },
        {
          key: "sunCareer",
          label: "Sun",
          value: "Sun supports authority and visibility",
          source: "rashi",
          domains: ["career"],
        },
      ],
    });

    expect(result.domain).toBe("career");
    expect(result.supportiveFactors).toHaveLength(2);
    expect(result.supportiveFactors[0]?.factor).toContain("10th house");
    expect(result.supportiveFactors[0]?.source).toBe("rashi");
    expect(result.supportiveFactors[0]?.confidence).toBe("high");
    expect(JSON.stringify(result)).not.toContain("promotion guaranteed");
  });

  it("classifies career pressure language as challenging without promising outcomes", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "saturnPressure", label: "Saturn", value: "Saturn pressure on 10th house indicates career delay" }],
    });

    expect(result.challengingFactors).toHaveLength(1);
    expect(result.challengingFactors[0]?.interpretationHint).toContain("pressure");
    expect(result.challengingFactors[0]?.interpretationHint).toContain("delay");
    expect(result.challengingFactors[0]?.interpretationHint).not.toContain("guarantee");
  });

  it("marks D10 career evidence as birth-time sensitive", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "d10", label: "D10", value: "D10 career factor available", birthTimeSensitive: true }],
    });

    expect(result.birthTimeSensitivity).toBe("high");
  });

  it("includes marriage factors and marks Navamsa sensitivity", () => {
    const result = buildChartEvidence({
      domain: "marriage",
      chart: [
        { key: "seventhHouse", label: "7th house", value: "7th house relationship fact", polarity: "supportive" },
        { key: "venus", label: "Venus", value: "Venus is relevant", domains: ["marriage"] },
        { key: "navamsaFactor", label: "Navamsa", value: "Navamsa relationship fact", source: "navamsa" },
      ],
    });

    expect(result.supportiveFactors.length + result.neutralFacts.length).toBeGreaterThan(0);
    expect(result.birthTimeSensitivity).toBe("high");
    expect(result.supportiveFactors[0]?.factor ?? result.neutralFacts[0]?.fact).toContain("7th house");
  });

  it("excludes money-only evidence from relationship domain", () => {
    const result = buildChartEvidence({
      domain: "relationship",
      chart: [{ key: "secondHouse", label: "2nd house", value: "Money only fact", domains: ["money"] }],
    });

    expect(result.supportiveFactors).toHaveLength(0);
    expect(result.challengingFactors).toHaveLength(0);
    expect(result.neutralFacts).toHaveLength(0);
  });

  it("includes money evidence for 2nd and 11th houses", () => {
    const result = buildChartEvidence({
      domain: "money",
      chart: [
        { key: "secondHouse", label: "2nd house", value: "Savings and resources" },
        { key: "eleventhHouse", label: "11th house", value: "Gains and income" },
      ],
    });

    expect(result.supportiveFactors.length + result.neutralFacts.length).toBe(2);
  });

  it("includes 5th house speculation only for money domain", () => {
    const money = buildChartEvidence({
      domain: "money",
      chart: [{ key: "fifthHouse", label: "5th house", value: "Speculation fact" }],
    });
    const marriage = buildChartEvidence({
      domain: "marriage",
      chart: [{ key: "fifthHouse", label: "5th house", value: "Speculation fact" }],
    });

    expect(money.supportiveFactors.length + money.challengingFactors.length + money.neutralFacts.length).toBe(1);
    expect(marriage.supportiveFactors).toHaveLength(0);
    expect(marriage.challengingFactors).toHaveLength(0);
    expect(marriage.neutralFacts).toHaveLength(0);
  });

  it("frames health evidence as reflective only", () => {
    const result = buildChartEvidence({
      domain: "health",
      chart: [
        { key: "sixthHouse", label: "6th house", value: "6th house pressure", polarity: "challenging" },
        { key: "moonStress", label: "Moon", value: "Moon stress" },
        { key: "saturnMarsRahu", label: "Saturn Mars Rahu", value: "Saturn/Mars/Rahu pressure" },
      ],
    });

    const hints = [...result.supportiveFactors, ...result.challengingFactors].map((factor) => factor.interpretationHint.toLowerCase());
    expect(result.challengingFactors.length).toBeGreaterThan(0);
    expect(hints.join(" ")).toContain("reflective");
    expect(hints.join(" ")).not.toContain("diagnosis");
    expect(hints.join(" ")).not.toContain("cure");
    expect(hints.join(" ")).not.toContain("treatment");
    expect(hints.join(" ")).not.toContain("death");
  });

  it("includes family indicators for home and parents", () => {
    const result = buildChartEvidence({
      domain: "family",
      chart: [{ key: "fourthHouse", label: "4th house", value: "Home and mother fact" }],
    });

    expect(result.supportiveFactors.length + result.challengingFactors.length + result.neutralFacts.length).toBe(1);
  });

  it("keeps general domain inclusive", () => {
    const result = buildChartEvidence({
      domain: "general",
      chart: [
        { key: "careerFact", label: "10th house", value: "Career" },
        { key: "moneyFact", label: "2nd house", value: "Money" },
        { key: "familyFact", label: "4th house", value: "Family" },
      ],
    });

    expect(result.supportiveFactors.length + result.challengingFactors.length + result.neutralFacts.length).toBe(3);
  });

  it("honors provided polarity even with challenging text", () => {
    const result = buildChartEvidence({
      domain: "relationship",
      chart: [{ key: "venus", label: "Venus", value: "Venus delay language", polarity: "supportive" }],
    });

    expect(result.supportiveFactors).toHaveLength(1);
    expect(result.challengingFactors).toHaveLength(0);
  });

  it("defaults unclear Venus text to neutral", () => {
    const result = buildChartEvidence({
      domain: "relationship",
      chart: [{ key: "venus", label: "Venus", value: "Venus is in Taurus" }],
    });

    expect(result.neutralFacts).toHaveLength(1);
    expect(result.supportiveFactors).toHaveLength(0);
    expect(result.challengingFactors).toHaveLength(0);
  });

  it("keeps mixed signals neutral when not explicit", () => {
    const result = buildChartEvidence({
      domain: "marriage",
      chart: [{ key: "seventhHouse", label: "7th house", value: "7th house relationship fact" }],
    });

    expect(result.neutralFacts).toHaveLength(1);
    expect(result.supportiveFactors).toHaveLength(0);
    expect(result.challengingFactors).toHaveLength(0);
  });

  it("infers dasha source from current period language", () => {
    const result = buildChartEvidence({
      domain: "career",
      dasha: [{ key: "currentMahadasha", label: "current Mahadasha", value: "Connected to 10th house" }],
    });

    expect([...result.supportiveFactors, ...result.challengingFactors, ...result.neutralFacts].some((fact) => fact.source === "dasha")).toBe(true);
  });

  it("infers transit source from transit pressure language", () => {
    const result = buildChartEvidence({
      domain: "health",
      transits: [{ key: "saturnTransit", label: "Saturn transit", value: "Saturn transit pressure on Moon" }],
    });

    expect(result.challengingFactors[0]?.source).toBe("transit");
  });

  it("infers navamsa source from D9 text", () => {
    const result = buildChartEvidence({
      domain: "marriage",
      chart: [{ key: "d9Factor", label: "D9/Navamsa", value: "D9 relationship fact" }],
    });

    expect(result.neutralFacts[0]?.source).toBe("navamsa");
    expect(result.birthTimeSensitivity).toBe("high");
  });

  it("supports ConsultationChartFactSet input", () => {
    const result = buildChartEvidence({
      domain: "career",
      chartFacts: {
        source: "test_fixture",
        facts: [
          { key: "lagna", label: "Lagna", value: "Leo", confidence: "high" },
          { key: "tenthHouse", label: "10th house", value: "Career house fact", confidence: "medium" },
        ],
      },
    });

    expect(result.supportiveFactors.length + result.challengingFactors.length + result.neutralFacts.length).toBe(1);
    expect(result.neutralFacts[0]?.fact ?? result.supportiveFactors[0]?.factor).toContain("10th house");
  });

  it("supports shallow object sources", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: {
        tenthHouse: "Strong 10th house career indicator",
        eleventhHouse: "11th house gains indicator",
      },
    });

    expect(result.supportiveFactors.length + result.challengingFactors.length + result.neutralFacts.length).toBe(2);
  });

  it("deduplicates repeated facts from multiple sources", () => {
    const repeated = { key: "tenthHouse", label: "10th house", value: "Career indicator" };
    const result = buildChartEvidence({
      domain: "career",
      chartFacts: {
        source: "test_fixture",
        facts: [{ key: repeated.key, label: repeated.label, value: repeated.value }],
      },
      chart: [repeated],
    });

    expect(result.supportiveFactors.length + result.challengingFactors.length + result.neutralFacts.length).toBe(1);
  });

  it("skips malformed facts safely", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "", value: "" } as unknown as ChartEvidenceInputFact, null as unknown as ChartEvidenceInputFact],
    });

    expect(result).toEqual({
      domain: "career",
      supportiveFactors: [],
      challengingFactors: [],
      neutralFacts: [],
      birthTimeSensitivity: "low",
    });
  });

  it("avoids forbidden generated claims in hints", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "tenthHouse", label: "10th house", value: "Strong 10th house career indicator" }],
    });

    const hints = [...result.supportiveFactors, ...result.challengingFactors].map((factor) => factor.interpretationHint.toLowerCase()).join(" ");
    expect(hints).not.toContain("guarantee");
    expect(hints).not.toContain("definitely");
    expect(hints).not.toContain("will happen");
    expect(hints).not.toContain("death");
    expect(hints).not.toContain("cure");
    expect(hints).not.toContain("wear blue sapphire");
    expect(hints).not.toContain("perform puja");
    expect(hints).not.toContain("mantra");
  });

  it("does not output remedy language", () => {
    const result = buildChartEvidence({
      domain: "health",
      chart: [
        { key: "sixthHouse", label: "6th house", value: "Health pressure" },
        { key: "moon", label: "Moon", value: "Moon stress" },
      ],
    });

    const text = JSON.stringify(result).toLowerCase();
    expect(text).not.toContain("remedy");
    expect(text).not.toContain("puja");
    expect(text).not.toContain("mantra");
    expect(text).not.toContain("gemstone");
    expect(text).not.toContain("donation");
  });

  it("marks birth time sensitivity high for divisional and degree facts", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "d10Degree", label: "D10", value: "Exact degree and divisional factor" }],
    });

    expect(result.birthTimeSensitivity).toBe("high");
  });

  it("keeps career exact-fact style inputs grounded", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "lagna", label: "Lagna", value: "Leo" }],
    });

    expect(JSON.stringify(result).toLowerCase()).not.toContain("guarantee");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("will happen");
  });
});

describe("consultation regressions", () => {
  it("preserves Phase 2 life extraction", () => {
    const result = extractLifeContext({ question: "Should I quit my job and start my own business?" });
    expect(result.decisionType).toBe("business_transition");
  });

  it("preserves Phase 3 emotional comparison detection", () => {
    const result = detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." });
    expect(result.primaryEmotion).toBe("comparison");
  });

  it("preserves Phase 4 cultural family extraction", () => {
    const result = extractCulturalFamilyContext({ question: "My parents are forcing me to say yes to this proposal." });
    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
  });

  it("preserves Phase 5 practical constraints extraction", () => {
    const result = extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." });
    expect(result.timeConstraint).toBe(true);
    expect(result.privacyConstraint).toBe(true);
    expect(result.familyConstraint).toBe(true);
  });

  it("preserves exact-fact consultation state bypass", () => {
    const state = createEmptyConsultationState({ userQuestion: "What is my Lagna?" });
    expect(state.intent.primary).toBe("exact_fact");
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.practicalConstraints).toEqual({});
    expect(state.followUp.allowed).toBe(false);
  });
});
