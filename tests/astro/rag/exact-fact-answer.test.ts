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

    expect(formatted).toContain("Direct answer:");
    expect(formatted).toContain("How this is derived:");
    expect(formatted).toContain("Accuracy:");
    expect(formatted).toContain("Suggested follow-up:");
    expect(formatted).toContain("Totally accurate — this is a deterministic chart fact.");
  });

  it("formats unavailable facts", () => {
    const formatted = formatExactFactAnswer(unavailableExactFactAnswer("planet_placement:mars"));

    expect(formatted).toContain("I do not have that exact chart fact available");
    expect(formatted).toContain("Unavailable — this exact fact is not available from the current structured data.");
    expect(formatted).not.toContain("Totally accurate");
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
