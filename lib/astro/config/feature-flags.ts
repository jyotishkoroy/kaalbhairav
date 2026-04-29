/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

export type AstroFeatureFlags = {
  readingV2Enabled: boolean
  memoryEnabled: boolean
  remediesEnabled: boolean
  monthlyEnabled: boolean
  voiceEnabled: boolean
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
    remediesEnabled: readBooleanEnv(process.env.ASTRO_REMEDIES_ENABLED),
    monthlyEnabled: readBooleanEnv(process.env.ASTRO_MONTHLY_ENABLED),
    voiceEnabled: readBooleanEnv(process.env.ASTRO_VOICE_ENABLED),
  }
}

export function isAstroReadingV2Enabled(): boolean {
  return getAstroFeatureFlags().readingV2Enabled
}
