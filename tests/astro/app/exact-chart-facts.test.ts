/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildAstroChartContext } from "@/lib/astro/chart-context";
import { answerExactChartFactQuestion } from "@/lib/astro/exact-chart-facts";

const context = buildAstroChartContext({
  profileId: "profile-1",
  chartVersionId: "chart-1",
  chartJson: {
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
      antardashaTimeline: [
        { mahadasha: "Jupiter", antardasha: "Ketu", startDate: "2025-01-01", endDate: "2026-07-01" },
        { mahadasha: "Jupiter", antardasha: "Venus", startDate: "2026-07-02", endDate: "2027-01-01" },
      ],
      mangalDosha: false,
      kalsarpaYoga: false,
      westernSunSign: "Gemini",
    },
    ascendant: { sign: "Virgo" },
  },
  predictionSummary: {
    current_timing_summary: "Jupiter Mahadasha",
    antardashaTimeline: [
      { mahadasha: "Jupiter", antardasha: "Ketu", startDate: "2025-01-01", endDate: "2026-07-01" },
      { mahadasha: "Jupiter", antardasha: "Venus", startDate: "2026-07-02", endDate: "2027-01-01" },
    ],
  },
});

describe("answerExactChartFactQuestion", () => {
  it("answers benchmark exact facts and avoids wrong Virgo basis", () => {
    if (!context.ready) throw new Error("chart not ready");
    const lagna = answerExactChartFactQuestion({ question: "What is my Lagna?", chartContext: context });
    const lagnaVirgo = answerExactChartFactQuestion({ question: "Is my Lagna Virgo?", chartContext: context });
    const moon = answerExactChartFactQuestion({ question: "What is my Moon sign?", chartContext: context });
    const nak = answerExactChartFactQuestion({ question: "What is my Nakshatra?", chartContext: context });
    const sun = answerExactChartFactQuestion({ question: "What is my Sun sign in the Vedic chart?", chartContext: context });
    if (lagna.matched !== true || lagnaVirgo.matched !== true || moon.matched !== true || nak.matched !== true || sun.matched !== true) throw new Error("expected matched exact answers");
    expect(lagna.answer).toContain("Leo");
    expect(lagnaVirgo.answer).toContain("No");
    expect(moon.answer).toContain("Gemini");
    expect(nak.answer).toContain("Mrigasira");
    expect(sun.answer).toContain("Taurus");
    const mahadasha = answerExactChartFactQuestion({ question: "Which Mahadasha am I running now?", chartContext: context });
    const antardasha = answerExactChartFactQuestion({ question: "What Antardasha am I in around mid-2026?", chartContext: context });
    const manglik = answerExactChartFactQuestion({ question: "Am I Manglik?", chartContext: context });
    const kalsarpa = answerExactChartFactQuestion({ question: "Do I have Kalsarpa Dosha?", chartContext: context });
    expect(mahadasha.matched).toBe(true);
    expect(antardasha.matched).toBe(true);
    expect(manglik.matched).toBe(true);
    expect(kalsarpa.matched).toBe(true);
    if (mahadasha.matched !== true || antardasha.matched !== true || manglik.matched !== true || kalsarpa.matched !== true) throw new Error("expected matched exact answers");
    expect(mahadasha.answer).toContain("Jupiter Mahadasha");
    expect(antardasha.answer).toContain("Jupiter-Ketu");
    expect(manglik.answer).toContain("No");
    expect(kalsarpa.answer).toContain("No");
  });

  it("keeps metadata out of unavailable answers", () => {
    if (!context.ready) throw new Error("chart not ready");
    const result = answerExactChartFactQuestion({ question: "What is my Mars sign?", chartContext: context });
    expect(result.matched).toBe(false);
  });
});
