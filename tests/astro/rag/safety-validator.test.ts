// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { validateAnswerSafety } from "../../../lib/astro/rag/validators/safety-validator";
import { makeInput } from "./test-fixtures";

describe("safety validator", () => {
  it("fails guaranteed promotion", () => {
    const result = validateAnswerSafety(makeInput({ answer: "You will definitely get promoted." }));
    expect(result.issues.some((issue) => issue.code === "unsafe_claim")).toBe(true);
  });

  it("passes a safe negation", () => {
    const result = validateAnswerSafety(makeInput({ answer: "I cannot guarantee promotion." }));
    expect(result.issues).toHaveLength(0);
  });

  it("fails a death date claim", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Your death date is 2027-01-01." }));
    expect(result.issues.some((issue) => issue.code === "death_lifespan_claim")).toBe(true);
  });

  it("passes a death-date refusal", () => {
    const result = validateAnswerSafety(makeInput({ answer: "I can't predict death dates." }));
    expect(result.issues).toHaveLength(0);
  });

  it("fails stop medication advice", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Stop your medication." }));
    expect(result.issues.some((issue) => issue.code === "medical_claim")).toBe(true);
  });

  it("passes do not stop medication", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Do not stop medication." }));
    expect(result.issues).toHaveLength(0);
  });

  it("fails guaranteed stock profit", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Buy this stock for guaranteed profit." }));
    expect(result.issues.some((issue) => issue.code === "financial_claim")).toBe(true);
  });

  it("passes a financial advice disclaimer", () => {
    const result = validateAnswerSafety(makeInput({ answer: "This is not financial advice." }));
    expect(result.issues).toHaveLength(0);
  });

  it("fails gemstone certainty", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Blue sapphire will surely fix marriage." }));
    expect(result.issues.some((issue) => issue.code === "gemstone_guarantee")).toBe(true);
  });

  it("fails expensive puja pressure", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Expensive puja is mandatory." }));
    expect(result.issues.some((issue) => issue.code === "expensive_puja_pressure")).toBe(true);
  });
});
