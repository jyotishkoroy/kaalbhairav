/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateAstrologyReadingWithRouter } from "@/lib/astro/reading/reading-router";

const ORIGINAL_ENV = process.env;

describe("Astro rollout stable path integration", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ASTRO_READING_V2_ENABLED;
    delete process.env.ASTRO_MEMORY_ENABLED;
    delete process.env.ASTRO_REMEDIES_ENABLED;
    delete process.env.ASTRO_MONTHLY_ENABLED;
    delete process.env.ASTRO_LLM_PROVIDER;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("uses the stable generator by default even when other V2 side flags are enabled", async () => {
    process.env.ASTRO_MEMORY_ENABLED = "true";
    process.env.ASTRO_REMEDIES_ENABLED = "true";
    process.env.ASTRO_MONTHLY_ENABLED = "true";
    process.env.ASTRO_LLM_PROVIDER = "ollama";

    const stableGenerator = vi.fn(async () => ({
      answer: "stable path answer",
      meta: {
        version: "stable" as const,
      },
    }));

    const result = await generateAstrologyReadingWithRouter(
      {
        userId: "rollout-user",
        question: "When will my career improve?",
      },
      {
        stableGenerator,
      },
    );

    expect(stableGenerator).toHaveBeenCalledTimes(1);
    expect(result.answer).toBe("stable path answer");
    expect(result.meta?.version).toBe("stable");
  });

  it("uses V2 only when ASTRO_READING_V2_ENABLED is true", async () => {
    process.env.ASTRO_READING_V2_ENABLED = "true";

    const stableGenerator = vi.fn(async () => ({
      answer: "stable path answer",
      meta: {
        version: "stable" as const,
      },
    }));

    const result = await generateAstrologyReadingWithRouter(
      {
        userId: "rollout-user",
        question: "When will my career improve?",
        dasha: {
          mahadasha: "Saturn",
        },
      },
      {
        stableGenerator,
      },
    );

    expect(stableGenerator).not.toHaveBeenCalled();
    expect(result.meta?.version).toBe("v2");
  });
});
