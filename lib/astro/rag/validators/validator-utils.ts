// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerContract } from "../answer-contract-types";
import type { RetrievalContext } from "../retrieval-types";
import type { ReasoningPath } from "../reasoning-path-builder";
import type { TimingContext } from "../timing-engine";
import type { ValidationIssue, ValidationIssueCode, ValidationSeverity } from "../validation-types";

export function normalizeText(value: string): string {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeKey(value: string): string {
  return normalizeText(value).replace(/\s+/g, "_");
}

export function textIncludesLoose(text: string, needle: string): boolean {
  const hay = normalizeText(text);
  const want = normalizeText(needle);
  if (!hay || !want) return false;
  if (hay.includes(want)) return true;
  const compactHay = hay.replace(/\s+/g, "");
  const compactNeedle = want.replace(/\s+/g, "");
  return compactHay.includes(compactNeedle);
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) continue;
    const key = normalizeText(text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function extractAnswerText(input: { answer?: string; json?: { answer?: string; sections?: Record<string, string> } | null }): string {
  const answer = typeof input?.answer === "string" ? input.answer.trim() : "";
  if (answer) return answer;
  const jsonAnswer = typeof input?.json?.answer === "string" ? input.json.answer.trim() : "";
  if (jsonAnswer) return jsonAnswer;
  const sections = input?.json?.sections ?? {};
  return Object.values(sections).find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function anchorTexts(contract: AnswerContract): string[] {
  const out: string[] = [];
  for (const anchor of contract.anchors ?? []) {
    out.push(anchor.key, anchor.label, anchor.description, ...(anchor.factKeys ?? []), ...(anchor.ruleKeys ?? []));
  }
  return uniqueStrings(out);
}

function factTexts(context: RetrievalContext): string[] {
  const out: string[] = [];
  for (const fact of context.chartFacts ?? []) {
    out.push(fact.factKey, fact.factType, fact.factValue, fact.planet ?? "", fact.sign ?? "", fact.house ? `house ${fact.house}` : "", fact.house ? `${fact.house}th house` : "");
  }
  return uniqueStrings(out);
}

function reasoningTexts(reasoningPath: ReasoningPath): string[] {
  const out: string[] = [];
  for (const step of reasoningPath.steps ?? []) {
    out.push(step.id, step.label, step.explanation, ...(step.factKeys ?? []), ...(step.ruleKeys ?? []));
  }
  out.push(reasoningPath.summary, ...(reasoningPath.missingAnchors ?? []), ...(reasoningPath.warnings ?? []));
  return uniqueStrings(out);
}

function timingTexts(timing: TimingContext): string[] {
  const out: string[] = [];
  for (const window of timing.windows ?? []) {
    out.push(window.label, window.interpretation, window.startsOn ?? "", window.endsOn ?? "", ...(window.factKeys ?? []));
  }
  out.push(timing.limitation ?? "");
  return uniqueStrings(out);
}

export function collectAllowedAnchorKeys(contract: AnswerContract, context: RetrievalContext, reasoningPath: ReasoningPath, timing: TimingContext): string[] {
  return uniqueStrings([
    ...(contract.anchors ?? []).map((anchor) => anchor.key),
    ...(contract.anchors ?? []).map((anchor) => anchor.label),
    ...anchorTexts(contract),
    ...factTexts(context),
    ...reasoningTexts(reasoningPath),
    ...timingTexts(timing),
  ].map(normalizeKey));
}

export function collectAllowedFactSnippets(context: RetrievalContext, reasoningPath: ReasoningPath, timing: TimingContext): string[] {
  return uniqueStrings([...factTexts(context), ...reasoningTexts(reasoningPath), ...timingTexts(timing)]);
}

export function collectAllowedTimingDates(timing: TimingContext): string[] {
  return uniqueStrings((timing.windows ?? []).flatMap((window) => [window.startsOn ?? "", window.endsOn ?? ""]).filter(Boolean));
}

export function hasNegatedUnsafePhrase(text: string, phrase: string): boolean {
  const hay = normalizeText(text);
  const needle = normalizeText(phrase);
  if (!hay || !needle) return false;
  const negations = ["cannot", "can't", "do not", "don't", "not", "no", "unable to", "should not", "must not"];
  const index = hay.indexOf(needle);
  if (index < 0) return false;
  const start = Math.max(0, index - 40);
  const prefix = hay.slice(start, index);
  return negations.some((neg) => prefix.includes(neg));
}

export function buildIssue(code: ValidationIssueCode, severity: ValidationSeverity, message: string, evidence?: string): ValidationIssue {
  return { code, severity, message, evidence };
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
