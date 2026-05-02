/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type ConsultationFeatureFlagName =
  | "ASTRO_CONSULTATION_STATE_ENABLED"
  | "ASTRO_LIFE_CONTEXT_ENABLED"
  | "ASTRO_EMOTIONAL_STATE_ENABLED"
  | "ASTRO_CULTURAL_CONTEXT_ENABLED"
  | "ASTRO_PRACTICAL_CONSTRAINTS_ENABLED"
  | "ASTRO_CHART_EVIDENCE_ENABLED"
  | "ASTRO_PATTERN_RECOGNITION_ENABLED"
  | "ASTRO_ONE_FOLLOWUP_ENABLED"
  | "ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED"
  | "ASTRO_TIMING_JUDGEMENT_ENABLED"
  | "ASTRO_REMEDY_PROPORTIONALITY_ENABLED"
  | "ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED"
  | "ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED"
  | "ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED"
  | "ASTRO_CONSULTATION_VALIDATOR_ENABLED"
  | "ASTRO_CONSULTATION_MONITORING_ENABLED";

export type ConsultationFeatureFlagsInput = Partial<Record<ConsultationFeatureFlagName, string | boolean | number | undefined>>;

export type ConsultationFeatureFlagDefaults = Partial<Record<ConsultationFeatureFlagName, boolean>>;

export type ConsultationFeatureFlagValue = {
  readonly name: ConsultationFeatureFlagName;
  readonly enabled: boolean;
  readonly source: "default" | "env";
  readonly rawValue?: string;
};

export type ResolvedConsultationFeatureFlags = {
  readonly consultationState: boolean;
  readonly lifeContext: boolean;
  readonly emotionalState: boolean;
  readonly culturalContext: boolean;
  readonly practicalConstraints: boolean;
  readonly chartEvidence: boolean;
  readonly patternRecognition: boolean;
  readonly oneFollowUp: boolean;
  readonly ephemeralMemoryReset: boolean;
  readonly timingJudgement: boolean;
  readonly remedyProportionality: boolean;
  readonly responsePlan: boolean;
  readonly orchestrator: boolean;
  readonly finalConsultationAnswer: boolean;
  readonly validator: boolean;
  readonly monitoring: boolean;
  readonly exactFactBypassAlwaysOn: true;
  readonly fullConsultationPipelineEnabled: boolean;
  readonly disabledReasons: readonly string[];
};

export type ConsultationRolloutReadiness = {
  readonly readyForLocalUnitTests: boolean;
  readonly readyForIntegrationTests: boolean;
  readonly readyForExactFactRegression: boolean;
  readonly readyForConsultationSmoke: boolean;
  readonly readyForTestBank: boolean;
  readonly readyForPreviewDeployment: boolean;
  readonly readyForProductionDeployment: boolean;
  readonly blockers: readonly string[];
  readonly rollbackOrder: readonly ConsultationFeatureFlagName[];
};

export type ConsultationFeatureFallbackMode = "exact_fact_only" | "basic_response" | "full_consultation";

export const CONSULTATION_FEATURE_FLAG_NAMES: readonly ConsultationFeatureFlagName[] = [
  "ASTRO_CONSULTATION_STATE_ENABLED",
  "ASTRO_LIFE_CONTEXT_ENABLED",
  "ASTRO_EMOTIONAL_STATE_ENABLED",
  "ASTRO_CULTURAL_CONTEXT_ENABLED",
  "ASTRO_PRACTICAL_CONSTRAINTS_ENABLED",
  "ASTRO_CHART_EVIDENCE_ENABLED",
  "ASTRO_PATTERN_RECOGNITION_ENABLED",
  "ASTRO_ONE_FOLLOWUP_ENABLED",
  "ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED",
  "ASTRO_TIMING_JUDGEMENT_ENABLED",
  "ASTRO_REMEDY_PROPORTIONALITY_ENABLED",
  "ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED",
  "ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED",
  "ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED",
  "ASTRO_CONSULTATION_VALIDATOR_ENABLED",
  "ASTRO_CONSULTATION_MONITORING_ENABLED",
] as const;

export const CONSULTATION_ROLLBACK_ORDER: readonly ConsultationFeatureFlagName[] = [
  "ASTRO_CONSULTATION_MONITORING_ENABLED",
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
] as const;

export const DEFAULT_CONSULTATION_FEATURE_FLAG_DEFAULTS: Record<ConsultationFeatureFlagName, boolean> = {
  ASTRO_CONSULTATION_STATE_ENABLED: false,
  ASTRO_LIFE_CONTEXT_ENABLED: false,
  ASTRO_EMOTIONAL_STATE_ENABLED: false,
  ASTRO_CULTURAL_CONTEXT_ENABLED: false,
  ASTRO_PRACTICAL_CONSTRAINTS_ENABLED: false,
  ASTRO_CHART_EVIDENCE_ENABLED: false,
  ASTRO_PATTERN_RECOGNITION_ENABLED: false,
  ASTRO_ONE_FOLLOWUP_ENABLED: false,
  ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED: false,
  ASTRO_TIMING_JUDGEMENT_ENABLED: false,
  ASTRO_REMEDY_PROPORTIONALITY_ENABLED: false,
  ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED: false,
  ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED: false,
  ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED: false,
  ASTRO_CONSULTATION_VALIDATOR_ENABLED: false,
  ASTRO_CONSULTATION_MONITORING_ENABLED: false,
};

const TRUE_STRINGS = new Set(["true", "1", "yes", "on", "enabled"]);
const FALSE_STRINGS = new Set(["false", "0", "no", "off", "disabled"]);

export function parseConsultationFlagValue(
  value: string | boolean | number | undefined,
  defaultValue = false,
): { enabled: boolean; source: "default" | "env"; rawValue?: string } {
  if (value === undefined || value === null || value === "") {
    return { enabled: defaultValue, source: "default" };
  }
  if (typeof value === "boolean") {
    return { enabled: value, source: "env", rawValue: String(value) };
  }
  if (typeof value === "number") {
    if (value === 1) return { enabled: true, source: "env", rawValue: "1" };
    if (value === 0) return { enabled: false, source: "env", rawValue: "0" };
    return { enabled: defaultValue, source: "default", rawValue: String(value) };
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return { enabled: defaultValue, source: "default", rawValue: value };
  }
  if (TRUE_STRINGS.has(normalized)) {
    return { enabled: true, source: "env", rawValue: value };
  }
  if (FALSE_STRINGS.has(normalized)) {
    return { enabled: false, source: "env", rawValue: value };
  }
  return { enabled: defaultValue, source: "default", rawValue: value };
}

export function resolveConsultationFeatureFlagValues(
  input: ConsultationFeatureFlagsInput = process.env as ConsultationFeatureFlagsInput,
  defaults: ConsultationFeatureFlagDefaults = DEFAULT_CONSULTATION_FEATURE_FLAG_DEFAULTS,
): readonly ConsultationFeatureFlagValue[] {
  return CONSULTATION_FEATURE_FLAG_NAMES.map((name) => {
    const defaultValue = defaults[name] ?? false;
    const raw = input[name];
    const parsed = parseConsultationFlagValue(raw, defaultValue);
    return {
      name,
      enabled: parsed.enabled,
      source: parsed.source,
      ...(parsed.rawValue !== undefined ? { rawValue: parsed.rawValue } : {}),
    };
  });
}

export function resolveConsultationFeatureFlags(
  input: ConsultationFeatureFlagsInput = process.env as ConsultationFeatureFlagsInput,
  defaults: ConsultationFeatureFlagDefaults = DEFAULT_CONSULTATION_FEATURE_FLAG_DEFAULTS,
): ResolvedConsultationFeatureFlags {
  const values = resolveConsultationFeatureFlagValues(input, defaults);
  const byName = new Map(values.map((value) => [value.name, value.enabled] as const));
  const raw = (name: ConsultationFeatureFlagName) => byName.get(name) ?? false;

  const consultationState = raw("ASTRO_CONSULTATION_STATE_ENABLED");
  const lifeContext = consultationState && raw("ASTRO_LIFE_CONTEXT_ENABLED");
  const emotionalState = consultationState && raw("ASTRO_EMOTIONAL_STATE_ENABLED");
  const culturalContext = consultationState && raw("ASTRO_CULTURAL_CONTEXT_ENABLED");
  const practicalConstraints = consultationState && raw("ASTRO_PRACTICAL_CONSTRAINTS_ENABLED");
  const chartEvidence = consultationState && raw("ASTRO_CHART_EVIDENCE_ENABLED");
  const patternRecognition =
    consultationState &&
    chartEvidence &&
    lifeContext &&
    emotionalState &&
    culturalContext &&
    practicalConstraints &&
    raw("ASTRO_PATTERN_RECOGNITION_ENABLED");
  const oneFollowUp = consultationState && raw("ASTRO_ONE_FOLLOWUP_ENABLED");
  const ephemeralMemoryReset = consultationState && raw("ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED");
  const timingJudgement = consultationState && chartEvidence && raw("ASTRO_TIMING_JUDGEMENT_ENABLED");
  const remedyProportionality =
    consultationState &&
    emotionalState &&
    practicalConstraints &&
    raw("ASTRO_REMEDY_PROPORTIONALITY_ENABLED");
  const responsePlan = consultationState && raw("ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED");
  const validator = raw("ASTRO_CONSULTATION_VALIDATOR_ENABLED");
  const monitoring = raw("ASTRO_CONSULTATION_MONITORING_ENABLED");
  const finalConsultationAnswer = responsePlan && validator && raw("ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED");
  const orchestrator = consultationState && raw("ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED");

  const disabledReasons: string[] = [];
  if (raw("ASTRO_LIFE_CONTEXT_ENABLED") && !lifeContext) disabledReasons.push("life_context_disabled_consultation_state_off");
  if (raw("ASTRO_EMOTIONAL_STATE_ENABLED") && !emotionalState) disabledReasons.push("emotional_state_disabled_consultation_state_off");
  if (raw("ASTRO_CULTURAL_CONTEXT_ENABLED") && !culturalContext) disabledReasons.push("cultural_context_disabled_consultation_state_off");
  if (raw("ASTRO_PRACTICAL_CONSTRAINTS_ENABLED") && !practicalConstraints) disabledReasons.push("practical_constraints_disabled_consultation_state_off");
  if (raw("ASTRO_CHART_EVIDENCE_ENABLED") && !chartEvidence) disabledReasons.push("chart_evidence_disabled_consultation_state_off");
  if (raw("ASTRO_PATTERN_RECOGNITION_ENABLED") && !patternRecognition) disabledReasons.push("pattern_recognition_disabled_missing_dependencies");
  if (raw("ASTRO_TIMING_JUDGEMENT_ENABLED") && !timingJudgement) disabledReasons.push("timing_judgement_disabled_missing_chart_evidence");
  if (raw("ASTRO_REMEDY_PROPORTIONALITY_ENABLED") && !remedyProportionality) disabledReasons.push("remedy_proportionality_disabled_missing_dependencies");
  if (raw("ASTRO_ONE_FOLLOWUP_ENABLED") && !oneFollowUp) disabledReasons.push("one_followup_disabled_consultation_state_off");
  if (raw("ASTRO_EPHEMERAL_MEMORY_RESET_ENABLED") && !ephemeralMemoryReset) disabledReasons.push("ephemeral_memory_reset_disabled_consultation_state_off");
  if (raw("ASTRO_CONSULTATION_RESPONSE_PLAN_ENABLED") && !responsePlan) disabledReasons.push("response_plan_disabled_consultation_state_off");
  if (raw("ASTRO_CONSULTATION_ORCHESTRATOR_ENABLED") && !orchestrator) disabledReasons.push("orchestrator_disabled_consultation_state_off");
  if (raw("ASTRO_FINAL_CONSULTATION_ANSWER_ENABLED") && !finalConsultationAnswer) disabledReasons.push("final_answer_disabled_response_plan_or_validator_off");
  if (raw("ASTRO_CONSULTATION_VALIDATOR_ENABLED") && !validator) disabledReasons.push("validator_disabled_default_or_invalid");
  if (raw("ASTRO_CONSULTATION_MONITORING_ENABLED") && !monitoring) disabledReasons.push("monitoring_disabled_default_or_invalid");
  if (!finalConsultationAnswer || !validator || !responsePlan || !orchestrator || !consultationState || !lifeContext || !emotionalState || !culturalContext || !practicalConstraints || !chartEvidence || !patternRecognition || !oneFollowUp || !ephemeralMemoryReset || !timingJudgement || !remedyProportionality) {
    if (!disabledReasons.includes("full_pipeline_disabled_missing_required_flags")) {
      disabledReasons.push("full_pipeline_disabled_missing_required_flags");
    }
  }

  return {
    consultationState,
    lifeContext,
    emotionalState,
    culturalContext,
    practicalConstraints,
    chartEvidence,
    patternRecognition,
    oneFollowUp,
    ephemeralMemoryReset,
    timingJudgement,
    remedyProportionality,
    responsePlan,
    orchestrator,
    finalConsultationAnswer,
    validator,
    monitoring,
    exactFactBypassAlwaysOn: true,
    fullConsultationPipelineEnabled:
      Boolean(
        orchestrator &&
        consultationState &&
        lifeContext &&
        emotionalState &&
        culturalContext &&
        practicalConstraints &&
        chartEvidence &&
        patternRecognition &&
        oneFollowUp &&
        ephemeralMemoryReset &&
        timingJudgement &&
        remedyProportionality &&
        responsePlan &&
        validator &&
        finalConsultationAnswer,
      ),
    disabledReasons,
  };
}

export function buildConsultationRolloutReadiness(
  flags: ResolvedConsultationFeatureFlags,
): ConsultationRolloutReadiness {
  const blockers = [
    ...(!flags.exactFactBypassAlwaysOn ? ["exact_fact_bypass_disabled"] : []),
    ...(!flags.fullConsultationPipelineEnabled ? ["full_consultation_pipeline_disabled"] : []),
    ...flags.disabledReasons,
  ];
  return {
    readyForLocalUnitTests: true,
    readyForIntegrationTests: flags.consultationState && flags.responsePlan && flags.validator,
    readyForExactFactRegression: flags.exactFactBypassAlwaysOn,
    readyForConsultationSmoke: flags.fullConsultationPipelineEnabled,
    readyForTestBank: flags.validator && flags.responsePlan,
    readyForPreviewDeployment: flags.fullConsultationPipelineEnabled,
    readyForProductionDeployment: flags.fullConsultationPipelineEnabled,
    blockers,
    rollbackOrder: CONSULTATION_ROLLBACK_ORDER,
  };
}

export function getConsultationFallbackMode(
  flags: ResolvedConsultationFeatureFlags,
  intentPrimary?: string,
): ConsultationFeatureFallbackMode {
  if (intentPrimary === "exact_fact") return "exact_fact_only";
  if (flags.fullConsultationPipelineEnabled) return "full_consultation";
  return "basic_response";
}
