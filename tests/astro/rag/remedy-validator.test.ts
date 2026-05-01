// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { validateAnswerRemedies } from "../../../lib/astro/rag/validators/remedy-validator";
import { fakeContract, makeInput } from "./test-fixtures";

describe("remedy validator", () => {
  it("passes optional mantra practice", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "An optional mantra or breathing practice can help." }));
    expect(result).toHaveLength(0);
  });

  it("passes safe night routine", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "A simple, low-cost bedtime routine can help." }));
    expect(result).toHaveLength(0);
  });

  it("passes safe sleep routine with optional support", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "For sleep, keep the remedy simple, low-cost, and non-fear-based. Try a steady routine tonight." }));
    expect(result).toHaveLength(0);
  });

  it("passes safe calming practice", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "Hanuman Chalisa is an optional calming practice if helpful." }));
    expect(result).toHaveLength(0);
  });

  it("passes remedy without money pressure", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "Use a simple routine and keep it low-cost." }));
    expect(result).toHaveLength(0);
  });

  it("fails must do puja", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "You must do puja." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("fails payment pressure", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "Pay 50000 rupees for the remedy." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("fails gemstone certainty", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "Blue sapphire will guarantee success." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("fails expensive puja pressure with scary wording", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "You must buy this expensive puja." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("fails cure insomnia language", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "This will cure insomnia." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("fails stop medicine advice", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "Stop medicine now." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("fails stop treatment advice", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "Stop treatment and use mantra only." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("fails expensive puja pressure", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "A costly puja is mandatory and you must pay 50000 rupees." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("fails gemstone fixes everything claim", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "A blue sapphire will fix all my problems." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("passes restricted-remedy limitation text when remedies are not allowed", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: false, requiredSections: ["direct_answer"] }), answer: "Remedies are restricted here." }));
    expect(result).toHaveLength(0);
  });
});
