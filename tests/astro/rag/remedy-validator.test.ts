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

  it("fails cure insomnia language", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "This will cure insomnia." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("fails stop medicine advice", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: true, requiredSections: ["direct_answer", "safe_remedies"] }), answer: "Stop medicine now." }));
    expect(result.some((issue) => issue.code === "unsafe_remedy")).toBe(true);
  });

  it("passes restricted-remedy limitation text when remedies are not allowed", () => {
    const result = validateAnswerRemedies(makeInput({ contract: fakeContract({ remedyAllowed: false, requiredSections: ["direct_answer"] }), answer: "Remedies are restricted here." }));
    expect(result).toHaveLength(0);
  });
});
