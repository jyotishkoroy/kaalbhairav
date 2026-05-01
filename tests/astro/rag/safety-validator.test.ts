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
    const result = validateAnswerSafety(makeInput({ answer: "I understand the concern. I can't predict death dates." }));
    expect(result.issues).toHaveLength(0);
  });

  it("passes a broader death safety disclaimer", () => {
    const result = validateAnswerSafety(makeInput({ answer: "I would not predict death, lifespan, or death timing." }));
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

  it("passes health non-diagnostic disclaimer", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Astrology cannot diagnose, please speak with a qualified professional." }));
    expect(result.issues).toHaveLength(0);
  });

  it("passes legal disclaimer", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Astrology should not be treated as legal advice." }));
    expect(result.issues).toHaveLength(0);
  });

  it("passes financial planning advice", () => {
    const result = validateAnswerSafety(makeInput({ answer: "The overall pattern matters more than one isolated prediction. Focus on planning and discipline." }));
    expect(result.issues).toHaveLength(0);
  });

  it("passes reassurance that avoids fear", () => {
    const result = validateAnswerSafety(makeInput({ answer: "A responsible reading should reduce fear." }));
    expect(result.issues).toHaveLength(0);
  });

  it("passes safe relationship reflection", () => {
    const result = validateAnswerSafety(makeInput({ answer: "This relationship is not doomed; it may help to reflect on clarity, boundaries, and choice." }));
    expect(result.issues).toHaveLength(0);
  });

  it("passes cannot guarantee business profit", () => {
    const result = validateAnswerSafety(makeInput({ answer: "I cannot guarantee business profit." }));
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

  it("fails actual death date prediction", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Your death date is 2027-01-01." }));
    expect(result.issues.some((issue) => issue.code === "death_lifespan_claim")).toBe(true);
  });

  it("fails actual legal guarantee", () => {
    const result = validateAnswerSafety(makeInput({ answer: "This is a legal guarantee and you will win your case." }));
    expect(result.issues.some((issue) => issue.code === "legal_claim")).toBe(true);
  });

  it("fails actual financial guarantee", () => {
    const result = validateAnswerSafety(makeInput({ answer: "This is a guaranteed profit and 100% return." }));
    expect(result.issues.some((issue) => issue.code === "financial_claim")).toBe(true);
  });

  it("fails actual medical cure language", () => {
    const result = validateAnswerSafety(makeInput({ answer: "This will cure diabetes and replace treatment." }));
    expect(result.issues.some((issue) => issue.code === "medical_claim")).toBe(true);
  });

  it("fails cursed or doomed claim", () => {
    const result = validateAnswerSafety(makeInput({ answer: "Your chart is bad and you are doomed." }));
    expect(result.issues.some((issue) => issue.code === "unsafe_claim")).toBe(true);
  });

  it("fails never find a partner claim", () => {
    const result = validateAnswerSafety(makeInput({ answer: "You will never find a partner." }));
    expect(result.issues.some((issue) => issue.code === "unsafe_claim")).toBe(true);
  });

  it("fails destined to be alone claim", () => {
    const result = validateAnswerSafety(makeInput({ answer: "You are destined to be alone." }));
    expect(result.issues.some((issue) => issue.code === "unsafe_claim")).toBe(true);
  });
});
