"use client";

/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
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
  const safeSummary = typeof summary === "string" && summary.trim() ? summary.trim().slice(0, 160) : "";
  const safeTopic = typeof previousTopic === "string" && previousTopic.trim() ? previousTopic.trim().slice(0, 80) : "";

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
      {safeTopic ? (
        <div className="mt-2 text-xs opacity-75">Previous topic: {safeTopic}</div>
      ) : null}
      {safeSummary ? <p className="mt-2 text-sm opacity-90">{safeSummary}</p> : null}
    </section>
  );
}
