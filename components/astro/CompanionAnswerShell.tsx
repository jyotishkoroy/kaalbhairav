/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

"use client";

import { CompanionMemoryNotice } from "@/components/astro/CompanionMemoryNotice";
import { GentleFollowUpCard } from "@/components/astro/GentleFollowUpCard";
import { ListeningReflectionCard } from "@/components/astro/ListeningReflectionCard";
import { ReadingConfidenceNote } from "@/components/astro/ReadingConfidenceNote";
import { ReadingFeedbackBar, type ReadingFeedbackInput } from "@/components/astro/ReadingFeedbackBar";

type CompanionAnswerShellProps = {
  answer: string;
  topic?: string | null;
  acknowledgement?: string | null;
  emotionalTone?: string | null;
  limitations?: string[];
  safetyBoundaries?: string[];
  confidence?: string | null;
  followUpQuestion?: string | null;
  followUpReason?: string | null;
  memoryUsed?: boolean;
  memorySaved?: boolean;
  memorySummary?: string | null;
  messageId?: string | null;
  sessionId?: string | null;
  showCompanionUi?: boolean;
  onFollowUp?: (question: string) => void;
  onFeedbackSubmit?: (feedback: ReadingFeedbackInput) => Promise<void> | void;
  onClearMemory?: () => void;
};

export function CompanionAnswerShell(props: CompanionAnswerShellProps) {
  const answer = props.answer ?? "";
  if (!props.showCompanionUi) {
    return <article className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="whitespace-pre-wrap break-words text-sm leading-7 text-white/90">{answer}</div></article>;
  }

  return (
    <article className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <ListeningReflectionCard isVisible topic={props.topic} emotionalTone={props.emotionalTone} acknowledgement={props.acknowledgement} />
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-white/90">{answer}</div>
      <ReadingConfidenceNote limitations={props.limitations} safetyBoundaries={props.safetyBoundaries} confidence={props.confidence} />
      <CompanionMemoryNotice memoryUsed={props.memoryUsed} memorySaved={props.memorySaved} summary={props.memorySummary} onClearMemory={props.onClearMemory} />
      {props.followUpQuestion ? <GentleFollowUpCard question={props.followUpQuestion} reason={props.followUpReason} onUseQuestion={props.onFollowUp} /> : null}
      <ReadingFeedbackBar messageId={props.messageId} sessionId={props.sessionId} onSubmit={props.onFeedbackSubmit} />
    </article>
  );
}
