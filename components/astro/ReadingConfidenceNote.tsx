/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

"use client";

type ReadingConfidenceNoteProps = {
  limitations?: string[];
  safetyBoundaries?: string[];
  confidence?: "low" | "medium" | "high" | string | null;
};

function clampText(value: string, limit = 180): string {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function safeList(values?: string[]): string[] {
  return (values ?? []).map((value) => clampText(value)).filter(Boolean).slice(0, 4);
}

export function ReadingConfidenceNote({ limitations, safetyBoundaries, confidence }: ReadingConfidenceNoteProps) {
  const safeLimitations = safeList(limitations);
  const safeBoundaries = safeList(safetyBoundaries);
  const hasContent = safeLimitations.length > 0 || safeBoundaries.length > 0 || Boolean(confidence);
  if (!hasContent) return null;

  const lowConfidence = !confidence || confidence === "low";

  return (
    <section aria-label="Reading confidence" className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-sm font-medium text-white/80">Reading confidence</div>
      <p className="mt-2 text-sm leading-6 text-white/80">
        {lowConfidence ? "I’ll keep this grounded because some details may be limited." : "I’ll keep this grounded and avoid certainty that the reading cannot support."}
      </p>
      {safeLimitations.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-white/80">
          {safeLimitations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      {safeBoundaries.length > 0 ? (
        <div className="mt-2 text-xs leading-5 text-white/55">
          {safeBoundaries.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
