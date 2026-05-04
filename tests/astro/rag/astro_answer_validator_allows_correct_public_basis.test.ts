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

describe("validateAstroAnswerAgainstPublicFacts allows correct public basis", () => {
  it("passes correct lagna", () => expect(validateAstroAnswerAgainstPublicFacts({ answer: "Your Lagna is Leo.", publicFacts: facts }).ok).toBe(true));
  it("passes correct moon sign", () => expect(validateAstroAnswerAgainstPublicFacts({ answer: "Your Moon sign is Gemini.", publicFacts: facts }).ok).toBe(true));
  it("passes correct sun sign", () => expect(validateAstroAnswerAgainstPublicFacts({ answer: "Your Sun is in Taurus.", publicFacts: facts }).ok).toBe(true));
  it("passes correct moon house", () => expect(validateAstroAnswerAgainstPublicFacts({ answer: "Your Moon is in the 11th house.", publicFacts: facts }).ok).toBe(true));
  it("passes correct nakshatra and pada", () => expect(validateAstroAnswerAgainstPublicFacts({ answer: "Your Nakshatra is Mrigashira, Pada 4.", publicFacts: facts }).ok).toBe(true));
  it("passes correct mahadasha", () => expect(validateAstroAnswerAgainstPublicFacts({ answer: "You are running Jupiter Mahadasha.", publicFacts: facts }).ok).toBe(true));
  it("passes interpretive answer without exact claims", () => expect(validateAstroAnswerAgainstPublicFacts({ answer: "This pattern favors steady effort and clear boundaries.", publicFacts: facts }).ok).toBe(true));
});
