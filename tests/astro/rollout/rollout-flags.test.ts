/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAstroRolloutFlagState,
  getAstroRolloutReadiness,
} from "@/lib/astro/config/rollout-flags";

const ORIGINAL_ENV = process.env;

describe("Astro rollout flags", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ASTRO_READING_V2_ENABLED;
    delete process.env.ASTRO_MEMORY_ENABLED;
    delete process.env.ASTRO_REMEDIES_ENABLED;
    delete process.env.ASTRO_MONTHLY_ENABLED;
    delete process.env.NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED;
    delete process.env.NEXT_PUBLIC_ASTRO_VOICE_ENABLED;
    delete process.env.ASTRO_LLM_PROVIDER;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("keeps all rollout flags off by default", () => {
    const state = getAstroRolloutFlagState();

    expect(state.server.readingV2Enabled).toBe(false);
    expect(state.server.memoryEnabled).toBe(false);
    expect(state.server.remediesEnabled).toBe(false);
    expect(state.server.monthlyEnabled).toBe(false);
    expect(state.client.readingV2UiEnabled).toBe(false);
    expect(state.client.voiceEnabled).toBe(false);
    expect(state.llm.provider).toBe("disabled");
    expect(state.llm.enabled).toBe(false);
  });

  it("reports default production as safe when all rollout flags are disabled", () => {
    const readiness = getAstroRolloutReadiness();

    expect(readiness.safeForDefaultProduction).toBe(true);
    expect(readiness.reasons).toEqual([]);
  });

  it("reports reasons when experimental flags are enabled", () => {
    process.env.ASTRO_READING_V2_ENABLED = "true";
    process.env.ASTRO_MEMORY_ENABLED = "true";
    process.env.ASTRO_REMEDIES_ENABLED = "true";
    process.env.ASTRO_MONTHLY_ENABLED = "true";
    process.env.NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED = "true";
    process.env.NEXT_PUBLIC_ASTRO_VOICE_ENABLED = "true";
    process.env.ASTRO_LLM_PROVIDER = "ollama";

    const readiness = getAstroRolloutReadiness();

    expect(readiness.safeForDefaultProduction).toBe(false);
    expect(readiness.reasons).toEqual(
      expect.arrayContaining([
        "ASTRO_READING_V2_ENABLED is enabled",
        "ASTRO_MEMORY_ENABLED is enabled",
        "ASTRO_REMEDIES_ENABLED is enabled",
        "ASTRO_MONTHLY_ENABLED is enabled",
        "NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED is enabled",
        "NEXT_PUBLIC_ASTRO_VOICE_ENABLED is enabled",
        "ASTRO_LLM_PROVIDER is not disabled",
      ]),
    );
  });
});
