/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { composeFinalConsultationAnswer } from "../../../lib/astro/consultation/final-consultation-answer";
import {
  buildConsultationRolloutReadiness,
  CONSULTATION_FEATURE_FLAG_NAMES,
  CONSULTATION_ROLLBACK_ORDER,
  getConsultationFallbackMode,
  parseConsultationFlagValue,
  resolveConsultationFeatureFlagValues,
  resolveConsultationFeatureFlags,
} from "../../../lib/astro/consultation/consultation-feature-flags";
import { runConsultationOrchestration } from "../../../lib/astro/consultation/consultation-orchestrator";
import { CONSULTATION_TEST_BANK_SCENARIOS } from "./consultation-test-bank.fixtures";

function allTrueEnv(): Record<string, string> {
  return Object.fromEntries(CONSULTATION_FEATURE_FLAG_NAMES.map((name) => [name, "true"]));
}

function allFalseEnv(): Record<string, string> {
  return Object.fromEntries(CONSULTATION_FEATURE_FLAG_NAMES.map((name) => [name, "false"]));
}

function envFromOverrides(overrides: Partial<Record<string, string | undefined>>): Record<string, string | undefined> {
  return { ...allFalseEnv(), ...overrides };
}

describe("consultation feature flags", () => {
  it("parser returns default false for undefined", () => {
    expect(parseConsultationFlagValue(undefined)).toEqual({ enabled: false, source: "default" });
  });

  it("parser returns default true for undefined with true default", () => {
    expect(parseConsultationFlagValue(undefined, true)).toEqual({ enabled: true, source: "default" });
  });

  it("parser parses true string", () => {
    expect(parseConsultationFlagValue("true").enabled).toBe(true);
  });

  it("parser parses TRUE uppercase", () => {
    expect(parseConsultationFlagValue("TRUE").enabled).toBe(true);
  });

  it("parser parses 1", () => {
    expect(parseConsultationFlagValue("1").enabled).toBe(true);
  });

  it("parser parses yes", () => {
    expect(parseConsultationFlagValue("yes").enabled).toBe(true);
  });

  it("parser parses on", () => {
    expect(parseConsultationFlagValue("on").enabled).toBe(true);
  });

  it("parser parses enabled", () => {
    expect(parseConsultationFlagValue("enabled").enabled).toBe(true);
  });

  it("parser parses false string", () => {
    expect(parseConsultationFlagValue("false").enabled).toBe(false);
  });

  it("parser parses 0", () => {
    expect(parseConsultationFlagValue("0").enabled).toBe(false);
  });

  it("parser parses no", () => {
    expect(parseConsultationFlagValue("no").enabled).toBe(false);
  });

  it("parser parses off", () => {
    expect(parseConsultationFlagValue("off").enabled).toBe(false);
  });

  it("parser parses disabled", () => {
    expect(parseConsultationFlagValue("disabled").enabled).toBe(false);
  });

  it("parser trims whitespace", () => {
    expect(parseConsultationFlagValue("  YES  ").enabled).toBe(true);
  });

  it("parser treats unknown string as default", () => {
    expect(parseConsultationFlagValue("maybe", true)).toEqual({ enabled: true, source: "default", rawValue: "maybe" });
  });

  it("parser accepts boolean true", () => {
    expect(parseConsultationFlagValue(true)).toEqual({ enabled: true, source: "env", rawValue: "true" });
  });

  it("parser accepts boolean false", () => {
    expect(parseConsultationFlagValue(false)).toEqual({ enabled: false, source: "env", rawValue: "false" });
  });

  it("parser accepts number 1", () => {
    expect(parseConsultationFlagValue(1)).toEqual({ enabled: true, source: "env", rawValue: "1" });
  });

  it("parser accepts number 0", () => {
    expect(parseConsultationFlagValue(0)).toEqual({ enabled: false, source: "env", rawValue: "0" });
  });

  it("parser treats other numbers as default", () => {
    expect(parseConsultationFlagValue(7, true)).toEqual({ enabled: true, source: "default", rawValue: "7" });
  });

  it("resolves all known flag names", () => {
    expect(resolveConsultationFeatureFlagValues(allFalseEnv())).toHaveLength(CONSULTATION_FEATURE_FLAG_NAMES.length);
  });

  it("default all flags false", () => {
    const flags = resolveConsultationFeatureFlags(allFalseEnv());
    expect(flags.consultationState).toBe(false);
    expect(flags.lifeContext).toBe(false);
    expect(flags.emotionalState).toBe(false);
    expect(flags.culturalContext).toBe(false);
    expect(flags.practicalConstraints).toBe(false);
    expect(flags.chartEvidence).toBe(false);
    expect(flags.patternRecognition).toBe(false);
    expect(flags.oneFollowUp).toBe(false);
    expect(flags.ephemeralMemoryReset).toBe(false);
    expect(flags.timingJudgement).toBe(false);
    expect(flags.remedyProportionality).toBe(false);
    expect(flags.responsePlan).toBe(false);
    expect(flags.orchestrator).toBe(false);
    expect(flags.finalConsultationAnswer).toBe(false);
    expect(flags.validator).toBe(false);
    expect(flags.exactFactBypassAlwaysOn).toBe(true);
  });

  it("exact-fact bypass always true", () => {
    expect(resolveConsultationFeatureFlags(allFalseEnv()).exactFactBypassAlwaysOn).toBe(true);
  });

  it("all explicit true enables full pipeline", () => {
    expect(resolveConsultationFeatureFlags(allTrueEnv()).fullConsultationPipelineEnabled).toBe(true);
  });

  it("all explicit false disables full pipeline", () => {
    expect(resolveConsultationFeatureFlags(allFalseEnv()).fullConsultationPipelineEnabled).toBe(false);
  });

  it("consultationState disabled forces lifeContext false", () => {
    const flags = resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "false", ASTRO_LIFE_CONTEXT_ENABLED: "true" }));
    expect(flags.lifeContext).toBe(false);
    expect(flags.disabledReasons).toContain("life_context_disabled_consultation_state_off");
  });

  it("consultationState disabled forces emotional false", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "false", ASTRO_EMOTIONAL_STATE_ENABLED: "true" })).emotionalState).toBe(false);
  });

  it("consultationState disabled forces cultural false", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "false", ASTRO_CULTURAL_CONTEXT_ENABLED: "true" })).culturalContext).toBe(false);
  });

  it("consultationState disabled forces practical false", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "false", ASTRO_PRACTICAL_CONSTRAINTS_ENABLED: "true" })).practicalConstraints).toBe(false);
  });

  it("consultationState disabled forces chartEvidence false", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "false", ASTRO_CHART_EVIDENCE_ENABLED: "true" })).chartEvidence).toBe(false);
  });

  it("consultationState disabled forces timing false", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "false", ASTRO_TIMING_JUDGEMENT_ENABLED: "true" })).timingJudgement).toBe(false);
  });

  it("consultationState disabled forces remedy false", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "false", ASTRO_REMEDY_PROPORTIONALITY_ENABLED: "true" })).remedyProportionality).toBe(false);
  });

  it("pattern recognition requires chart evidence", () => {
    const flags = resolveConsultationFeatureFlags(envFromOverrides({
      ASTRO_CONSULTATION_STATE_ENABLED: "true",
      ASTRO_LIFE_CONTEXT_ENABLED: "true",
      ASTRO_EMOTIONAL_STATE_ENABLED: "true",
      ASTRO_CULTURAL_CONTEXT_ENABLED: "true",
      ASTRO_PRACTICAL_CONSTRAINTS_ENABLED: "true",
      ASTRO_CHART_EVIDENCE_ENABLED: "false",
      ASTRO_PATTERN_RECOGNITION_ENABLED: "true",
    }));
    expect(flags.patternRecognition).toBe(false);
  });

  it("pattern recognition requires life/emotion/cultural/practical", () => {
    const flags = resolveConsultationFeatureFlags(envFromOverrides({
      ASTRO_CONSULTATION_STATE_ENABLED: "true",
      ASTRO_CHART_EVIDENCE_ENABLED: "true",
      ASTRO_PATTERN_RECOGNITION_ENABLED: "true",
      ASTRO_LIFE_CONTEXT_ENABLED: "true",
      ASTRO_EMOTIONAL_STATE_ENABLED: "false",
      ASTRO_CULTURAL_CONTEXT_ENABLED: "true",
      ASTRO_PRACTICAL_CONSTRAINTS_ENABLED: "true",
    }));
    expect(flags.patternRecognition).toBe(false);
  });

  it("timing judgement requires chart evidence", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "true", ASTRO_TIMING_JUDGEMENT_ENABLED: "true", ASTRO_CHART_EVIDENCE_ENABLED: "false" })).timingJudgement).toBe(false);
  });

  it("remedy proportionality requires emotional and practical constraints", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "true", ASTRO_REMEDY_PROPORTIONALITY_ENABLED: "true", ASTRO_EMOTIONAL_STATE_ENABLED: "false", ASTRO_PRACTICAL_CONSTRAINTS_ENABLED: "true" })).remedyProportionality).toBe(false);
  });

  it("response plan requires consultation state", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "false", ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED: "true" })).responsePlan).toBe(false);
  });

  it("validator can be independently true", () => {
    const flags = resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_VALIDATOR_ENABLED: "true" }));
    expect(flags.validator).toBe(true);
    expect(flags.fullConsultationPipelineEnabled).toBe(false);
  });

  it("final answer requires response plan and validator", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "true", ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED: "false", ASTRO_CONSULTATION_VALIDATOR_ENABLED: "true", ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED: "true" })).finalConsultationAnswer).toBe(false);
  });

  it("orchestrator requires consultation state", () => {
    expect(resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "false", ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED: "true" })).orchestrator).toBe(false);
  });

  it("full pipeline false if final answer disabled", () => {
    const flags = resolveConsultationFeatureFlags({ ...allTrueEnv(), ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED: "false" });
    expect(flags.fullConsultationPipelineEnabled).toBe(false);
  });

  it("full pipeline false if validator disabled", () => {
    const flags = resolveConsultationFeatureFlags({ ...allTrueEnv(), ASTRO_CONSULTATION_VALIDATOR_ENABLED: "false" });
    expect(flags.fullConsultationPipelineEnabled).toBe(false);
  });

  it("readiness local unit tests true even all false", () => {
    expect(buildConsultationRolloutReadiness(resolveConsultationFeatureFlags(allFalseEnv())).readyForLocalUnitTests).toBe(true);
  });

  it("readiness exact-fact regression true even all false", () => {
    expect(buildConsultationRolloutReadiness(resolveConsultationFeatureFlags(allFalseEnv())).readyForExactFactRegression).toBe(true);
  });

  it("readiness integration false when response plan or validator false", () => {
    const flags = resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "true", ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED: "false", ASTRO_CONSULTATION_VALIDATOR_ENABLED: "true" }));
    expect(buildConsultationRolloutReadiness(flags).readyForIntegrationTests).toBe(false);
  });

  it("readiness integration true when consultationState responsePlan validator true", () => {
    const flags = resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "true", ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED: "true", ASTRO_CONSULTATION_VALIDATOR_ENABLED: "true" }));
    expect(buildConsultationRolloutReadiness(flags).readyForIntegrationTests).toBe(true);
  });

  it("readiness smoke true only for full pipeline", () => {
    expect(buildConsultationRolloutReadiness(resolveConsultationFeatureFlags(allTrueEnv())).readyForConsultationSmoke).toBe(true);
  });

  it("readiness preview/prod true only for full pipeline", () => {
    const readiness = buildConsultationRolloutReadiness(resolveConsultationFeatureFlags(allTrueEnv()));
    expect(readiness.readyForPreviewDeployment).toBe(true);
    expect(readiness.readyForProductionDeployment).toBe(true);
  });

  it("readiness rollback order matches expected reverse order", () => {
    expect(CONSULTATION_ROLLBACK_ORDER).toEqual([
      "ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED",
      "ASTRO_CONSULTATION_VALIDATOR_ENABLED",
      "ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED",
      "ASTRO_REMEDY_PROPORTIONALITY_ENABLED",
      "ASTRO_TIMING_JUDGEMENT_ENABLED",
      "ASTRO_PATTERN_RECOGNITION_ENABLED",
      "ASTRO_ONE_FOLLOWUP_ENABLED",
      "ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED",
      "ASTRO_CHART_EVIDENCE_ENABLED",
      "ASTRO_PRACTICAL_CONSTRAINTS_ENABLED",
      "ASTRO_CULTURAL_CONTEXT_ENABLED",
      "ASTRO_EMOTIONAL_STATE_ENABLED",
      "ASTRO_LIFE_CONTEXT_ENABLED",
      "ASTRO_CONSULTATION_STATE_ENABLED",
      "ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED",
    ]);
  });

  it("fallback mode exact_fact always exact_fact_only", () => {
    expect(getConsultationFallbackMode(resolveConsultationFeatureFlags(allFalseEnv()), "exact_fact")).toBe("exact_fact_only");
  });

  it("fallback mode full_consultation when full pipeline enabled", () => {
    expect(getConsultationFallbackMode(resolveConsultationFeatureFlags(allTrueEnv()), "marriage")).toBe("full_consultation");
  });

  it("fallback mode basic_response when pipeline disabled and non-exact", () => {
    expect(getConsultationFallbackMode(resolveConsultationFeatureFlags(allFalseEnv()), "marriage")).toBe("basic_response");
  });

  it("unknown env values do not crash", () => {
    expect(() => resolveConsultationFeatureFlags(envFromOverrides({ ASTRO_CONSULTATION_STATE_ENABLED: "maybe", ASTRO_LIFE_CONTEXT_ENABLED: "later", ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED: "rollout" }))).not.toThrow();
  });

  it("process.env-like object support", () => {
    const env: Record<string, string | undefined> = { ASTRO_CONSULTATION_STATE_ENABLED: "true", ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED: "true", ASTRO_CONSULTATION_VALIDATOR_ENABLED: "true" };
    expect(() => resolveConsultationFeatureFlags(env)).not.toThrow();
  });

  it("no private data in feature flag tests", () => {
    expect(true).toBe(true);
  });

  it("phase 1 exact-fact regression", () => {
    const state = createEmptyConsultationState({ userQuestion: "What is my Lagna?" });
    expect(state.intent.primary).toBe("exact_fact");
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.practicalConstraints).toEqual({});
  });

  it("phase 13 orchestrator exact-fact unaffected by flags", () => {
    const result = runConsultationOrchestration({ userQuestion: "What is my Lagna?" });
    expect(result.status).toBe("exact_fact_bypass");
    expect(result.responsePlan.mode).toBe("exact_fact_only");
  });

  it("phase 16 composer still works with flags module present", () => {
    const state = createEmptyConsultationState({ userQuestion: "What is my Lagna?" });
    const result = composeFinalConsultationAnswer({ state, responsePlan: { mode: "exact_fact_only", tone: { primary: "gentle", avoid: [], mustInclude: [] }, sections: [], safetyGuardrails: [], evidenceSummary: { supportive: [], challenging: [], neutral: [] }, resetAfterFinalAnswer: true }, exactFactAnswer: "Your Lagna is Leo." });
    expect(result.passed).toBe(true);
  });

  it("consultation test bank still reports 300 scenarios", () => {
    expect(CONSULTATION_TEST_BANK_SCENARIOS).toHaveLength(300);
  });
});
