import { describe, expect, it } from "vitest";
import { selectStructuredReasoningRules } from "../../../lib/astro/rag/reasoning-rule-selector";
import type { AstroReasoningRule, AstroRuleRankingContext } from "../../../lib/astro/rag/types";

function rule(overrides: Partial<AstroReasoningRule>): AstroReasoningRule {
  return {
    ruleId: "r",
    ruleStatement: "rule",
    sourceText: "text",
    sourceReference: "classical",
    sourceReliability: "primary_classical",
    primaryPlanet: null,
    secondaryPlanet: null,
    house: null,
    targetHouse: null,
    sign: null,
    lordship: null,
    dignity: null,
    aspectType: null,
    yogaName: null,
    divisionalChart: null,
    dashaCondition: null,
    transitCondition: null,
    normalizedSourceText: null,
    normalizedSourceReference: null,
    normalizedSourceReliability: null,
    normalizedEmbeddingText: null,
    normalizedPromptCompactSummary: null,
    lifeAreaTags: [],
    conditionTags: [],
    retrievalKeywords: [],
    requiredTags: [],
    enabled: true,
    metadata: { domain: "career" },
    ...overrides,
  };
}

const context: AstroRuleRankingContext = {
  userQuestion: "question",
  domains: ["career"],
  lifeAreaTags: ["career"],
  conditionTags: ["career"],
  chartFactTags: ["career"],
  planets: ["Venus"],
  houses: [7],
  signs: ["Libra"],
  exactFactMode: false,
  safetyBlocked: false,
};

describe("selectStructuredReasoningRules", () => {
  it("ranks chart-specific marriage rule above generic wealth rule", () => {
    const ranked = selectStructuredReasoningRules([
      rule({ ruleId: "generic", ruleStatement: "generic", metadata: { domain: "career" } }),
      rule({ ruleId: "marriage", ruleStatement: "marriage", primaryPlanet: "Venus", house: 7, metadata: { domain: "marriage" }, lifeAreaTags: ["marriage"], conditionTags: ["marriage"] }),
    ], context, { limit: 2 });
    expect(ranked[0].rule.ruleId).toBe("marriage");
  });

  it("prefers primary classical sources", () => {
    const ranked = selectStructuredReasoningRules([
      rule({ ruleId: "modern", sourceReliability: "modern_interpretation", metadata: { domain: "career" } }),
      rule({ ruleId: "classical", sourceReliability: "primary_classical", metadata: { domain: "career" } }),
    ], context, { limit: 2 });
    expect(ranked[0].rule.ruleId).toBe("classical");
  });

  it("penalizes exact fact mode for interpretive rules", () => {
    const ranked = selectStructuredReasoningRules([rule({ ruleId: "interpretive", metadata: { domain: "career" } })], { ...context, exactFactMode: true }, { limit: 1 });
    expect(ranked.length).toBe(0);
  });

  it("deduplicates identical statements", () => {
    const ranked = selectStructuredReasoningRules([
      rule({ ruleId: "a", ruleStatement: "same", metadata: { domain: "career" } }),
      rule({ ruleId: "b", ruleStatement: "same", metadata: { domain: "career" } }),
    ], context, { limit: 2 });
    expect(ranked).toHaveLength(1);
  });
});
