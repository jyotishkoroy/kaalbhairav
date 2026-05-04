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
  antardashaNow: "Saturn",
  placements: {},
  mangalDosha: false,
  kalsarpaYoga: false,
} as never;

describe("validateAstroAnswerAgainstPublicFacts invented transit date", () => {
  const cases = [
    "Marriage will happen on 2026-05-04.",
    "Sade Sati starts on 2026-05-04.",
    "Job change will definitely happen in June 2026.",
    "The exact date is 5 May 2026.",
    "from 2026-05-04 to 2026-06-10",
  ];

  for (const answer of cases) {
    it(`rejects: ${answer}`, () => {
      const result = validateAstroAnswerAgainstPublicFacts({ answer, publicFacts: facts });
      expect(result.ok).toBe(false);
    });
  }
});
