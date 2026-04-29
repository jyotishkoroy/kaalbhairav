"use client";

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export type FollowUpChip = {
  label: string;
  message: string;
};

export const defaultFollowUpChips: FollowUpChip[] = [
  {
    label: "Explain deeper",
    message: "Explain this reading more deeply.",
  },
  {
    label: "Give remedy",
    message: "Give me a safe remedy for this situation.",
  },
  {
    label: "What should I do now?",
    message: "What should I do now in practical steps?",
  },
  {
    label: "Timing please",
    message: "Give timing guidance without making guarantees.",
  },
  {
    label: "Continue from last reading",
    message: "Continue from my last reading and connect the guidance.",
  },
];

export type FollowUpChipsProps = {
  chips?: FollowUpChip[];
  onSelect?: (message: string) => void;
  disabled?: boolean;
};

export function FollowUpChips({
  chips = defaultFollowUpChips,
  onSelect,
  disabled = false,
}: FollowUpChipsProps) {
  return (
    <section
      aria-label="Suggested follow-up questions"
      className="rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <div className="mb-2 text-sm font-medium">Follow-up prompts</div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(chip.message)}
            className={[
              "rounded-full border border-white/10 px-3 py-1.5 text-sm transition",
              "hover:bg-white/10",
              disabled ? "cursor-not-allowed opacity-60" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );
}
