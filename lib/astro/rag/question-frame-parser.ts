/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type {
  QuestionFrame,
  QuestionNegativeSafetyConstraint,
  QuestionRequestedStyle,
  QuestionSituationContext,
} from "./question-frame-types";

type FrameToken = {
  suffix: string;
  style?: QuestionRequestedStyle;
  context?: QuestionSituationContext;
  negative?: QuestionNegativeSafetyConstraint[];
};

const TOKEN_PATTERNS: Array<{ pattern: RegExp; token: FrameToken }> = [
  { pattern: /please answer with practical guidance/i, token: { suffix: "Please answer with practical guidance", style: "practical_guidance" } },
  { pattern: /please answer without fear-based language/i, token: { suffix: "Please answer without fear-based language", style: "fear_free", negative: ["fear_based_language"] } },
  { pattern: /please answer without medical, legal, or financial certainty/i, token: { suffix: "Please answer without medical, legal, or financial certainty", negative: ["medical", "legal", "financial"] } },
  { pattern: /please answer using only verifiable chart facts/i, token: { suffix: "Please answer using only verifiable chart facts", style: "verifiable_facts_only" } },
  { pattern: /please answer with one next step/i, token: { suffix: "Please answer with one next step", style: "one_next_step" } },
  { pattern: /please answer without expensive remedies/i, token: { suffix: "Please answer without expensive remedies", style: "no_expensive_remedies", negative: ["expensive_remedy"] } },
  { pattern: /please answer with emotional acknowledgement/i, token: { suffix: "Please answer with emotional acknowledgement", style: "emotional_acknowledgement" } },
  { pattern: /please answer without sounding generic/i, token: { suffix: "Please answer without sounding generic", style: "non_generic" } },
  { pattern: /as a concise answer/i, token: { suffix: "as a concise answer", style: "concise" } },
  { pattern: /as a follow-up question if more context is needed/i, token: { suffix: "as a follow-up question if more context is needed", context: "follow_up_if_needed" } },
  { pattern: /for the next month/i, token: { suffix: "for the next month", context: "next_month" } },
  { pattern: /for this year/i, token: { suffix: "for this year", context: "this_year" } },
  { pattern: /when i feel anxious/i, token: { suffix: "when I feel anxious", context: "anxious" } },
  { pattern: /when family pressure is high/i, token: { suffix: "when family pressure is high", context: "family_pressure" } },
  { pattern: /when i feel stuck/i, token: { suffix: "when I feel stuck", context: "stuck" } },
  { pattern: /while keeping old behavior safe/i, token: { suffix: "while keeping old behavior safe", context: "old_behavior_safe" } },
  { pattern: /without predicting exact timing/i, token: { suffix: "without predicting exact timing", context: "no_exact_timing", negative: ["exact_timing"] } },
  { pattern: /without medical, legal, or financial certainty/i, token: { suffix: "without medical, legal, or financial certainty", negative: ["medical", "legal", "financial"] } },
  { pattern: /without making guarantees/i, token: { suffix: "without making guarantees", negative: ["guarantee"] } },
  { pattern: /without exact timing/i, token: { suffix: "without exact timing", context: "no_exact_timing", negative: ["exact_timing"] } },
  { pattern: /without fear-based language/i, token: { suffix: "without fear-based language", style: "fear_free", negative: ["fear_based_language"] } },
  { pattern: /compassionately/i, token: { suffix: "compassionately", style: "compassionate_grounded" } },
  { pattern: /without expensive remedies/i, token: { suffix: "without expensive remedies", style: "no_expensive_remedies", negative: ["expensive_remedy"] } },
  { pattern: /without guarantees/i, token: { suffix: "without guarantees", negative: ["guarantee"] } },
];

const QUESTION_ENDERS = /[?!.]+$/;

function normalizeQuestionText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pushUnique<T>(items: T[], item: T): void {
  if (!items.includes(item)) items.push(item);
}

function unshiftUnique<T>(items: T[], item: T): void {
  if (!items.includes(item)) items.unshift(item);
}

function findTokenAtEnd(input: string): { token: FrameToken; prefix: string } | null {
  for (const entry of TOKEN_PATTERNS) {
    const match = input.match(
      new RegExp(
        `^(.*?)(?:[\\s,]*)(?:please answer\\s+)?(${entry.pattern.source})[\\s,]*[?!.]*\\s*$`,
        entry.pattern.flags,
      ),
    );
    if (match?.[1] !== undefined) {
      return { token: entry.token, prefix: match[1] };
    }
  }
  return null;
}

function stripTrailingSuffixes(rawQuestion: string): { coreQuestion: string; extractedSuffixes: string[]; requestedStyle: QuestionRequestedStyle[]; situationContext: QuestionSituationContext[]; negativeSafetyConstraints: QuestionNegativeSafetyConstraint[] } {
  let remaining = normalizeQuestionText(rawQuestion);
  const extractedSuffixes: string[] = [];
  const requestedStyle: QuestionRequestedStyle[] = [];
  const situationContext: QuestionSituationContext[] = [];
  const negativeSafetyConstraints: QuestionNegativeSafetyConstraint[] = [];

  while (remaining) {
    const token = findTokenAtEnd(remaining);
    if (!token) break;
    extractedSuffixes.unshift(token.token.suffix);
    if (token.token.style) unshiftUnique(requestedStyle, token.token.style);
    if (token.token.context) unshiftUnique(situationContext, token.token.context);
    if (token.token.negative) {
      for (const constraint of token.token.negative) pushUnique(negativeSafetyConstraints, constraint);
    }
    remaining = normalizeQuestionText(token.prefix);
  }

  const coreQuestion = normalizeQuestionText(remaining).replace(QUESTION_ENDERS, (m) => (m.includes("?") ? "?" : m));

  return { coreQuestion, extractedSuffixes, requestedStyle, situationContext, negativeSafetyConstraints };
}

export function parseQuestionFrame(rawQuestion: string): QuestionFrame {
  const raw = typeof rawQuestion === "string" ? rawQuestion : "";
  const normalized = normalizeQuestionText(raw);
  if (!normalized) {
    return {
      rawQuestion: raw,
      coreQuestion: "",
      requestedStyle: [],
      situationContext: [],
      negativeSafetyConstraints: [],
      extractedSuffixes: [],
    };
  }

  const parsed = stripTrailingSuffixes(normalized);

  return {
    rawQuestion: raw,
    coreQuestion: parsed.coreQuestion,
    requestedStyle: parsed.requestedStyle,
    situationContext: parsed.situationContext,
    negativeSafetyConstraints: parsed.negativeSafetyConstraints,
    extractedSuffixes: parsed.extractedSuffixes,
  };
}
