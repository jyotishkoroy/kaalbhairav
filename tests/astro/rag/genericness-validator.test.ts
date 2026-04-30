// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { validateGenericness } from "../../../lib/astro/rag/validators/genericness-validator";
import { fakeContract, makeInput } from "./test-fixtures";

describe("genericness validator", () => {
  it("passes an anchored career answer", () => {
    const result = validateGenericness(makeInput({ contract: fakeContract({ answerMode: "interpretive" }), answer: "Leo Lagna and Taurus 10th house support career growth." }));
    expect(result.issues.some((issue) => issue.code === "generic_answer")).toBe(false);
  });

  it("fails stay positive advice", () => {
    const result = validateGenericness(makeInput({ contract: fakeContract({ answerMode: "interpretive" }), answer: "Stay positive and work hard." }));
    expect(result.issues.some((issue) => issue.code === "generic_answer")).toBe(true);
  });

  it("fails vague improvement language", () => {
    const result = validateGenericness(makeInput({ contract: fakeContract({ answerMode: "interpretive" }), answer: "Things will improve." }));
    expect(result.issues.some((issue) => issue.code === "generic_answer")).toBe(true);
  });

  it("fails repeated sentence", () => {
    const result = validateGenericness(makeInput({ contract: fakeContract({ answerMode: "interpretive" }), answer: "Leo Lagna helps. Leo Lagna helps." }));
    expect(result.issues.some((issue) => issue.code === "too_repetitive")).toBe(true);
  });

  it("passes a short exact fact answer", () => {
    const result = validateGenericness(makeInput({ contract: fakeContract({ domain: "exact_fact", answerMode: "exact_fact" }), answer: "Sun Taurus." }));
    expect(result.issues.some((issue) => issue.code === "too_short")).toBe(false);
  });

  it("passes a short safety refusal", () => {
    const result = validateGenericness(makeInput({ contract: fakeContract({ domain: "safety", answerMode: "safety" }), answer: "I cannot predict death dates." }));
    expect(result.issues.some((issue) => issue.code === "too_short")).toBe(false);
  });

  it("passes a follow-up-only response in followup mode", () => {
    const result = validateGenericness(makeInput({ contract: fakeContract({ domain: "general", answerMode: "followup" }), answer: "Could you share your birth time?" }));
    expect(result.issues.some((issue) => issue.code === "too_short")).toBe(false);
  });
});
