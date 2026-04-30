/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import {
  applyReadingPlanSafetyPolicy,
  buildReadingPlanLimitations,
  determineReadingPlanMode,
  normalizeReadingPlanTopic,
  sanitizeReadingPlanStringArray,
  sanitizeReadingPlanText,
  shouldIncludeRemedies,
  validateReadingPlan,
} from "../../../lib/astro/synthesis";
import type { ReadingPlan } from "../../../lib/astro/synthesis";

const basePlan: ReadingPlan = {
  question: "What is my career?",
  topic: "career",
  mode: "interpretive",
  acknowledgement: { emotionalContext: "career", userNeed: "clarity", openingLine: "I hear you." },
  chartTruth: { evidence: [{ id: "e1", label: "Saturn", explanation: "Saturn adds delay", confidence: "medium", source: "chart" }], chartAnchors: ["house_10"], limitations: [] },
  livedExperience: ["Pressure from authority can slow things down."],
  lessonPattern: { pattern: "delay tests patience", nonFatalisticMeaning: "slow periods can still improve" },
  practicalGuidance: ["Take one practical step."],
  remedies: { include: false, spiritual: [], behavioral: [], practical: [], inner: [] },
  safetyBoundaries: [],
  reassurance: { closingLine: "Keep going.", avoidFalseCertainty: true },
};

describe("normalizeReadingPlanTopic", () => {
  it("normalize topic career", () => {
    expect(normalizeReadingPlanTopic("promotion")).toBe("career");
  });
  it("normalize unknown topic to general", () => {
    expect(normalizeReadingPlanTopic("random")).toBe("general");
  });
});

describe("determineReadingPlanMode", () => {
  it("determine follow_up mode for vague missing question", () => {
    expect(determineReadingPlanMode({ question: "What will happen?", listening: { shouldAskFollowUp: true } as never })).toBe("follow_up");
  });
  it("determine safety mode for death_lifespan", () => {
    expect(determineReadingPlanMode({ question: "When will I die?" })).toBe("safety");
  });
  it("determine remedy mode for remedy request", () => {
    expect(determineReadingPlanMode({ question: "Give me a remedy" })).toBe("remedy");
  });
  it("determine timing mode for timing question", () => {
    expect(determineReadingPlanMode({ question: "When will it happen?" })).toBe("timing");
  });
  it("determine exact_fact mode when concern says exact_fact", () => {
    expect(determineReadingPlanMode({ question: "What is my Lagna?", concern: { mode: "exact_fact" } })).toBe("exact_fact");
  });
});

describe("validateReadingPlan", () => {
  it("validate rejects timing date without source", () => {
    const result = validateReadingPlan({ ...basePlan, chartTruth: { ...basePlan.chartTruth, limitations: ["2026-01-01"] } });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("timing_without_source");
  });
  it("validate catches guaranteed promotion", () => {
    const result = validateReadingPlan({ ...basePlan, practicalGuidance: ["Guaranteed promotion."] });
    expect(result.ok).toBe(false);
  });
  it("validate catches guaranteed marriage", () => {
    const result = validateReadingPlan({ ...basePlan, livedExperience: ["Guaranteed marriage."] });
    expect(result.ok).toBe(false);
  });
  it("validate catches death date", () => {
    const result = validateReadingPlan({ ...basePlan, chartTruth: { ...basePlan.chartTruth, limitations: ["Death date is 2026-01-01"] } });
    expect(result.errors).toContain("death_prediction");
  });
  it("validate catches cure insomnia/stop medicine", () => {
    const result = validateReadingPlan({ ...basePlan, remedies: { include: true, spiritual: [], behavioral: ["Stop medicine now."], practical: [], inner: [] } });
    expect(result.errors).toContain("unsafe_remedy_language");
  });
  it("validate catches legal guarantee", () => {
    const result = validateReadingPlan({ ...basePlan, safetyBoundaries: [], practicalGuidance: ["Guaranteed legal outcome."], chartTruth: { ...basePlan.chartTruth, limitations: ["legal"] } });
    expect(result.ok).toBe(false);
  });
  it("validate catches financial guarantee", () => {
    const result = validateReadingPlan({ ...basePlan, safetyBoundaries: [], practicalGuidance: ["Guaranteed profit."], chartTruth: { ...basePlan.chartTruth, limitations: ["financial"] } });
    expect(result.ok).toBe(false);
  });
  it("validate catches gemstone certainty", () => {
    const result = validateReadingPlan({ ...basePlan, remedies: { include: true, spiritual: ["Blue sapphire guarantees success."], behavioral: [], practical: [], inner: [] } });
    expect(result.ok).toBe(false);
  });
  it("validate catches expensive puja pressure", () => {
    const result = validateReadingPlan({ ...basePlan, remedies: { include: true, spiritual: ["Pay 50000 rupees for puja."], behavioral: [], practical: [], inner: [] } });
    expect(result.ok).toBe(false);
  });
  it("validate catches curse/doomed language", () => {
    const result = validateReadingPlan({ ...basePlan, acknowledgement: { ...basePlan.acknowledgement, openingLine: "You are doomed." } });
    expect(result.errors).toContain("fear_language");
  });
  it("safety risk with no boundary warns/errors", () => {
    const result = validateReadingPlan({ ...basePlan, safetyBoundaries: [], chartTruth: { ...basePlan.chartTruth, limitations: ["medical"] } });
    expect(result.ok).toBe(false);
  });
  it("follow_up mode without followUp warns/errors", () => {
    const result = validateReadingPlan({ ...basePlan, mode: "follow_up", followUp: undefined });
    expect(result.errors).toContain("missing_followup");
  });
  it("exact_fact mode with broad interpretation warns/errors", () => {
    const result = validateReadingPlan({ ...basePlan, mode: "exact_fact", practicalGuidance: ["Broad interpretation."] });
    expect(result.errors).toContain("broad_claim_in_exact_fact");
  });
  it("missing reassurance warns/errors", () => {
    const result = validateReadingPlan({ ...basePlan, reassurance: { closingLine: "", avoidFalseCertainty: true } });
    expect(result.errors).toContain("missing_reassurance");
  });
  it("avoidFalseCertainty false warns/errors", () => {
    const result = validateReadingPlan({ ...basePlan, reassurance: { closingLine: "ok", avoidFalseCertainty: false } });
    expect(result.errors).toContain("false_certainty_enabled");
  });
});

describe("policy helpers", () => {
  it("build limitations for missing birth time", () => {
    expect(buildReadingPlanLimitations({ question: "x", birthContext: { hasBirthTime: false } })).toContain("Birth time is missing, so fine-grained timing and house interpretation are limited.");
  });
  it("build limitations for missing timing source", () => {
    expect(buildReadingPlanLimitations({ question: "x", timingContext: { timingSourceAvailable: false } })).toContain("No grounded timing source is available, so exact windows must not be claimed.");
  });
  it("shouldIncludeRemedies false by default", () => {
    expect(shouldIncludeRemedies({ question: "x" })).toEqual({ include: false, reason: "not_requested" });
  });
  it("shouldIncludeRemedies true for remedy request", () => {
    expect(shouldIncludeRemedies({ question: "x", remedyContext: { remedyRequested: true, safeRemediesAvailable: true } })).toEqual({ include: true, reason: "user_requested_remedy" });
  });
  it("sanitize strips markdown", () => {
    expect(sanitizeReadingPlanText("**hello** _world_")).toBe("hello world");
  });
  it("sanitize strips token-like data", () => {
    expect(sanitizeReadingPlanText("sk-secret-123")).toBe("[REDACTED]");
  });
  it("sanitize clamps long strings", () => {
    expect(sanitizeReadingPlanText("x".repeat(300), 10)).toHaveLength(10);
  });
  it("sanitize array dedupes/clamps", () => {
    expect(sanitizeReadingPlanStringArray(["a", "a", "b"], 2, 10)).toEqual(["a", "b"]);
  });
  it("apply safety policy adds timing boundary", () => {
    const result = applyReadingPlanSafetyPolicy({ ...basePlan, chartTruth: { ...basePlan.chartTruth, limitations: [] }, safetyBoundaries: [] }, { question: "x", timingContext: { timingSourceAvailable: false } });
    expect(result.safetyBoundaries.join(" ")).toContain("exact timing");
  });
});
