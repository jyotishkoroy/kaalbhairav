import { describe, expect, it } from "vitest";
import { packAstroRagPromptContext } from "../../../lib/astro/rag/prompt-packer";
import type { AstroRankedReasoningRule } from "../../../lib/astro/rag/types";

const rules = Array.from({ length: 10 }, (_, index) => ({
  rule: {
    ruleId: `r${index}`,
    ruleStatement: index < 2 ? "same" : `rule ${index}`,
    sourceText: `source ${index}`,
    sourceReference: `ref ${index}`,
    sourceReliability: "primary_classical",
    normalizedSourceText: `source ${index}`,
    normalizedSourceReference: `ref ${index}`,
    normalizedSourceReliability: "primary_classical",
    normalizedPromptCompactSummary: `summary ${index}`,
    lifeAreaTags: [],
    conditionTags: [],
    retrievalKeywords: [],
    requiredTags: [],
    enabled: true,
    metadata: {},
  },
  score: 100 - index,
  rankingReasons: [],
  rejectionReasons: [],
} satisfies AstroRankedReasoningRule));

describe("packAstroRagPromptContext", () => {
  it("caps rules and deduplicates statements", () => {
    const packed = packAstroRagPromptContext({ rankedRules: rules, options: { maxRules: 8 } });
    expect(packed.includedRuleIds.length).toBeLessThanOrEqual(8);
    expect(new Set(packed.includedRuleIds).size).toBe(packed.includedRuleIds.length);
  });

  it("includes compact source metadata", () => {
    const packed = packAstroRagPromptContext({ rankedRules: rules.slice(0, 1) });
    expect(packed.text).toContain("source primary_classical");
    expect(packed.text).toContain("Caveat:");
  });

  it("omits examples unless enabled", () => {
    const packed = packAstroRagPromptContext({ rankedRules: rules.slice(0, 1), examples: [{ id: "e1", exampleKey: "e1", domain: "career", question: "q", answer: "a", reasoning: null, accuracyClass: null, readingStyle: null, followUpQuestion: null, tags: [], enabled: true, metadata: {} }] });
    expect(packed.text).not.toContain("Example e1");
  });

  it("truncates under max characters", () => {
    const packed = packAstroRagPromptContext({ rankedRules: rules, options: { maxCharacters: 200 } });
    expect(packed.truncated).toBe(true);
  });

  it("does not include raw JSON", () => {
    const packed = packAstroRagPromptContext({ rankedRules: rules.slice(0, 1) });
    expect(packed.text).not.toContain('"ruleId"');
  });
});
