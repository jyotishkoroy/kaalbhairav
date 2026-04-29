"use client";

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export type ReadingMemoryCardProps = {
  enabled?: boolean;
  summary?: string;
  previousTopic?: string;
};

export function ReadingMemoryCard({
  enabled = false,
  summary,
  previousTopic,
}: ReadingMemoryCardProps) {
  return (
    <section
      aria-label="Reading memory"
      className="rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <div className="text-sm font-medium">Reading memory</div>
      <div className="mt-1 text-sm opacity-80">
        {enabled
          ? "Memory is enabled for Reading V2."
          : "Memory is off by default and only activates when enabled."}
      </div>
      {previousTopic ? (
        <div className="mt-2 text-xs opacity-75">Previous topic: {previousTopic}</div>
      ) : null}
      {summary ? <p className="mt-2 text-sm opacity-90">{summary}</p> : null}
    </section>
  );
}
