/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import { buildReadingPlan, renderReadingPlanFallback, renderUserFacingAnswerPlan, toUserFacingAnswerPlan } from "../../../lib/astro/synthesis";

const originalEnv = { ...process.env };

function withUserFacingFlag(value: string | undefined) {
  if (value === undefined) delete process.env.ASTRO_USER_FACING_PLAN_ENABLED;
  else process.env.ASTRO_USER_FACING_PLAN_ENABLED = value;
}

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
  it("internal guidance exists but is not rendered", () => {
    const plan = buildReadingPlan({ question: "Career", concern: { topic: "career" } });
    expect(renderReadingPlanFallback(plan)).not.toContain("internal guidance");
  });
  it("validator hints exist but are not rendered", () => {
    const plan = buildReadingPlan({ question: "Career", concern: { topic: "career" } });
    expect(renderReadingPlanFallback(plan)).not.toContain("validator");
  });
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
  it("dedupes repeated boilerplate memory text", () => {
    const text = renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" }, memorySummary: "Previous concern: career concern. Previous concern: career concern." }));
    expect(text).not.toMatch(/Previous concern:/i);
  });
  it("dedupes repeated key anchors block", () => {
    const repeated = renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" }, evidence: [{ id: "e1", label: "Saturn", explanation: "Delay is visible", confidence: "high", source: "chart" }], chartAnchors: ["house_10", "house_10", "house_11"] }));
    expect(repeated).not.toMatch(/house_10.*house_10/i);
  });
  it("career answer remains chart anchored after deduping", () => {
    const text = renderReadingPlanFallback(plan);
    expect(text).toMatch(/Saturn|house/i);
  });
  it("blocks This question should be read through", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "x", concern: { topic: "career" } }))).not.toContain("This question should be read through");
  });
  it("blocks The person may be seeking", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "x", concern: { topic: "career" } }))).not.toContain("The person may be seeking");
  });
  it("blocks The answer should stay tied", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "x", concern: { topic: "career" } }))).not.toContain("The answer should stay tied");
  });
  it("blocks Keep the answer tied", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "x", concern: { topic: "career" } }))).not.toContain("Keep the answer tied");
  });
  it("blocks Chart basis raw label", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "x", concern: { topic: "career" } }))).not.toContain("Chart basis:");
  });
  it("blocks Key anchors raw label", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "x", concern: { topic: "career" } }))).not.toContain("Key anchors:");
  });
  it("converts safety note into clean boundary text", () => {
    const text = renderReadingPlanFallback(buildReadingPlan({ question: "x", concern: { topic: "health", safetyRisks: ["medical"] } }));
    expect(text).not.toContain("Safety note:");
    expect(text).toContain("medical");
  });
  it("blocks Accuracy raw label", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "x", concern: { topic: "career" } }))).not.toContain("Accuracy:");
  });
  it("blocks Suggested follow-up raw label", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "What will happen?" }))).not.toContain("Suggested follow-up:");
  });
  it("blocks Previous concern raw label", () => {
    const text = renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" }, memorySummary: "Previous concern: career" }));
    expect(text).not.toContain("Previous concern:");
  });
  it("blocks Preference raw label", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" }, memorySummary: "Preference: practical" }))).not.toContain("Preference:");
  });
  it("blocks Guidance already given raw label", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" }, memorySummary: "Guidance already given: keep calm" }))).not.toContain("Guidance already given:");
  });
  it("blocks duplicate previous concern labels", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" }, memorySummary: "Previous concern: Previous concern: career" }))).not.toMatch(/Previous concern:.*Previous concern:/i);
  });
  it("exact fact answers do not render memory", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "What is my Lagna?", concern: { mode: "exact_fact", topic: "career" }, memorySummary: "career memory" }))).not.toContain("career memory");
  });
  it("relationship prompt does not render career memory", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "relationship issue", concern: { topic: "relationship" }, memorySummary: "career memory" }))).not.toContain("career memory");
  });
  it("sleep remedy prompt does not render career memory", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "sleep remedy", concern: { topic: "sleep" }, memorySummary: "career memory" }))).not.toContain("career memory");
  });
  it("vague spiritual prompt does not render career memory", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "spiritual question", concern: { topic: "spirituality" }, memorySummary: "career memory" }))).not.toContain("career memory");
  });
  it("final rendered answer does not contain raw labels", () => {
    const text = renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" }, memorySummary: "Previous concern: Previous concern: Previous concern: Preference: Guidance already given:" }));
    expect(text).not.toMatch(/Previous concern:|Preference:|Guidance already given:/i);
  });
  it("blocks validator label", () => {
    const plan = toUserFacingAnswerPlan({
      internalPlan: {
        internalGuidance: ["validator internal note"],
        validatorHints: ["validator internal label"],
        safetyPolicy: [],
        evidencePolicy: [],
        memoryPolicy: [],
      },
    });
    expect(renderUserFacingAnswerPlan(plan)).not.toContain("validator");
  });
  it("blocks policy label", () => {
    const plan = toUserFacingAnswerPlan({
      internalPlan: {
        internalGuidance: ["policy internal note"],
        validatorHints: [],
        safetyPolicy: [],
        evidencePolicy: [],
        memoryPolicy: [],
      },
    });
    expect(renderUserFacingAnswerPlan(plan)).not.toContain("policy");
  });
  it("blocks metadata label", () => {
    const plan = toUserFacingAnswerPlan({
      internalPlan: {
        internalGuidance: ["metadata internal note"],
        validatorHints: [],
        safetyPolicy: [],
        evidencePolicy: [],
        memoryPolicy: [],
      },
    });
    expect(renderUserFacingAnswerPlan(plan)).not.toContain("metadata");
  });
  it("blocks internal label", () => {
    const plan = toUserFacingAnswerPlan({
      internalPlan: {
        internalGuidance: ["internal internal note"],
        validatorHints: [],
        safetyPolicy: [],
        evidencePolicy: [],
        memoryPolicy: [],
      },
    });
    expect(renderUserFacingAnswerPlan(plan)).not.toContain("internal");
  });
  it("renders multiple sections in order", () => {
    const rendered = renderUserFacingAnswerPlan({
      acknowledgement: "I understand.",
      answerSections: [
        { kind: "direct_answer", text: "First." },
        { kind: "interpretation", text: "Second." },
        { kind: "practical_guidance", text: "Third." },
      ],
      forbiddenRenderLabels: [],
    });
    expect(rendered.indexOf("First.")).toBeLessThan(rendered.indexOf("Second."));
    expect(rendered.indexOf("Second.")).toBeLessThan(rendered.indexOf("Third."));
  });
  it("fallbacks safely for malformed plan", () => {
    expect(renderUserFacingAnswerPlan({ answerSections: [], forbiddenRenderLabels: [] })).toContain("grounded");
  });
  it("dedupes adjacent exact sentence", () => {
    const rendered = renderUserFacingAnswerPlan({
      acknowledgement: "I understand.",
      answerSections: [
        { kind: "direct_answer", text: "Repeat." },
        { kind: "interpretation", text: "Repeat." },
      ],
      forbiddenRenderLabels: [],
    });
    expect(rendered.match(/Repeat\./g)?.length ?? 0).toBe(1);
  });
  it("preserves exact fact compactness", () => {
    const exact = buildReadingPlan({ question: "What is my Lagna?", concern: { mode: "exact_fact" } });
    expect(renderReadingPlanFallback(exact).split(" ").length).toBeLessThan(90);
  });
  it("preserves career interpretive clarity", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "Career?", concern: { topic: "career" } }))).toMatch(/career|work|progress/i);
  });
  it("preserves money interpretive clarity", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "Money?", concern: { topic: "money" } }))).toMatch(/money|planning|stability/i);
  });
  it("preserves relationship interpretive clarity", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "Relationship?", concern: { topic: "relationship" } }))).toMatch(/relationship|clarity|connection/i);
  });
  it("preserves safety boundary strictness", () => {
    expect(renderReadingPlanFallback(buildReadingPlan({ question: "When will I die?", concern: { safetyRisks: ["death_lifespan"] } }))).toContain("Do not predict death dates or lifespan.");
  });
  it("supports new renderer path when flag enabled", () => {
    withUserFacingFlag("true");
    const text = renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" } }));
    expect(text).not.toContain("Chart basis:");
  });
  it("keeps old renderer path when flag disabled", () => {
    withUserFacingFlag("false");
    const text = renderReadingPlanFallback(buildReadingPlan({ question: "Career", concern: { topic: "career" } }));
    expect(text).toContain("Effort is often not visible immediately.");
  });
  it("does not introduce Groq or Ollama words", () => {
    expect(renderReadingPlanFallback(plan)).not.toMatch(/groq|ollama/i);
  });
});

process.env = { ...originalEnv };
