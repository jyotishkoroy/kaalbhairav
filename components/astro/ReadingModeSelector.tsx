"use client";

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { ReadingMode } from "@/lib/astro/reading/reading-types";

export type ReadingModeOption = {
  value: ReadingMode;
  label: string;
  description: string;
};

export const readingModeOptions: ReadingModeOption[] = [
  {
    value: "short_comfort",
    label: "Gentle",
    description: "Short, calm, reassuring reading.",
  },
  {
    value: "practical_guidance",
    label: "Practical",
    description: "Clear next steps and grounded advice.",
  },
  {
    value: "timing_prediction",
    label: "Timing",
    description: "Timing guidance without guarantees.",
  },
  {
    value: "remedy_focused",
    label: "Remedy",
    description: "Safe, simple, non-fear-based remedies.",
  },
  {
    value: "deep_astrology",
    label: "Deep",
    description: "More astrological reasoning.",
  },
];

export type ReadingModeSelectorProps = {
  value?: ReadingMode;
  onChange?: (mode: ReadingMode) => void;
  disabled?: boolean;
};

export function ReadingModeSelector({
  value = "practical_guidance",
  onChange,
  disabled = false,
}: ReadingModeSelectorProps) {
  return (
    <section
      aria-label="Reading mode"
      className="rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <div className="mb-2 text-sm font-medium">Reading style</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {readingModeOptions.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange?.(option.value)}
              className={[
                "rounded-lg border p-3 text-left transition",
                selected
                  ? "border-white/40 bg-white/15"
                  : "border-white/10 bg-transparent hover:bg-white/10",
                disabled ? "cursor-not-allowed opacity-60" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="text-sm font-medium">{option.label}</div>
              <div className="mt-1 text-xs opacity-75">{option.description}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
