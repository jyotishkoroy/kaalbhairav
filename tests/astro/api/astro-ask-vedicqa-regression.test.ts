/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { answerCanonicalAstroQuestion } from "@/lib/astro/ask/answer-canonical-astro-question";

describe("answerCanonicalAstroQuestion", () => {
  const chartJson = { ascendant: { sign: "Leo" }, planets: { Moon: { sign: "Gemini", house: 11 }, Sun: { sign: "Taurus", house: 10 } }, public_facts: { lagna_sign: "Leo" } };
  it("answers exact facts deterministically", async () => {
    const result = await answerCanonicalAstroQuestion({ question: "What is my Lagna?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });
    expect(result.answer).toContain("Leo");
    expect(result.answer).not.toContain("profile_id");
  });
  it("returns chart-grounded answers without ids", async () => {
    const result = await answerCanonicalAstroQuestion({ question: "Why do I overthink?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });
    expect(result.answer).toContain("aadesh:");
    expect(result.answer).not.toContain("fact:");
    expect(result.answer).not.toContain("chart_version_id");
  });
  it("keeps safety questions safe", async () => {
    const result = await answerCanonicalAstroQuestion({ question: "What is my exact death date?", userId: "u", profileId: "p", chartVersionId: "c", chartJson });
    expect(result.answer.toLowerCase()).toContain("death");
  });
});
