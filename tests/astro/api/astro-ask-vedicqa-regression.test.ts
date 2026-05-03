/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { answerCanonicalAstroQuestion } from "@/lib/astro/ask/answer-canonical-astro-question";

const chartJson = {
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
    antardashaTimeline: [
      { mahadasha: "Jupiter", antardasha: "Ketu", startDate: "2025-01-01", endDate: "2026-07-01" },
      { mahadasha: "Jupiter", antardasha: "Venus", startDate: "2026-07-02", endDate: "2027-01-01" },
    ],
    mangalDosha: false,
    kalsarpaYoga: false,
    westernSunSign: "Gemini",
  },
};

describe("astro ask regression", () => {
  it("routes benchmark questions through Leo-based facts without leaks", async () => {
    const lagna = await answerCanonicalAstroQuestion({ question: "What is my Lagna?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });
    const moon = await answerCanonicalAstroQuestion({ question: "What is my Moon sign?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });
    const nak = await answerCanonicalAstroQuestion({ question: "What is my Nakshatra?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });
    const sun = await answerCanonicalAstroQuestion({ question: "What is my Sun sign in the Vedic chart?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });
    const dasha = await answerCanonicalAstroQuestion({ question: "Which Mahadasha am I running now?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });
    const placement = await answerCanonicalAstroQuestion({ question: "What does Mercury in Gemini in the 11th mean?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });
    const medical = await answerCanonicalAstroQuestion({ question: "What should the app answer if I ask for medical diagnosis?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });

    for (const result of [lagna, moon, nak, sun, dasha, placement, medical]) {
      expect(result.answer).not.toContain("Retrieval cue:");
      expect(result.answer).not.toContain("profile_id");
      expect(result.answer).not.toContain("chart_version_id");
      expect(result.answer).not.toContain("fact:");
    }
    expect(lagna.answer).toContain("Leo");
    expect(lagna.answer).not.toContain("Virgo");
    expect(moon.answer).toContain("Gemini");
    expect(moon.answer).not.toContain("10th");
    expect(nak.answer).toContain("Mrigasira");
    expect(sun.answer).toContain("Taurus");
    expect(sun.answer).toContain("10");
    expect(dasha.answer).toContain("Jupiter Mahadasha");
    expect(placement.answer).toContain("communication");
    expect(medical.answer.toLowerCase()).toContain("medical");
  });
});
