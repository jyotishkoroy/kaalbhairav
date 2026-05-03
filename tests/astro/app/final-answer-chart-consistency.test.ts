/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { enforceFinalAnswerChartConsistency } from "@/lib/astro/final-answer-chart-consistency";
import type { NormalizedChartFacts } from "@/lib/astro/normalized-chart-facts";

const leoFacts: NormalizedChartFacts = { lagnaSign: "Leo", moonSign: "Gemini", moonHouse: 11, sunSign: "Taurus", sunHouse: 10, sourcePriority: [], warnings: [] };

describe("enforceFinalAnswerChartConsistency", () => {
  it("rewrites Virgo basis to Leo basis", () => {
    const result = enforceFinalAnswerChartConsistency({ answer: "aadesh: Your Lagna is Virgo. Chart basis: Virgo Lagna, Gemini Moon in the 10th house, Taurus Sun in the 9th house", facts: leoFacts });
    expect(result.answer).toContain("Leo Lagna");
    expect(result.answer).not.toContain("Virgo Lagna");
    expect(result.violations).toContain("wrong_lagna_basis");
  });

  it("removes Retrieval cue and ids", () => {
    const result = enforceFinalAnswerChartConsistency({ answer: "aadesh: Chart basis: Leo Lagna. Retrieval cue: secret fact: profile_id=abc chart_version_id=def", facts: leoFacts });
    expect(result.answer).not.toContain("Retrieval cue:");
    expect(result.answer).not.toContain("fact:");
    expect(result.answer).not.toContain("profile_id");
    expect(result.answer).not.toContain("chart_version_id");
  });

  it("preserves aadesh prefix and already-correct text", () => {
    const answer = "aadesh: Your Lagna is Leo. Chart basis: Leo Lagna, Gemini Moon in the 11th house, Taurus Sun in the 10th house.";
    const result = enforceFinalAnswerChartConsistency({ answer, facts: leoFacts });
    expect(result.answer.startsWith("aadesh:")).toBe(true);
    expect(result.answer).toContain("Leo Lagna");
    expect(result.violations).toHaveLength(0);
  });
});
