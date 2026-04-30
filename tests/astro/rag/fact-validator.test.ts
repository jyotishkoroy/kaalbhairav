// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { validateFactGrounding } from "../../../lib/astro/rag/validators/fact-validator";
import { fakeContext, fakeContract, makeInput } from "./test-fixtures";

const groundedAnswer = "Leo Lagna with Taurus 10th house, Sun Taurus in the 10th house, Venus as 10th lord, Gemini 11th house, Moon Gemini in the 11th house, Mercury Gemini in the 11th house, and Jupiter Mahadasha.";

describe("fact validator", () => {
  it("accepts a grounded career answer using required anchors", () => {
    const result = validateFactGrounding(makeInput({ answer: groundedAnswer }));
    expect(result.issues).toHaveLength(0);
    expect(result.missingAnchors).toEqual([]);
    expect(result.wrongFacts).toEqual([]);
  });

  it("flags Sun in Aries when context says Taurus", () => {
    const result = validateFactGrounding(makeInput({ answer: "Your Sun is in Aries." }));
    expect(result.wrongFacts).toContain("Sun in Aries");
  });

  it("flags Moon sign Cancer when context says Gemini", () => {
    const result = validateFactGrounding(makeInput({ answer: "Your Moon sign is Cancer." }));
    expect(result.wrongFacts).toContain("Moon in Cancer");
  });

  it("flags Scorpio Lagna when context says Leo", () => {
    const result = validateFactGrounding(makeInput({ answer: "You have Scorpio Lagna." }));
    expect(result.wrongFacts).toContain("Scorpio Lagna");
  });

  it("flags 10th house Aries when context says Taurus", () => {
    const result = validateFactGrounding(makeInput({ answer: "The 10th house is Aries." }));
    expect(result.wrongFacts).toContain("10th house Aries");
  });

  it("flags 10th lord Mars when context says Venus", () => {
    const result = validateFactGrounding(makeInput({ answer: "The 10th lord is Mars." }));
    expect(result.wrongFacts).toContain("10th lord Mars");
  });

  it("flags Venus in 10th when context says house 12", () => {
    const result = validateFactGrounding(makeInput({ answer: "Venus is placed in the 10th house." }));
    expect(result.wrongFacts).toContain("Venus in 10th");
  });

  it("flags invented Rahu placement when the chart facts do not supply it", () => {
    const result = validateFactGrounding(
      makeInput({
        answer: "Rahu is in the 7th house.",
        contract: fakeContract({ anchors: fakeContract().anchors.filter((anchor) => anchor.key !== "house_11" && anchor.key !== "current_dasha") }),
      }),
    );
    expect(result.issues.some((issue) => issue.code === "invented_chart_fact")).toBe(true);
  });

  it("satisfies a required anchor from usedAnchors", () => {
    const result = validateFactGrounding(
      makeInput({
        answer: "Grounded answer.",
        json: { answer: "Grounded answer.", sections: { direct_answer: "Grounded answer." }, usedAnchors: ["lagna", "house_10", "sun_placement", "lord_10", "house_11", "current_dasha"], limitations: [], suggestedFollowUp: null, confidence: 0 },
      }),
    );
    expect(result.issues.some((issue) => issue.code === "missing_required_anchor")).toBe(false);
  });

  it("satisfies a required anchor from section text", () => {
    const result = validateFactGrounding(
      makeInput({
        answer: "Grounded answer.",
        json: {
          answer: "Grounded answer.",
          sections: {
            direct_answer: "Grounded answer.",
            chart_basis: "Lagna Leo and Taurus 10th house.",
            reasoning: "Jupiter Mahadasha.",
          },
          usedAnchors: [],
          limitations: [],
          suggestedFollowUp: null,
          confidence: 0,
        },
      }),
    );
    expect(result.missingAnchors).not.toContain("lagna");
    expect(result.missingAnchors).not.toContain("house_10");
  });

  it("treats optional anchors as optional", () => {
    const result = validateFactGrounding(
      makeInput({
        answer: groundedAnswer,
        contract: fakeContract({
          anchors: fakeContract().anchors.map((anchor) => ({ ...anchor, required: anchor.key !== "house_11" })),
        }),
      }),
    );
    expect(result.issues.some((issue) => issue.code === "missing_required_anchor" && issue.evidence === "house_11")).toBe(false);
  });

  it("does not flag generic astrology teaching as an invented chart fact", () => {
    const result = validateFactGrounding(makeInput({ answer: "The 10th house represents career and public status." }));
    expect(result.issues.some((issue) => issue.code === "invented_chart_fact")).toBe(false);
  });

  it("accepts supported phrase variations", () => {
    const result = validateFactGrounding(makeInput({ answer: groundedAnswer }));
    expect(result.issues.some((issue) => issue.code === "wrong_chart_fact")).toBe(false);
  });

  it("uses fact snippets from reasoning and timing as allowed grounding", () => {
    const result = validateFactGrounding(
      makeInput({
        answer: "Jupiter Mahadasha is the backdrop for timing.",
        context: fakeContext(),
      }),
    );
    expect(result.missingAnchors).not.toContain("current_dasha");
  });
});
