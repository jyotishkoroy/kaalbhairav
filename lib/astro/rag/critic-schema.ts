// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

export type LocalCriticResult = {
  answersQuestion: boolean;
  tooGeneric: boolean;
  missingAnchors: string[];
  missingSections: string[];
  unsafeClaims: string[];
  wrongFacts: string[];
  companionToneScore: number;
  shouldRetry: boolean;
  correctionInstruction: string;
};

export type LocalCriticValidationResult =
  | { ok: true; value: LocalCriticResult }
  | { ok: false; error: string };

function clamp01(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = item.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function normalizeString(value: unknown, max = 1200): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? text.slice(0, max) : text;
}

export function buildDefaultCriticResult(overrides: Partial<LocalCriticResult> = {}): LocalCriticResult {
  return {
    answersQuestion: false,
    tooGeneric: false,
    missingAnchors: [],
    missingSections: [],
    unsafeClaims: [],
    wrongFacts: [],
    companionToneScore: 0.5,
    shouldRetry: false,
    correctionInstruction: "",
    ...overrides,
  };
}

export function validateLocalCriticResult(value: unknown): LocalCriticValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "invalid_critic_object" };
  const raw = value as Record<string, unknown>;
  return {
    ok: true,
    value: {
      answersQuestion: typeof raw.answersQuestion === "boolean" ? raw.answersQuestion : false,
      tooGeneric: typeof raw.tooGeneric === "boolean" ? raw.tooGeneric : false,
      missingAnchors: normalizeStringArray(raw.missingAnchors),
      missingSections: normalizeStringArray(raw.missingSections),
      unsafeClaims: normalizeStringArray(raw.unsafeClaims),
      wrongFacts: normalizeStringArray(raw.wrongFacts),
      companionToneScore: clamp01(raw.companionToneScore),
      shouldRetry: typeof raw.shouldRetry === "boolean" ? raw.shouldRetry : false,
      correctionInstruction: normalizeString(raw.correctionInstruction, 1200),
    },
  };
}

export function normalizeLocalCriticResult(value: unknown): LocalCriticResult | null {
  const validated = validateLocalCriticResult(value);
  return validated.ok ? validated.value : null;
}
