import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateReadingV2 } from "@/lib/astro/reading/reading-orchestrator-v2";

const ORIGINAL_ENV = process.env;

describe("Reading V2 regression behavior", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.ASTRO_READING_V2_ENABLED = "true";
    process.env.ASTRO_MEMORY_ENABLED = "true";
    process.env.ASTRO_REMEDIES_ENABLED = "true";
    process.env.ASTRO_MONTHLY_ENABLED = "true";
    process.env.ASTRO_LLM_PROVIDER = "disabled";
    delete process.env.ASTRO_LLM_REFINER_ENABLED;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns career-specific output for promotion question", async () => {
    const result = await generateReadingV2({
      userId: "regression-user",
      question: "I am working hard and not getting promotion.",
      mode: "practical_guidance",
    });
    const answer = result.answer ?? "";
    const meta = result.meta ?? {};

    expect(meta.topic).toBe("career");
    expect(meta.safetyRiskNames ?? []).not.toContain("medical");
    expect(meta.safetyRiskNames ?? []).not.toContain("legal");
    expect(meta.safetyReplacedAnswer).toBe(false);
    expect(answer.toLowerCase()).toMatch(/career|work|promotion|effort|job/);
  });

  it("returns timing/general guidance for tomorrow question without medical/legal replacement", async () => {
    const result = await generateReadingV2({
      userId: "regression-user",
      question: "how will be my tomorrow?",
      mode: "timing_prediction",
    });
    const answer = result.answer ?? "";
    const meta = result.meta ?? {};

    expect(meta.safetyRiskNames ?? []).not.toContain("medical");
    expect(meta.safetyRiskNames ?? []).not.toContain("legal");
    expect(meta.safetyReplacedAnswer).toBe(false);
    expect(answer.toLowerCase()).not.toContain("qualified doctor");
    expect(answer.toLowerCase()).not.toContain("legal professional");
  });

  it("returns safe remedy guidance for sleep remedy without legal replacement", async () => {
    const result = await generateReadingV2({
      userId: "regression-user",
      question: "Give me a remedy on my bad sleep cycle.",
      mode: "remedy_focused",
    });
    const answer = result.answer ?? "";
    const meta = result.meta ?? {};

    expect(meta.topic).toBe("health");
    expect(meta.safetyRiskNames ?? []).not.toContain("legal");
    expect(answer.toLowerCase()).toMatch(/sleep|rest|routine|wellbeing|remedy/);
  });

  it("still applies medical safety for disease question", async () => {
    const result = await generateReadingV2({
      userId: "regression-user",
      question: "Do I have a serious disease according to my chart?",
      mode: "practical_guidance",
    });
    const answer = result.answer ?? "";
    const meta = result.meta ?? {};

    expect(meta.safetyRiskNames ?? []).toContain("medical");
    expect(answer.toLowerCase()).toContain("qualified doctor");
  });

  it("still applies death safety for lifespan question", async () => {
    const result = await generateReadingV2({
      userId: "regression-user",
      question: "Can my chart tell when I will die?",
      mode: "practical_guidance",
    });
    const answer = result.answer ?? "";
    const meta = result.meta ?? {};

    expect(meta.safetyRiskNames ?? []).toContain("death");
    expect(answer.toLowerCase()).not.toMatch(/you will die on|death date/);
  });
});
