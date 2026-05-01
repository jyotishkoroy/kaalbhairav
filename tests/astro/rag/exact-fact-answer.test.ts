import { describe, expect, it } from "vitest";
import { formatExactFactAnswer, unavailableExactFactAnswer } from "../../../lib/astro/rag/exact-fact-answer";

describe("exact fact answer formatting", () => {
  it("formats answered facts", () => {
    const formatted = formatExactFactAnswer({
      directAnswer: "Your Lagna is Leo.",
      derivation: "This is directly read from lagna lagna in the structured chart data.",
      accuracy: "totally_accurate",
      suggestedFollowUp: "You can ask which planet rules your Lagna.",
      factKeys: ["lagna"],
    });

    expect(formatted).toContain("Direct answer: Your Lagna is Leo.");
    expect(formatted).toContain("This is a deterministic chart fact read from the chart data.");
    expect(formatted).not.toContain("How this is derived:");
    expect(formatted).not.toContain("Accuracy:");
    expect(formatted).not.toContain("Suggested follow-up:");
  });

  it("formats unavailable facts", () => {
    const formatted = formatExactFactAnswer(unavailableExactFactAnswer("planet_placement:mars"));

    expect(formatted).toContain("Direct answer: I do not have that exact chart fact available in the structured chart data yet. Missing: planet_placement:mars.");
    expect(formatted).toContain("Unavailable — this exact fact is not available from the current structured data.");
    expect(formatted).not.toContain("How this is derived:");
    expect(formatted).not.toContain("Accuracy:");
  });

  it("keeps unavailable wording deterministic", () => {
    const answer = unavailableExactFactAnswer("house_4");
    expect(answer.accuracy).toBe("unavailable");
    expect(answer.factKeys).toEqual(["house_4"]);
    expect(answer.derivation).toContain("deterministic router");
  });

  it("does not require markdown tables", () => {
    const formatted = formatExactFactAnswer({
      directAnswer: "A",
      derivation: "B",
      accuracy: "totally_accurate",
      suggestedFollowUp: "C",
      factKeys: [],
    });
    expect(formatted).not.toContain("|");
  });
});
