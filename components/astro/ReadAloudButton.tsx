"use client";

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { useState } from "react";
import { isAstroVoiceUiEnabled } from "@/lib/astro/reading/ui-feature-flags";
import {
  getSpeechLanguage,
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
} from "@/lib/voice/browser-speech";

export type ReadAloudButtonProps = {
  text: string;
  language?: string;
  disabled?: boolean;
  label?: string;
};

export function ReadAloudButton({
  text,
  language = "english",
  disabled = false,
  label = "Read aloud",
}: ReadAloudButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!isAstroVoiceUiEnabled()) return null;

  const supported = isSpeechSynthesisSupported();

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        aria-label="Read aloud unavailable"
        title="Read aloud is not supported in this browser."
        className="rounded-full border border-white/10 px-3 py-1.5 text-sm opacity-50"
      >
        Read unavailable
      </button>
    );
  }

  function handleClick() {
    if (disabled) return;

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    const started = speakText(text, {
      lang: getSpeechLanguage(language),
      rate: 0.92,
      pitch: 1,
    });

    setIsSpeaking(started);
  }

  return (
    <button
      type="button"
      disabled={disabled || !text.trim()}
      aria-pressed={isSpeaking}
      aria-label={isSpeaking ? "Stop reading aloud" : label}
      onClick={handleClick}
      className={[
        "rounded-full border border-white/10 px-3 py-1.5 text-sm transition",
        isSpeaking ? "bg-white/15" : "hover:bg-white/10",
        disabled || !text.trim() ? "cursor-not-allowed opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isSpeaking ? "Stop reading" : label}
    </button>
  );
}
