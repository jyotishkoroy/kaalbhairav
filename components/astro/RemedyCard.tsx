"use client";

/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type RemedyCardProps = {
  title?: string;
  instructions?: string[];
  safetyNote?: string;
};

export function RemedyCard({
  title = "Safe remedy",
  instructions = [],
  safetyNote,
}: RemedyCardProps) {
  const safeInstructions = instructions.map((instruction) => instruction.trim().slice(0, 180)).filter(Boolean);
  const safeSafetyNote = safetyNote?.trim().slice(0, 180);
  if (safeInstructions.length === 0 && !safeSafetyNote) return null;

  return (
    <section
      aria-label="Safe remedy"
      className="rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <div className="text-sm font-medium">{title}</div>
      {safeInstructions.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm opacity-90">
          {safeInstructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ul>
      ) : null}
      {safeSafetyNote ? (
        <p className="mt-2 text-xs opacity-75">Safety note: {safeSafetyNote}</p>
      ) : null}
    </section>
  );
}
