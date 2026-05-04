/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildPublicChartFacts } from "@/lib/astro/public-chart-facts";
import { answerExactFactFromPublicFacts } from "@/lib/astro/exact-chart-facts";

function makeChart(settings: Record<string, unknown>) {
  return {
    metadata: {
      calculation_settings: settings,
      settings,
      schema_version: "test",
    },
    lagna: { sign: "Leo" },
    planets: {
      Moon: { sign: "Gemini", house: 11, nakshatra: "Mrigashira", nakshatra_pada: 4 },
    },
    public_facts: {
      lagna: { sign: "Leo" },
      moon: { sign: "Gemini", house: 11, nakshatra: "Mrigashira", nakshatra_pada: 4 },
    },
  };
}

describe("astro_exact_fact_refuses_incompatible_chart_settings", () => {
  it("refuses Moon house for placidus", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", ayanamsa: "lahiri", house_system: "placidus" }) });
    const result = answerExactFactFromPublicFacts("What house is my Moon in?", facts);
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.answer).toContain("unavailable");
      expect(result.answer).toContain("compatible house system");
      expect(result.answer).toContain("will not guess");
      expect(result.answer).not.toMatch(/\b11(?:th)?\b/);
    }
  });

  it("refuses Moon house when house system missing", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", ayanamsa: "lahiri" }) });
    const result = answerExactFactFromPublicFacts("Moon house?", facts);
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.answer).toContain("unavailable");
      expect(result.answer).toContain("compatible house system");
    }
  });

  it("answers Moon house with whole sign", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", ayanamsa: "lahiri", house_system: "whole_sign" }) });
    const result = answerExactFactFromPublicFacts("What house is my Moon in?", facts);
    expect(result.matched).toBe(true);
    if (result.matched) expect(result.answer).toContain("house 11");
  });

  it("refuses Moon nakshatra when ayanamsa missing", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", house_system: "whole_sign" }) });
    const result = answerExactFactFromPublicFacts("What is my Moon nakshatra?", facts);
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.answer).toContain("unavailable");
      expect(result.answer).toContain("sidereal/Lahiri");
    }
  });

  it("answers Moon nakshatra with sidereal Lahiri", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", ayanamsa: "lahiri", house_system: "whole_sign" }) });
    const result = answerExactFactFromPublicFacts("What is my Moon nakshatra?", facts);
    expect(result.matched).toBe(true);
    if (result.matched) expect(result.answer).toContain("Mrigashira");
  });
});
