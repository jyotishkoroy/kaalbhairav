/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { validateAstroAnswerAgainstPublicFacts } from "../../../lib/astro/rag/answer-validator";

const baseFacts = {
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
  antardashaNow: "Saturn",
  placements: {},
  mangalDosha: false,
  kalsarpaYoga: false,
} as never;

describe("validateAstroAnswerAgainstPublicFacts wrong moon house", () => {
  const cases = [
    "Moon is in the 10th house.",
    "Moon house 10.",
    "Chandra is in the 10th house.",
    "Your Moon sign is Gemini and Moon is in the 10th house.",
    "moon is in house 10!!!",
  ];

  for (const answer of cases) {
    it(`rejects: ${answer}`, () => {
      const result = validateAstroAnswerAgainstPublicFacts({ answer, publicFacts: baseFacts });
      expect(result.ok).toBe(false);
    });
  }

  it("rejects concrete moon house when unavailable", () => {
    const result = validateAstroAnswerAgainstPublicFacts({
      answer: "Moon in the 11th house.",
      publicFacts: ({ ...(baseFacts as Record<string, unknown>), moonHouse: undefined, unavailableFacts: { moonHouse: { status: "unavailable", reason: "missing_house_system", message: "x" } } } as never),
    });
    expect(result.ok).toBe(false);
  });
});
