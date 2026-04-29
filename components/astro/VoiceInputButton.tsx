"use client";

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { useRef, useState } from "react";
import { isAstroVoiceUiEnabled } from "@/lib/astro/reading/ui-feature-flags";
import {
  createSpeechRecognition,
  getSpeechLanguage,
  isSpeechRecognitionSupported,
  type BrowserSpeechRecognition,
} from "@/lib/voice/browser-speech";

export type VoiceInputButtonProps = {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
  label?: string;
};

export function VoiceInputButton({
  onTranscript,
  language = "english",
  disabled = false,
  label = "Voice input",
}: VoiceInputButtonProps) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!isAstroVoiceUiEnabled()) return null;

  const supported = isSpeechRecognitionSupported();

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        aria-label="Voice input unavailable"
        title="Voice input is not supported in this browser."
        className="rounded-full border border-white/10 px-3 py-1.5 text-sm opacity-50"
      >
        Voice unavailable
      </button>
    );
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function startListening() {
    if (disabled || isListening) return;

    setError(undefined);

    const recognition = createSpeechRecognition({
      lang: getSpeechLanguage(language),
      continuous: false,
      interimResults: false,
    });

    if (!recognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
      setError(event.message ?? event.error ?? "Voice input failed.");
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop voice input" : label}
        onClick={isListening ? stopListening : startListening}
        className={[
          "rounded-full border border-white/10 px-3 py-1.5 text-sm transition",
          isListening ? "bg-white/15" : "hover:bg-white/10",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isListening ? "Stop listening" : label}
      </button>
      {error ? <span className="text-xs opacity-70">{error}</span> : null}
    </div>
  );
}
