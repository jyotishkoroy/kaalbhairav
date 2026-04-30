/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

"use client";

type ListeningReflectionCardProps = {
  topic?: string | null;
  emotionalTone?: string | null;
  acknowledgement?: string | null;
  isVisible?: boolean;
};

function clampText(value: string, limit = 180): string {
  return value
    .trim()
    .replace(/risk:\s*/gi, "")
    .replace(/[{}"]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, limit);
}

export function ListeningReflectionCard({
  topic,
  emotionalTone,
  acknowledgement,
  isVisible = false,
}: ListeningReflectionCardProps) {
  const safeTopic = typeof topic === "string" && topic.trim() ? clampText(topic, 80) : "";
  const safeTone = typeof emotionalTone === "string" && emotionalTone.trim() ? clampText(emotionalTone, 80) : "";
  const safeAcknowledgement = typeof acknowledgement === "string" && acknowledgement.trim() ? clampText(acknowledgement) : "";

  if (!isVisible || (!safeTopic && !safeTone && !safeAcknowledgement)) return null;

  return (
    <section aria-label="Reading context" className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-sm font-medium text-white/80">Reading context</div>
      <div className="mt-2 space-y-2 text-sm leading-6 text-white/85">
        {safeTopic ? <p>I’m reading this as a {safeTopic} question.</p> : null}
        {safeTone ? <p>I’ll keep the tone {safeTone.toLowerCase()} and practical.</p> : null}
        {safeAcknowledgement ? <p>{safeAcknowledgement}</p> : null}
      </div>
    </section>
  );
}
