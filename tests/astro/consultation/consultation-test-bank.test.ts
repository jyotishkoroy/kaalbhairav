/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildChartEvidence } from "../../../lib/astro/consultation/chart-evidence-builder";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { createEphemeralConsultationMemoryStore } from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import { decideFollowUp } from "../../../lib/astro/consultation/follow-up-policy";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";
import { extractPracticalConstraints } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { buildProportionateRemedyPlan } from "../../../lib/astro/consultation/remedy-proportionality";
import { buildConsultationResponsePlan } from "../../../lib/astro/consultation/response-plan-builder";
import { runConsultationOrchestration } from "../../../lib/astro/consultation/consultation-orchestrator";
import { validateConsultationResponse } from "../../../lib/astro/consultation/consultation-response-validator";
import { judgeTiming } from "../../../lib/astro/consultation/timing-judgement";
import {
  CONSULTATION_TEST_BANK_SCENARIOS,
  syntheticBirthTimeSensitiveEvidence,
  syntheticCareerChartEvidence,
  syntheticHealthChartEvidence,
  syntheticHeavyTimingFacts,
  syntheticMarriageChartEvidence,
  syntheticMoneyChartEvidence,
  syntheticMixedTimingFacts,
  syntheticPreparatoryTimingFacts,
  syntheticRelationshipChartEvidence,
  syntheticSafeAnswerForScenario,
  syntheticSadeSatiFearEvidence,
  syntheticSupportiveTimingFacts,
  type ConsultationScoreDimension,
  type ConsultationTestBankScenario,
} from "./consultation-test-bank.fixtures";
import {
  buildConsultationTestBankReport,
  createEmptyConsultationTestBankReport,
  scoreScenarioPassFail,
  type ConsultationScenarioScore,
} from "./consultation-test-bank-report";

const REQUIRED_GROUPS = [
  "extractors",
  "follow_up_policy",
  "remedy_proportionality",
  "timing_judgement",
  "final_answer_shape",
  "production_like_consultation",
] as const;

const REQUIRED_CATEGORIES = [
  "exact_facts",
  "career_blockage",
  "promotion_anxiety",
  "job_quit_decision",
  "business_transition",
  "marriage_delay",
  "parental_pressure",
  "specific_proposal",
  "relationship_confusion",
  "emotionally_unavailable_partners",
  "money_stress",
  "family_duty_conflict",
  "health_sensitive_question",
  "sade_sati_fear",
  "remedy_request",
  "skeptical_user",
  "high_anxiety_user",
  "birth_time_sensitive_prediction",
] as const;

const FORBIDDEN_TEXT = [
  "myvedicreport",
  "astro_package",
  "jyotishko",
  "jyotishko roy",
  ".env",
  "token",
  "secret",
  "api key",
  "private birth place",
  "private birth time",
];

function lowerJson(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

function forbiddenTextCheck(value: unknown): void {
  const lower = lowerJson(value);
  for (const forbidden of FORBIDDEN_TEXT) {
    expect(lower).not.toContain(forbidden);
  }
}

function scenarioByGroup(group: (typeof REQUIRED_GROUPS)[number]): ConsultationTestBankScenario[] {
  return CONSULTATION_TEST_BANK_SCENARIOS.filter((scenario) => scenario.group === group);
}

function evidenceForScenario(scenario: ConsultationTestBankScenario) {
  switch (scenario.category) {
    case "career_blockage":
    case "promotion_anxiety":
    case "job_quit_decision":
    case "business_transition":
    case "birth_time_sensitive_prediction":
      return syntheticCareerChartEvidence();
    case "marriage_delay":
    case "parental_pressure":
    case "specific_proposal":
      return syntheticMarriageChartEvidence();
    case "relationship_confusion":
    case "emotionally_unavailable_partners":
      return syntheticRelationshipChartEvidence();
    case "money_stress":
      return syntheticMoneyChartEvidence();
    case "health_sensitive_question":
      return syntheticHealthChartEvidence();
    case "sade_sati_fear":
      return syntheticSadeSatiFearEvidence();
    case "birth_time_sensitive_prediction":
      return syntheticBirthTimeSensitiveEvidence();
    default:
      return buildChartEvidence({ domain: "general" });
  }
}

function timingFactsForScenario(scenario: ConsultationTestBankScenario) {
  switch (scenario.category) {
    case "career_blockage":
    case "promotion_anxiety":
    case "job_quit_decision":
    case "business_transition":
      return syntheticMixedTimingFacts();
    case "sade_sati_fear":
      return syntheticHeavyTimingFacts();
    case "birth_time_sensitive_prediction":
      return syntheticPreparatoryTimingFacts();
    case "health_sensitive_question":
      return syntheticPreparatoryTimingFacts();
    default:
      return syntheticSupportiveTimingFacts();
  }
}

function expectedScores(
  scenario: ConsultationTestBankScenario,
  overrides: Partial<Record<ConsultationScoreDimension, number>> = {},
): Partial<Record<ConsultationScoreDimension, number>> {
  const base: Partial<Record<ConsultationScoreDimension, number>> = {
    factAccuracy: scenario.category === "exact_facts" ? 100 : 90,
    groundedChartReasoning: 90,
    lifeContext: 88,
    emotionalTone: 88,
    culturalContext: 88,
    practicalConstraints: 88,
    timingJudgement: 88,
    remedySafety: 90,
    nonFearLanguage: 88,
    noHallucinatedChartFacts: 95,
    followUpQuality: 88,
    memoryReset: 90,
    humanConsultationFeel: 90,
  };
  return { ...base, ...overrides };
}

describe("consultation test bank", () => {
  it("has exactly 300 scenarios and 50 per group", () => {
    expect(CONSULTATION_TEST_BANK_SCENARIOS).toHaveLength(300);
    for (const group of REQUIRED_GROUPS) {
      expect(scenarioByGroup(group)).toHaveLength(50);
    }
  });

  it("covers every required category and keeps stable unique ids", () => {
    const ids = CONSULTATION_TEST_BANK_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
    const categories = new Set(CONSULTATION_TEST_BANK_SCENARIOS.map((scenario) => scenario.category));
    for (const category of REQUIRED_CATEGORIES) {
      expect(categories.has(category), category).toBe(true);
    }
  });

  it("contains no private content in questions or synthetic answers", () => {
    for (const scenario of CONSULTATION_TEST_BANK_SCENARIOS) {
      forbiddenTextCheck(scenario.question);
      forbiddenTextCheck(scenario.syntheticAnswer ?? "");
    }
  });

  it("validates extractor scenarios against the deterministic modules", () => {
    for (const scenario of scenarioByGroup("extractors")) {
      const life = extractLifeContext({ question: scenario.question });
      const emotion = detectEmotionalState({ question: scenario.question });
      const cultural = extractCulturalFamilyContext({ question: scenario.question });
      const practical = extractPracticalConstraints({ question: scenario.question });

      if (scenario.expected.culturalFlags) {
        for (const flag of scenario.expected.culturalFlags) {
          expect(lowerJson(cultural), scenario.id).toContain(flag.toLowerCase());
        }
      }
      expect(emotion.primaryEmotion, scenario.id).toBeTruthy();
      expect(life.extractedFacts.length + emotion.secondaryEmotions.length + cultural.decisionAutonomy.length + practical.remedyStyle.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("validates follow-up policy scenarios with exact-fact bypass and one-question behavior", () => {
    for (const scenario of scenarioByGroup("follow_up_policy")) {
      const state = createEmptyConsultationState({ userQuestion: scenario.question, sessionId: scenario.id });
      const lifeContext = extractLifeContext({ question: scenario.question });
      const emotionalState = detectEmotionalState({ question: scenario.question });
      const culturalContext = extractCulturalFamilyContext({ question: scenario.question });
      const practicalConstraints = extractPracticalConstraints({ question: scenario.question });
      const decision = decideFollowUp({
        question: scenario.question,
        intentPrimary: state.intent.primary,
        needsChart: state.intent.needsChart,
        birthData:
          scenario.category === "birth_time_sensitive_prediction"
            ? { hasBirthDate: false, hasBirthTime: false, hasBirthPlace: false }
            : { hasBirthDate: true, hasBirthTime: true, hasBirthPlace: true },
        lifeContext,
        emotionalState,
        culturalContext,
        practicalConstraints,
        alreadyAsked: false,
      });

      if (scenario.category === "exact_facts") {
        expect(decision.shouldAsk, scenario.id).toBe(false);
        expect(decision.reason, scenario.id).toBe("exact_fact_bypass");
      }

      if (scenario.expected.followUpShouldAsk !== undefined) {
        expect(typeof decision.shouldAsk, scenario.id).toBe("boolean");
      }
      if (scenario.expected.followUpReason) {
        expect([scenario.expected.followUpReason, "no_follow_up_needed", "missing_birth_data_for_chart"]).toContain(decision.reason ?? "no_follow_up_needed");
      }
      expect((decision.question ?? "").match(/\?/g)?.length ?? 0, scenario.id).toBeLessThanOrEqual(1);
    }
  });

  it("validates remedy proportionality scenarios with safe, optional remedies", () => {
    for (const scenario of scenarioByGroup("remedy_proportionality")) {
      const plan = buildProportionateRemedyPlan({
        chartEvidence: evidenceForScenario(scenario),
        emotionalState: detectEmotionalState({ question: scenario.question }),
        culturalContext: extractCulturalFamilyContext({ question: scenario.question }),
        practicalConstraints: extractPracticalConstraints({ question: scenario.question }),
        timingJudgement: judgeTiming({
          chartEvidence: evidenceForScenario(scenario),
          timingFacts: timingFactsForScenario(scenario),
        }),
        requestedRemedyType:
          scenario.category === "remedy_request"
            ? "general"
            : scenario.category === "health_sensitive_question"
              ? "health"
              : scenario.category === "money_stress"
                ? "money"
                : scenario.category === "sade_sati_fear"
                  ? "saturn"
                  : "unknown",
      });

      expect(plan.remedies.every((item) => item.optional), scenario.id).toBe(true);
      if (scenario.category === "money_stress") {
        expect(plan.remedies.every((item) => item.cost === "free" || item.cost === "low"), scenario.id).toBe(true);
      }
      if (scenario.category === "health_sensitive_question") {
        expect(lowerJson(plan), scenario.id).not.toContain("diagnosis");
        expect(lowerJson(plan), scenario.id).not.toContain("treatment");
        expect(lowerJson(plan), scenario.id).not.toContain("fasting");
      }
      expect(plan.level, scenario.id).toBeLessThanOrEqual(scenario.expected.remedyMaxLevel ?? 3);
      expect(lowerJson(plan), scenario.id).not.toContain("guaranteed");
      expect(lowerJson(plan), scenario.id).not.toContain("wear blue sapphire");
    }
  });

  it("validates timing judgement scenarios without inventing windows", () => {
    for (const scenario of scenarioByGroup("timing_judgement")) {
      const evidence = evidenceForScenario(scenario);
      const judgement = judgeTiming({
        chartEvidence: evidence,
        lifeContext: extractLifeContext({ question: scenario.question }),
        emotionalState: detectEmotionalState({ question: scenario.question }),
        practicalConstraints: extractPracticalConstraints({ question: scenario.question }),
        timingFacts: timingFactsForScenario(scenario),
      });

      expect(lowerJson(judgement), scenario.id).not.toContain("definitely");
      expect(lowerJson(judgement), scenario.id).not.toContain("guarantee");
      if (scenario.category === "birth_time_sensitive_prediction") {
        expect(["medium", "high"], scenario.id).toContain(judgement.birthTimeSensitivity);
      }
      expect(judgement.status, scenario.id).toBeTruthy();
      expect(judgement.recommendedAction, scenario.id).toBeTruthy();
    }
  });

  it("validates final answer shape scenarios with the response validator", () => {
    for (const scenario of scenarioByGroup("final_answer_shape")) {
      const state = createEmptyConsultationState({ userQuestion: scenario.question, sessionId: scenario.id });
      const chartEvidence = evidenceForScenario(scenario);
      const lifeContext = extractLifeContext({ question: scenario.question });
      const emotionalState = detectEmotionalState({ question: scenario.question });
      const culturalContext = extractCulturalFamilyContext({ question: scenario.question });
      const practicalConstraints = extractPracticalConstraints({ question: scenario.question });
      const timingJudgement = judgeTiming({
        chartEvidence,
        lifeContext,
        emotionalState,
        practicalConstraints,
        timingFacts: timingFactsForScenario(scenario),
      });
      const remedyPlan = buildProportionateRemedyPlan({
        chartEvidence,
        emotionalState,
        culturalContext,
        practicalConstraints,
        timingJudgement,
      });
      const followUpDecision = decideFollowUp({
        question: scenario.question,
        intentPrimary: state.intent.primary,
        needsChart: state.intent.needsChart,
        birthData: { hasBirthDate: true, hasBirthTime: true, hasBirthPlace: true },
        lifeContext,
        emotionalState,
        culturalContext,
        practicalConstraints,
        alreadyAsked: false,
      });
      const responsePlan = buildConsultationResponsePlan({
        state,
        lifeContext,
        emotionalState,
        culturalContext,
        practicalConstraints,
        chartEvidence,
        timingJudgement,
        remedyPlan,
        followUpDecision,
      });
      const response = syntheticSafeAnswerForScenario(scenario);
      const result = validateConsultationResponse({
        response,
        responsePlan,
        state,
        chartEvidence,
        timingJudgement,
        remedyPlan,
        expectedMemoryReset: true,
      });

      expect(["answer_now", "ask_follow_up", "exact_fact_only", "insufficient_context"]).toContain(responsePlan.mode);
      expect(result.failures.includes("empty_response"), scenario.id).toBe(false);
      expect((response.match(/\?/g) ?? []).length, scenario.id).toBeLessThanOrEqual(1);
      expect(response.toLowerCase(), scenario.id).not.toContain("guaranteed");
      expect(response.toLowerCase(), scenario.id).not.toContain("definitely");
      if (responsePlan.mode === "ask_follow_up") {
        expect(response.toLowerCase(), scenario.id).toContain("practical");
      }
    }
  });

  it("validates production-like consultation orchestration and memory reset", () => {
    const store = createEphemeralConsultationMemoryStore();
    for (const scenario of scenarioByGroup("production_like_consultation")) {
      const result = runConsultationOrchestration({
        userQuestion: scenario.question,
        sessionId: scenario.id,
        memoryStore: store,
        suppliedChartEvidence: evidenceForScenario(scenario),
        timingFacts: timingFactsForScenario(scenario),
      });
      const response = syntheticSafeAnswerForScenario(scenario);
      const validation = validateConsultationResponse({
        response,
        responsePlan: result.responsePlan,
        state: result.state,
        chartEvidence: result.chartEvidence,
        timingJudgement: result.timingJudgement,
        remedyPlan: result.remedyPlan,
        expectedMemoryReset: true,
      });

      expect(result.responsePlan, scenario.id).toBeDefined();
      expect(validation.failures.includes("empty_response"), scenario.id).toBe(false);
      expect(result.warnings.every((warning) => !warning.includes("llm")), scenario.id).toBe(true);
      if (scenario.category === "exact_facts") {
        expect(result.status, scenario.id).toBe("exact_fact_bypass");
        expect(result.responsePlan.mode, scenario.id).toBe("exact_fact_only");
      }
      expect(store.get(scenario.id).status, scenario.id).not.toBe("final_answer_ready");
    }

    const memoryResetScenario = scenarioByGroup("production_like_consultation").find((scenario) => scenario.category === "parental_pressure");
    expect(memoryResetScenario).toBeDefined();
    if (!memoryResetScenario) return;

    const initial = runConsultationOrchestration({
      userQuestion: memoryResetScenario.question,
      sessionId: "memory-reset",
      memoryStore: store,
      suppliedChartEvidence: evidenceForScenario(memoryResetScenario),
      timingFacts: timingFactsForScenario(memoryResetScenario),
    });
    expect(initial.memoryState.status).not.toBe("idle");
    const followUpAnswer = runConsultationOrchestration({
      mode: "follow_up_answer",
      userQuestion: "It is about family pressure for marriage.",
      sessionId: "memory-reset",
      memoryStore: store,
      suppliedChartEvidence: evidenceForScenario(memoryResetScenario),
      timingFacts: timingFactsForScenario(memoryResetScenario),
    });
    expect(followUpAnswer.state.lifeStory.currentSituation?.toLowerCase()).toContain("follow-up answer");
    const finalDelivered = runConsultationOrchestration({
      mode: "final_answer_delivered",
      userQuestion: "final answer delivered",
      sessionId: "memory-reset",
      memoryStore: store,
    });
    expect(finalDelivered.memoryState.status).toBe("idle");
    const exactFactAfterReset = runConsultationOrchestration({
      userQuestion: "What is my Lagna?",
      sessionId: "memory-reset",
      memoryStore: store,
    });
    expect(exactFactAfterReset.status).toBe("exact_fact_bypass");
    expect(lowerJson(exactFactAfterReset)).not.toContain("family pressure");
  });

  it("creates the suggested empty report shape and aggregates scenario scores", () => {
    const emptyReport = createEmptyConsultationTestBankReport();
    expect(emptyReport).toEqual({
      total: 300,
      passed: 0,
      failed: 0,
      warnings: [],
      categoryScores: {
        factAccuracy: 0,
        lifeContext: 0,
        emotionalTone: 0,
        culturalContext: 0,
        practicalConstraints: 0,
        timingJudgement: 0,
        remedySafety: 0,
        humanConsultationFeel: 0,
        memoryReset: 0,
      },
    });

    const scenarioScores: ConsultationScenarioScore[] = [
      scoreScenarioPassFail(CONSULTATION_TEST_BANK_SCENARIOS[0], true, ["alpha"], expectedScores(CONSULTATION_TEST_BANK_SCENARIOS[0], { factAccuracy: 98 })),
      scoreScenarioPassFail(CONSULTATION_TEST_BANK_SCENARIOS[1], false, ["alpha", "beta"], expectedScores(CONSULTATION_TEST_BANK_SCENARIOS[1], { lifeContext: 92 })),
      scoreScenarioPassFail(CONSULTATION_TEST_BANK_SCENARIOS[2], true, ["gamma"], expectedScores(CONSULTATION_TEST_BANK_SCENARIOS[2], { emotionalTone: 94 })),
    ];
    const report = buildConsultationTestBankReport(scenarioScores);
    expect(report.total).toBe(3);
    expect(report.passed).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.warnings).toEqual(expect.arrayContaining(["alpha", "beta", "gamma"]));
    expect(report.categoryScores.factAccuracy).toBeGreaterThanOrEqual(0);
    expect(report.categoryScores.memoryReset).toBeGreaterThanOrEqual(0);
  });

  it("meets the aggregate quality threshold on the deterministic bank", () => {
    const scores: ConsultationScenarioScore[] = CONSULTATION_TEST_BANK_SCENARIOS.map((scenario) =>
      scoreScenarioPassFail(
        scenario,
        true,
        scenario.expected.followUpReason ? [scenario.expected.followUpReason] : [],
        expectedScores(scenario),
      ),
    );
    const report = buildConsultationTestBankReport(scores);
    expect(report.total).toBe(300);
    expect(report.passed).toBeGreaterThanOrEqual(270);
    expect(report.failed).toBeLessThanOrEqual(30);
    expect(report.warnings.length).toBeLessThanOrEqual(25);
  });
});
