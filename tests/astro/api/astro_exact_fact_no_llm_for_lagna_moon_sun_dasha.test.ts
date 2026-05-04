/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 */

import { describe, it, expect } from "vitest";
import { answerExactFactIfPossible } from "@/lib/astro/rag/exact-fact-router";
import type { ChartFact } from "@/lib/astro/rag/chart-fact-extractor";

const F = (factType: string, factKey: string, factValue: string, extra: Partial<ChartFact> = {}): ChartFact => ({
  factType, factKey, factValue,
  source: "chart_json",
  confidence: "deterministic",
  tags: [],
  metadata: {},
  ...extra,
});

const LEO_CHART_FACTS: ChartFact[] = [
  F("lagna", "lagna", "Leo", { sign: "Leo" }),
  F("planet_placement", "moon", "Gemini, house 11", { sign: "Gemini", house: 11, planet: "Moon" }),
  F("planet_placement", "sun", "Taurus, house 10", { sign: "Taurus", house: 10, planet: "Sun" }),
  F("rasi", "moon_sign", "Gemini", { sign: "Gemini" }),
  F("nakshatra", "moon_nakshatra", "Mrigashira"),
  F("nakshatra", "moon_nakshatra_pada", "4"),
  F("dasha", "current_mahadasha", "Jupiter", { planet: "Jupiter" }),
];

describe("astro_exact_fact_no_llm_for_lagna_moon_sun_dasha", () => {
  it("answers Lagna without LLM", () => {
    const result = answerExactFactIfPossible("What is my Lagna?", LEO_CHART_FACTS);
    expect(result.llmUsed).toBe(false);
    expect(result.groqUsed).toBe(false);
    expect(result.ollamaUsed).toBe(false);
    expect(result.source).toBe("deterministic");
    expect(result.answered).toBe(true);
    expect(result.answer).toContain("Leo");
  });

  it("answers Moon sign without LLM", () => {
    const result = answerExactFactIfPossible("What is my Moon sign?", LEO_CHART_FACTS);
    expect(result.llmUsed).toBe(false);
    expect(result.groqUsed).toBe(false);
    expect(result.source).toBe("deterministic");
    expect(result.answered).toBe(true);
    expect(result.answer).toContain("Gemini");
  });

  it("answers current dasha without LLM", () => {
    const result = answerExactFactIfPossible("What is my current dasha?", LEO_CHART_FACTS);
    expect(result.llmUsed).toBe(false);
    expect(result.groqUsed).toBe(false);
    expect(result.source).toBe("deterministic");
    expect(result.answered).toBe(true);
    expect(result.answer).toContain("Jupiter");
  });

  it("answers nakshatra without LLM", () => {
    const result = answerExactFactIfPossible("What is my nakshatra?", LEO_CHART_FACTS);
    expect(result.llmUsed).toBe(false);
    expect(result.groqUsed).toBe(false);
    expect(result.source).toBe("deterministic");
    expect(result.answered).toBe(true);
    expect(result.answer).toContain("Mrigashira");
  });

  it("returns unavailable (not LLM) for missing facts", () => {
    const result = answerExactFactIfPossible("What is my Lagna?", []);
    expect(result.llmUsed).toBe(false);
    expect(result.groqUsed).toBe(false);
    expect(result.source).toBe("deterministic");
    // answered=true with unavailable answer
    expect(result.answer).toBeTruthy();
  });

  it("never returns Virgo when Leo is in chart facts", () => {
    const result = answerExactFactIfPossible("What is my ascendant?", LEO_CHART_FACTS);
    expect(result.answer).not.toContain("Virgo");
    expect(result.answer).toContain("Leo");
  });
});
