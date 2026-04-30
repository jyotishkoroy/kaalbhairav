import { describe, expect, it } from "vitest";
import { buildDefaultCriticResult, normalizeLocalCriticResult, validateLocalCriticResult } from "../../../lib/astro/rag/critic-schema";

describe("critic schema", () => {
  it("validates complete critic result", () => {
    const result = validateLocalCriticResult({
      answersQuestion: true,
      tooGeneric: false,
      missingAnchors: ["a"],
      missingSections: ["b"],
      unsafeClaims: ["c"],
      wrongFacts: ["d"],
      companionToneScore: 0.8,
      shouldRetry: true,
      correctionInstruction: "Fix it",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects non-object values", () => {
    expect(validateLocalCriticResult(null).ok).toBe(false);
    expect(validateLocalCriticResult("x").ok).toBe(false);
  });

  it("defaults invalid booleans in normalize", () => {
    expect(normalizeLocalCriticResult({ answersQuestion: "yes", tooGeneric: 1, shouldRetry: "no" })?.answersQuestion).toBe(false);
  });

  it("defaults missing arrays", () => {
    expect(normalizeLocalCriticResult({})?.missingAnchors).toEqual([]);
  });

  it("trims dedupes and removes empty array values", () => {
    expect(normalizeLocalCriticResult({ missingAnchors: [" a ", "", "A", "b"] })?.missingAnchors).toEqual(["a", "b"]);
  });

  it("clamps score above 1", () => {
    expect(normalizeLocalCriticResult({ companionToneScore: 2 })?.companionToneScore).toBe(1);
  });

  it("clamps score below 0", () => {
    expect(normalizeLocalCriticResult({ companionToneScore: -2 })?.companionToneScore).toBe(0);
  });

  it("defaults invalid score", () => {
    expect(normalizeLocalCriticResult({ companionToneScore: "x" })?.companionToneScore).toBe(0.5);
  });

  it("trims correction instruction", () => {
    expect(normalizeLocalCriticResult({ correctionInstruction: "  hi  " })?.correctionInstruction).toBe("hi");
  });

  it("caps correction instruction at 1200", () => {
    expect(normalizeLocalCriticResult({ correctionInstruction: "x".repeat(1300) })?.correctionInstruction.length).toBe(1200);
  });

  it("defaults missing shouldRetry", () => {
    expect(normalizeLocalCriticResult({})?.shouldRetry).toBe(false);
  });

  it("defaults missing answersQuestion", () => {
    expect(normalizeLocalCriticResult({})?.answersQuestion).toBe(false);
  });

  it("preserves wrongFacts array", () => {
    expect(normalizeLocalCriticResult({ wrongFacts: ["fact"] })?.wrongFacts).toEqual(["fact"]);
  });

  it("preserves unsafeClaims array", () => {
    expect(normalizeLocalCriticResult({ unsafeClaims: ["unsafe"] })?.unsafeClaims).toEqual(["unsafe"]);
  });

  it("preserves missingAnchors array", () => {
    expect(normalizeLocalCriticResult({ missingAnchors: ["lagna"] })?.missingAnchors).toEqual(["lagna"]);
  });

  it("preserves missingSections array", () => {
    expect(normalizeLocalCriticResult({ missingSections: ["accuracy"] })?.missingSections).toEqual(["accuracy"]);
  });

  it("builds default result", () => {
    expect(buildDefaultCriticResult().companionToneScore).toBe(0.5);
  });

  it("builds default result with overrides", () => {
    expect(buildDefaultCriticResult({ shouldRetry: true }).shouldRetry).toBe(true);
  });

  it("does not throw on malformed input", () => {
    expect(() => normalizeLocalCriticResult({ correctionInstruction: { bad: true } })).not.toThrow();
  });
});
