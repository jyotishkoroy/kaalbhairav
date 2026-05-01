/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect } from "vitest";
import { parseQuestionBankMarkdown, splitRules } from "../../../lib/astro/e2e/question-bank-parser.ts";

describe("parseQuestionBankMarkdown", () => {
  it("parses a single normal case", () => {
    const content = `## 1.
Question: What is my Lagna?
Answer: Your Lagna is Leo.
Mode: exact_fact
Rule: exact_lagna
`;
    const result = parseQuestionBankMarkdown({ sourcePath: "test.md", content });
    expect(result.cases).toHaveLength(1);
    expect(result.cases[0]).toMatchObject({
      number: 1,
      question: "What is my Lagna?",
      expectedAnswer: "Your Lagna is Leo.",
      mode: "exact_fact",
      rules: ["exact_lagna"],
      rawRule: "exact_lagna",
    });
    expect(result.warnings).toHaveLength(0);
  });

  it("parses a case with multiple pipe-separated rules", () => {
    const content = `## 2.
Question: Which Mahadasha am I running?
Answer: Jupiter Mahadasha from 2018 to 2034.
Mode: companion
Rule: exact_jupiter_dasha | exact_dasha_current | dasha_interpretation
`;
    const result = parseQuestionBankMarkdown({ sourcePath: "test.md", content });
    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].rules).toEqual([
      "exact_jupiter_dasha",
      "exact_dasha_current",
      "dasha_interpretation",
    ]);
    expect(result.cases[0].rawRule).toBe("exact_jupiter_dasha | exact_dasha_current | dasha_interpretation");
  });

  it("parses a case with a multi-line answer", () => {
    const content = `## 3.
Question: Tell me about my career.
Answer: Your Sun is in the 10th house. This supports career authority.
Mercury in the 11th house supports networks and visibility.
Mode: companion
Rule: career_fact_evidence_split
`;
    const result = parseQuestionBankMarkdown({ sourcePath: "test.md", content });
    expect(result.cases).toHaveLength(1);
    const answer = result.cases[0].expectedAnswer;
    expect(answer).toContain("Sun is in the 10th house");
    expect(answer).toContain("Mercury in the 11th house");
  });

  it("warns and skips a case with missing Mode field", () => {
    const content = `## 4.
Question: What is my Moon sign?
Answer: Your Moon is in Gemini.
Rule: exact_moon
`;
    const result = parseQuestionBankMarkdown({ sourcePath: "test.md", content });
    expect(result.cases).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/missing Mode/);
    expect(result.warnings[0]).toMatch(/4/);
  });

  it("warns and skips a case with an invalid Mode value", () => {
    const content = `## 5.
Question: Am I lucky?
Answer: Luck is subjective.
Mode: oracle_mode
Rule: some_rule
`;
    const result = parseQuestionBankMarkdown({ sourcePath: "test.md", content });
    expect(result.cases).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/invalid Mode/);
    expect(result.warnings[0]).toMatch(/oracle_mode/);
  });

  it("parses 2 cases in sequence with correct headings", () => {
    const content = `## 1.
Question: What is my Lagna?
Answer: Leo Lagna.
Mode: exact_fact
Rule: exact_lagna

## 2.
Question: Where is my Moon?
Answer: Moon in Gemini 11th house.
Mode: companion
Rule: exact_moon
`;
    const result = parseQuestionBankMarkdown({ sourcePath: "test.md", content });
    expect(result.cases).toHaveLength(2);
    expect(result.cases[0].number).toBe(1);
    expect(result.cases[1].number).toBe(2);
    expect(result.cases[0].mode).toBe("exact_fact");
    expect(result.cases[1].mode).toBe("companion");
  });

  it("trims spaces from rule list entries", () => {
    const rules = splitRules("  rule_one  |  rule_two  |   rule_three   ");
    expect(rules).toEqual(["rule_one", "rule_two", "rule_three"]);
  });
});
