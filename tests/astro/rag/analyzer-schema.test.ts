import { describe, expect, it } from "vitest";
import { buildDeterministicAnalyzerResult, normalizeAnalyzerResult, validateAnalyzerResult } from "../../../lib/astro/rag/analyzer-schema";

describe("analyzer schema", () => {
  it("validates complete Ollama result", () => {
    const result = validateAnalyzerResult({
      language: "en",
      topic: "career",
      questionType: "interpretive",
      riskFlags: ["medical"],
      needsTiming: true,
      needsRemedy: false,
      requiredFacts: ["lagna"],
      retrievalTags: ["career"],
      shouldAskFollowup: false,
      followupQuestion: null,
      confidence: 0.7,
      source: "ollama",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.source).toBe("ollama");
  });

  it("defaults invalid topic to general", () => {
    const result = validateAnalyzerResult({ topic: "weird", questionType: "interpretive" });
    expect(result.ok ? result.value.topic : null).toBe("general");
  });

  it("defaults invalid questionType to general", () => {
    const result = validateAnalyzerResult({ topic: "career", questionType: "weird" });
    expect(result.ok ? result.value.questionType : null).toBe("general");
  });

  it("clamps confidence > 1 to 1", () => {
    const result = validateAnalyzerResult({ confidence: 9 });
    expect(result.ok ? result.value.confidence : null).toBe(1);
  });

  it("clamps confidence < 0 to 0", () => {
    const result = validateAnalyzerResult({ confidence: -1 });
    expect(result.ok ? result.value.confidence : null).toBe(0);
  });

  it("invalid confidence becomes 0.4", () => {
    const result = validateAnalyzerResult({ confidence: "bad" });
    expect(result.ok ? result.value.confidence : null).toBe(0.4);
  });

  it("arrays remove empty strings and duplicates", () => {
    const result = validateAnalyzerResult({ riskFlags: [" medical ", "", "medical"], requiredFacts: [" Lagna ", "", "lagna"], retrievalTags: [" Career ", "career", ""] });
    expect(result.ok ? result.value.riskFlags : null).toEqual(["medical"]);
    expect(result.ok ? result.value.requiredFacts : null).toEqual(["lagna"]);
    expect(result.ok ? result.value.retrievalTags : null).toEqual(["career"]);
  });

  it("invalid arrays become []", () => {
    const result = validateAnalyzerResult({ riskFlags: "x", requiredFacts: 1, retrievalTags: null });
    expect(result.ok ? result.value.riskFlags : null).toEqual([]);
    expect(result.ok ? result.value.requiredFacts : null).toEqual([]);
    expect(result.ok ? result.value.retrievalTags : null).toEqual([]);
  });

  it("invalid booleans become false", () => {
    const result = validateAnalyzerResult({ needsTiming: "yes", needsRemedy: 1, shouldAskFollowup: "no" });
    expect(result.ok ? result.value.needsTiming : null).toBe(false);
    expect(result.ok ? result.value.needsRemedy : null).toBe(false);
    expect(result.ok ? result.value.shouldAskFollowup : null).toBe(false);
  });

  it("invalid followupQuestion becomes null", () => {
    const result = validateAnalyzerResult({ followupQuestion: 123 });
    expect(result.ok ? result.value.followupQuestion : "not").toBeNull();
  });

  it("non-object invalid returns ok false or normalize null", () => {
    expect(validateAnalyzerResult(null).ok).toBe(false);
    expect(normalizeAnalyzerResult("x")).toBeNull();
  });

  it("buildDeterministicAnalyzerResult returns deterministic fallback source", () => {
    const result = buildDeterministicAnalyzerResult({ question: "What is my Lagna?" });
    expect(result.source).toBe("deterministic_fallback");
  });
});
