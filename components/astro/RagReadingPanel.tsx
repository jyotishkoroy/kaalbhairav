// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { ReactNode } from "react";

export type RagReadingSectionKey =
  | "safety_response"
  | "direct_answer"
  | "chart_basis"
  | "reasoning"
  | "timing"
  | "what_to_do"
  | "safe_remedies"
  | "accuracy"
  | "limitations"
  | "suggested_follow_up";

export type RagReadingSections = Partial<Record<RagReadingSectionKey, string>>;

export type RagReadingMeta = {
  engine?: string;
  ragEnabled?: boolean;
  exactFactAnswered?: boolean;
  safetyGatePassed?: boolean;
  safetyBlocked?: boolean;
  followupAsked?: boolean;
  fallbackUsed?: boolean;
  validationPassed?: boolean;
  groqUsed?: boolean;
  groqRetryUsed?: boolean;
  ollamaCriticUsed?: boolean;
  deterministicAnalyzerUsed?: boolean;
  timingsAvailable?: boolean;
};

export type RagReadingPanelProps = {
  answer: string;
  sections?: RagReadingSections | null;
  followUpQuestion?: string | null;
  followUpAnswer?: string | null;
  meta?: RagReadingMeta | null;
  className?: string;
};

const SECTION_ORDER: RagReadingSectionKey[] = [
  "safety_response",
  "direct_answer",
  "chart_basis",
  "reasoning",
  "timing",
  "what_to_do",
  "safe_remedies",
  "accuracy",
  "limitations",
  "suggested_follow_up",
];

const SECTION_LABELS: Record<RagReadingSectionKey, string> = {
  safety_response: "Safety response",
  direct_answer: "Direct answer",
  chart_basis: "Chart basis",
  reasoning: "Reasoning",
  timing: "Timing",
  what_to_do: "What to do",
  safe_remedies: "Safe remedies",
  accuracy: "Accuracy",
  limitations: "Limitations",
  suggested_follow_up: "Suggested follow-up",
};

const UNSAFE_KEY_PATTERNS = [
  "debug",
  "artifact",
  "env",
  "secret",
  "raw",
  "payload",
  "supabase",
  "groq",
  "ollama",
];

function isDisplayableText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeSectionText(value: string): string {
  return value.trim();
}

function isUnsafeKey(key: string): boolean {
  const lower = key.toLowerCase();
  return UNSAFE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

function getDisplayableSections(sections?: RagReadingSections | null): RagReadingSections {
  if (!sections || typeof sections !== "object") return {};

  const displayable: RagReadingSections = {};

  for (const [key, value] of Object.entries(sections)) {
    if (isUnsafeKey(key)) continue;
    if (!SECTION_ORDER.includes(key as RagReadingSectionKey)) continue;
    if (!isDisplayableText(value)) continue;
    displayable[key as RagReadingSectionKey] = sanitizeSectionText(value);
  }

  return displayable;
}

function getSafeStatus(meta?: RagReadingMeta | null): string | null {
  if (!meta) return null;
  if (meta.safetyBlocked) return "Safety response";
  if (meta.exactFactAnswered) return "Deterministic fact";
  if (meta.fallbackUsed) return "Fallback answer";
  if (meta.groqUsed || meta.validationPassed) return "Grounded answer";
  return null;
}

function renderParagraph(text: string): ReactNode {
  return <p className="whitespace-pre-wrap break-words text-sm leading-7 text-white/90">{text}</p>;
}

function renderSection(key: RagReadingSectionKey, text: string) {
  return (
    <article
      key={key}
      className="rounded-xl border border-white/10 bg-black/20 p-4"
      aria-label={SECTION_LABELS[key]}
    >
      <h3 className="text-sm font-medium text-white/75">{SECTION_LABELS[key]}</h3>
      <div className="mt-2">{renderParagraph(text)}</div>
    </article>
  );
}

export function getDisplayableRagSections(sections?: RagReadingSections | null): RagReadingSections {
  return getDisplayableSections(sections);
}

export function getSafeRagStatus(meta?: RagReadingMeta | null): string | null {
  return getSafeStatus(meta);
}

export function RagReadingPanel({
  answer,
  sections,
  followUpQuestion,
  followUpAnswer,
  meta,
  className,
}: RagReadingPanelProps) {
  const displayableSections = getDisplayableSections(sections);
  const safeStatus = getSafeStatus(meta);
  const hasStructuredContent = Object.keys(displayableSections).length > 0;

  return (
    <article
      className={["rounded-2xl border border-white/10 bg-black/20 p-4", className]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
    >
      {safeStatus ? (
        <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
          {safeStatus}
        </div>
      ) : null}

      {hasStructuredContent ? (
        <div className="grid gap-3">
          {SECTION_ORDER.map((key) => {
            const text = displayableSections[key];
            return text ? renderSection(key, text) : null;
          })}
        </div>
      ) : (
        <div className="whitespace-pre-wrap break-words text-sm leading-7 text-white/90">
          {answer}
        </div>
      )}

      {followUpQuestion ? (
        <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-medium text-white/75">Suggested follow-up</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-white/90">
            {followUpQuestion}
          </p>
          {followUpAnswer ? (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-white/80">
              {followUpAnswer}
            </p>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
