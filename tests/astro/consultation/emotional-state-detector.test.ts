/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";

describe("detectEmotionalState", () => {
  it("detects comparison anxiety", () => {
    const result = detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." });
    expect(result.primaryEmotion).toBe("comparison");
    expect(result.secondaryEmotions).toEqual(expect.arrayContaining(["anxiety", "stagnation", "self-worth pressure"]));
    expect(result.intensity).toBe("medium");
    expect(result.toneNeeded).toBe("reassuring");
    expect(result.safetyFlags).toEqual(expect.arrayContaining(["avoid_fear_language", "avoid_absolute_prediction"]));
  });

  it("detects marriage exhaustion", () => {
    const result = detectEmotionalState({ question: "I am tired of waiting. Will I ever get married?" });
    expect(result.primaryEmotion).toBe("exhaustion");
    expect(result.secondaryEmotions).toEqual(expect.arrayContaining(["fear", "anxiety"]));
    expect(result.intensity).toBe("high");
    expect(result.toneNeeded).toBe("gentle");
    expect(result.safetyFlags).toEqual(expect.arrayContaining(["avoid_fear_language", "avoid_absolute_prediction", "avoid_harsh_karma_language"]));
  });

  it("detects fear about making the wrong decision", () => {
    const result = detectEmotionalState({ question: "I am scared I will make the wrong decision." });
    expect(result.primaryEmotion).toBe("fear");
    expect(result.intensity).toBe("high");
    expect(result.toneNeeded).toBe("gentle");
    expect(result.safetyFlags).toEqual(expect.arrayContaining(["avoid_fear_language", "avoid_absolute_prediction"]));
  });

  it("detects confusion and decision paralysis", () => {
    const result = detectEmotionalState({ question: "I am confused and cannot decide whether to marry this person." });
    expect(result.primaryEmotion).toBe("confusion");
    expect(result.toneNeeded).toBe("analytical");
    expect(result.safetyFlags).toEqual(expect.arrayContaining(["avoid_absolute_prediction"]));
  });

  it("detects grief after heartbreak", () => {
    const result = detectEmotionalState({ question: "I am devastated after heartbreak and cannot move on." });
    expect(result.primaryEmotion).toBe("grief");
    expect(result.intensity).toBe("high");
    expect(result.toneNeeded).toBe("gentle");
    expect(result.safetyFlags).toEqual(expect.arrayContaining(["avoid_fear_language", "avoid_harsh_karma_language"]));
  });

  it("detects anger at blocked progress", () => {
    const result = detectEmotionalState({ question: "I am angry and frustrated because my manager keeps blocking me." });
    expect(result.primaryEmotion).toBe("anger");
    expect(result.toneNeeded).toBe("direct");
    expect(result.safetyFlags).toEqual(expect.arrayContaining(["avoid_absolute_prediction"]));
  });

  it("detects hope", () => {
    const result = detectEmotionalState({ question: "I feel hopeful. Can things improve in my career?" });
    expect(result.primaryEmotion).toBe("hope");
    expect(result.toneNeeded).toBe("reassuring");
    expect(result.safetyFlags).toEqual(expect.arrayContaining(["avoid_absolute_prediction"]));
    expect(result.safetyFlags).not.toContain("suggest_professional_support");
  });

  it("keeps exact-style questions neutral", () => {
    const result = detectEmotionalState({ question: "What is my Lagna?" });
    expect(result.primaryEmotion).toBe("neutral");
    expect(result.intensity).toBe("low");
    expect(result.toneNeeded).toBe("direct");
    expect(result.safetyFlags).toEqual([]);
  });

  it("handles skeptical users with analytical tone", () => {
    const result = detectEmotionalState({ question: "I am skeptical. Explain this logically and not mystically." });
    expect(result.primaryEmotion).toBe("neutral");
    expect(result.secondaryEmotions).toEqual(expect.arrayContaining(["skepticism"]));
    expect(result.toneNeeded).toBe("analytical");
    expect(result.safetyFlags).toEqual([]);
  });

  it("handles skeptical anxiety with clear reasoning", () => {
    const result = detectEmotionalState({ question: "I don't believe vague astrology, but I am anxious about my marriage timing." });
    expect(result.primaryEmotion).toBe("anxiety");
    expect(result.secondaryEmotions).toEqual(expect.arrayContaining(["skepticism"]));
    expect(result.toneNeeded).toBe("analytical");
    expect(result.safetyFlags).toEqual(expect.arrayContaining(["avoid_absolute_prediction"]));
  });

  it("flags severe self-harm distress for support", () => {
    const result = detectEmotionalState({ question: "I feel like I might harm myself." });
    expect(result.intensity).toBe("high");
    expect(result.toneNeeded).toBe("grounding");
    expect(result.safetyFlags).toEqual(expect.arrayContaining([
      "suggest_professional_support",
      "avoid_fear_language",
      "avoid_absolute_prediction",
      "avoid_harsh_karma_language",
    ]));
  });

  it("flags danger and abuse for support", () => {
    const result = detectEmotionalState({ question: "I feel unsafe because of violence at home." });
    expect(result.intensity).toBe("high");
    expect(result.toneNeeded).toBe("grounding");
    expect(result.safetyFlags).toContain("suggest_professional_support");
  });

  it("handles empty input", () => {
    const result = detectEmotionalState({ question: "     " });
    expect(result.primaryEmotion).toBe("neutral");
    expect(result.intensity).toBe("low");
    expect(result.secondaryEmotions).toEqual([]);
    expect(result.safetyFlags).toEqual([]);
  });

  it("prefers grief over anxiety on loss language", () => {
    const result = detectEmotionalState({ question: "I am anxious and devastated after this loss." });
    expect(result.primaryEmotion).toBe("grief");
  });

  it("prefers fear over comparison when urgency is present", () => {
    const result = detectEmotionalState({ question: "Everyone around me is settled and I am scared I am running out of time." });
    expect(result.primaryEmotion).toBe("fear");
    expect(result.secondaryEmotions).toEqual(expect.arrayContaining(["comparison", "urgency"]));
    expect(result.safetyFlags).toContain("avoid_harsh_karma_language");
  });

  it("adds stagnation for stuck language", () => {
    const result = detectEmotionalState({ question: "I feel stuck in life." });
    expect(result.secondaryEmotions).toContain("stagnation");
  });

  it("integrates into consultation state for non-exact-fact requests", () => {
    const state = createEmptyConsultationState({
      userQuestion: "I am tired of waiting. Will I ever get married?",
    });

    expect(state.intent.primary).not.toBe("exact_fact");
    expect(state.emotionalState.primary).toBe("exhaustion");
    expect(state.emotionalState.intensity).toBe("high");
    expect(state.emotionalState.toneNeeded).toBe("gentle");
  });

  it("keeps exact-fact state empty for emotionalState and lifeStory", () => {
    const state = createEmptyConsultationState({
      userQuestion: "What is my Lagna?",
    });

    expect(state.intent.primary).toBe("exact_fact");
    expect(state.emotionalState).toEqual({});
    expect(state.lifeStory).toEqual({});
    expect(state.followUp.allowed).toBe(false);
  });

  it("preserves Phase 2 life extraction", () => {
    const result = extractLifeContext({ question: "Should I quit my job and start my own business?" });
    expect(result.lifeArea).toBe("career");
    expect(result.decisionType).toBe("business_transition");
  });
});
