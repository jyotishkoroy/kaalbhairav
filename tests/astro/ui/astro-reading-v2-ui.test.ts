/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { readingModeOptions } from "@/components/astro/ReadingModeSelector";
import { defaultFollowUpChips } from "@/components/astro/FollowUpChips";
import {
  isAstroReadingV2UiEnabled,
  isAstroVoiceUiEnabled,
} from "@/lib/astro/reading/ui-feature-flags";

const ORIGINAL_ENV = process.env;

describe("Astro Reading V2 UI exports", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("keeps V2 UI disabled by default", () => {
    delete process.env.NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED;

    expect(isAstroReadingV2UiEnabled()).toBe(false);
  });

  it("can enable V2 UI with client flag", () => {
    process.env.NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED = "true";

    expect(isAstroReadingV2UiEnabled()).toBe(true);
  });

  it("keeps browser voice UI disabled by default", () => {
    delete process.env.NEXT_PUBLIC_ASTRO_VOICE_ENABLED;

    expect(isAstroVoiceUiEnabled()).toBe(false);
  });

  it("can enable browser voice UI with client flag", () => {
    process.env.NEXT_PUBLIC_ASTRO_VOICE_ENABLED = "true";

    expect(isAstroVoiceUiEnabled()).toBe(true);
  });

  it("exports reading mode options", () => {
    expect(readingModeOptions.map((option) => option.value)).toContain(
      "practical_guidance",
    );
  });

  it("exports follow-up chips", () => {
    expect(defaultFollowUpChips.map((chip) => chip.label)).toContain(
      "Give remedy",
    );
  });
});
