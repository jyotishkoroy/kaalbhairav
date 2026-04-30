/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import { buildReadingPlan, renderReadingPlanFallback } from "../../../lib/astro/synthesis";

const plan = buildReadingPlan({
  question: "Career and sleep question",
  concern: { topic: "career" },
  evidence: [{ id: "e1", label: "Saturn", explanation: "Delay is visible", confidence: "high", source: "chart" }],
  chartAnchors: ["house_10"],
  remedyContext: { remedyRequested: true, safeRemediesAvailable: true },
  timingContext: { timingSourceAvailable: false },
  safetyRestrictions: ["Do not give exact timing without source."],
});

describe("renderReadingPlanFallback", () => {
  it("renders opening acknowledgement", () => {
    expect(renderReadingPlanFallback(plan)).toContain(plan.acknowledgement.openingLine);
  });
  it("renders evidence labels", () => {
    expect(renderReadingPlanFallback(plan)).toContain("Saturn");
  });
  it("renders limitations", () => {
    expect(renderReadingPlanFallback(plan)).toContain("Limitations:");
  });
  it("renders lived experience", () => {
    expect(renderReadingPlanFallback(plan)).toContain("Effort is often not visible immediately.");
  });
  it("renders practical guidance", () => {
    expect(renderReadingPlanFallback(plan)).toContain("Practical guidance:");
  });
  it("renders remedies only when include=true", () => {
    expect(renderReadingPlanFallback(plan)).toContain("Optional remedy support:");
  });
  it("omits remedies when include=false", () => {
    const noRemedy = buildReadingPlan({ question: "Career", concern: { topic: "career" } });
    expect(renderReadingPlanFallback(noRemedy)).not.toContain("Optional remedy support:");
  });
  it("renders safety boundaries", () => {
    expect(renderReadingPlanFallback(plan)).toContain("Safety boundary:");
  });
  it("renders follow-up question", () => {
    const followUp = buildReadingPlan({ question: "What will happen?", listening: { topic: "general", emotionalTone: "confused", emotionalNeed: "clarity", userSituationSummary: "vague", acknowledgementHint: "I hear you.", missingContext: ["specific_question"], shouldAskFollowUp: true, followUpQuestion: "What specifically?", safetyRisks: [], humanizationHints: [], source: "deterministic_fallback", confidence: "low" } });
    expect(renderReadingPlanFallback(followUp)).toContain("What specifically?");
  });
  it("renders reassurance closing", () => {
    expect(renderReadingPlanFallback(plan)).toContain(plan.reassurance.closingLine);
  });
  it("does not mention JSON", () => {
    expect(renderReadingPlanFallback(plan).toLowerCase()).not.toContain("json");
  });
  it("does not mention ReadingPlan internal systems", () => {
    expect(renderReadingPlanFallback(plan)).not.toMatch(/readingplan|validator|internal system/i);
  });
  it("does not add facts not in plan", () => {
    expect(renderReadingPlanFallback(plan)).not.toMatch(/jupiter|venus|mars/i);
  });
  it("does not add timing not in plan", () => {
    expect(renderReadingPlanFallback(plan)).not.toMatch(/2026-01-01|next month/i);
  });
  it("does not add remedies not in plan", () => {
    const noRemedy = buildReadingPlan({ question: "Career", concern: { topic: "career" } });
    expect(renderReadingPlanFallback(noRemedy)).not.toMatch(/Optional remedy support/);
  });
  it("follow_up mode answer is short", () => {
    const followUp = buildReadingPlan({ question: "What will happen?", listening: { topic: "general", emotionalTone: "confused", emotionalNeed: "clarity", userSituationSummary: "vague", acknowledgementHint: "I hear you.", missingContext: ["specific_question"], shouldAskFollowUp: true, followUpQuestion: "What specifically?", safetyRisks: [], humanizationHints: [], source: "deterministic_fallback", confidence: "low" } });
    expect(renderReadingPlanFallback(followUp).split(" ").length).toBeLessThan(18);
  });
  it("safety mode preserves boundary", () => {
    const safety = buildReadingPlan({ question: "When will I die?", concern: { safetyRisks: ["death_lifespan"] } });
    expect(renderReadingPlanFallback(safety)).toContain("Do not predict death dates or lifespan.");
  });
  it("exact_fact mode stays concise", () => {
    const exactFact = buildReadingPlan({ question: "What is my Lagna?", concern: { mode: "exact_fact", topic: "career" } });
    expect(renderReadingPlanFallback(exactFact).split(" ").length).toBeLessThan(90);
  });
  it("empty evidence plan still renders safe limitation", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "x" }))).toContain("Limitations:");
  });
  it("renderer output passes simple safety pattern checks", () => {
    const text = renderReadingPlanFallback(plan);
    expect(text).not.toMatch(/guarantee|curse|doomed|death date/i);
  });
  it("dedupes repeated topic words", () => {
    const text = renderReadingPlanFallback(buildReadingPlan({ question: "career progress career", concern: { topic: "career" } }));
    expect(text).not.toMatch(/career progress career/i);
  });
  it("dedupes repeated chart basis paragraph", () => {
    const repeated = renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" }, evidence: [{ id: "e1", label: "Saturn", explanation: "Delay is visible", confidence: "high", source: "chart" }], chartAnchors: ["house_10", "house_10"] }));
    expect(repeated.match(/Chart basis:/gi)?.length ?? 0).toBeLessThanOrEqual(1);
  });
  it("dedupes repeated key anchors block", () => {
    const repeated = renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" }, evidence: [{ id: "e1", label: "Saturn", explanation: "Delay is visible", confidence: "high", source: "chart" }], chartAnchors: ["house_10", "house_10", "house_11"] }));
    expect(repeated).not.toMatch(/house_10.*house_10/i);
  });
  it("career answer remains chart anchored after deduping", () => {
    const text = renderReadingPlanFallback(plan);
    expect(text).toMatch(/Saturn|house/i);
  });
});
