/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildAstroChartContext } from "@/lib/astro/chart-context";

describe("buildAstroChartContext", () => {
  it("builds the Leo basis line from normalized facts only", () => {
    const context = buildAstroChartContext({
      profileId: "profile-1",
      chartVersionId: "chart-1",
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
          mahadasha: "Jupiter",
        },
      },
      predictionSummary: {
        current_timing_summary: "Jupiter Mahadasha",
      },
    });
    expect(context.ready).toBe(true);
    if (context.ready) {
      expect(context.basisLine).toContain("Leo Lagna");
      expect(context.basisLine).toContain("Gemini Moon in the 11th house");
      expect(context.basisLine).toContain("Taurus Sun in the 10th house");
      expect(context.basisLine).toContain("Mrigasira Nakshatra Pada 4");
      expect(context.basisLine).toContain("running Jupiter Mahadasha");
      expect(context.basisLine).not.toContain("Virgo Lagna");
      expect(context.publicFacts.lagnaSign).toBe("Leo");
    }
  });
});
