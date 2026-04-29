import { getAstroFeatureFlags } from "@/lib/astro/config/feature-flags";
import {
  getAstroReadingUiFeatureFlags,
} from "@/lib/astro/reading/ui-feature-flags";
import { getLLMProviderConfig } from "@/lib/llm/config";

export type AstroRolloutFlagState = {
  server: {
    readingV2Enabled: boolean;
    memoryEnabled: boolean;
    remediesEnabled: boolean;
    monthlyEnabled: boolean;
  };
  client: {
    readingV2UiEnabled: boolean;
    voiceEnabled: boolean;
  };
  llm: {
    provider: "disabled" | "ollama" | "groq";
    enabled: boolean;
  };
};

export type AstroRolloutReadiness = {
  safeForDefaultProduction: boolean;
  reasons: string[];
  flags: AstroRolloutFlagState;
};

export function getAstroRolloutFlagState(): AstroRolloutFlagState {
  const serverFlags = getAstroFeatureFlags();
  const uiFlags = getAstroReadingUiFeatureFlags();
  const llmConfig = getLLMProviderConfig();

  return {
    server: {
      readingV2Enabled: serverFlags.readingV2Enabled,
      memoryEnabled: serverFlags.memoryEnabled,
      remediesEnabled: serverFlags.remediesEnabled,
      monthlyEnabled: serverFlags.monthlyEnabled,
    },
    client: {
      readingV2UiEnabled: uiFlags.readingV2UiEnabled,
      voiceEnabled: uiFlags.voiceEnabled,
    },
    llm: {
      provider: llmConfig.provider,
      enabled: llmConfig.enabled,
    },
  };
}

export function getAstroRolloutReadiness(): AstroRolloutReadiness {
  const flags = getAstroRolloutFlagState();
  const reasons: string[] = [];

  if (flags.server.readingV2Enabled) {
    reasons.push("ASTRO_READING_V2_ENABLED is enabled");
  }

  if (flags.server.memoryEnabled) {
    reasons.push("ASTRO_MEMORY_ENABLED is enabled");
  }

  if (flags.server.remediesEnabled) {
    reasons.push("ASTRO_REMEDIES_ENABLED is enabled");
  }

  if (flags.server.monthlyEnabled) {
    reasons.push("ASTRO_MONTHLY_ENABLED is enabled");
  }

  if (flags.client.readingV2UiEnabled) {
    reasons.push("NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED is enabled");
  }

  if (flags.client.voiceEnabled) {
    reasons.push("NEXT_PUBLIC_ASTRO_VOICE_ENABLED is enabled");
  }

  if (flags.llm.enabled) {
    reasons.push("ASTRO_LLM_PROVIDER is not disabled");
  }

  return {
    safeForDefaultProduction: reasons.length === 0,
    reasons,
    flags,
  };
}
