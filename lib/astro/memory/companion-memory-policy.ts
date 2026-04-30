/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { CompanionMemoryDraft, CompanionMemoryExtractionInput, CompanionMemoryItem, CompanionMemoryRetrievalInput } from "./companion-memory-types";
import { containsSensitiveMemoryContent, normalizeMemoryTopic, sanitizeMemoryDraft } from "./companion-memory-redactor";

export function isCompanionMemoryEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.ASTRO_COMPANION_MEMORY_ENABLED === "true";
}

export function isCompanionMemoryRetrieveEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return isCompanionMemoryEnabled(env) && env.ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED === "true";
}

export function isCompanionMemoryWriteEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return isCompanionMemoryEnabled(env) && env.ASTRO_COMPANION_MEMORY_WRITE_ENABLED === "true";
}

export function getCompanionMemoryMaxItems(env: Record<string, string | undefined> = process.env): number {
  const raw = Number.parseInt(env.ASTRO_COMPANION_MEMORY_MAX_ITEMS ?? "8", 10);
  if (!Number.isFinite(raw) || raw <= 0) return 8;
  return Math.min(raw, 12);
}

function topicRelated(a?: string | null, b?: string | null): boolean {
  const left = normalizeMemoryTopic(a);
  const right = normalizeMemoryTopic(b);
  if (left === right) return true;
  return (
    (left === "relationship" && right === "marriage") ||
    (left === "marriage" && right === "relationship") ||
    (left === "career" && right === "money") ||
    (left === "money" && right === "career") ||
    (left === "remedy" && (right === "health" || right === "spirituality")) ||
    (right === "remedy" && (left === "health" || left === "spirituality"))
  );
}

export function shouldRetrieveCompanionMemory(input: CompanionMemoryRetrievalInput): { allowed: boolean; reason?: string; maxItems: number } {
  const maxItems = Math.min(input.maxItems ?? getCompanionMemoryMaxItems(input.env), 12);
  if (!isCompanionMemoryRetrieveEnabled(input.env)) return { allowed: false, reason: "companion_memory_disabled", maxItems };
  if (!input.userId) return { allowed: false, reason: "missing_user_id", maxItems };
  return { allowed: true, maxItems };
}

export function shouldStoreCompanionMemory(input: CompanionMemoryExtractionInput): { allowed: boolean; reason?: string } {
  if (!isCompanionMemoryWriteEnabled(input.env)) return { allowed: false, reason: "companion_memory_disabled" };
  if (!input.userId) return { allowed: false, reason: "missing_user_id" };
  const sensitive = containsSensitiveMemoryContent(`${input.question} ${input.finalAnswer}`);
  if (sensitive) return { allowed: false, reason: "sensitive_content" };
  return { allowed: true };
}

export function filterRetrievedMemories(input: { memories: CompanionMemoryItem[]; topic?: string | null; question?: string; maxItems?: number; includeLowConfidence?: boolean }): CompanionMemoryItem[] {
  const target = normalizeMemoryTopic(input.topic ?? input.question ?? null);
  const relevant = input.memories.filter((memory) => !memory.archivedAt && (input.includeLowConfidence || memory.confidence !== "low") && !containsSensitiveMemoryContent(memory.content));
  const sorted = relevant.sort((a, b) => {
    const aScore = normalizeMemoryTopic(a.topic) === target ? 2 : topicRelated(a.topic, target) ? 1 : 0;
    const bScore = normalizeMemoryTopic(b.topic) === target ? 2 : topicRelated(b.topic, target) ? 1 : 0;
    if (aScore !== bScore) return bScore - aScore;
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });
  return sorted.slice(0, Math.min(input.maxItems ?? 8, 12));
}

export function buildMemorySummary(memories: CompanionMemoryItem[] | { previousReadings?: Array<{ topic: string; summary: string }> } | null | undefined): string {
  if (!memories) return "";
  if (!Array.isArray(memories)) {
    const last = memories.previousReadings?.at(-1);
    if (!last) return "";
    const topic = normalizeMemoryTopic(last.topic);
    return `Previous concern: ${topic === "general" ? "general guidance" : `${topic} guidance`}. Preference: practical, non-fear-based guidance.`.slice(0, 180);
  }
  const items = memories.slice(0, 3).map((memory) => {
    const topic = normalizeMemoryTopic(memory.topic);
    const noun = topic === "general" || topic === "unknown" ? "earlier themes" : `${topic} concern`;
    return `Previous concern: ${noun}.`;
  });
  return [...new Set(items)].join(" ").slice(0, 180);
}

export function shouldStoreDraft(draft: CompanionMemoryDraft): { allowed: boolean; reason?: string } {
  const sanitized = sanitizeMemoryDraft(draft);
  if (!sanitized) return { allowed: false, reason: "unsafe_draft" };
  if (containsSensitiveMemoryContent(sanitized.content)) return { allowed: false, reason: "sensitive_content" };
  return { allowed: true };
}
