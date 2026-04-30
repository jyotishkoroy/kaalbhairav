// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerValidationInput, ValidationIssue } from "../validation-types";
import { buildIssue, normalizeText, textIncludesLoose } from "./validator-utils";

function sentencePieces(text: string): string[] {
  return text.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
}

function dedupeAdjacentTerms(text: string): string {
  const words = text.split(/\s+/);
  const output: string[] = [];
  for (const word of words) {
    const prev = output[output.length - 1];
    if (prev && prev.toLowerCase() === word.toLowerCase()) continue;
    output.push(word);
  }
  return output.join(" ");
}

export function validateGenericness(input: AnswerValidationInput): {
  issues: ValidationIssue[];
  genericnessScore: number;
} {
  const answer = input.answer ?? "";
  const normalizedAnswer = dedupeAdjacentTerms(answer);
  const lower = normalizeText(normalizedAnswer);
  const issues: ValidationIssue[] = [];
  let score = 0;
  const mode = input.contract.answerMode;

  if (!answer.trim()) {
    return {
      issues: [buildIssue("generic_answer", "error", "Answer is empty.", "missing_answer")],
      genericnessScore: 1,
    };
  }

  const shortInterpretive = mode !== "exact_fact" && mode !== "safety" && mode !== "followup" && mode !== "fallback" && input.contract.canUseGroq && answer.trim().length < 80;
  if (shortInterpretive) {
    score += 0.35;
    issues.push(buildIssue("too_short", "warning", "Interpretive answer is too short.", answer.slice(0, 80)));
  }

  const genericPhrases = ["work hard", "stay positive", "things will improve", "trust the process", "good things are coming", "be patient"];
  const genericHits = genericPhrases.filter((phrase) => textIncludesLoose(normalizedAnswer, phrase));
  if (genericHits.length) {
    score += 0.4;
    issues.push(buildIssue("generic_answer", "warning", "Answer relies on generic advice.", genericHits[0]));
  }

  if (!input.contract.anchors?.some((anchor) => anchor.required && textIncludesLoose(normalizedAnswer, anchor.key))) {
    score += 0.2;
  }

  if (!/(direct answer|chart basis|reasoning|what to do|safe remedies|limitations|accuracy|follow up|suggested follow up|safety response)/i.test(normalizedAnswer)) {
    score += 0.1;
  }

  const sentences = sentencePieces(normalizedAnswer);
  if (sentences.length > 1) {
    const dup = sentences.find((sentence, index) => sentences.indexOf(sentence) !== index);
    if (dup) {
      score += 0.3;
      issues.push(buildIssue("too_repetitive", "error", "Sentence is repeated.", dup));
    }
  }

  const repeatedPhrases = new Map<string, number>();
  for (const phrase of lower.split(/\s{2,}|[,;]/g)) {
    const key = phrase.trim();
    if (!key) continue;
    repeatedPhrases.set(key, (repeatedPhrases.get(key) ?? 0) + 1);
  }
  for (const [phrase, count] of repeatedPhrases) {
    if (count >= 3) {
      score += 0.3;
      issues.push(buildIssue("too_repetitive", "error", "Phrase is repeated too many times.", phrase));
      break;
    }
  }

  const domain = input.contract.domain;
  const domainHints: Record<string, string[]> = {
    career: ["career", "job", "promotion", "work", "status"],
    sleep: ["sleep", "rest", "bed", "insomnia"],
    marriage: ["marriage", "spouse", "partner", "relationship"],
    money: ["money", "income", "finance", "wealth"],
    safety: ["cannot", "can't", "do not", "not"],
    timing: ["timing", "window", "date", "month"],
  };
  const hints = domainHints[domain] ?? [];
  if (hints.length && !hints.some((hint) => textIncludesLoose(answer, hint))) {
    score += 0.2;
    issues.push(buildIssue("does_not_answer_question", "warning", "Answer does not address the expected domain.", domain));
  }

  const remedyLike = /(mantra|breath|breathing|routine|sleep hygiene|remedy|optional)/i.test(normalizedAnswer);
  if (mode === "interpretive" && score >= 0.55 && !(input.contract.remedyAllowed && remedyLike)) {
    issues.push(buildIssue("generic_answer", "error", "Answer is too generic for an interpretive response.", answer.slice(0, 120)));
  }

  const deduped: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const issue of issues) {
    const key = JSON.stringify(issue);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(issue);
  }
  return {
    issues: deduped,
    genericnessScore: Math.max(0, Math.min(1, Number(score.toFixed(2)))),
  };
}
