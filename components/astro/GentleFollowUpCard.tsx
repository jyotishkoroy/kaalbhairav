/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

"use client";

type GentleFollowUpCardProps = {
  question: string;
  reason?: string | null;
  onUseQuestion?: (question: string) => void;
};

function clampText(value: string, limit = 240): string {
  return value.trim().replace(/\breason[_-]?code:\s*/gi, "").replace(/[{}"]/g, "").replace(/\s+/g, " ").slice(0, limit);
}

export function GentleFollowUpCard({ question, reason, onUseQuestion }: GentleFollowUpCardProps) {
  const safeQuestion = clampText(question, 220);
  const safeReason = typeof reason === "string" && reason.trim() ? clampText(reason) : "";
  if (!safeQuestion) return null;

  return (
    <section aria-label="Suggested follow-up" className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-sm font-medium text-white/80">Suggested follow-up</div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/85">{safeQuestion}</p>
      {safeReason ? <p className="mt-2 text-xs leading-5 text-white/55">{safeReason}</p> : null}
      <button
        type="button"
        aria-label={`Use this follow-up: ${safeQuestion}`}
        onClick={() => onUseQuestion?.(safeQuestion)}
        className="mt-3 rounded-full border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/10"
      >
        Use this follow-up
      </button>
    </section>
  );
}
