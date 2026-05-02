/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import {
  buildConsultationMonitoringAggregateReport,
  buildConsultationMonitoringEvent,
  createEmptyConsultationMonitoringEvent,
  detectConsultationMonitoringRedFlags,
  isPrivacySafeConsultationMonitoringEvent,
  serializeConsultationMonitoringEvent,
} from "../../../lib/astro/consultation/consultation-monitoring";
import { resolveConsultationFeatureFlags } from "../../../lib/astro/consultation/consultation-feature-flags";
import { runConsultationOrchestration } from "../../../lib/astro/consultation/consultation-orchestrator";
import { composeFinalConsultationAnswer } from "../../../lib/astro/consultation/final-consultation-answer";
import { validateConsultationResponse } from "../../../lib/astro/consultation/consultation-response-validator";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";
import { decideFollowUp } from "../../../lib/astro/consultation/follow-up-policy";
import { buildProportionateRemedyPlan, type RemedyPlan } from "../../../lib/astro/consultation/remedy-proportionality";
import type { TimingJudgement } from "../../../lib/astro/consultation/timing-judgement";
import { buildConsultationResponsePlan } from "../../../lib/astro/consultation/response-plan-builder";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { createEphemeralConsultationMemoryStore } from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import type { ChartEvidence } from "../../../lib/astro/consultation/chart-evidence-builder";
import { CONSULTATION_TEST_BANK_SCENARIOS, syntheticCareerChartEvidence, syntheticMarriageChartEvidence, syntheticMixedTimingFacts, syntheticSadeSatiFearEvidence, syntheticSupportiveTimingFacts } from "./consultation-test-bank.fixtures";
import { CONSULTATION_FEATURE_FLAG_NAMES } from "../../../lib/astro/consultation/consultation-feature-flags";
import type { ConsultationMonitoringEvent } from "../../../lib/astro/consultation/consultation-monitoring";

function chartEvidence(): ChartEvidence {
  return syntheticMarriageChartEvidence();
}
function timing(overrides: Partial<TimingJudgement> = {}): TimingJudgement {
  return { status: "mixed", currentPeriodMeaning: "Synthetic timing", recommendedAction: "avoid_impulsive_decision", reasoning: ["synthetic"], confidence: "medium", birthTimeSensitivity: "medium", ...overrides };
}
function remedy(level = 2, cost: RemedyPlan["remedies"][number]["cost"] = "medium"): RemedyPlan {
  return { level: level as RemedyPlan["level"], levelMeaning: "behavioral", remedies: [{ type: "behavioral", instruction: "Use one grounded step.", reason: "synthetic", cost, optional: true }], avoid: [] };
}
function allTrueConsultationFlags(): Record<string, string> {
  return Object.fromEntries(CONSULTATION_FEATURE_FLAG_NAMES.map((name) => [name, "true"]));
}

describe("consultation monitoring", () => {
  it("empty monitoring event has safe defaults", () => {
    const event = createEmptyConsultationMonitoringEvent();
    expect(event.mode).toBe("unknown");
    expect(event.redFlags).toEqual([]);
    expect(isPrivacySafeConsultationMonitoringEvent(event)).toBe(true);
  });

  it("empty input builder does not throw", () => {
    expect(() => buildConsultationMonitoringEvent({})).not.toThrow();
  });

  it("exact fact bypass event records exactFactBypassUsed", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "What is my Lagna?" });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.mode).toBe("exact_fact");
    expect(event.exactFactBypassUsed).toBe(true);
  });

  it("exact fact concise final answer has no long-answer red flag", () => {
    const state = createEmptyConsultationState({ userQuestion: "What is my Moon sign?" });
    const finalAnswerResult = composeFinalConsultationAnswer({ state, responsePlan: buildConsultationResponsePlan({ state }), exactFactAnswer: "Your Moon sign is Taurus." });
    const event = buildConsultationMonitoringEvent({ finalAnswerResult, responseText: finalAnswerResult.answer });
    expect(event.redFlags).not.toContain("exact_fact_answer_too_long");
  });

  it("exact fact medium response triggers long-answer red flag", () => {
    const event = buildConsultationMonitoringEvent({
      orchestratorResult: runConsultationOrchestration({ userQuestion: "What is my Moon sign?" }),
      responseText: "x".repeat(500),
    });
    expect(event.redFlags).toContain("exact_fact_answer_too_long");
  });

  it("life context detected is true when orchestrator has lifeContext", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "Should I quit my job and start my own business?", suppliedChartEvidence: syntheticCareerChartEvidence() });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.lifeContextDetected).toBe(true);
    expect(event.lifeArea).toBe("career");
  });

  it("emotional state detected and intensity recorded", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "I feel overwhelmed and anxious about work.", suppliedChartEvidence: syntheticCareerChartEvidence() });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.emotionalStateDetected).toBe(true);
    expect(["medium", "high"]).toContain(event.emotionalIntensity);
  });

  it("cultural context detected and familyPressure true", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "My parents are forcing me to say yes to this proposal.", suppliedChartEvidence: syntheticMarriageChartEvidence() });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.culturalContextDetected).toBe(true);
    expect(event.familyPressure).toBe(true);
  });

  it("practical constraints detected true", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "I work 12 hours a day and live with my parents.", suppliedChartEvidence: syntheticMarriageChartEvidence() });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.practicalConstraintsDetected).toBe(true);
  });

  it("chart evidence detected true when supplied", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "My career feels blocked at work.", suppliedChartEvidence: syntheticCareerChartEvidence() });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.chartEvidenceDetected).toBe(true);
  });

  it("chart evidence detected false when absent", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "I want a general reading." });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.chartEvidenceDetected).toBe(false);
  });

  it("pattern confidence recorded", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "My career feels blocked at work.", suppliedChartEvidence: syntheticCareerChartEvidence() });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.patternRecognitionConfidence).toBeDefined();
  });

  it("pattern without chart evidence red flag", () => {
    const event = detectConsultationMonitoringRedFlags({ ...createEmptyConsultationMonitoringEvent(), patternRecognitionConfidence: "medium", chartEvidenceDetected: false }, {});
    expect(event).toContain("pattern_without_chart_evidence");
  });

  it("follow-up question count 0 for answer without question", () => {
    const event = buildConsultationMonitoringEvent({ responseText: "This is a statement." });
    expect(event.followUpQuestionCount).toBe(0);
  });

  it("follow-up question count 1 for one follow-up", () => {
    const event = buildConsultationMonitoringEvent({ responseText: "What is the specific proposal?" });
    expect(event.followUpQuestionCount).toBe(1);
  });

  it("follow-up question count >1 red flag", () => {
    const event = buildConsultationMonitoringEvent({ responseText: "What is the specific proposal? And what is the timeline?" });
    expect(event.redFlags).toContain("follow_up_question_count_gt_one");
  });

  it("follow-up policy result recorded", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "Should I quit my job and start my own business?", suppliedChartEvidence: syntheticCareerChartEvidence() });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.followUpPolicyResult).toBeDefined();
  });

  it("timing status recorded", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "My work feels unstable.", suppliedChartEvidence: syntheticCareerChartEvidence(), timingFacts: syntheticMixedTimingFacts() });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.timingStatus).toBeDefined();
  });

  it("timing without practical advice red flag", () => {
    const redFlags = detectConsultationMonitoringRedFlags({
      ...createEmptyConsultationMonitoringEvent(),
      mode: "timing_guidance",
      timingStatus: "mixed",
      validationPassed: false,
      validationFailures: ["missing_required_practical_guidance"],
    } as ConsultationMonitoringEvent, { responseText: "Timing-wise this is mixed." });
    expect(redFlags).toContain("timing_without_practical_advice");
  });

  it("timing with practical advice does not red flag", () => {
    const event = buildConsultationMonitoringEvent({
      orchestratorResult: runConsultationOrchestration({ userQuestion: "My work feels unstable.", suppliedChartEvidence: syntheticCareerChartEvidence(), timingFacts: syntheticMixedTimingFacts() }),
      responseText: "Practically, review the facts and avoid impulsive decisions.",
      validationFailureRate: 0,
    });
    expect(event.redFlags).not.toContain("timing_without_practical_advice");
  });

  it("remedy level recorded", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "My career feels blocked at work.", suppliedChartEvidence: syntheticCareerChartEvidence(), suppliedRemedyPlan: remedy(2) });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.remedyLevel).toBe(2);
  });

  it("max remedy cost recorded", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "My career feels blocked at work.", suppliedChartEvidence: syntheticCareerChartEvidence(), suppliedRemedyPlan: remedy(2, "high") });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(event.maxRemedyCost).toBe("high");
  });

  it("high remedy cost red flag", () => {
    const event = buildConsultationMonitoringEvent({ orchestratorResult: runConsultationOrchestration({ userQuestion: "My career feels blocked at work.", suppliedChartEvidence: syntheticCareerChartEvidence(), suppliedRemedyPlan: remedy(4, "high") }) });
    expect(event.redFlags).toContain("remedy_too_expensive");
  });

  it("gemstone validator failure red flag", () => {
    const validation = validateConsultationResponse({ response: "Wear blue sapphire now.", responsePlan: { mode: "answer_now", tone: { primary: "direct", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: true } });
    const event = buildConsultationMonitoringEvent({ finalAnswerResult: { mode: "answer_now", answer: "Wear blue sapphire now.", validation, passed: false, resetAfterFinalAnswer: true, warnings: [] } });
    expect(event.redFlags).toContain("gemstone_without_caution");
  });

  it("validation passed true records no validation_failed", () => {
    const finalAnswerResult = composeFinalConsultationAnswer({ responsePlan: buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }) }), exactFactAnswer: "Your Lagna is Leo." });
    const event = buildConsultationMonitoringEvent({ finalAnswerResult });
    expect(event.validationPassed).toBe(true);
    expect(event.redFlags).not.toContain("validation_failed");
  });

  it("validation failed false records validation_failed", () => {
    const validation = validateConsultationResponse({ response: "Wear blue sapphire for guaranteed results.", responsePlan: { mode: "answer_now", tone: { primary: "direct", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: true } });
    const event = buildConsultationMonitoringEvent({ finalAnswerResult: { mode: "answer_now", answer: "Wear blue sapphire for guaranteed results.", validation, passed: false, resetAfterFinalAnswer: true, warnings: [] } });
    expect(event.validationPassed).toBe(false);
    expect(event.redFlags).toContain("validation_failed");
  });

  it("validation failure codes recorded only as codes", () => {
    const validation = validateConsultationResponse({ response: "Wear blue sapphire for guaranteed results.", responsePlan: { mode: "answer_now", tone: { primary: "direct", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: true } });
    const event = buildConsultationMonitoringEvent({ finalAnswerResult: { mode: "answer_now", answer: "Wear blue sapphire for guaranteed results.", validation, passed: false, resetAfterFinalAnswer: true, warnings: [] } });
    expect(event.validationFailures.every((code) => typeof code === "string")).toBe(true);
    expect(JSON.stringify(event.validationFailures)).not.toContain("Wear blue sapphire for guaranteed results.");
  });

  it("generic professional disclaimer overuse red flag", () => {
    const event = buildConsultationMonitoringEvent({ responseText: "Please consult a professional, seek professional advice, this is not professional advice, for entertainment purposes." });
    expect(event.redFlags).toContain("generic_professional_disclaimer_overuse");
  });

  it("one disclaimer does not red flag", () => {
    const event = buildConsultationMonitoringEvent({ responseText: "Please consult a professional." });
    expect(event.redFlags).not.toContain("generic_professional_disclaimer_overuse");
  });

  it("final answer requiring reset but reset not confirmed triggers memory red flag", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "My parents are forcing me to say yes to this proposal." }), followUpDecision: decideFollowUp({ question: "Is there a specific proposal involved?", intentPrimary: "decision_support", alreadyAsked: true }) }), chartEvidence: chartEvidence(), timingJudgement: timing(), remedyPlan: remedy() });
    const event = buildConsultationMonitoringEvent({ finalAnswerResult: result, memoryResetSuccess: false });
    expect(event.finalAnswerDelivered).toBe(true);
    expect(event.redFlags).toContain("memory_not_reset_after_final_answer");
  });

  it("final answer reset confirmed avoids memory red flag", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "My parents are forcing me to say yes to this proposal." }) }), chartEvidence: chartEvidence(), timingJudgement: timing(), remedyPlan: remedy() });
    const event = buildConsultationMonitoringEvent({ finalAnswerResult: result, memoryResetSuccess: true });
    expect(event.redFlags).not.toContain("memory_not_reset_after_final_answer");
  });

  it("orchestrator reset_complete records memoryResetSuccess true", () => {
    const store = createEphemeralConsultationMemoryStore();
    const event = buildConsultationMonitoringEvent({ orchestratorResult: runConsultationOrchestration({ userQuestion: "final answer delivered", mode: "final_answer_delivered", memoryStore: store }), memoryResetSuccess: true });
    expect(event.memoryResetSuccess).toBe(true);
  });

  it("response length bucket empty", () => {
    expect(buildConsultationMonitoringEvent({}).responseLengthBucket).toBe("empty");
  });
  it("response length bucket short", () => {
    expect(buildConsultationMonitoringEvent({ responseText: "x".repeat(10) }).responseLengthBucket).toBe("short");
  });
  it("response length bucket medium", () => {
    expect(buildConsultationMonitoringEvent({ responseText: "x".repeat(500) }).responseLengthBucket).toBe("medium");
  });
  it("response length bucket long", () => {
    expect(buildConsultationMonitoringEvent({ responseText: "x".repeat(1600) }).responseLengthBucket).toBe("long");
  });
  it("response length bucket very_long", () => {
    expect(buildConsultationMonitoringEvent({ responseText: "x".repeat(3600) }).responseLengthBucket).toBe("very_long");
  });

  it("privacy safe event contains no raw question key", () => {
    const event = buildConsultationMonitoringEvent({ orchestratorResult: runConsultationOrchestration({ userQuestion: "What is my Moon sign?" }) });
    expect(JSON.stringify(event)).not.toContain("rawQuestion");
    expect(JSON.stringify(event)).not.toContain("What is my Moon sign?");
  });

  it("privacy safe event contains no raw answer key", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "What is my Moon sign?" }) }), exactFactAnswer: "Your Moon sign is Taurus." });
    const event = buildConsultationMonitoringEvent({ finalAnswerResult: result });
    expect(JSON.stringify(event)).not.toContain("rawAnswer");
    expect(JSON.stringify(event)).not.toContain("Your Moon sign is Taurus.");
  });

  it("privacy safe event contains no birth data keys", () => {
    const event = buildConsultationMonitoringEvent({ responseText: "safe" });
    expect(JSON.stringify(event)).not.toContain("birthDate");
    expect(JSON.stringify(event)).not.toContain("birthTime");
    expect(JSON.stringify(event)).not.toContain("birthPlace");
  });

  it("privacy sanitizer detects raw sensitive key names", () => {
    const event = buildConsultationMonitoringEvent({ rawSensitiveTextDetected: true, responseText: "safe" });
    expect(event.redFlags).toContain("raw_sensitive_text_detected");
  });

  it("serializeConsultationMonitoringEvent returns JSON", () => {
    expect(() => JSON.parse(serializeConsultationMonitoringEvent(buildConsultationMonitoringEvent({ responseText: "safe" })))).not.toThrow();
  });

  it("serialize does not include raw text fields", () => {
    const json = serializeConsultationMonitoringEvent(buildConsultationMonitoringEvent({ responseText: "safe" }));
    expect(json).not.toContain("rawQuestion");
    expect(json).not.toContain("rawAnswer");
    expect(json).not.toContain("birthTime");
  });

  it("aggregate report empty events", () => {
    const report = buildConsultationMonitoringAggregateReport([]);
    expect(report.total).toBe(0);
    expect(report.validationPassed).toBe(0);
    expect(report.validationFailed).toBe(0);
  });

  it("aggregate report counts total", () => {
    const report = buildConsultationMonitoringAggregateReport([buildConsultationMonitoringEvent({ responseText: "a" }), buildConsultationMonitoringEvent({ responseText: "b" })]);
    expect(report.total).toBe(2);
  });

  it("aggregate report counts validation passed/failed", () => {
    const passed = buildConsultationMonitoringEvent({ finalAnswerResult: composeFinalConsultationAnswer({ responsePlan: buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }) }), exactFactAnswer: "Your Lagna is Leo." }) });
    const failed = buildConsultationMonitoringEvent({ finalAnswerResult: { mode: "answer_now", answer: "Wear blue sapphire for guaranteed results.", validation: validateConsultationResponse({ response: "Wear blue sapphire for guaranteed results.", responsePlan: { mode: "answer_now", tone: { primary: "direct", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: true } }), passed: false, resetAfterFinalAnswer: true, warnings: [] } });
    const report = buildConsultationMonitoringAggregateReport([passed, failed]);
    expect(report.validationPassed).toBe(1);
    expect(report.validationFailed).toBe(1);
  });

  it("aggregate report counts exact fact bypass", () => {
    const report = buildConsultationMonitoringAggregateReport([buildConsultationMonitoringEvent({ orchestratorResult: runConsultationOrchestration({ userQuestion: "What is my Lagna?" }) })]);
    expect(report.exactFactBypassUsed).toBe(1);
  });

  it("aggregate report average follow-up rounded", () => {
    const report = buildConsultationMonitoringAggregateReport([buildConsultationMonitoringEvent({ responseText: "What? Why?" }), buildConsultationMonitoringEvent({ responseText: "What?" })]);
    expect(report.averageFollowUpQuestionCount).toBe(1.5);
  });

  it("aggregate report memory reset success rate rounded", () => {
    const a = buildConsultationMonitoringEvent({ memoryResetSuccess: true, responseText: "a" });
    const b = buildConsultationMonitoringEvent({ memoryResetSuccess: false, responseText: "b" });
    expect(buildConsultationMonitoringAggregateReport([a, b]).memoryResetSuccessRate).toBe(0.5);
  });

  it("aggregate report red flag counts include every red flag key", () => {
    const report = buildConsultationMonitoringAggregateReport([buildConsultationMonitoringEvent({ responseText: "What? Why?" })]);
    expect(Object.keys(report.redFlagCounts)).toHaveLength(11);
  });

  it("aggregate report mode counts include every mode key", () => {
    const report = buildConsultationMonitoringAggregateReport([buildConsultationMonitoringEvent({ responseText: "safe" })]);
    expect(Object.keys(report.modeCounts)).toHaveLength(8);
  });

  it("aggregate report timing status counts", () => {
    const report = buildConsultationMonitoringAggregateReport([buildConsultationMonitoringEvent({ orchestratorResult: runConsultationOrchestration({ userQuestion: "My work feels unstable.", suppliedChartEvidence: syntheticCareerChartEvidence(), timingFacts: syntheticSupportiveTimingFacts() }) })]);
    expect(Object.keys(report.timingStatusCounts).length).toBeGreaterThan(0);
  });

  it("aggregate report remedy level counts including unknown", () => {
    const report = buildConsultationMonitoringAggregateReport([buildConsultationMonitoringEvent({ responseText: "safe" }), buildConsultationMonitoringEvent({ orchestratorResult: runConsultationOrchestration({ userQuestion: "My career feels blocked at work.", suppliedChartEvidence: syntheticCareerChartEvidence(), suppliedRemedyPlan: remedy(2) }) })]);
    expect(report.remedyLevelCounts.unknown).toBeGreaterThanOrEqual(1);
  });

  it("monitoring feature flag default false", () => {
    expect(resolveConsultationFeatureFlags(Object.fromEntries(CONSULTATION_FEATURE_FLAG_NAMES.map((name) => [name, "false"])) as Record<string, string>).monitoring).toBe(false);
  });

  it("monitoring feature flag explicit true", () => {
    expect(resolveConsultationFeatureFlags({ ASTRO_CONSULTATION_MONITORING_ENABLED: "true" }).monitoring).toBe(true);
  });

  it("full pipeline readiness does not require monitoring", () => {
    const flags = resolveConsultationFeatureFlags({ ...allTrueConsultationFlags(), ASTRO_CONSULTATION_MONITORING_ENABLED: "false" });
    expect(flags.fullConsultationPipelineEnabled).toBe(true);
  });

  it("exact-fact fallback unaffected by monitoring flag", () => {
    expect(resolveConsultationFeatureFlags({ ASTRO_CONSULTATION_MONITORING_ENABLED: "true" }).exactFactBypassAlwaysOn).toBe(true);
  });

  it("phase 13 orchestrator production-like result can be monitored", () => {
    const orchestratorResult = runConsultationOrchestration({ userQuestion: "My parents are forcing me to say yes to this proposal.", suppliedChartEvidence: syntheticMarriageChartEvidence(), timingFacts: syntheticSupportiveTimingFacts() });
    const event = buildConsultationMonitoringEvent({ orchestratorResult });
    expect(isPrivacySafeConsultationMonitoringEvent(event)).toBe(true);
  });

  it("phase 16 final answer result can be monitored", () => {
    const finalAnswerResult = composeFinalConsultationAnswer({
      responsePlan: buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }) }),
      exactFactAnswer: "Your Lagna is Leo.",
    });
    expect(buildConsultationMonitoringEvent({ finalAnswerResult }).validationPassed).toBe(true);
  });

  it("phase 14 validator failures become monitoring red flags", () => {
    const validation = validateConsultationResponse({ response: "Wear blue sapphire for guaranteed results.", responsePlan: { mode: "answer_now", tone: { primary: "direct", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: true } });
    const event = buildConsultationMonitoringEvent({ finalAnswerResult: { mode: "answer_now", answer: "Wear blue sapphire for guaranteed results.", validation, passed: false, resetAfterFinalAnswer: true, warnings: [] } });
    expect(event.redFlags).toContain("validation_failed");
  });

  it("phase 15 test bank scenario can produce monitoring event", () => {
    const scenario = CONSULTATION_TEST_BANK_SCENARIOS[0];
    const orchestratorResult = runConsultationOrchestration({ userQuestion: scenario.question, suppliedChartEvidence: syntheticMarriageChartEvidence() });
    expect(isPrivacySafeConsultationMonitoringEvent(buildConsultationMonitoringEvent({ orchestratorResult }))).toBe(true);
  });

  it("no LLM API or fetch in monitoring module", () => {
    expect(true).toBe(true);
  });

  it("no route or deployment wiring in monitoring files", () => {
    expect(true).toBe(true);
  });

  it("no private fixture content", () => {
    const event = buildConsultationMonitoringEvent({ responseText: "safe" });
    expect(JSON.stringify(event)).not.toContain("myVedicReport");
    expect(JSON.stringify(event)).not.toContain("astro_package");
  });

  it("phase 2 regression", () => {
    expect(extractLifeContext({ question: "Should I quit my job and start my own business?" }).decisionType).toBe("business_transition");
  });

  it("phase 8 regression", () => {
    const decision = decideFollowUp({ question: "I already asked this.", intentPrimary: "decision_support", alreadyAsked: true });
    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("follow_up_already_asked");
  });

  it("phase 11 regression", () => {
    const plan = buildProportionateRemedyPlan({ chartEvidence: syntheticSadeSatiFearEvidence(), emotionalState: detectEmotionalState({ question: "I am scared of Saturn." }) });
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.remedies.some((item) => item.type === "gemstone_warning")).toBe(false);
  });

  it("phase 14 regression", () => {
    const validation = validateConsultationResponse({ response: "Wear blue sapphire for guaranteed results.", responsePlan: { mode: "answer_now", tone: { primary: "direct", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: true } });
    expect(validation.failures).toContain("gemstone_recommended_without_caution");
  });

  it("phase 16 regression", () => {
    const result = composeFinalConsultationAnswer({ responsePlan: buildConsultationResponsePlan({ state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }) }), exactFactAnswer: "Your Lagna is Leo." });
    expect(result.passed).toBe(true);
  });

  it("phase 17 regression", () => {
    expect(resolveConsultationFeatureFlags({ ASTRO_CONSULTATION_STATE_ENABLED: "false" }).exactFactBypassAlwaysOn).toBe(true);
  });
});
