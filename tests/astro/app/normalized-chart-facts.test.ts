/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildNormalizedChartFacts } from "@/lib/astro/normalized-chart-facts";

const chartJson = {
  public_facts: {
    lagna_sign: "Leo",
    lagna_lord: "Sun",
    rasi_lord: "Mercury",
    nakshatra_lord: "Mars",
    planets: {
      Moon: { sign: "Gemini", house: 11, nakshatra: "Mrigasira", pada: 4 },
      Sun: { sign: "Taurus", house: 10 },
    },
  },
  ascendant: { sign: "Virgo" },
  d1: { lagna: { sign: "Leo" }, moon: { sign: "Gemini", house: 11 }, sun: { sign: "Taurus", house: 10 } },
  prediction_ready_summaries: {
    current_timing_summary: "Jupiter Mahadasha with Jupiter-Ketu until early July 2026, then Jupiter-Venus",
    summary: "Jupiter Mahadasha",
    mahadasha_sequence: [
      { mahadasha: "Jupiter", antardasha: "Ketu", from: "2025-01-01", to: "2026-07-01" },
      { mahadasha: "Jupiter", antardasha: "Venus", from: "2026-07-02", to: "2027-01-01" },
    ],
  },
};

describe("buildNormalizedChartFacts", () => {
  it("prefers report-derived Leo over generic Virgo", () => {
    const facts = buildNormalizedChartFacts({ chartJson, predictionSummary: chartJson.prediction_ready_summaries, reportFacts: chartJson.public_facts });
    expect(facts.lagnaSign).toBe("Leo");
    expect(facts.warnings).toContain("conflicting_lagna_sources");
  });
  it("extracts deterministic placements and timing facts", () => {
    const facts = buildNormalizedChartFacts({ chartJson, predictionSummary: chartJson.prediction_ready_summaries, reportFacts: chartJson.public_facts });
    expect(facts.moonSign).toBe("Gemini");
    expect(facts.moonHouse).toBe(11);
    expect(facts.sunSign).toBe("Taurus");
    expect(facts.sunHouse).toBe(10);
    expect(facts.nakshatra).toBe("Mrigasira");
    expect(facts.nakshatraPada).toBe(4);
    expect(facts.nakshatraLord).toBe("Mars");
    expect(facts.mahadasha).toBe("Jupiter");
    expect(facts.antardashaTimeline?.length).toBe(2);
  });
});
