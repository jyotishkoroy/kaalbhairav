/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { answerExactFactIfPossible, detectExactFactIntent } from "../../../lib/astro/rag/exact-fact-router";

const baseFacts = [
  { factType: "lagna", factKey: "lagna", factValue: "Leo", sign: "Leo", source: "chart_json", confidence: "deterministic", tags: ["lagna"], metadata: {} },
  { factType: "rasi", factKey: "moon_sign", factValue: "Gemini", sign: "Gemini", source: "chart_json", confidence: "deterministic", tags: ["moon"], metadata: {} },
  { factType: "nakshatra", factKey: "moon_nakshatra", factValue: "Mrigasira", source: "chart_json", confidence: "deterministic", tags: ["moon", "nakshatra"], metadata: {} },
  { factType: "planet_placement", factKey: "sun", factValue: "Sun in Taurus 28-51-52, Mrigasira pada 2, house 10", planet: "Sun", house: 10, sign: "Taurus", degreeNumeric: 28.86, source: "chart_json", confidence: "deterministic", tags: ["sun", "house_10"], metadata: {} },
  { factType: "house", factKey: "house_10", factValue: "Taurus", sign: "Taurus", house: 10, source: "chart_json", confidence: "deterministic", tags: ["house_10"], metadata: {} },
  { factType: "house_lord", factKey: "lord_10", factValue: "Venus", planet: "Venus", sign: "Taurus", house: 10, source: "chart_json", confidence: "deterministic", tags: ["lord_10"], metadata: {} },
  { factType: "dasha", factKey: "current_mahadasha", factValue: "Jupiter Mahadasha 2020-2036", planet: "Jupiter", source: "chart_json", confidence: "deterministic", tags: ["dasha"], metadata: {} },
  { factType: "dasha", factKey: "current_antardasha", factValue: "Venus Antardasha 2025-2027", planet: "Venus", source: "chart_json", confidence: "deterministic", tags: ["dasha"], metadata: {} },
] as const;

function answer(question: string, facts = baseFacts as never) {
  return answerExactFactIfPossible({ question, facts: facts as never });
}

function text(result: ReturnType<typeof answer>) {
  return result.answer ?? "";
}

describe("exact fact router", () => {
  it("detects exact fact intents deterministically", () => {
    expect(detectExactFactIntent("What is my Lagna?")).toBe("lagna");
    expect(detectExactFactIntent("Where is Sun placed?")).toBe("planet_placement");
    expect(detectExactFactIntent("Which planet rules the 10th house?")).toBe("house_lord");
    expect(detectExactFactIntent("Which Mahadasha am I running now?")).toBe("dasha_period");
    expect(detectExactFactIntent("Which Antardasha should be active around 2026 according to my report?")).toBe("dasha_period");
  });

  it.each([
    "Which Mahadasha am I running now?",
    "Which dasha am I running now?",
    "What is my current Vimshottari Mahadasha?",
    "What is my current Antardasha?",
    "Which Antardasha should be active around 2026 according to my report?",
  ])("routes dasha exact facts: %s", (question) => {
    const result = answer(question);
    expect(result.answered).toBe(true);
    expect(result.intent).toBe("dasha_period");
    expect(result.llmUsed).toBe(false);
    expect(result.groqUsed).toBe(false);
    expect(result.ollamaUsed).toBe(false);
  });

  it("supports direct exact facts and placement facts", () => {
    const cases = [
      ["What is my Lagna?", "Leo", "lagna"],
      ["What is my ascendant?", "Leo", "lagna"],
      ["Where is Sun placed?", "Taurus", "planet_placement"],
      ["What is my Moon sign?", "Gemini", "moon_sign"],
      ["Which sign is in the 10th house?", "Taurus", "house_sign"],
    ] as const;
    for (const [question, expected, intent] of cases) {
      const result = answer(question);
      expect(result.answered).toBe(true);
      expect(result.intent).toBe(intent);
      expect(text(result)).toContain(expected);
    }
  });

  it("keeps long-horizon dasha predictions and emotional prompts out of the exact-fact dasha bucket", () => {
    expect(detectExactFactIntent("Give me a 10 year prediction from my dasha")).toBe("current_dasha");
    expect(detectExactFactIntent("How do I emotionally handle my dasha?")).toBe("current_dasha");
  });
});
