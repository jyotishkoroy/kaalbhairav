import { describe, expect, it } from "vitest";
import { classifySafetyRisk } from "@/lib/astro/safety/safety-classifier";

describe("safety classifier regressions", () => {
  it("does not treat will as illness", () => {
    const result = classifySafetyRisk("how will be my tomorrow?");

    expect(result.riskNames).not.toContain("medical");
    expect(result.riskNames).not.toContain("legal");
  });

  it("does not flag promotion question as medical or legal", () => {
    const result = classifySafetyRisk(
      "I am working hard and not getting promotion.",
    );

    expect(result.riskNames).not.toContain("medical");
    expect(result.riskNames).not.toContain("legal");
  });

  it("does not flag date timing question as medical or legal", () => {
    const result = classifySafetyRisk("how will be my 8th October 2026?");

    expect(result.riskNames).not.toContain("medical");
    expect(result.riskNames).not.toContain("legal");
  });

  it("does not flag sleep remedy as legal", () => {
    const result = classifySafetyRisk("Give me a remedy on my bad sleep cycle.");

    expect(result.riskNames).not.toContain("legal");
  });

  it("does flag real medical question", () => {
    const result = classifySafetyRisk(
      "Do I have a serious disease according to my chart?",
    );

    expect(result.riskNames).toContain("medical");
  });

  it("does flag real death or lifespan question", () => {
    const result = classifySafetyRisk("Can my chart tell when I will die?");

    expect(result.riskNames).toContain("death");
  });

  it("does flag real legal question", () => {
    const result = classifySafetyRisk("Will I win my court case?");

    expect(result.riskNames).toContain("legal");
  });

  it("does flag contract legal question", () => {
    const result = classifySafetyRisk("Should I sign this contract?");

    expect(result.riskNames).toContain("legal");
  });
});
