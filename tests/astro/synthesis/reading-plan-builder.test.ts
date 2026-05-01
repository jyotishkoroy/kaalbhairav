/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import { buildReadingPlan } from "../../../lib/astro/synthesis";

const evidence = [{ id: "e1", label: "Saturn", explanation: "Saturn points to delay", confidence: "high" as const, source: "chart" as const }];

describe("buildReadingPlan", () => {
  it("career anxiety plan includes emotional acknowledgement", () => {
    const plan = buildReadingPlan({ question: "Why am I anxious about career?", concern: { topic: "career" }, evidence, chartAnchors: ["house_10"] });
    expect(plan.acknowledgement.emotionalContext).toContain("career");
  });
  it("career promotion plan includes career topic", () => {
    expect(buildReadingPlan({ question: "Will I get promotion?", concern: { topic: "career" } }).topic).toBe("career");
  });
  it("career evidence becomes chartTruth.evidence", () => {
    expect(buildReadingPlan({ question: "Career?", evidence }).chartTruth.evidence).toHaveLength(1);
  });
  it("career chart anchors are preserved", () => {
    expect(buildReadingPlan({ question: "Career?", chartAnchors: ["house_10", "saturn"] }).chartTruth.chartAnchors).toEqual(["house_10", "saturn"]);
  });
  it("career practical guidance exists", () => {
    expect(buildReadingPlan({ question: "Career?", concern: { topic: "career" } }).practicalGuidance.length).toBeGreaterThan(0);
  });
  it("career lesson is non-fatalistic", () => {
    expect(buildReadingPlan({ question: "Career?", concern: { topic: "career" } }).lessonPattern.nonFatalisticMeaning).not.toMatch(/fatal|doomed/i);
  });
  it("marriage delay includes anxious/fearful acknowledgement", () => {
    const plan = buildReadingPlan({ question: "Will marriage delay?", concern: { topic: "marriage" } });
    expect(plan.livedExperience.join(" ")).toContain("Delay or confusion does not automatically mean rejection.");
  });
  it("marriage delay says delay is not rejection through livedExperience or reassurance", () => {
    const plan = buildReadingPlan({ question: "marriage delay", concern: { topic: "marriage" } });
    expect(`${plan.livedExperience.join(" ")} ${plan.reassurance.closingLine}`).toMatch(/not automatically mean rejection|does not rule out/i);
  });
  it("relationship confusion uses decision_support or clarity", () => {
    const plan = buildReadingPlan({ question: "I feel confused about my partner", listening: { topic: "relationship", emotionalTone: "confused", emotionalNeed: "decision_support", userSituationSummary: "confused", acknowledgementHint: "I hear you.", missingContext: [], shouldAskFollowUp: false, safetyRisks: [], humanizationHints: [], source: "deterministic_fallback", confidence: "medium" } });
    expect(plan.acknowledgement.userNeed).toMatch(/decision support|clarity/);
  });
  it("money anxiety includes practical financial boundary", () => {
    const plan = buildReadingPlan({ question: "Money worries", concern: { topic: "money", safetyRisks: ["financial_guarantee"] } });
    expect(plan.safetyBoundaries.join(" ")).toMatch(/financial guarantees/);
  });
  it("sleep/remedy request includes safe remedy sections", () => {
    const plan = buildReadingPlan({ question: "Sleep remedy", concern: { topic: "sleep", mode: "remedy" }, remedyContext: { remedyRequested: true, safeRemediesAvailable: true } });
    expect(plan.remedies.include).toBe(true);
  });
  it("health-adjacent sleep question includes medical safety boundary", () => {
    const plan = buildReadingPlan({ question: "Bad sleep and health", concern: { topic: "health", safetyRisks: ["medical"] } });
    expect(plan.safetyBoundaries.join(" ")).toContain("medical");
  });
  it("education confusion includes study consistency guidance", () => {
    expect(buildReadingPlan({ question: "Study confusion", concern: { topic: "education" } }).practicalGuidance.join(" ")).toMatch(/study|repeat/i);
  });
  it("family pressure includes boundary guidance", () => {
    expect(buildReadingPlan({ question: "Family pressure", concern: { topic: "family" } }).practicalGuidance.join(" ")).toMatch(/boundary/i);
  });
  it("vague what will happen uses follow_up mode", () => {
    expect(buildReadingPlan({ question: "What will happen?" }).mode).toBe("follow_up");
  });
  it("vague follow_up has followUp question", () => {
    expect(buildReadingPlan({ question: "What will happen?", listening: { topic: "general", emotionalTone: "confused", emotionalNeed: "clarity", userSituationSummary: "vague", acknowledgementHint: "I hear you.", missingContext: ["specific_question"], shouldAskFollowUp: true, followUpQuestion: "What specifically?", safetyRisks: [], humanizationHints: [], source: "deterministic_fallback", confidence: "low" } }).followUp?.question).toBeTruthy();
  });
  it("exact fact mode remains concise", () => {
    expect(buildReadingPlan({ question: "What is my Lagna?", concern: { mode: "exact_fact" } }).mode).toBe("exact_fact");
  });
  it("timing question with no timing source prohibits timing", () => {
    const plan = buildReadingPlan({ question: "When will I get promotion?", concern: { topic: "career" }, timingContext: { timingSourceAvailable: false } });
    expect(plan.chartTruth.limitations.join(" ")).toMatch(/timing source|date or window/i);
  });
  it("timing question with timing source may include allowed timing limitation description", () => {
    const plan = buildReadingPlan({ question: "When will I get promotion?", timingContext: { timingSourceAvailable: true, allowedTimingDescription: "Grounded timing from dasha" } });
    expect(plan.chartTruth.limitations.join(" ")).toContain("Grounded timing");
  });
  it("remedy not requested keeps remedies absent minimal", () => {
    expect(buildReadingPlan({ question: "Career", concern: { topic: "career" } }).remedies.include).toBe(false);
  });
  it("remedy requested includes all sections", () => {
    const plan = buildReadingPlan({ question: "Remedy?", concern: { mode: "remedy" }, remedyContext: { remedyRequested: true, safeRemediesAvailable: true } });
    expect(plan.remedies.spiritual.length + plan.remedies.behavioral.length + plan.remedies.practical.length + plan.remedies.inner.length).toBeGreaterThan(0);
  });
  it("death lifespan safety risk produces safety mode", () => {
    expect(buildReadingPlan({ question: "When will I die?", concern: { safetyRisks: ["death_lifespan"] } }).mode).toBe("safety");
  });
  it("medical safety risk produces medical boundary", () => {
    expect(buildReadingPlan({ question: "Medical", concern: { safetyRisks: ["medical"] } }).safetyBoundaries.join(" ")).toContain("clinician");
  });
  it("legal safety risk produces legal boundary", () => {
    expect(buildReadingPlan({ question: "Legal", concern: { safetyRisks: ["legal"] } }).safetyBoundaries.join(" ")).toContain("legal advice");
  });
  it("financial guarantee safety risk produces financial boundary", () => {
    expect(buildReadingPlan({ question: "Money", concern: { safetyRisks: ["financial_guarantee"] } }).safetyBoundaries.join(" ")).toContain("financial guarantees");
  });
  it("pregnancy safety risk produces boundary", () => {
    expect(buildReadingPlan({ question: "Pregnancy", concern: { safetyRisks: ["pregnancy"] } }).safetyBoundaries.join(" ")).toContain("pregnancy");
  });
  it("self_harm safety risk produces boundary", () => {
    expect(buildReadingPlan({ question: "Self harm", concern: { safetyRisks: ["self_harm"] } }).safetyBoundaries.join(" ")).toContain("crisis support");
  });
  it("curse_fear safety risk avoids curse fear language", () => {
    expect(buildReadingPlan({ question: "curse fear", concern: { safetyRisks: ["curse_fear"] } }).safetyBoundaries.join(" ")).toMatch(/curse or doom/);
  });
  it("expensive remedy pressure blocks expensive remedy pressure", () => {
    expect(buildReadingPlan({ question: "expensive remedy", concern: { safetyRisks: ["expensive_remedy_pressure"] } }).safetyBoundaries.join(" ")).toContain("expensive puja");
  });
  it("deterministic_prediction blocks guarantee", () => {
    expect(buildReadingPlan({ question: "guaranteed outcome", concern: { safetyRisks: ["deterministic_prediction"] } }).safetyBoundaries.join(" ")).toContain("guarantees");
  });
  it("missing birth time adds limitation", () => {
    expect(buildReadingPlan({ question: "x", birthContext: { hasBirthTime: false } }).chartTruth.limitations.join(" ")).toContain("Birth time");
  });
  it("missing birth date adds limitation", () => {
    expect(buildReadingPlan({ question: "x", birthContext: { hasBirthDate: false } }).chartTruth.limitations.join(" ")).toContain("Birth date");
  });
  it("missing birth place adds limitation", () => {
    expect(buildReadingPlan({ question: "x", birthContext: { hasBirthPlace: false } }).chartTruth.limitations.join(" ")).toContain("Birth place");
  });
  it("weak no evidence adds limitation", () => {
    expect(buildReadingPlan({ question: "x" }).chartTruth.limitations.join(" ")).toContain("No direct chart evidence");
  });
  it("memory summary included only when provided", () => {
    expect(buildReadingPlan({ question: "x", memorySummary: "summary" }).memoryUse?.used).toBe(true);
  });
  it("memory summary sanitized", () => {
    expect(buildReadingPlan({ question: "x", memorySummary: "sk-secret-1" }).memoryUse?.summary).toBe("[REDACTED]");
  });
  it("safetyRestrictions are preserved", () => {
    expect(buildReadingPlan({ question: "x", safetyRestrictions: ["custom boundary"] }).safetyBoundaries).toContain("custom boundary");
  });
  it("no chart facts invented when evidence empty", () => {
    expect(buildReadingPlan({ question: "x" }).chartTruth.evidence).toEqual([]);
  });
  it("no timing invented when no timing source", () => {
    expect(buildReadingPlan({ question: "x", timingContext: { timingSourceAvailable: false } }).chartTruth.limitations.join(" ")).toContain("No grounded timing source");
  });
  it("no remedy guarantee appears", () => {
    expect(buildReadingPlan({ question: "x", remedyContext: { remedyRequested: true, safeRemediesAvailable: true } }).remedies.include).toBe(true);
  });
  it("internal plan exists and stays separate", () => {
    expect(buildReadingPlan({ question: "x" }).internalPlan?.internalGuidance).toEqual([]);
  });
  it("internal guidance can exist without affecting renderable fields", () => {
    const plan = buildReadingPlan({ question: "x" });
    expect(plan.internalPlan?.validatorHints).toEqual([]);
    expect(plan.acknowledgement.openingLine).toContain("listening");
  });
  it("internal policy arrays default to empty", () => {
    const plan = buildReadingPlan({ question: "x" });
    expect(plan.internalPlan?.safetyPolicy).toEqual([]);
    expect(plan.internalPlan?.evidencePolicy).toEqual([]);
    expect(plan.internalPlan?.memoryPolicy).toEqual([]);
  });
  it("does not inject forbidden internal labels into plan text", () => {
    const plan = buildReadingPlan({ question: "x", memorySummary: "Previous concern: internal" });
    const text = [
      plan.acknowledgement.emotionalContext,
      plan.acknowledgement.userNeed,
      plan.acknowledgement.openingLine,
      plan.chartTruth.limitations.join(" "),
      plan.livedExperience.join(" "),
      plan.practicalGuidance.join(" "),
      plan.reassurance.closingLine,
      plan.memoryUse?.summary ?? "",
    ].join(" ");
    expect(text).not.toMatch(/validator|metadata|chart basis|key anchors|suggested follow-up/i);
  });
  it("exact fact mode trims practical guidance", () => {
    expect(buildReadingPlan({ question: "x", concern: { mode: "exact_fact" } }).practicalGuidance).toHaveLength(1);
  });
  it("follow-up mode always includes a follow-up question", () => {
    expect(buildReadingPlan({ question: "What will happen?" }).followUp?.question).toBeTruthy();
  });
  it("safety topic clears remedies", () => {
    expect(buildReadingPlan({ question: "When will I die?", concern: { safetyRisks: ["death_lifespan"] } }).remedies.include).toBe(false);
  });
  it("topic defaults remain stable for unknown questions", () => {
    expect(buildReadingPlan({ question: "Something obscure" }).topic).toBe("general");
  });
  it("chart anchor sanitization drops url fragments", () => {
    expect(buildReadingPlan({ question: "x", chartAnchors: ["https://example.com/anchor"] }).chartTruth.chartAnchors.join(" ")).not.toContain("http");
  });
  it("memory summary is still tracked separately from internal guidance", () => {
    const plan = buildReadingPlan({ question: "x", memorySummary: "note" });
    expect(plan.memoryUse?.used).toBe(true);
    expect(plan.internalPlan).toBeTruthy();
  });
  it("leak phrases are absent from acknowledgement", () => {
    const plan = buildReadingPlan({ question: "x", concern: { topic: "career" } });
    expect(plan.acknowledgement.openingLine).not.toMatch(/chart basis|key anchors|suggested follow-up|previous concern/i);
  });
  it("career plan remains grounded and compact", () => {
    const plan = buildReadingPlan({ question: "promotion", concern: { topic: "career" } });
    expect(plan.practicalGuidance.join(" ")).toContain("next step");
  });
});
