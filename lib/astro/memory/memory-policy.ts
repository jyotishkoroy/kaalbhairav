/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { AstrologyUserMemory } from "@/lib/astro/memory/memory-types";

const SENSITIVE_PATTERNS = [
  /\b(suicide|kill myself|end my life|self harm|self-harm)\b/i,
  /\b(cancer|diagnosis|pregnant|pregnancy|serious disease)\b/i,
  /\b(death date|when will i die|lifespan|life span)\b/i,
];

export function shouldStoreQuestionInMemory(question: string): boolean {
  if (!question.trim()) return false;

  return !SENSITIVE_PATTERNS.some((pattern) => pattern.test(question));
}

export function sanitizeMemorySummary(summary: string): string {
  return summary
    .replace(/\s+/g, " ")
    .replace(/\b(cancer|suicide|kill myself|death date)\b/gi, "[sensitive]")
    .trim()
    .slice(0, 500);
}

export function capMemory(memory: AstrologyUserMemory): AstrologyUserMemory {
  return {
    ...memory,
    mainConcerns: Array.from(new Set(memory.mainConcerns)).slice(-10),
    emotionalPatterns: memory.emotionalPatterns.slice(-20),
    previousReadings: memory.previousReadings.slice(-20),
  };
}
