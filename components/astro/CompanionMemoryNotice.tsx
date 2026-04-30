/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

"use client";

type CompanionMemoryNoticeProps = {
  memoryUsed?: boolean;
  memorySaved?: boolean;
  summary?: string | null;
  onClearMemory?: () => void;
};

function clampText(value: string, limit = 140): string {
  return value.trim().replace(/[{}"]/g, "").replace(/\s+/g, " ").slice(0, limit);
}

export function CompanionMemoryNotice({ memoryUsed, memorySaved, summary, onClearMemory }: CompanionMemoryNoticeProps) {
  const safeSummary = typeof summary === "string" && summary.trim() ? clampText(summary) : "";
  if (!memoryUsed && !memorySaved) return null;

  return (
    <section aria-label="Companion memory" className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-sm font-medium text-white/80">Memory</div>
      <div className="mt-2 space-y-2 text-sm leading-6 text-white/85">
        {memoryUsed ? <p>I used a small amount of your previous context to avoid repeating a generic answer.</p> : null}
        {memorySaved ? <p>I can remember that this topic matters to you for future readings.</p> : null}
        {safeSummary ? <p>{safeSummary}</p> : null}
      </div>
      {onClearMemory ? (
        <button type="button" onClick={onClearMemory} className="mt-3 rounded-full border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/10">
          Clear remembered context
        </button>
      ) : null}
    </section>
  );
}
