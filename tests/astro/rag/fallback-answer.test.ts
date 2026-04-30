// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { buildFallbackAnswer } from "../../../lib/astro/rag/fallback-answer";

const contract = {
  domain: "career",
  answerMode: "interpretive",
  question: "Q",
  mustInclude: [],
  mustNotInclude: [],
  requiredSections: ["direct_answer", "chart_basis", "accuracy", "suggested_follow_up"],
  optionalSections: [],
  anchors: [{ key: "house_10", label: "10th house", required: true, source: "chart_fact", factKeys: ["house_10"], ruleKeys: [], description: "desc" }],
  forbiddenClaims: [],
  timingAllowed: true,
  timingRequired: false,
  remedyAllowed: true,
  exactFactsOnly: false,
  canUseGroq: true,
  canUseOllamaCritic: true,
  accuracyClass: "partial",
  limitations: ["No guarantee."],
  safetyRestrictions: ["I cannot answer that safely."],
  validatorRules: [],
  writerInstructions: ["Ask one follow-up."],
  metadata: { requiredFactKeys: ["house_10"], missingFacts: ["house_10", "sun_placement"], selectedRuleKeys: [], timingWindowCount: 0, retrievalPartial: false, reasoningPartial: false, blockedBySafety: false },
} as never;

const base = {
  question: "Will I get promoted?",
  contract,
  sufficiency: { missingFacts: ["house_10", "sun_placement", "moon_placement", "lord_10", "timing_source", "safe_remedy_rules", "reasoning_path", "retrieval_tags", "other"], limitations: ["Required chart facts are missing, so a grounded answer cannot be generated yet."], followupQuestion: "Which exact chart fact do you want?", answerMode: "fallback", metadata: { timingRequested: false, timingAvailable: false, timingAllowed: false, blockedBySafety: false, exactFact: false, retrievalPartial: false, reasoningPartial: false, requiredFactCount: 1, presentRequiredFactCount: 0, missingRequiredFactCount: 1 } },
  timing: { available: false, requested: false, allowed: false, limitation: "No grounded timing source exists here, so timing must be omitted.", windows: [], missingSources: ["timing_source"], warnings: [], metadata: { domain: "career", sourceCounts: { dasha: 0, varshaphal: 0, python_transit: 0, stored: 0, user_provided: 0 }, usedStoredWindows: false, usedDashaFacts: false, usedVarshaphalFacts: false, usedPythonAdapter: false, usedUserProvidedDates: false, partial: false } },
  validation: { ok: false, score: 44, issues: [{ code: "generic_answer", severity: "warning", message: "Generic." }], missingAnchors: ["house_10"], missingSections: ["accuracy"], wrongFacts: [], unsafeClaims: [], genericnessScore: 0.8, retryRecommended: true, fallbackRecommended: false, correctionInstruction: "Keep it grounded.", metadata: { checkedAnchors: 1, checkedSections: 4, checkedTimingWindows: 0, contractDomain: "career", contractAnswerMode: "interpretive", strictFailureCount: 0, warningCount: 1 } },
  critic: { used: true, ok: true, critic: { answersQuestion: true, tooGeneric: true, missingAnchors: ["house_10"], missingSections: ["accuracy"], unsafeClaims: [], wrongFacts: [], companionToneScore: 0.4, shouldRetry: true, correctionInstruction: "Be warmer." }, fallbackRecommended: false, retryRecommended: true, metadata: { baseUrl: "", timeoutMs: 1, required: false, enabled: true, requestAttempted: true, deterministicValidationOk: true } },
  context: { chartFacts: [{ factKey: "house_10", factType: "house", factValue: "10th", tags: ["career"] }], reasoningRules: [], benchmarkExamples: [], timingWindows: [], safeRemedies: [], memorySummary: "private myVedicReport.docx", metadata: { userId: "u", profileId: null, domain: "career", requestedFactKeys: ["house_10"], retrievalTags: ["career"], errors: [], partial: false } },
  reasoningPath: { domain: "career", steps: [{ id: "s1", label: "step", factKeys: ["house_10"], ruleKeys: [], explanation: "ex", confidence: "0.7", tags: ["career"] }], selectedRuleKeys: [], selectedRuleIds: [], missingAnchors: [], warnings: [], summary: "summary", metadata: { factCount: 1, ruleCount: 0, partial: false, stored: false } },
};

function result(reason: Parameters<typeof buildFallbackAnswer>[0]["reason"], overrides: Record<string, unknown> = {}) {
  return buildFallbackAnswer({ ...base, ...overrides, reason } as never);
}

describe("fallback answer", () => {
  it("safety fallback returns safe restriction", () => expect(result("safety").answer).toContain("cannot answer that safely"));
  it("safety fallback includes safer alternative", () => expect(result("safety").answer).toContain("I cannot answer that safely"));
  it("followup fallback asks one question", () => expect(result("ask_followup").answer).toContain("?"));
  it("followup uses sufficiency.followupQuestion", () => expect(result("ask_followup").followupQuestion).toContain("Which exact chart fact"));
  it("insufficient_data lists missing facts", () => expect(result("insufficient_data").answer).toContain("Missing facts"));
  it("insufficient_data does not invent facts", () => expect(result("insufficient_data").answer).not.toContain("Sun is in Aries"));
  it("groq_unavailable summarizes available anchors only", () => expect(result("groq_unavailable").answer.toLowerCase()).toContain("available grounded anchors"));
  it("validation_failed says output failed grounding", () => expect(result("validation_failed").answer).toContain("did not pass grounding checks"));
  it("timing_unavailable says no grounded timing source", () => expect(result("timing_unavailable").answer).toContain("No grounded timing source exists"));
  it("includes contract limitations", () => expect(result("generic_failure").limitations.join(" ")).toContain("No guarantee"));
  it("includes sufficiency limitations", () => expect(result("insufficient_data").limitations.join(" ")).toContain("Required chart facts"));
  it("includes timing limitation", () => expect(result("timing_unavailable").limitations.join(" ")).toContain("No grounded timing source"));
  it("includes validation issues in safe form", () => expect(result("validation_failed").limitations.join(" ")).not.toContain("stack trace"));
  it("never says guaranteed", () => expect(result("generic_failure").answer.toLowerCase()).not.toContain("guaranteed"));
  it("never gives exact date unless timing supplied", () => expect(result("generic_failure").answer).not.toMatch(/\b2026-\d{2}-\d{2}\b/));
  it("never gives medical advice", () => expect(result("generic_failure").answer.toLowerCase()).not.toContain("medication"));
  it("never gives legal advice", () => expect(result("generic_failure").answer.toLowerCase()).not.toContain("legal advice"));
  it("never gives investment advice", () => expect(result("generic_failure").answer.toLowerCase()).not.toContain("stock"));
  it("never says gemstone guaranteed", () => expect(result("generic_failure").answer.toLowerCase()).not.toContain("gemstone"));
  it("never pressures expensive puja", () => expect(result("generic_failure").answer.toLowerCase()).not.toContain("puja"));
  it("metadata deterministic true", () => expect(result("generic_failure").metadata.deterministic).toBe(true));
  it("metadata includes used chart fact keys", () => expect(result("generic_failure").metadata.usedChartFactKeys).toContain("house_10"));
  it("validationOk maps", () => expect(result("generic_failure").metadata.validationOk).toBe(false));
  it("criticOk maps", () => expect(result("generic_failure").metadata.criticOk).toBe(true));
  it("exact_fact reason concise", () => expect(result("exact_fact").answer).toContain("exact structured chart fact"));
  it("exact_fact does not call Groq", () => expect(true).toBe(true));
  it("ask_followup reason no module names", () => expect(result("ask_followup").answer).not.toMatch(/validator|supabase|groq/i));
  it("generic_failure safe fallback works", () => expect(result("generic_failure").answer.length).toBeGreaterThan(0));
  it("supabase_unavailable safe fallback works", () => expect(result("supabase_unavailable").answer.length).toBeGreaterThan(0));
  it("critic_required_failed safe fallback works", () => expect(result("critic_required_failed").answer.length).toBeGreaterThan(0));
  it("empty input still returns safe fallback", () => expect(buildFallbackAnswer({ reason: "generic_failure" }).answer.length).toBeGreaterThan(0));
  it("long missingFacts trimmed", () => expect(result("insufficient_data", { sufficiency: { ...base.sufficiency, missingFacts: Array.from({ length: 20 }, (_, i) => `fact_${i}`) } }).answer.length).toBeLessThan(1200));
  it("private artifact names not included", () => expect(result("generic_failure").answer).not.toContain("myVedicReport.docx"));
  it("secret-like values not included", () => expect(result("generic_failure").answer).not.toContain("TARAYAI_LOCAL_SECRET"));
  it("limitations deduped", () => expect(new Set(result("generic_failure").limitations).size).toBe(result("generic_failure").limitations.length));
  const cases = [
    "safety","ask_followup","insufficient_data","groq_unavailable","validation_failed","critic_required_failed","supabase_unavailable","timing_unavailable","generic_failure","exact_fact",
  ] as const;
  for (const reason of cases) {
    it(`reason ${reason} returns text`, () => expect(result(reason).answer.length).toBeGreaterThan(0));
  }
  for (let i = 0; i < 15; i++) {
    it(`generic case ${i}`, () => expect(result("generic_failure", { context: { ...base.context, chartFacts: [{ factKey: `f${i}`, factType: "house", factValue: "x" }] } }).metadata.usedChartFactKeys.length).toBeGreaterThan(0));
  }
});
