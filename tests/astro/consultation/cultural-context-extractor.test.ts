/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import {
  extractCulturalFamilyContext,
  type CulturalFamilyContextResult,
} from "../../../lib/astro/consultation/cultural-context-extractor";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";

describe("extractCulturalFamilyContext", () => {
  it("detects forced proposal pressure with reputation pressure", () => {
    const result = extractCulturalFamilyContext({
      question: "My parents are forcing me to say yes to this proposal.",
    });

    expect(result).toEqual<CulturalFamilyContextResult>({
      familyInvolved: true,
      parentalPressure: true,
      arrangedMarriageContext: true,
      familyReputationPressure: true,
      financialDependents: false,
      religiousComfort: "unknown",
      decisionAutonomy: "low",
    });
  });

  it("keeps supportive parents from becoming pressure", () => {
    const result = extractCulturalFamilyContext({
      question: "My parents are involved in my marriage decision, but they support my choice.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(false);
    expect(result.arrangedMarriageContext).toBe(false);
    expect(result.decisionAutonomy).toBe("high");
  });

  it("treats marriage pressure without proposal conservatively", () => {
    const result = extractCulturalFamilyContext({
      question: "My parents are pressuring me for marriage but there is no specific proposal.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(false);
    expect(result.decisionAutonomy).toBe("medium");
  });

  it("detects arranged marriage context from match language", () => {
    const result = extractCulturalFamilyContext({
      question: "My family selected a match and we are doing kundli matching.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
    expect(result.parentalPressure).toBe(false);
    expect(result.religiousComfort).toBe("unknown");
  });

  it("detects family reputation pressure from explicit text", () => {
    const result = extractCulturalFamilyContext({
      question: "I am worried about what relatives will say and family reputation.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.familyReputationPressure).toBe(true);
    expect(result.decisionAutonomy).toBe("unknown");
  });

  it("detects financial dependents without inventing pressure", () => {
    const result = extractCulturalFamilyContext({
      question: "I am the only earning member and my parents depend on me financially.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.financialDependents).toBe(true);
    expect(result.parentalPressure).toBe(false);
  });

  it("keeps living with parents separate from pressure", () => {
    const result = extractCulturalFamilyContext({
      question: "I live with my parents, but they do not pressure me.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(false);
    expect(result.decisionAutonomy).toBe("high");
  });

  it("detects low religious comfort", () => {
    const result = extractCulturalFamilyContext({
      question: "I am not religious and I do not want puja or rituals. Practical only.",
    });

    expect(result.religiousComfort).toBe("low");
    expect(result.familyInvolved).toBe(false);
    expect(result.parentalPressure).toBe(false);
  });

  it("detects medium religious comfort", () => {
    const result = extractCulturalFamilyContext({
      question: "I am open to simple remedies and light spiritual guidance if needed.",
    });

    expect(result.religiousComfort).toBe("medium");
  });

  it("detects high religious comfort", () => {
    const result = extractCulturalFamilyContext({
      question: "I do puja daily and I am comfortable with mantra and temple visits.",
    });

    expect(result.religiousComfort).toBe("high");
  });

  it("does not treat skeptical astrology interest as family context", () => {
    const result = extractCulturalFamilyContext({
      question: "I am skeptical and want logic only.",
    });

    expect(result.religiousComfort).toBe("low");
    expect(result.familyInvolved).toBe(false);
    expect(result.parentalPressure).toBe(false);
  });

  it("detects family duty without inventing financial dependence", () => {
    const result = extractCulturalFamilyContext({
      question: "My family duties are affecting my career choice.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(false);
    expect(result.financialDependents).toBe(false);
    expect(result.decisionAutonomy).toBe("unknown");
  });

  it("detects in-laws as family involvement only", () => {
    const result = extractCulturalFamilyContext({
      question: "My in-laws are involved in our marriage decisions.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(false);
    expect(result.arrangedMarriageContext).toBe(false);
  });

  it("handles empty input conservatively", () => {
    const result = extractCulturalFamilyContext({ question: "     " });

    expect(result).toEqual({
      familyInvolved: false,
      parentalPressure: false,
      arrangedMarriageContext: false,
      familyReputationPressure: false,
      financialDependents: false,
      religiousComfort: "unknown",
      decisionAutonomy: "unknown",
    });
  });

  it("does not infer arranged marriage from marriage alone", () => {
    const result = extractCulturalFamilyContext({
      question: "When will I get married?",
    });

    expect(result.familyInvolved).toBe(false);
    expect(result.parentalPressure).toBe(false);
    expect(result.arrangedMarriageContext).toBe(false);
    expect(result.familyReputationPressure).toBe(false);
    expect(result.decisionAutonomy).toBe("unknown");
  });

  it("does not infer pressure from parents alone", () => {
    const result = extractCulturalFamilyContext({
      question: "My parents know about my relationship.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(false);
    expect(result.arrangedMarriageContext).toBe(false);
    expect(result.familyReputationPressure).toBe(false);
  });

  it("treats no-choice family control as low autonomy", () => {
    const result = extractCulturalFamilyContext({
      question: "I have no choice because my family decides everything.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(true);
    expect(result.decisionAutonomy).toBe("low");
  });

  it("respects explicit autonomy overrides", () => {
    const result = extractCulturalFamilyContext({
      question: "My family knows, but I will decide independently.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.decisionAutonomy).toBe("high");
    expect(result.parentalPressure).toBe(false);
  });

  it("preserves previous context for short ambiguous follow-up", () => {
    const previous = createEmptyConsultationState({
      userQuestion: "My parents are forcing me to say yes to this proposal.",
    });

    const result = extractCulturalFamilyContext({
      question: "What should I do?",
      previousEphemeralContext: previous,
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
  });

  it("lets explicit new text override previous pressure", () => {
    const previous = createEmptyConsultationState({
      userQuestion: "My parents are pressuring me for marriage.",
    });

    const result = extractCulturalFamilyContext({
      question: "My parents are supportive and I can decide.",
      previousEphemeralContext: previous,
    });

    expect(result.parentalPressure).toBe(false);
    expect(result.decisionAutonomy).toBe("high");
  });

  it("integrates into consultation state for non-exact-fact requests", () => {
    const state = createEmptyConsultationState({
      userQuestion: "My parents are forcing me to say yes to this proposal.",
    });

    expect(state.intent.primary).not.toBe("exact_fact");
    expect(state.culturalFamilyContext.familyInvolved).toBe(true);
    expect(state.culturalFamilyContext.parentalPressure).toBe(true);
    expect(state.culturalFamilyContext.arrangedMarriageContext).toBe(true);
    expect(state.culturalFamilyContext.religiousComfort).toBe("unknown");
  });

  it("keeps exact-fact bypass clean", () => {
    const state = createEmptyConsultationState({
      userQuestion: "What is my Lagna?",
    });

    expect(state.intent.primary).toBe("exact_fact");
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.followUp.allowed).toBe(false);
  });

  it("preserves Phase 2 life extraction", () => {
    const result = extractLifeContext({
      question: "My parents are pressuring me for marriage but I am not ready.",
    });

    expect(result.decisionType).toBe("marriage_readiness");
  });

  it("preserves Phase 3 emotional comparison detection", () => {
    const result = detectEmotionalState({
      question: "Everyone around me is getting settled. I feel stuck.",
    });

    expect(result.primaryEmotion).toBe("comparison");
  });
});
