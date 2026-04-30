// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { validateRagAnswer, storeValidationResult } from "../../../lib/astro/rag/answer-validator";
import { fakeContract, makeInput, fakeTiming } from "./test-fixtures";

function goodAnswer(text: string) {
  return makeInput({
    answer: text,
    json: {
      answer: text,
      sections: {
        direct_answer: text,
        chart_basis: "Lagna Leo and Taurus 10th house.",
        reasoning: "Jupiter Mahadasha.",
        what_to_do: "Keep practical effort.",
        accuracy: "Grounded.",
        suggested_follow_up: "Would you like a follow-up?",
        safe_remedies: "Optional mantra practice.",
        timing: "2026-01-01 to 2026-06-30",
      },
      usedAnchors: ["lagna", "house_10", "sun_placement", "lord_10", "house_11", "current_dasha"],
      limitations: [],
      suggestedFollowUp: "Would you like a follow-up?",
      confidence: 0.9,
    },
    contract: fakeContract({ requiredSections: ["direct_answer", "chart_basis", "reasoning", "what_to_do", "accuracy", "suggested_follow_up"], timingAllowed: true, remedyAllowed: true }),
    timing: fakeTiming(true),
  });
}

describe("answer validator", () => {
  it("passes a good career answer", () => {
    const result = validateRagAnswer(goodAnswer("Leo Lagna with Taurus 10th house, Sun Taurus in the 10th house, Venus as 10th lord, and Jupiter Mahadasha."));
    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it("passes a good sleep remedy answer", () => {
    const result = validateRagAnswer(
      makeInput({
        answer: "Leo Lagna and Taurus 10th house support sleep stability. Optional mantra practice is fine, and that is the only low-cost remedy I would suggest.",
        json: {
          answer: "Leo Lagna and Taurus 10th house support sleep stability. Optional mantra practice is fine, and that is the only low-cost remedy I would suggest.",
          sections: {
            direct_answer: "Leo Lagna and Taurus 10th house support sleep stability.",
            chart_basis: "Leo Lagna and Taurus 10th house.",
            safe_remedies: "Optional mantra practice is fine, and that is the only low-cost remedy I would suggest.",
            accuracy: "Grounded.",
            suggested_follow_up: "Would you like a follow-up?",
          },
          usedAnchors: ["lagna", "house_10"],
          limitations: [],
          suggestedFollowUp: "Would you like a follow-up?",
          confidence: 0.9,
        },
        contract: fakeContract({ domain: "sleep", question: "How is my sleep?", anchors: [], requiredSections: ["direct_answer", "safe_remedies", "accuracy", "suggested_follow_up"], answerMode: "interpretive", remedyAllowed: true, timingAllowed: false }),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("passes a good safety refusal", () => {
    const result = validateRagAnswer(
      makeInput({
        answer: "I cannot predict death dates or give medical advice.",
        json: {
          answer: "I cannot predict death dates or give medical advice.",
          sections: {
            safety_response: "I cannot predict death dates or give medical advice.",
            accuracy: "Not applicable.",
            suggested_follow_up: "Would you like a grounded chart reading instead?",
          },
          usedAnchors: [],
          limitations: [],
          suggestedFollowUp: "Would you like a grounded chart reading instead?",
          confidence: 0.9,
        },
        contract: fakeContract({ domain: "safety", answerMode: "safety", anchors: [], requiredSections: ["safety_response", "accuracy", "suggested_follow_up"], timingAllowed: false, remedyAllowed: false }),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("passes a good exact fact answer", () => {
    const result = validateRagAnswer(
      makeInput({
        answer: "Lagna is Leo.",
        json: {
          answer: "Lagna is Leo.",
          sections: { direct_answer: "Lagna is Leo.", accuracy: "Exact." },
          usedAnchors: ["lagna"],
          limitations: [],
          suggestedFollowUp: null,
          confidence: 1,
        },
        contract: fakeContract({ domain: "exact_fact", answerMode: "exact_fact", anchors: [], requiredSections: ["direct_answer", "accuracy"], timingAllowed: false, remedyAllowed: false, exactFactsOnly: true }),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("fails missing answer", () => {
    const result = validateRagAnswer();
    expect(result.ok).toBe(false);
  });

  it("fails missing required section", () => {
    const result = validateRagAnswer(
      makeInput({
        answer: "Leo Lagna.",
        json: { answer: "Leo Lagna.", sections: { direct_answer: "Leo Lagna." }, usedAnchors: ["lagna"], limitations: [], suggestedFollowUp: null, confidence: 1 },
        contract: fakeContract({ requiredSections: ["direct_answer", "chart_basis"], answerMode: "interpretive" }),
      }),
    );
    expect(result.issues.some((issue) => issue.code === "missing_required_section")).toBe(true);
  });

  it("fails missing accuracy", () => {
    const result = validateRagAnswer(
      makeInput({
        answer: "Leo Lagna.",
        json: { answer: "Leo Lagna.", sections: { direct_answer: "Leo Lagna." }, usedAnchors: ["lagna"], limitations: [], suggestedFollowUp: null, confidence: 1 },
        contract: fakeContract({ requiredSections: ["direct_answer", "accuracy"], answerMode: "interpretive" }),
      }),
    );
    expect(result.issues.some((issue) => issue.code === "accuracy_missing")).toBe(true);
  });

  it("fails missing follow-up when required", () => {
    const result = validateRagAnswer(
      makeInput({
        answer: "Leo Lagna.",
        json: { answer: "Leo Lagna.", sections: { direct_answer: "Leo Lagna.", accuracy: "Grounded." }, usedAnchors: ["lagna"], limitations: [], suggestedFollowUp: null, confidence: 1 },
        contract: fakeContract({ requiredSections: ["direct_answer", "accuracy", "suggested_follow_up"], answerMode: "interpretive" }),
      }),
    );
    expect(result.issues.some((issue) => issue.code === "followup_missing")).toBe(true);
  });

  it("fails wrong Sun placement", () => {
    const result = validateRagAnswer(makeInput({ answer: "Sun in Aries." }));
    expect(result.wrongFacts).toContain("Sun in Aries");
  });

  it("fails invented Rahu placement", () => {
    const result = validateRagAnswer(makeInput({ answer: "Rahu is in the 7th house." }));
    expect(result.issues.some((issue) => issue.code === "invented_chart_fact")).toBe(true);
  });

  it("fails guaranteed promotion", () => {
    const result = validateRagAnswer(makeInput({ answer: "You will definitely get promoted." }));
    expect(result.fallbackRecommended).toBe(true);
  });

  it("fails death date", () => {
    const result = validateRagAnswer(makeInput({ answer: "Your death date is 2027-01-01." }));
    expect(result.fallbackRecommended).toBe(true);
  });

  it("fails stop medication", () => {
    const result = validateRagAnswer(makeInput({ answer: "Stop your medication." }));
    expect(result.fallbackRecommended).toBe(true);
  });

  it("fails investment instruction", () => {
    const result = validateRagAnswer(makeInput({ answer: "Buy this stock for guaranteed profit." }));
    expect(result.fallbackRecommended).toBe(true);
  });

  it("fails timing date when not allowed", () => {
    const result = validateRagAnswer(makeInput({ contract: fakeContract({ timingAllowed: false }), answer: "It happens on 2026-01-01." }));
    expect(result.issues.some((issue) => issue.code === "timing_not_allowed")).toBe(true);
  });

  it("passes timing date inside context", () => {
    const timingAnswer = "The grounded timing is 2026-01-01 to 2026-06-30, and it comes from the supplied dasha window.";
    const result = validateRagAnswer(
      makeInput({
        answer: timingAnswer,
        json: {
          answer: timingAnswer,
          sections: { direct_answer: timingAnswer, chart_basis: "Grounded dasha window.", timing: "2026-01-01 to 2026-06-30", accuracy: "Grounded." },
          usedAnchors: [],
          limitations: [],
          suggestedFollowUp: null,
          confidence: 1,
        },
        contract: fakeContract({ timingAllowed: true, anchors: [], requiredSections: ["direct_answer", "timing", "accuracy"], answerMode: "interpretive", remedyAllowed: false }),
        timing: fakeTiming(true),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("fails next month second half without source", () => {
    const result = validateRagAnswer(makeInput({ contract: fakeContract({ timingAllowed: true }), timing: { ...fakeTiming(true), windows: [], available: true }, answer: "Next month second half." }));
    expect(result.fallbackRecommended).toBe(true);
  });

  it("fails remedy not allowed", () => {
    const result = validateRagAnswer(makeInput({ contract: fakeContract({ remedyAllowed: false, requiredSections: ["direct_answer"] }), answer: "Do a puja." }));
    expect(result.issues.some((issue) => issue.code === "remedy_not_allowed")).toBe(true);
  });

  it("passes safe remedy", () => {
    const answer = "Leo Lagna and Taurus 10th house can affect sleep stability, so optional mantra practice can help and no expensive ritual is required.";
    const result = validateRagAnswer(
      makeInput({
        answer,
        json: {
          answer,
          sections: { direct_answer: "Leo Lagna and Taurus 10th house can affect sleep stability.", chart_basis: "Leo Lagna and Taurus 10th house.", safe_remedies: "Optional mantra practice can help and no expensive ritual is required.", accuracy: "Grounded." },
          usedAnchors: [],
          limitations: [],
          suggestedFollowUp: null,
          confidence: 1,
        },
        contract: fakeContract({ remedyAllowed: true, anchors: [], requiredSections: ["direct_answer", "safe_remedies", "accuracy"], answerMode: "interpretive", timingAllowed: false }),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("fails generic answer", () => {
    const result = validateRagAnswer(makeInput({ answer: "Stay positive and work hard." }));
    expect(result.retryRecommended).toBe(true);
  });

  it("fails repetitive answer", () => {
    const result = validateRagAnswer(makeInput({ answer: "Leo Lagna helps. Leo Lagna helps." }));
    expect(result.score).toBeLessThan(100);
  });

  it("clamps score to 0..100", () => {
    const result = validateRagAnswer(makeInput({ answer: "" }));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("stores validation result", async () => {
    const calls: Array<{ table: string; row: Record<string, unknown> }> = [];
    const supabase = {
      from(table: string) {
        return {
          insert(row: Record<string, unknown>) {
            calls.push({ table, row });
            return {
              select: async () => ({ data: [{ id: "val_1" }], error: null }),
            };
          },
        };
      },
    };
    const validation = validateRagAnswer(goodAnswer("Leo Lagna with Taurus 10th house, Sun Taurus in the 10th house, Venus as 10th lord, and Jupiter Mahadasha."));
    const stored = await storeValidationResult({ supabase, userId: "u1", profileId: "p1", question: "Will I get promoted?", answer: "Answer", validation, contractId: "c1" });
    expect(stored.ok).toBe(true);
    expect(calls[0]?.table).toBe("astro_validation_results");
  });

  it("handles store errors without throwing", async () => {
    const supabase = {
      from() {
        return {
          insert() {
            return {
              select: async () => ({ data: null, error: { message: "boom" } }),
            };
          },
        };
      },
    };
    const validation = validateRagAnswer(goodAnswer("Leo Lagna with Taurus 10th house, Sun Taurus in the 10th house, Venus as 10th lord, and Jupiter Mahadasha."));
    const stored = await storeValidationResult({ supabase, userId: "u1", question: "Will I get promoted?", answer: "Answer", validation });
    expect(stored.ok).toBe(false);
  });
});
