"use client";

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { isAstroReadingV2UiEnabled } from "@/lib/astro/reading/ui-feature-flags";
import type { ReadingMode } from "@/lib/astro/reading/reading-types";
import { ReadAloudButton } from "@/components/astro/ReadAloudButton";
import { FollowUpChips, type FollowUpChip } from "@/components/astro/FollowUpChips";
import { ReadingMemoryCard } from "@/components/astro/ReadingMemoryCard";
import { ReadingModeSelector } from "@/components/astro/ReadingModeSelector";
import { VoiceInputButton } from "@/components/astro/VoiceInputButton";

export type AstroReadingV2PanelProps = {
  mode?: ReadingMode;
  onModeChange?: (mode: ReadingMode) => void;
  onFollowUpSelect?: (message: string) => void;
  followUpChips?: FollowUpChip[];
  memoryEnabled?: boolean;
  memorySummary?: string;
  previousTopic?: string;
  disabled?: boolean;
  voiceLanguage?: string;
  latestAnswer?: string;
  onVoiceTranscript?: (text: string) => void;
};

export function AstroReadingV2Panel({
  mode = "practical_guidance",
  onModeChange,
  onFollowUpSelect,
  followUpChips,
  memoryEnabled = false,
  memorySummary,
  previousTopic,
  disabled = false,
  voiceLanguage,
  latestAnswer,
  onVoiceTranscript,
}: AstroReadingV2PanelProps) {
  if (!isAstroReadingV2UiEnabled()) return null;

  return (
    <aside
      aria-label="Reading V2 tools"
      className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
    >
      <ReadingModeSelector value={mode} onChange={onModeChange} disabled={disabled} />
      <FollowUpChips
        chips={followUpChips}
        onSelect={onFollowUpSelect}
        disabled={disabled}
      />
      <ReadingMemoryCard
        enabled={memoryEnabled}
        summary={memorySummary}
        previousTopic={previousTopic}
      />
      {onVoiceTranscript || latestAnswer ? (
        <section
          aria-label="Voice tools"
          className="rounded-xl border border-white/10 bg-white/5 p-3"
        >
          <div className="mb-2 text-sm font-medium">Voice tools</div>
          <div className="flex flex-wrap gap-2">
            {onVoiceTranscript ? (
              <VoiceInputButton
                onTranscript={onVoiceTranscript}
                language={voiceLanguage}
                disabled={disabled}
              />
            ) : null}
            {latestAnswer ? (
              <ReadAloudButton
                text={latestAnswer}
                language={voiceLanguage}
                disabled={disabled}
              />
            ) : null}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
