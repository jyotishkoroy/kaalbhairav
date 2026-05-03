/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { normalizeAnswerForMatch, scoreAnswerMatch } from "@/lib/astro/benchmark/answer-match";

describe("answer-match", () => {
  it("passes exact matches", () => {
    expect(scoreAnswerMatch({ actual: "aadesh: Your Lagna is Leo.", expected: "aadesh: Your Lagna is Leo." }).exact).toBe(true);
  });
  it("passes normalized spacing and punctuation", () => {
    expect(scoreAnswerMatch({ actual: "aadesh: Your Lagna is Leo", expected: "aadesh:  Your Lagna is Leo." }).normalizedExact).toBe(true);
  });
  it("accepts semantic astrology paraphrases", () => {
    expect(scoreAnswerMatch({ actual: "aadesh: Leo Lagna points to visibility and leadership.", expected: "aadesh: Your Lagna is Leo. This makes leadership central." }).matched).toBe(true);
  });
  it("rejects generic answers", () => {
    expect(scoreAnswerMatch({ actual: "aadesh: Focus on balance and positivity.", expected: "aadesh: Your Moon sign is Gemini." }).matched).toBe(false);
  });
  it("flags internal IDs", () => {
    expect(scoreAnswerMatch({ actual: "aadesh: profile_id=abc chart_version_id=def Your Lagna is Leo.", expected: "aadesh: Your Lagna is Leo." }).matched).toBe(false);
  });
  it("fails deterministic contradictions", () => {
    expect(scoreAnswerMatch({ actual: "aadesh: Your Lagna is Virgo.", expected: "aadesh: Your Lagna is Leo." }).matched).toBe(false);
    expect(scoreAnswerMatch({ actual: "aadesh: Your Lagna is Virgo.", expected: "aadesh: No. Your chart gives Leo Lagna, not Virgo." }).matched).toBe(false);
  });
  it("normalizes aadesh prefix", () => {
    expect(normalizeAnswerForMatch("Aadesh: Your Lagna is Leo!")).toBe("your lagna is leo");
  });
});
