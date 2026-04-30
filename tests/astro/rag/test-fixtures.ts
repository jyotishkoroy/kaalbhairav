// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerContract, ContractAnchor } from "../../../lib/astro/rag/answer-contract-types";
import type { AnswerValidationInput } from "../../../lib/astro/rag/validation-types";
import type { RetrievalContext } from "../../../lib/astro/rag/retrieval-types";
import type { TimingContext } from "../../../lib/astro/rag/timing-engine";

export function fakeContext(): RetrievalContext {
  return {
    chartFacts: [
      { factType: "lagna", factKey: "lagna", factValue: "Leo", sign: "Leo", source: "chart_json", confidence: "deterministic", tags: ["lagna"], metadata: {} },
      { factType: "planet_placement", factKey: "sun_placement", factValue: "Taurus house 10", planet: "Sun", house: 10, sign: "Taurus", source: "chart_json", confidence: "deterministic", tags: ["sun", "house_10"], metadata: {} },
      { factType: "planet_placement", factKey: "moon_placement", factValue: "Gemini house 11", planet: "Moon", house: 11, sign: "Gemini", source: "chart_json", confidence: "deterministic", tags: ["moon", "house_11"], metadata: {} },
      { factType: "planet_placement", factKey: "mercury_placement", factValue: "Gemini house 11", planet: "Mercury", house: 11, sign: "Gemini", source: "chart_json", confidence: "deterministic", tags: ["mercury", "house_11"], metadata: {} },
      { factType: "planet_placement", factKey: "venus_placement", factValue: "Cancer house 12", planet: "Venus", house: 12, sign: "Cancer", source: "chart_json", confidence: "deterministic", tags: ["venus", "house_12"], metadata: {} },
      { factType: "house", factKey: "house_10", factValue: "Taurus", house: 10, sign: "Taurus", source: "chart_json", confidence: "deterministic", tags: ["house_10"], metadata: {} },
      { factType: "house_lord", factKey: "lord_10", factValue: "Venus", source: "derived", confidence: "deterministic", tags: ["lord_10"], metadata: {} },
      { factType: "dasha", factKey: "current_dasha", factValue: "Jupiter Mahadasha", source: "derived", confidence: "deterministic", tags: ["dasha"], metadata: {} },
      { factType: "house", factKey: "house_12", factValue: "Cancer", house: 12, sign: "Cancer", source: "chart_json", confidence: "deterministic", tags: ["house_12"], metadata: {} },
      { factType: "house", factKey: "house_6", factValue: "Capricorn", house: 6, sign: "Capricorn", source: "chart_json", confidence: "deterministic", tags: ["house_6"], metadata: {} },
    ],
    reasoningRules: [],
    benchmarkExamples: [],
    timingWindows: [],
    safeRemedies: [],
    metadata: { userId: "u", profileId: null, domain: "career", requestedFactKeys: [], retrievalTags: [], errors: [], partial: false },
  };
}

export function fakeTiming(available = true): TimingContext {
  return {
    available,
    windows: available ? [{ label: "2026-01-01 to 2026-06-30", startsOn: "2026-01-01", endsOn: "2026-06-30", domain: "career", interpretation: "Grounded window", source: "dasha", confidence: "strong", tags: ["timing"], factKeys: ["current_dasha"], metadata: {} }] : [],
    requested: true,
    allowed: true,
    limitation: available ? undefined : "timing unavailable",
    missingSources: available ? [] : ["dasha"],
    warnings: [],
    metadata: {
      domain: "career",
      sourceCounts: { dasha: 1, varshaphal: 0, python_transit: 0, stored: 0, user_provided: 0 },
      usedStoredWindows: false,
      usedDashaFacts: true,
      usedVarshaphalFacts: false,
      usedPythonAdapter: false,
      usedUserProvidedDates: false,
      partial: !available,
    },
  };
}

export function fakeContract(overrides: Partial<AnswerContract> = {}): AnswerContract {
  const anchors: ContractAnchor[] = [
    { key: "lagna", label: "lagna", required: true, source: "chart_fact", factKeys: ["lagna"], ruleKeys: [], description: "Lagna" },
    { key: "house_10", label: "house_10", required: true, source: "chart_fact", factKeys: ["house_10"], ruleKeys: [], description: "10th house" },
    { key: "sun_placement", label: "sun_placement", required: true, source: "chart_fact", factKeys: ["sun_placement"], ruleKeys: [], description: "Sun placement" },
    { key: "lord_10", label: "lord_10", required: true, source: "chart_fact", factKeys: ["lord_10"], ruleKeys: [], description: "10th lord" },
    { key: "house_11", label: "house_11", required: true, source: "chart_fact", factKeys: ["house_11"], ruleKeys: [], description: "11th house" },
    { key: "current_dasha", label: "current_dasha", required: true, source: "reasoning_path", factKeys: ["current_dasha"], ruleKeys: [], description: "Dasha" },
  ];
  return {
    id: "c1",
    domain: "career",
    answerMode: "interpretive",
    question: "Will I get promoted?",
    mustInclude: [],
    mustNotInclude: [],
    requiredSections: ["direct_answer", "chart_basis", "reasoning", "what_to_do", "accuracy", "suggested_follow_up"],
    optionalSections: ["timing", "limitations"],
    anchors,
    forbiddenClaims: [{ key: "guaranteed promotion", description: "No guaranteed promotion", severity: "block" }],
    timingAllowed: true,
    timingRequired: true,
    remedyAllowed: true,
    exactFactsOnly: false,
    canUseGroq: true,
    canUseOllamaCritic: false,
    accuracyClass: "grounded_interpretive",
    limitations: [],
    safetyRestrictions: [],
    validatorRules: [],
    writerInstructions: [],
    metadata: { requiredFactKeys: ["lagna"], missingFacts: [], selectedRuleKeys: [], timingWindowCount: 1, retrievalPartial: false, reasoningPartial: false, blockedBySafety: false },
    ...overrides,
  };
}

export function makeInput(overrides: Partial<AnswerValidationInput> = {}): AnswerValidationInput {
  const contract = overrides.contract ?? fakeContract();
  const context = overrides.context ?? fakeContext();
  const reasoningPath = overrides.reasoningPath ?? {
    domain: "career",
    steps: [
      { id: "career-lagna", label: "Lagna", factKeys: ["lagna"], ruleKeys: ["career_lagna"], explanation: "Lagna is Leo.", confidence: "deterministic", tags: ["career"] },
      { id: "career-10th", label: "10th House", factKeys: ["house_10", "sun_placement"], ruleKeys: ["career_10th"], explanation: "10th house Taurus and Sun Taurus.", confidence: "deterministic", tags: ["career"] },
    ],
    selectedRuleKeys: ["career_lagna", "career_10th"],
    selectedRuleIds: ["r1", "r2"],
    missingAnchors: [],
    warnings: [],
    summary: "Career reasoning is anchored in Lagna and 10th house.",
    metadata: { factCount: 2, ruleCount: 2, partial: false, stored: false },
  } as never;
  const timing = overrides.timing ?? fakeTiming();
  return {
    question: "Will I get promoted?",
    answer: "",
    json: null,
    contract,
    context,
    reasoningPath,
    timing,
    ...overrides,
  };
}
