// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { COMMON_FORBIDDEN_CLAIMS, COMMON_VALIDATOR_RULES, sectionLabel, trimContractText, uniqueStrings } from "../../../lib/astro/rag/contracts/common";
import { buildCareerContractParts } from "../../../lib/astro/rag/contracts/career";
import { buildGeneralContractParts } from "../../../lib/astro/rag/contracts/general";
import { buildMarriageContractParts } from "../../../lib/astro/rag/contracts/marriage";
import { buildMoneyContractParts } from "../../../lib/astro/rag/contracts/money";
import { buildSafetyContractParts } from "../../../lib/astro/rag/contracts/safety";
import { buildSleepContractParts } from "../../../lib/astro/rag/contracts/sleep";
import { buildDeterministicAnalyzerResult } from "../../../lib/astro/rag/analyzer-schema";
import { ragSafetyGate } from "../../../lib/astro/rag/safety-gate";
import { planRequiredData } from "../../../lib/astro/rag/required-data-planner";
import { buildReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
import type { BuildAnswerContractInput } from "../../../lib/astro/rag/answer-contract-types";
import type { RequiredDataPlan } from "../../../lib/astro/rag/required-data-planner";
import type { RetrievalContext } from "../../../lib/astro/rag/retrieval-types";
import type { ReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
import type { TimingContext } from "../../../lib/astro/rag/timing-engine";

describe("contract domain helpers", () => {
  it("common forbidden claims include guaranteed_outcome", () => expect(COMMON_FORBIDDEN_CLAIMS.map((item) => item.key)).toContain("guaranteed_outcome"));
  it("common forbidden claims include invented_chart_fact", () => expect(COMMON_FORBIDDEN_CLAIMS.map((item) => item.key)).toContain("invented_chart_fact"));
  it("common forbidden claims include invented_timing", () => expect(COMMON_FORBIDDEN_CLAIMS.map((item) => item.key)).toContain("invented_timing"));
  it("common forbidden claims include medical_diagnosis", () => expect(COMMON_FORBIDDEN_CLAIMS.map((item) => item.key)).toContain("medical_diagnosis"));
  it("common forbidden claims include legal_advice", () => expect(COMMON_FORBIDDEN_CLAIMS.map((item) => item.key)).toContain("legal_advice"));
  it("common forbidden claims include financial_advice", () => expect(COMMON_FORBIDDEN_CLAIMS.map((item) => item.key)).toContain("financial_advice"));
  it("common forbidden claims include death_lifespan", () => expect(COMMON_FORBIDDEN_CLAIMS.map((item) => item.key)).toContain("death_lifespan"));
  it("common forbidden claims include gemstone_guarantee", () => expect(COMMON_FORBIDDEN_CLAIMS.map((item) => item.key)).toContain("gemstone_guarantee"));
  it("common forbidden claims include expensive_puja_pressure", () => expect(COMMON_FORBIDDEN_CLAIMS.map((item) => item.key)).toContain("expensive_puja_pressure"));
  it("common validator rules include answer_must_use_supplied_anchors", () => expect(COMMON_VALIDATOR_RULES).toContain("answer_must_use_supplied_anchors"));
  it("career contract parts require direct_answer", () => expect(buildCareerContractParts(fakeInput()).requiredSections).toContain("direct_answer"));
  it("career contract parts require chart_basis", () => expect(buildCareerContractParts(fakeInput()).requiredSections).toContain("chart_basis"));
  it("career contract parts require what_to_do", () => expect(buildCareerContractParts(fakeInput()).requiredSections).toContain("what_to_do"));
  it("career contract forbids guaranteed promotion", () => expect(buildCareerContractParts(fakeInput()).mustNotInclude.join(" ")).toContain("guaranteed promotion"));
  it("career contract forbids generic monthly dump", () => expect(buildCareerContractParts(fakeInput()).mustNotInclude.join(" ")).toContain("generic monthly dump"));
  it("sleep contract requires safe_remedies", () => expect(buildSleepContractParts(fakeInput({ plan: { ...fakePlan(), domain: "sleep", answerType: "remedy", needsRemedy: true, remedyAllowed: true }, context: { ...fakeContext(), safeRemedies: [{ id: "r", domain: "sleep", title: "r", description: "r", tags: [], restrictions: ["low"], source: "deterministic" }] } })).requiredSections).toContain("safe_remedies"));
  it("sleep contract forbids diagnosis", () => expect(buildSleepContractParts(fakeInput()).mustNotInclude.join(" ")).toContain("diagnosis"));
  it("sleep contract forbids medication stop advice", () => expect(buildSleepContractParts(fakeInput()).mustNotInclude.join(" ")).toContain("stop medicine"));
  it("sleep contract requires non-medical limitation", () => expect(buildSleepContractParts(fakeInput()).mustInclude.join(" ")).toContain("non-medical limitation"));
  it("marriage contract includes 7th house anchor", () => expect(buildMarriageContractParts(fakeInput()).mustInclude.join(" ")).toContain("7th house anchor"));
  it("marriage contract includes Venus anchor", () => expect(buildMarriageContractParts(fakeInput()).mustInclude.join(" ")).toContain("Venus relationship anchor"));
  it("marriage contract forbids guaranteed marriage", () => expect(buildMarriageContractParts(fakeInput()).mustNotInclude.join(" ")).toContain("guaranteed marriage"));
  it("money contract forbids financial guarantee", () => expect(buildMoneyContractParts(fakeInput()).mustNotInclude.join(" ")).toContain("financial guarantee"));
  it("money contract forbids investment instruction", () => expect(buildMoneyContractParts(fakeInput()).mustNotInclude.join(" ")).toContain("investment instruction"));
  it("safety contract requires safety_response", () => expect(buildSafetyContractParts(fakeInput({ sufficiency: fakeSufficiency({ answerMode: "safety", canUseGroq: false, canUseOllamaCritic: false }) })).requiredSections).toContain("safety_response"));
  it("safety contract disables unsafe claims", () => expect(buildSafetyContractParts(fakeInput()).validatorRules.join(" ")).toContain("accuracy_class:safety_only"));
  it("general contract includes limitations", () => expect(buildGeneralContractParts(fakeInput()).requiredSections).toContain("limitations"));
  it("timing_limited general contract requires limitations", () => expect(buildGeneralContractParts(fakeInput({ sufficiency: fakeSufficiency({ answerMode: "timing_limited" }) })).requiredSections).toContain("limitations"));
  it("uniqueStrings dedupes", () => expect(uniqueStrings(["a", "a", "b"])).toEqual(["a", "b"]));
  it("trimContractText trims long text", () => expect(trimContractText("x".repeat(500), 20).length).toBeLessThanOrEqual(20));
  it("sectionLabel returns stable readable labels", () => expect(sectionLabel("direct_answer")).toBe("Direct answer"));
});

function fakePlan(overrides: Partial<RequiredDataPlan> = {}): RequiredDataPlan {
  return planRequiredData({
    analyzer: buildDeterministicAnalyzerResult({ question: "Q", topic: "career", questionType: "interpretive" }),
    safety: ragSafetyGate({ question: "Q" }),
    question: "Q",
    ...overrides,
  } as never);
}

function fakeTiming(): TimingContext {
  return {
    available: true,
    windows: [{ label: "window", startsOn: "2026-01-01", endsOn: "2026-06-30", domain: "career", interpretation: "timing", source: "dasha", confidence: "strong", tags: ["timing"], factKeys: ["current_mahadasha"], metadata: {} }],
    requested: true,
    allowed: true,
    limitation: undefined,
    missingSources: [],
    warnings: [],
    metadata: {
      domain: "general",
      sourceCounts: { dasha: 1, varshaphal: 0, python_transit: 0, stored: 0, user_provided: 0 },
      usedStoredWindows: false,
      usedDashaFacts: true,
      usedVarshaphalFacts: false,
      usedPythonAdapter: false,
      usedUserProvidedDates: false,
      partial: false,
    },
  };
}

function fakeReasoningPath(): ReasoningPath {
  return buildReasoningPath({ plan: fakePlan(), context: fakeContext() });
}

function fakeContext(): RetrievalContext {
  return {
    chartFacts: [],
    reasoningRules: [],
    benchmarkExamples: [],
    timingWindows: [],
    safeRemedies: [],
    metadata: { userId: "u", profileId: null, domain: "general" as const, requestedFactKeys: [], retrievalTags: [], errors: [], partial: false },
  };
}

type FakeSufficiency = {
  status: "answer_now" | "ask_followup" | "fallback";
  missingFacts: string[];
  missingUserClarification: string[];
  followupQuestion?: string;
  limitations: string[];
  warnings: string[];
  canUseGroq: boolean;
  canUseOllamaCritic: boolean;
  answerMode: BuildAnswerContractInput["sufficiency"]["answerMode"];
  metadata: {
    blockedBySafety: boolean;
    exactFact: boolean;
    retrievalPartial: boolean;
    reasoningPartial: boolean;
    timingRequested: boolean;
    timingAvailable: boolean;
    timingAllowed: boolean;
    requiredFactCount: number;
    presentRequiredFactCount: number;
    missingRequiredFactCount: number;
  };
};

function fakeSufficiency(overrides: Partial<{ answerMode: BuildAnswerContractInput["sufficiency"]["answerMode"]; canUseGroq: boolean; canUseOllamaCritic: boolean }>): FakeSufficiency {
  return {
    status: "answer_now",
    missingFacts: [],
    missingUserClarification: [],
    limitations: [],
    warnings: [],
    canUseGroq: true,
    canUseOllamaCritic: true,
    answerMode: "interpretive",
    metadata: { blockedBySafety: false, exactFact: false, retrievalPartial: false, reasoningPartial: false, timingRequested: false, timingAvailable: false, timingAllowed: true, requiredFactCount: 0, presentRequiredFactCount: 0, missingRequiredFactCount: 0 },
    ...overrides,
  } as FakeSufficiency;
}

function fakeInput(overrides: Record<string, unknown> = {}): { question: string; plan: RequiredDataPlan; context: RetrievalContext; reasoningPath: ReasoningPath; timing: TimingContext; sufficiency: FakeSufficiency } {
  return {
    question: "Q",
    plan: fakePlan(),
    context: fakeContext(),
    reasoningPath: fakeReasoningPath(),
    timing: fakeTiming(),
    sufficiency: fakeSufficiency({}),
    ...overrides,
  };
}
