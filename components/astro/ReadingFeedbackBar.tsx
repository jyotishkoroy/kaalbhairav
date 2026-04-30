/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

"use client";

import { useState } from "react";

export type ReadingFeedbackInput = {
  rating?: 1 | 2 | 3 | 4 | 5;
  feltHeard?: boolean;
  tooGeneric?: boolean;
  tooFearful?: boolean;
  inaccurate?: boolean;
  comment?: string;
};

type ReadingFeedbackBarProps = {
  messageId?: string | null;
  sessionId?: string | null;
  onSubmit?: (feedback: ReadingFeedbackInput) => Promise<void> | void;
  disabled?: boolean;
};

const COMMENT_LIMIT = 1000;

export function ReadingFeedbackBar({ messageId, sessionId, onSubmit, disabled = false }: ReadingFeedbackBarProps) {
  const [feedback, setFeedback] = useState<ReadingFeedbackInput>({});
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "submitted" | "error">("idle");

  function update(partial: ReadingFeedbackInput) {
    setFeedback((current) => ({ ...current, ...partial }));
    setState("idle");
  }

  async function submit() {
    if (disabled) return;
    const trimmedComment = comment.trim().slice(0, COMMENT_LIMIT);
    const payload = { ...feedback, comment: trimmedComment || undefined };
    if (!payload.rating && !payload.feltHeard && !payload.tooGeneric && !payload.tooFearful && !payload.inaccurate && !payload.comment) return;
    try {
      setState("submitting");
      await onSubmit?.(payload);
      setState("submitted");
    } catch {
      setState("error");
    }
  }

  return (
    <section aria-label="Reading feedback" className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-sm font-medium text-white/80">Did this feel helpful?</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={disabled} onClick={() => update({ rating: 5, feltHeard: true })} className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Yes</button>
        <button type="button" disabled={disabled} onClick={() => update({ rating: 3 })} className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Somewhat</button>
        <button type="button" disabled={disabled} onClick={() => update({ tooGeneric: true })} className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Too generic</button>
        <button type="button" disabled={disabled} onClick={() => update({ tooFearful: true })} className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Too fearful</button>
        <button type="button" disabled={disabled} onClick={() => update({ inaccurate: true, rating: 1 })} className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Not relevant</button>
      </div>
      <label className="mt-3 block text-sm text-white/75">
        <span className="sr-only">Tell us what felt missing.</span>
        <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, COMMENT_LIMIT))} disabled={disabled} placeholder="Tell us what felt missing." rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:opacity-50" />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={submit} disabled={disabled} className="rounded-full bg-white px-3 py-1.5 text-sm text-black disabled:cursor-not-allowed disabled:opacity-50">Submit feedback</button>
        <span className="text-xs text-white/55">{state === "submitted" ? "Submitted." : state === "submitting" ? "Submitting..." : state === "error" ? "Could not submit feedback." : ""}</span>
      </div>
      <div className="sr-only">{messageId ?? ""}{sessionId ?? ""}</div>
    </section>
  );
}
