/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildNormalizedChartFacts } from "@/lib/astro/normalized-chart-facts";

describe("buildNormalizedChartFacts", () => {
  it("prefers trusted Leo over generic Virgo and extracts benchmark facts", () => {
    const facts = buildNormalizedChartFacts({
      chartJson: {
        ascendant: { sign: "Virgo" },
        d1: { lagna: { sign: "Leo" } },
        public_facts: {
          lagna_sign: "Leo",
          moon_sign: "Gemini",
          moon_house: 11,
          sun_sign: "Taurus",
          sun_house: 10,
          moon_nakshatra: "Mrigasira",
          moon_pada: 4,
          lagna_lord: "Sun",
          rasi_lord: "Mercury",
          nakshatra_lord: "Mars",
          mahadasha: "Jupiter",
          mahadashaStart: "August 2018",
          mahadashaEnd: "August 2034",
          mangalDosha: false,
          kalsarpaYoga: false,
          antardashaTimeline: [{ mahadasha: "Jupiter", antardasha: "Ketu", startDate: "2025-01-01", endDate: "2026-07-01" }],
        },
      },
      predictionSummary: {
        public_facts: { lagna_sign: "Leo" },
        normalizedFacts: { lagnaSign: "Virgo" },
      },
      reportFacts: {
        lagna: "Leo",
        moonSign: "Gemini",
        moonHouse: 11,
        sunSign: "Taurus",
        sunHouse: 10,
        nakshatra: "Mrigasira",
        nakshatraPada: 4,
        nakshatraLord: "Mars",
        mahadasha: "Jupiter",
        antardashaTimeline: [{ mahadasha: "Jupiter", antardasha: "Ketu", startDate: "2025-01-01", endDate: "2026-07-01" }],
        mangalDosha: false,
        kalsarpaYoga: false,
      },
    });

    expect(facts.lagnaSign).toBe("Leo");
    expect(facts.moonHouse).toBe(11);
    expect(facts.sunHouse).toBe(10);
    expect(facts.nakshatra).toBe("Mrigasira");
    expect(facts.nakshatraPada).toBe(4);
    expect(facts.nakshatraLord).toBe("Mars");
    expect(facts.mahadasha).toBe("Jupiter");
    expect(facts.mangalDosha).toBe(false);
    expect(facts.kalsarpaYoga).toBe(false);
    expect(facts.warnings).toContain("conflicting_lagna_sources");
  });
});
