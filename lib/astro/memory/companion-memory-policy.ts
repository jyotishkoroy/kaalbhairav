/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { CompanionMemoryDraft, CompanionMemoryExtractionInput, CompanionMemoryItem, CompanionMemoryRetrievalInput } from "./companion-memory-types";
import { containsSensitiveMemoryContent, normalizeMemoryTopic, redactCompanionMemoryForUserFacingText, sanitizeMemoryDraft } from "./companion-memory-redactor";
import { isAstroMemoryRelevanceGateEnabled } from "../config/feature-flags";

export type MemoryRelevanceDecision = {
  used: boolean;
  relevanceScore: number;
  matchedTopics: string[];
  userFacingSummary?: string;
  internalOnlySummary?: string;
  blockedReason?: "unrelated_topic" | "sensitive" | "stale" | "too_verbose" | "raw_label" | "low_confidence";
};

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

function inferCurrentTopic(input: { memoryTopic?: string | null; currentPrimaryIntent?: string | null; currentSecondaryIntents?: string[]; currentQuestion?: string }): string {
  return normalizeMemoryTopic(input.currentPrimaryIntent ?? input.currentSecondaryIntents?.[0] ?? input.currentQuestion ?? input.memoryTopic ?? null);
}

function scoreTopicMemory(memoryTopic: string, currentTopic: string, question?: string): { score: number; matchedTopics: string[] } {
  if (memoryTopic === currentTopic) return { score: 1, matchedTopics: [currentTopic] };
  const matched: string[] = [];
  if (currentTopic === "money" && memoryTopic === "career" && /job|income|work|salary|promotion/i.test(question ?? "")) return { score: 0.85, matchedTopics: ["money", "career"] };
  if (currentTopic === "career" && memoryTopic === "money" && /money|income|salary/i.test(question ?? "")) return { score: 0.85, matchedTopics: ["career", "money"] };
  if (currentTopic === "family" && memoryTopic === "marriage" && /marri|relationship|spouse|partner/i.test(question ?? "")) return { score: 0.85, matchedTopics: ["family", "marriage"] };
  if (currentTopic === "marriage" && memoryTopic === "family" && /pressure|family|marri|relationship|spouse|partner/i.test(question ?? "")) return { score: 0.85, matchedTopics: ["marriage", "family"] };
  if (topicRelated(memoryTopic, currentTopic)) matched.push(memoryTopic, currentTopic);
  return { score: matched.length ? 0.6 : 0.3, matchedTopics: matched.length ? [...new Set(matched)] : [] };
}

function isStaleMemory(memoryText?: string | null, now?: Date): boolean {
  if (!memoryText || !now) return false;
  const match = memoryText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (!match) return false;
  const ageDays = Math.abs(now.getTime() - new Date(match[1]).getTime()) / (1000 * 60 * 60 * 24);
  return Number.isFinite(ageDays) && ageDays > 365;
}

export function decideCompanionMemoryUse(input: {
  memoryText?: string | null;
  memoryTopic?: string | null;
  currentPrimaryIntent?: string | null;
  currentSecondaryIntents?: string[];
  currentQuestion?: string;
  now?: Date;
}): MemoryRelevanceDecision {
  const memoryText = String(input.memoryText ?? "").trim();
  if (!memoryText) return { used: false, relevanceScore: 0, matchedTopics: [] };
  if (containsSensitiveMemoryContent(memoryText)) return { used: false, relevanceScore: 0, matchedTopics: [], blockedReason: "sensitive" };
  if (/\b(?:previous concern|preference|guidance already given|memory|retrieved memory|companion memory|user memory)\s*:/i.test(memoryText)) {
    const redacted = redactCompanionMemoryForUserFacingText(memoryText);
    return redacted ? { used: false, relevanceScore: 0.1, matchedTopics: [], blockedReason: "raw_label", internalOnlySummary: redacted } : { used: false, relevanceScore: 0, matchedTopics: [], blockedReason: "raw_label" };
  }
  if (memoryText.length > 220) return { used: false, relevanceScore: 0.2, matchedTopics: [], blockedReason: "too_verbose" };
  if (isStaleMemory(memoryText, input.now)) return { used: false, relevanceScore: 0.2, matchedTopics: [], blockedReason: "stale" };

  const currentTopic = inferCurrentTopic(input);
  const memoryTopic = normalizeMemoryTopic(input.memoryTopic ?? memoryText);
  const { score, matchedTopics } = scoreTopicMemory(memoryTopic, currentTopic, input.currentQuestion);
  if (/exact_fact/i.test(input.currentPrimaryIntent ?? "")) {
    return { used: false, relevanceScore: 0, matchedTopics, blockedReason: "low_confidence" };
  }
  if (score < 0.6) return { used: false, relevanceScore: score, matchedTopics, blockedReason: "unrelated_topic" };
  const userFacingSummary = redactCompanionMemoryForUserFacingText(memoryText);
  if (!userFacingSummary) return { used: false, relevanceScore: score, matchedTopics, blockedReason: "raw_label" };
  const used = score >= 0.85;
  return {
    used,
    relevanceScore: score,
    matchedTopics,
    userFacingSummary: used ? userFacingSummary.split(".")[0].trim().slice(0, 140) : undefined,
    internalOnlySummary: userFacingSummary,
    blockedReason: used ? undefined : "low_confidence",
  };
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

export function gateCompanionMemoriesForUserFacingUse(input: {
  memories: CompanionMemoryItem[];
  currentPrimaryIntent?: string | null;
  currentSecondaryIntents?: string[];
  currentQuestion?: string;
  now?: Date;
  env?: Record<string, string | undefined>;
}): { usable: CompanionMemoryItem[]; decisions: MemoryRelevanceDecision[] } {
  const gateEnabled = input.env ? input.env.ASTRO_MEMORY_RELEVANCE_GATE_ENABLED === "true" : isAstroMemoryRelevanceGateEnabled();
  if (!gateEnabled) {
    return { usable: input.memories, decisions: input.memories.map((memory) => ({ used: true, relevanceScore: 1, matchedTopics: [normalizeMemoryTopic(memory.topic)] })) };
  }
  const decisions = input.memories.map((memory) => decideCompanionMemoryUse({ memoryText: memory.content, memoryTopic: memory.topic, currentPrimaryIntent: input.currentPrimaryIntent, currentSecondaryIntents: input.currentSecondaryIntents, currentQuestion: input.currentQuestion, now: input.now }));
  return { usable: input.memories.filter((_, index) => decisions[index]?.used), decisions };
}

export function buildMemorySummary(memories: CompanionMemoryItem[] | { previousReadings?: Array<{ topic: string; summary: string }> } | null | undefined): string {
  if (!memories) return "";
  if (!Array.isArray(memories)) {
    const last = memories.previousReadings?.at(-1);
    if (!last) return "";
    const topic = normalizeMemoryTopic(last.topic);
    return topic === "general"
      ? "Earlier context was general. Keep the answer practical and non-fear-based."
      : `Earlier context involved ${topic}. Keep the answer practical and non-fear-based.`;
  }
  const items = memories.slice(0, 2).map((memory) => {
    const topic = normalizeMemoryTopic(memory.topic);
    const noun = topic === "general" || topic === "unknown" ? "earlier themes" : `${topic} concern`;
    return `${noun}`;
  });
  return `Earlier context: ${[...new Set(items)].join(", ")}.`.slice(0, 180);
}

export function shouldStoreDraft(draft: CompanionMemoryDraft): { allowed: boolean; reason?: string } {
  const sanitized = sanitizeMemoryDraft(draft);
  if (!sanitized) return { allowed: false, reason: "unsafe_draft" };
  if (containsSensitiveMemoryContent(sanitized.content)) return { allowed: false, reason: "sensitive_content" };
  return { allowed: true };
}
