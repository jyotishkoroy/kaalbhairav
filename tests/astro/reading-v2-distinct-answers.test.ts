/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateReadingV2 } from "@/lib/astro/reading/reading-orchestrator-v2";

const ORIGINAL_ENV = process.env;

describe("Reading V2 distinct answer behavior", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.ASTRO_READING_V2_ENABLED = "true";
    process.env.ASTRO_MEMORY_ENABLED = "true";
    process.env.ASTRO_REMEDIES_ENABLED = "true";
    process.env.ASTRO_MONTHLY_ENABLED = "true";
    process.env.ASTRO_LLM_PROVIDER = "disabled";
    process.env.ASTRO_LLM_REFINER_ENABLED = "false";
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("does not return identical safety fallback for unrelated normal questions", async () => {
    const career = await generateReadingV2({
      userId: "distinct-user",
      question: "I am working hard and not getting promotion.",
      mode: "practical_guidance",
    });

    const tomorrow = await generateReadingV2({
      userId: "distinct-user",
      question: "how will be my tomorrow?",
      mode: "timing_prediction",
    });

    const sleep = await generateReadingV2({
      userId: "distinct-user",
      question: "Give me a remedy on my bad sleep cycle.",
      mode: "remedy_focused",
    });
    const careerAnswer = career.answer ?? "";
    const tomorrowAnswer = tomorrow.answer ?? "";
    const sleepAnswer = sleep.answer ?? "";

    const answers = [careerAnswer, tomorrowAnswer, sleepAnswer];

    expect(new Set(answers).size).toBe(3);

    for (const result of [career, tomorrow, sleep]) {
      expect((result.answer ?? "").toLowerCase()).not.toContain("legal professional");
      expect(result.meta?.safetyRiskNames ?? []).not.toContain("legal");
    }

    expect(careerAnswer.toLowerCase()).toMatch(/career|work|promotion|job|effort/);
    expect(sleepAnswer.toLowerCase()).toMatch(/sleep|rest|routine|wellbeing|remedy/);
  });
});
