"use client";

import { isAstroReadingV2UiEnabled } from "@/lib/astro/reading/ui-feature-flags";
import type { ReadingMode } from "@/lib/astro/reading/reading-types";
import { FollowUpChips, type FollowUpChip } from "@/components/astro/FollowUpChips";
import { ReadingMemoryCard } from "@/components/astro/ReadingMemoryCard";
import { ReadingModeSelector } from "@/components/astro/ReadingModeSelector";

export type AstroReadingV2PanelProps = {
  mode?: ReadingMode;
  onModeChange?: (mode: ReadingMode) => void;
  onFollowUpSelect?: (message: string) => void;
  followUpChips?: FollowUpChip[];
  memoryEnabled?: boolean;
  memorySummary?: string;
  previousTopic?: string;
  disabled?: boolean;
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
    </aside>
  );
}
