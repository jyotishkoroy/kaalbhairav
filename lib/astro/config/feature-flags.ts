/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type AstroFeatureFlags = {
  readingV2Enabled: boolean
  memoryEnabled: boolean
  memoryRelevanceGateEnabled: boolean
  domainAwareEvidenceEnabled: boolean
  remediesEnabled: boolean
  monthlyEnabled: boolean
  voiceEnabled: boolean
  userFacingPlanEnabled: boolean
}

function readBooleanEnv(value: string | undefined, defaultValue = false): boolean {
  if (value == null) return defaultValue
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return false
  }
  return defaultValue
}

export function getAstroFeatureFlags(): AstroFeatureFlags {
  return {
    readingV2Enabled: readBooleanEnv(process.env.ASTRO_READING_V2_ENABLED),
    memoryEnabled: readBooleanEnv(process.env.ASTRO_MEMORY_ENABLED),
    memoryRelevanceGateEnabled: readBooleanEnv(process.env.ASTRO_MEMORY_RELEVANCE_GATE_ENABLED),
    domainAwareEvidenceEnabled: readBooleanEnv(process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED),
    remediesEnabled: readBooleanEnv(process.env.ASTRO_REMEDIES_ENABLED),
    monthlyEnabled: readBooleanEnv(process.env.ASTRO_MONTHLY_ENABLED),
    voiceEnabled: readBooleanEnv(process.env.ASTRO_VOICE_ENABLED),
    userFacingPlanEnabled: readBooleanEnv(process.env.ASTRO_USER_FACING_PLAN_ENABLED),
  }
}

export function isAstroReadingV2Enabled(): boolean {
  return getAstroFeatureFlags().readingV2Enabled
}

export function isAstroUserFacingPlanEnabled(): boolean {
  return getAstroFeatureFlags().userFacingPlanEnabled
}

export function isAstroMemoryRelevanceGateEnabled(): boolean {
  return getAstroFeatureFlags().memoryRelevanceGateEnabled
}
