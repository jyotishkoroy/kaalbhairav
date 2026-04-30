// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { buildAnswerContract } from "../../../lib/astro/rag/answer-contract-builder";
import { buildDeterministicAnalyzerResult } from "../../../lib/astro/rag/analyzer-schema";
import { ragSafetyGate } from "../../../lib/astro/rag/safety-gate";
import { planRequiredData } from "../../../lib/astro/rag/required-data-planner";
import { buildReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
import { buildGroqAnswerMessages, compactContractForPrompt, compactContextForPrompt, compactReasoningPathForPrompt, compactTimingForPrompt } from "../../../lib/astro/rag/groq-answer-prompt";
import type { BuildAnswerContractInput } from "../../../lib/astro/rag/answer-contract-types";
import type { ReasoningRule, RetrievalContext, SafeRemedy, TimingWindow } from "../../../lib/astro/rag/retrieval-types";
import type { BenchmarkExample } from "../../../lib/astro/rag/retrieval-types";
import type { ChartFact } from "../../../lib/astro/rag/chart-fact-extractor";
import type { ReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
import type { TimingContext } from "../../../lib/astro/rag/timing-engine";

function pipeline(question: string, domain = "career", answerType: "interpretive" | "exact_fact" | "remedy" | "timing" | "safety" = "interpretive") {
  const analyzer = buildDeterministicAnalyzerResult({ question, topic: domain as never, questionType: answerType === "exact_fact" ? "exact_fact" : answerType === "timing" ? "timing" : answerType === "remedy" ? "remedy" : answerType === "safety" ? "unknown" : "interpretive" } as never);
  const safety = ragSafetyGate({ question, answerType: answerType === "safety" ? "unknown" : "interpretive" });
  const plan = planRequiredData({ analyzer, safety, question } as never);
  const context: RetrievalContext = {
    chartFacts: buildFacts(),
    reasoningRules: buildRules(),
    benchmarkExamples: buildBenchmarks(),
    timingWindows: buildWindows(),
    safeRemedies: buildRemedies(),
    memorySummary: "private report should not appear",
    metadata: { userId: "u", profileId: null, domain: plan.domain, requestedFactKeys: ["house_10"], retrievalTags: ["career"], errors: [], partial: false },
  };
  const reasoningPath: ReasoningPath = buildReasoningPath({ plan, context });
    const timing: TimingContext = {
    available: true,
    windows: buildWindows() as unknown as TimingContext["windows"],
    requested: true,
    allowed: plan.timingAllowed,
    limitation: plan.timingAllowed ? undefined : "Timing claims are restricted for this question.",
    missingSources: [],
    warnings: [],
    metadata: { domain: plan.domain, sourceCounts: { dasha: 1, varshaphal: 1, python_transit: 0, stored: 0, user_provided: 0 }, usedStoredWindows: false, usedDashaFacts: true, usedVarshaphalFacts: true, usedPythonAdapter: false, usedUserProvidedDates: false, partial: false },
  };
    const contract = buildAnswerContract({ question, plan, context, reasoningPath, timing, sufficiency: { status: "answer_now", missingFacts: [], missingUserClarification: [], limitations: [], warnings: [], canUseGroq: true, canUseOllamaCritic: true, answerMode, metadata: { blockedBySafety: false, exactFact: answerType === "exact_fact", retrievalPartial: false, reasoningPartial: false, timingRequested: false, timingAvailable: true, timingAllowed: plan.timingAllowed, requiredFactCount: plan.requiredFacts.length, presentRequiredFactCount: plan.requiredFacts.length, missingRequiredFactCount: 0 } } as never } as BuildAnswerContractInput);
  return { question, contract, context, reasoningPath, timing };
}

function answerMode(question: string): BuildAnswerContractInput["sufficiency"]["answerMode"] {
  if (/die|cancer|medical|legal/i.test(question)) return "safety";
  if (/what is my lagna|where is sun/i.test(question)) return "exact_fact";
  if (/remedy/i.test(question) || /sleep/i.test(question)) return "remedy";
  if (/when/i.test(question)) return "timing_limited";
  return "interpretive";
}

function buildFacts(): ChartFact[] {
  return Array.from({ length: 40 }, (_, index) => ({
    factKey: `fact_${index}`,
    factType: "planet_placement",
    factValue: `value_${index}`,
    house: index,
    planet: `planet_${index}`,
    sign: `sign_${index}`,
    tags: ["career", "test"],
    metadata: { secret: "TARAYAI_LOCAL_SECRET", url: "http://127.0.0.1:8787" },
  })) as unknown as ChartFact[];
}

function buildRules(): ReasoningRule[] {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `rule-${index}`,
    ruleKey: `rule_${index}`,
    domain: "career",
    title: `title_${index}`,
    description: `description_${index}`,
    requiredFactTypes: ["house"],
    requiredTags: ["career"],
    reasoningTemplate: `template_${index}`,
    weight: 1,
    safetyNotes: ["safe"],
    enabled: true,
    metadata: {},
  })) as unknown as ReasoningRule[];
}

function buildBenchmarks(): BenchmarkExample[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `id_${index}`,
    exampleKey: `example_${index}`,
    domain: "career",
    question: `question_${index}`,
    answer: `answer_${index}`,
    reasoning: `reasoning_${index}`,
    accuracyClass: "partial",
    readingStyle: "companion",
    followUpQuestion: `followup_${index}`,
    tags: ["career"],
    metadata: {},
    enabled: true,
  })) as unknown as BenchmarkExample[];
}

function buildWindows(): TimingWindow[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `window-${index}`,
    userId: "u",
    profileId: null,
    label: `window_${index}`,
    startsOn: `2026-0${(index % 9) + 1}-01`,
    endsOn: `2026-0${(index % 9) + 1}-28`,
    domain: "career",
    interpretation: `interpretation_${index}`,
    source: "dasha",
    confidence: "strong",
    tags: ["timing"],
    factKeys: ["current_dasha"],
    metadata: {},
  })) as unknown as TimingWindow[];
}

function buildRemedies(): SafeRemedy[] {
  return [{ id: "r1", domain: "sleep", title: "routine", description: "routine", tags: ["sleep"], restrictions: ["low-cost"], source: "deterministic" }] as unknown as SafeRemedy[];
}

describe("groq answer prompt", () => {
  const base = pipeline("I am working hard and not getting promotion.");
  it("system prompt demands valid JSON only", () => expect(buildGroqAnswerMessages(base).system).toContain("valid JSON only"));
  it("forbids invented facts", () => expect(buildGroqAnswerMessages(base).system).toContain("Do not invent chart facts."));
  it("forbids invented timing", () => expect(buildGroqAnswerMessages(base).system).toContain("Do not invent dates or timing windows."));
  it("forbids guaranteed outcomes", () => expect(buildGroqAnswerMessages(base).system).toContain("Do not guarantee outcomes."));
  it("forbids medical legal financial advice", () => expect(buildGroqAnswerMessages(base).system).toContain("medical/legal/financial advice"));
  it("forbids death prediction", () => expect(buildGroqAnswerMessages(base).system).toContain("death/lifespan/fatal events"));
  it("includes companion tone", () => expect(buildGroqAnswerMessages(base).system).toContain("companion-like"));
  it("user prompt includes question", () => expect(buildGroqAnswerMessages(base).user).toContain(base.question));
  it("user prompt includes contract", () => expect(buildGroqAnswerMessages(base).user).toContain('"contract"'));
  it("user prompt includes required sections", () => expect(buildGroqAnswerMessages(base).user).toContain('"requiredSections"'));
  it("user prompt includes forbidden claims", () => expect(buildGroqAnswerMessages(base).user).toContain('"forbiddenClaims"'));
  it("user prompt includes writer instructions", () => expect(buildGroqAnswerMessages(base).user).toContain('"writerInstructions"'));
  it("user prompt includes retrieved facts", () => expect(buildGroqAnswerMessages(base).user).toContain('"retrievedFacts"'));
  it("prompt trims chart facts to 30", () => expect((compactContextForPrompt(base.context).chartFacts as unknown[]).length).toBe(30));
  it("prompt trims benchmark examples to 4", () => expect((compactContextForPrompt(base.context).benchmarkExamples as unknown[]).length).toBe(4));
  it("prompt trims reasoning steps to 8", () => expect((compactReasoningPathForPrompt(base.reasoningPath).steps as unknown[]).length).toBeLessThanOrEqual(8));
  it("prompt trims timing windows to 8", () => expect((compactTimingForPrompt(base.timing).windows as unknown[]).length).toBeLessThanOrEqual(8));
  it("compact contract excludes secrets and urls", () => expect(JSON.stringify(compactContractForPrompt(base.contract))).not.toMatch(/TARAYAI_LOCAL_SECRET|127\.0\.0\.1:8787/));
  it("compact context excludes private artifact names", () => expect(JSON.stringify(compactContextForPrompt(base.context))).not.toMatch(/myVedicReport\.docx|astro_package\.zip|Archive\.zip/));
  it("timing false still builds prompt", () => {
    const next = pipeline("When will I get married?", "marriage", "timing");
    next.contract.timingAllowed = false;
    expect(buildGroqAnswerMessages(next).user).toContain('"timing"');
  });
  it("exact facts still builds safe prompt", () => {
    const next = pipeline("What is my Lagna?", "career", "exact_fact");
    next.contract.exactFactsOnly = true;
    expect(buildGroqAnswerMessages(next).system).toContain("Do not invent chart facts.");
  });
  it("safety prompt contains safety restrictions", () => {
    const next = pipeline("Can my chart tell when I will die?", "safety", "safety");
    expect(buildGroqAnswerMessages(next).user).toContain('"safetyRestrictions"');
  });
  it("career prompt contains career anchors", () => expect(buildGroqAnswerMessages(base).user).toContain("house_10"));
  it("sleep prompt contains safe remedy restrictions", () => {
    const next = pipeline("Give me remedy for bad sleep.", "sleep", "remedy");
    expect(buildGroqAnswerMessages(next).user).toContain('"safeRemedies"');
  });
  it("never contains TARAYAI_LOCAL_SECRET", () => expect(buildGroqAnswerMessages(base).user).not.toContain("TARAYAI_LOCAL_SECRET"));
  it("never contains GROQ_API_KEY", () => expect(buildGroqAnswerMessages(base).user).not.toContain("GROQ_API_KEY"));
  it("user prompt stays JSON shaped", () => expect(() => JSON.parse(buildGroqAnswerMessages(base).user)).not.toThrow());
  it("compact contract keeps canUseGroq", () => expect(compactContractForPrompt(base.contract).canUseGroq).toBe(true));
  it("compact timing respects allowed flag", () => expect(compactTimingForPrompt(base.timing).allowed).toBe(true));
  it("system prompt references JSON keys exactly", () => expect(buildGroqAnswerMessages(base).system).toContain("answer, sections, usedAnchors, limitations, suggestedFollowUp, confidence"));
});
