import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateAstrologyReadingWithRouter } from "@/lib/astro/reading/reading-router";

const ORIGINAL_ENV = process.env;

describe("Astro V2 full system smoke", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("keeps stable path default when all experimental side flags are enabled but V2 flag is off", async () => {
    delete process.env.ASTRO_READING_V2_ENABLED;
    process.env.ASTRO_MEMORY_ENABLED = "true";
    process.env.ASTRO_REMEDIES_ENABLED = "true";
    process.env.ASTRO_MONTHLY_ENABLED = "true";
    process.env.ASTRO_LLM_PROVIDER = "ollama";

    const result = await generateAstrologyReadingWithRouter(
      {
        userId: "smoke-user",
        question: "When will my career improve?",
      },
      {
        stableGenerator: async () => ({
          answer: "stable smoke answer",
          meta: {
            version: "stable" as const,
          },
        }),
      },
    );

    expect(result.answer).toBe("stable smoke answer");
    expect(result.meta?.version).toBe("stable");
  });

  it("runs V2 safely when only V2 flag is enabled", async () => {
    process.env.ASTRO_READING_V2_ENABLED = "true";
    delete process.env.ASTRO_MEMORY_ENABLED;
    delete process.env.ASTRO_REMEDIES_ENABLED;
    delete process.env.ASTRO_MONTHLY_ENABLED;
    delete process.env.ASTRO_LLM_PROVIDER;

    const result = await generateAstrologyReadingWithRouter(
      {
        userId: "smoke-user",
        question: "Do I have a serious disease according to my chart?",
        dasha: {
          mahadasha: "Saturn",
        },
      },
      {
        stableGenerator: async () => ({
          answer: "stable smoke answer",
          meta: {
            version: "stable" as const,
          },
        }),
      },
    );

    expect(result.meta?.version).toBe("v2");
    expect(result.meta?.safetyLayer).toBe("enabled_phase_8");
    expect(result.meta?.safetyRiskNames).toContain("medical");
    expect(String(result.answer ?? "")).toContain("qualified doctor");
  });
});
