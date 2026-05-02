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
  extractPracticalConstraints,
  type PracticalConstraintResult,
} from "../../../lib/astro/consultation/practical-constraints-extractor";

describe("extractPracticalConstraints", () => {
  it("detects long work hours and living with parents", () => {
    const result = extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." });
    expect(result).toEqual<PracticalConstraintResult>({
      moneyConstraint: false,
      timeConstraint: true,
      privacyConstraint: true,
      careerInstability: false,
      healthConstraint: false,
      familyConstraint: true,
      riskTolerance: "unknown",
      remedyStyle: "behavioral",
    });
  });

  it("detects money constraint from debt and expensive remedies", () => {
    const result = extractPracticalConstraints({
      question: "I have debt, no savings, and cannot afford expensive remedies.",
    });

    expect(result.moneyConstraint).toBe(true);
    expect(result.riskTolerance).toBe("low");
    expect(result.remedyStyle).toBe("avoid_ritual");
  });

  it("detects low budget with simple prayer", () => {
    const result = extractPracticalConstraints({
      question: "Money is tight, but I can do a simple prayer for five minutes.",
    });

    expect(result.moneyConstraint).toBe(true);
    expect(result.timeConstraint).toBe(true);
    expect(result.remedyStyle).toBe("light_spiritual");
  });

  it("detects time constraint from a busy schedule", () => {
    const result = extractPracticalConstraints({
      question: "I am very busy and can only do something short on weekends.",
    });

    expect(result.timeConstraint).toBe(true);
    expect(result.remedyStyle).toBe("behavioral");
  });

  it("detects explicit privacy constraint", () => {
    const result = extractPracticalConstraints({
      question: "I need something discreet because my family will notice.",
    });

    expect(result.privacyConstraint).toBe(true);
    expect(result.familyConstraint).toBe(true);
    expect(result.remedyStyle).toBe("behavioral");
  });

  it("detects career instability", () => {
    const result = extractPracticalConstraints({
      question: "My job is unstable and I might lose it.",
    });

    expect(result.careerInstability).toBe(true);
    expect(result.riskTolerance).toBe("low");
  });

  it("treats quitting without offer and savings as low risk tolerance", () => {
    const result = extractPracticalConstraints({
      question: "I want to quit but I have no offer and no savings.",
    });

    expect(result.careerInstability).toBe(true);
    expect(result.moneyConstraint).toBe(true);
    expect(result.riskTolerance).toBe("low");
  });

  it("detects calculated business risk", () => {
    const result = extractPracticalConstraints({
      question: "I want to start business slowly with a backup plan.",
    });

    expect(result.riskTolerance).toBe("medium");
    expect(result.careerInstability).toBe(false);
  });

  it("detects high risk tolerance", () => {
    const result = extractPracticalConstraints({
      question: "I have enough savings, no dependents, and I am ready to take risk.",
    });

    expect(result.moneyConstraint).toBe(false);
    expect(result.riskTolerance).toBe("high");
  });

  it("prefers low risk when family and debt are present", () => {
    const result = extractPracticalConstraints({
      question: "I want to take risk, but my family depends on me and I have debt.",
    });

    expect(result.moneyConstraint).toBe(true);
    expect(result.familyConstraint).toBe(true);
    expect(result.riskTolerance).toBe("low");
  });

  it("detects health constraint without diagnosis", () => {
    const result = extractPracticalConstraints({
      question: "I have health issues and cannot fast.",
    });

    expect(result.healthConstraint).toBe(true);
    expect(result.remedyStyle).toBe("avoid_ritual");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("diagnose");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("cure");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("medicine");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("treat");
  });

  it("detects burnout and sleep issue as health constraint", () => {
    const result = extractPracticalConstraints({ question: "I am burned out and my sleep is bad." });

    expect(result.healthConstraint).toBe(true);
    expect(result.timeConstraint).toBe(false);
    expect(result.remedyStyle).toBe("behavioral");
  });

  it("detects family responsibility", () => {
    const result = extractPracticalConstraints({
      question: "My family responsibilities are limiting my career choice.",
    });

    expect(result.familyConstraint).toBe(true);
    expect(result.riskTolerance === "low" || result.riskTolerance === "unknown").toBe(true);
  });

  it("detects children and dependents as low risk", () => {
    const result = extractPracticalConstraints({
      question: "I have children and dependents, so I need a safe option.",
    });

    expect(result.familyConstraint).toBe(true);
    expect(result.riskTolerance).toBe("low");
  });

  it("detects avoid ritual preference", () => {
    const result = extractPracticalConstraints({
      question: "I am not religious. No puja, no gemstones, practical only.",
    });

    expect(result.remedyStyle).toBe("avoid_ritual");
  });

  it("detects behavioral preference", () => {
    const result = extractPracticalConstraints({
      question: "I want practical action steps and a simple discipline, not rituals.",
    });

    expect(result.remedyStyle).toBe("avoid_ritual");
  });

  it("detects light spiritual preference", () => {
    const result = extractPracticalConstraints({
      question: "I can do a short mantra or simple prayer if it is not complicated.",
    });

    expect(result.remedyStyle).toBe("light_spiritual");
    expect(result.timeConstraint).toBe(true);
  });

  it("detects traditional preference", () => {
    const result = extractPracticalConstraints({
      question: "I am comfortable with puja, temple visits, mantra, and charity.",
    });

    expect(result.remedyStyle).toBe("traditional");
  });

  it("handles empty input conservatively", () => {
    const result = extractPracticalConstraints({ question: "     " });

    expect(result).toEqual({
      moneyConstraint: false,
      timeConstraint: false,
      privacyConstraint: false,
      careerInstability: false,
      healthConstraint: false,
      familyConstraint: false,
      riskTolerance: "unknown",
      remedyStyle: "unknown",
    });
  });

  it("keeps generic astrology questions free of practical constraints", () => {
    const result = extractPracticalConstraints({ question: "How is my career according to astrology?" });

    expect(result).toEqual({
      moneyConstraint: false,
      timeConstraint: false,
      privacyConstraint: false,
      careerInstability: false,
      healthConstraint: false,
      familyConstraint: false,
      riskTolerance: "unknown",
      remedyStyle: "unknown",
    });
  });

  it("uses previous context for short ambiguous follow-up", () => {
    const previous = createEmptyConsultationState({ userQuestion: "I have debt and my job is unstable." });
    const result = extractPracticalConstraints({ question: "What should I do?", previousEphemeralContext: previous });

    expect(result.moneyConstraint).toBe(true);
    expect(result.careerInstability).toBe(true);
    expect(result.riskTolerance).toBe("low");
  });

  it("lets explicit new text override previous money pressure", () => {
    const previous = createEmptyConsultationState({ userQuestion: "I have debt and money stress." });
    const result = extractPracticalConstraints({
      question: "I now have enough savings and can take calculated risk.",
      previousEphemeralContext: previous,
    });

    expect(result.moneyConstraint).toBe(false);
    expect(result.riskTolerance).toBe("medium");
  });

  it("does not produce medical advice wording", () => {
    const result = extractPracticalConstraints({ question: "I have diabetes and cannot fast." });

    expect(result.healthConstraint).toBe(true);
    expect(result.remedyStyle).toBe("avoid_ritual");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("doctor");
  });

  it("integrates into consultation state for non-exact-fact requests", () => {
    const state = createEmptyConsultationState({
      userQuestion: "I work 12 hours a day and live with my parents.",
    });

    expect(state.intent.primary).not.toBe("exact_fact");
    expect(state.practicalConstraints.timeConstraint).toBe(true);
    expect(state.practicalConstraints.privacyConstraint).toBe(true);
    expect(state.practicalConstraints.familyRestriction).toBe(true);
    expect(state.practicalConstraints.riskTolerance).toBe("unknown");
  });

  it("keeps exact-fact bypass clean", () => {
    const state = createEmptyConsultationState({
      userQuestion: "What is my Lagna?",
    });

    expect(state.intent.primary).toBe("exact_fact");
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.practicalConstraints).toEqual({});
    expect(state.followUp.allowed).toBe(false);
  });

  it("preserves Phase 2 life extraction", () => {
    const result = extractLifeContext({ question: "Should I quit my job and start my own business?" });
    expect(result.decisionType).toBe("business_transition");
  });

  it("preserves Phase 3 emotional comparison detection", () => {
    const result = detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." });
    expect(result.primaryEmotion).toBe("comparison");
  });

  it("preserves Phase 4 cultural family extraction", () => {
    const result = extractCulturalFamilyContext({
      question: "My parents are forcing me to say yes to this proposal.",
    });

    expect(result.familyInvolved).toBe(true);
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
  });
});
