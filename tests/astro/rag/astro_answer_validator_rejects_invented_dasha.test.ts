/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { validateAstroAnswerAgainstPublicFacts } from "../../../lib/astro/rag/answer-validator";

const facts = {
  profileId: "profile-test",
  chartVersionId: "chart-test",
  source: "merged",
  confidence: "complete",
  warnings: [],
  unavailableFacts: {},
  lagnaSign: "Leo",
  moonSign: "Gemini",
  sunSign: "Taurus",
  moonHouse: 11,
  sunHouse: 10,
  nakshatra: "Mrigashira",
  nakshatraPada: 4,
  mahadasha: "Jupiter",
  antardashaNow: undefined,
  placements: {},
  mangalDosha: false,
  kalsarpaYoga: false,
} as never;

describe("validateAstroAnswerAgainstPublicFacts invented dasha", () => {
  const cases = [
    "Venus Mahadasha.",
    "current dasha is Saturn.",
    "Jupiter-Ketu is active.",
    "Rahu Mahadasha.",
    "Jupiter / Saturn is not your current period.",
  ];

  for (const answer of cases) {
    it(`rejects: ${answer}`, () => {
      const result = validateAstroAnswerAgainstPublicFacts({ answer, publicFacts: facts });
      expect(result.ok).toBe(false);
    });
  }

  it("rejects concrete mahadasha when unavailable", () => {
    const result = validateAstroAnswerAgainstPublicFacts({
      answer: "Jupiter Mahadasha.",
      publicFacts: ({ ...(facts as Record<string, unknown>), mahadasha: undefined } as never),
    });
    expect(result.ok).toBe(false);
  });
});
