/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import {
  mapListeningSafetyRisksToExistingSafety,
  normalizeListeningAnalysis,
  sanitizeListeningStringArray,
  sanitizeListeningText,
  shouldUseListeningAnalyzer,
  validateListeningAnalysis,
} from "../../../lib/astro/listening/listening-policy";
import { buildDeterministicListeningFallback } from "../../../lib/astro/listening/listening-fallback";

const fallback = buildDeterministicListeningFallback({ question: "Will I get promoted?" });

describe("listening policy validation", () => {
  it("valid JSON normalizes", () => {
    const raw = {
      topic: "career",
      emotionalTone: "anxious",
      emotionalNeed: "reassurance",
      userSituationSummary: "career question",
      acknowledgementHint: "I hear this matters.",
      missingContext: ["career_context"],
      shouldAskFollowUp: true,
      followUpQuestion: "What is your job?",
      safetyRisks: ["medical"],
      humanizationHints: ["be warm"],
      source: "ollama",
      confidence: "high",
    };
    expect(validateListeningAnalysis(raw).ok).toBe(true);
    expect(normalizeListeningAnalysis(raw, fallback).topic).toBe("career");
  });
  it("invalid object falls back", () => expect(validateListeningAnalysis(null).ok).toBe(false));
  it("missing topic falls back", () => expect(validateListeningAnalysis({ emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], confidence: "low" }).ok).toBe(false));
  it("unknown topic falls back", () => expect(validateListeningAnalysis({ topic: "x", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], confidence: "low" }).ok).toBe(false));
  it("unknown emotionalTone falls back", () => expect(validateListeningAnalysis({ topic: "career", emotionalTone: "x", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], confidence: "low" }).ok).toBe(false));
  it("unknown emotionalNeed falls back", () => expect(validateListeningAnalysis({ topic: "career", emotionalTone: "anxious", emotionalNeed: "x", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], confidence: "low" }).ok).toBe(false));
  it("unknown safety risk is removed", () => expect(normalizeListeningAnalysis({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: ["x"], humanizationHints: [], confidence: "low" }, fallback).safetyRisks).toEqual([]));
  it("arrays clamp max length", () => expect(sanitizeListeningStringArray(["a", "b", "c", "d", "e"], 3)).toHaveLength(3));
  it("long strings clamp", () => expect(sanitizeListeningText("x".repeat(500), 50).length).toBeLessThanOrEqual(50));
  it("markdown stripped", () => expect(sanitizeListeningText("**hello** _world_").includes("*")).toBe(false));
  it("email redacted", () => expect(sanitizeListeningText("test@example.com")).toContain("[REDACTED_EMAIL]"));
  it("phone redacted", () => expect(sanitizeListeningText("Call +1 (555) 123-4567")).toContain("[REDACTED_PHONE]"));
  it("token-like secret redacted", () => expect(sanitizeListeningText("sk-test-secret")).toContain("[REDACTED]"));
  it("invented chart fact in acknowledgement is rejected", () => expect(validateListeningAnalysis({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "career", acknowledgementHint: "Your Moon is in Aries", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], confidence: "low" }).ok).toBe(false));
  it("shouldUseListeningAnalyzer false by default", () => expect(shouldUseListeningAnalyzer({ question: "Q", env: {} }).allowed).toBe(false));
  it("enabled only when ASTRO_LISTENING_ANALYZER_ENABLED=true", () => expect(shouldUseListeningAnalyzer({ question: "Q", env: { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" } }).allowed).toBe(true));
  it("ASTRO_RAG_ENABLED alone does not enable", () => expect(shouldUseListeningAnalyzer({ question: "Q", env: { ASTRO_RAG_ENABLED: "true" } }).allowed).toBe(false));
  it("local analyzer alone does not enable if listening flag false", () => expect(shouldUseListeningAnalyzer({ question: "Q", env: { ASTRO_LOCAL_ANALYZER_ENABLED: "true" } }).allowed).toBe(false));
  it("maps death_lifespan", () => expect(mapListeningSafetyRisksToExistingSafety(["death_lifespan"])).toContain("death"));
  it("maps medical", () => expect(mapListeningSafetyRisksToExistingSafety(["medical"])).toContain("medical"));
  it("maps legal", () => expect(mapListeningSafetyRisksToExistingSafety(["legal"])).toContain("legal"));
  it("maps financial_guarantee", () => expect(mapListeningSafetyRisksToExistingSafety(["financial_guarantee"])).toContain("financial_guarantee"));
  it("maps expensive_remedy_pressure", () => expect(mapListeningSafetyRisksToExistingSafety(["expensive_remedy_pressure"])).toContain("expensive_puja_pressure"));
  it("no throw on malformed arrays", () => expect(() => sanitizeListeningStringArray({})).not.toThrow());
  it("deterministic fallback preserved when raw unsafe", () => expect(normalizeListeningAnalysis({ topic: "career", emotionalTone: "anxious", emotionalNeed: "clarity", userSituationSummary: "x", acknowledgementHint: "y", missingContext: [], shouldAskFollowUp: false, safetyRisks: ["medical"], humanizationHints: [], confidence: "low" }, fallback).source).toBe("deterministic_fallback"));
});
