/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";

describe("createEmptyConsultationState", () => {
  it("extracts the acceptance-case bootstrap state shape", () => {
    const state = createEmptyConsultationState({
      userQuestion:
        "My parents are pressuring me for marriage, but my career is unstable. I am scared I will make the wrong decision.",
    });

    expect(state.sessionId).toBe("anonymous-consultation-session");
    expect(state.userQuestion).toBe(
      "My parents are pressuring me for marriage, but my career is unstable. I am scared I will make the wrong decision.",
    );
    expect(state.intent.primary).not.toBe("exact_fact");
    expect(state.lifeStory.lifeArea).toBe("marriage");
    expect(state.lifeStory.currentIssue).toBe("family pressure for marriage despite inner unreadiness");
    expect(state.lifeStory.decisionType).toBe("marriage_readiness");
    expect(state.emotionalState.primary).toBe("fear");
    expect(state.emotionalState.intensity).toBe("high");
    expect(state.emotionalState.toneNeeded).toBe("gentle");
    expect(state.culturalFamilyContext.parentalPressure).toBe(true);
    expect(state.culturalFamilyContext.familyInvolved).toBe(true);
    expect(state.practicalConstraints.careerInstability).toBe(true);
    expect(state.followUp.allowed).toBe(true);
    expect(state.followUp.alreadyAsked).toBe(false);
  });

  it("preserves exact-fact bypass and avoids populating consultation layers", () => {
    const state = createEmptyConsultationState({
      userQuestion: "What is my Lagna?",
    });

    expect(state.intent.primary).toBe("exact_fact");
    expect(state.followUp.allowed).toBe(false);
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.practicalConstraints).toEqual({});
    expect(state.patternRecognition).toBeUndefined();
    expect(state.timingJudgement).toBeUndefined();
    expect(state.remedyPlan).toBeUndefined();
    expect(state.responsePlan).toBeUndefined();
  });

  it("respects an explicit exact_fact override", () => {
    const state = createEmptyConsultationState({
      userQuestion: "Tell me my current Mahadasha.",
      intent: { primary: "exact_fact" },
    });

    expect(state.intent.primary).toBe("exact_fact");
    expect(state.followUp.allowed).toBe(false);
    expect(state.intent.needsChart).toBe(true);
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.practicalConstraints).toEqual({});
  });

  it("normalizes malformed spacing without crashing", () => {
    const state = createEmptyConsultationState({
      userQuestion: "   I    am    scared   about   marriage   ",
    });

    expect(state.userQuestion).toBe("I am scared about marriage");
    expect(state.emotionalState.primary).toBe("fear");
    expect(state.lifeStory.lifeArea).toBe("marriage");
  });

  it("falls back to the default session id when blank", () => {
    const state = createEmptyConsultationState({
      sessionId: "   ",
      userQuestion: "How is my career?",
    });

    expect(state.sessionId).toBe("anonymous-consultation-session");
    expect(state.lifeStory.lifeArea).toBe("career");
  });

  it("passes chart facts through without mutation or invention", () => {
    const chartFacts = {
      source: "test_fixture" as const,
      facts: [{ key: "lagna", label: "Lagna", value: "Leo", confidence: "high" as const }],
    };

    const state = createEmptyConsultationState({
      userQuestion: "What is my chart?",
      chartFacts,
    });

    expect(state.chartFacts).toBe(chartFacts);
    expect(state.chartFacts?.facts).toHaveLength(1);
    expect(state.chartFacts?.facts[0]).toEqual({
      key: "lagna",
      label: "Lagna",
      value: "Leo",
      confidence: "high",
    });
  });

  it("keeps exact-fact astrology queries from expanding into consultation layers", () => {
    const state = createEmptyConsultationState({
      userQuestion: "Which Mahadasha am I running now?",
    });

    expect(state.intent.primary).toBe("exact_fact");
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.followUp.allowed).toBe(false);
  });

  it("handles decision-support requests with limited bootstrap inference", () => {
    const state = createEmptyConsultationState({
      userQuestion: "Should I quit my job and start business?",
    });

    expect(state.intent.primary).toBe("decision_support");
    expect(state.followUp.allowed).toBe(true);
    expect(state.lifeStory.lifeArea).toBe("career");
    expect(state.remedyPlan).toBeUndefined();
    expect(state.timingJudgement).toBeUndefined();
  });

  it("handles remedy requests without creating a remedy plan", () => {
    const state = createEmptyConsultationState({
      userQuestion: "What remedy should I do for Saturn?",
    });

    expect(state.intent.primary).toBe("remedy");
    expect(state.followUp.allowed).toBe(true);
    expect(state.remedyPlan).toBeUndefined();
  });

  it("uses the life-context extractor for marriage pressure cases", () => {
    const state = createEmptyConsultationState({
      userQuestion: "My parents are pressuring me for marriage but I am not ready.",
    });

    expect(state.lifeStory.lifeArea).toBe("marriage");
    expect(state.lifeStory.currentIssue).toBe("family pressure for marriage despite inner unreadiness");
    expect(state.lifeStory.decisionType).toBe("marriage_readiness");
    expect(state.lifeStory.desiredOutcome).toBe("clarity and reduced pressure");
  });

  it("keeps exact-fact state empty even with extractable context", () => {
    const state = createEmptyConsultationState({
      userQuestion: "What is my Lagna?",
    });

    expect(state.intent.primary).toBe("exact_fact");
    expect(state.lifeStory).toEqual({});
    expect(state.followUp.allowed).toBe(false);
  });
});
