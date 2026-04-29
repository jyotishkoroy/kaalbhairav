/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export type AstroReadingUiFeatureFlags = {
  readingV2UiEnabled: boolean;
  voiceEnabled: boolean;
};

function readBooleanEnv(value: string | undefined, defaultValue = false): boolean {
  if (value == null) return defaultValue;

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export function getAstroReadingUiFeatureFlags(): AstroReadingUiFeatureFlags {
  return {
    readingV2UiEnabled: readBooleanEnv(
      process.env.NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED,
      false,
    ),
    voiceEnabled: readBooleanEnv(
      process.env.NEXT_PUBLIC_ASTRO_VOICE_ENABLED,
      false,
    ),
  };
}

export function isAstroReadingV2UiEnabled(): boolean {
  return getAstroReadingUiFeatureFlags().readingV2UiEnabled;
}

export function isAstroVoiceUiEnabled(): boolean {
  return getAstroReadingUiFeatureFlags().voiceEnabled;
}
