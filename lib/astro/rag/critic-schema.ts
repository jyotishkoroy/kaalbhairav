// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

export type LocalCriticResult = {
  ok: boolean;
  safe: boolean;
  grounded: boolean;
  specific: boolean;
  compassionate: boolean;
  feelsHeardScore: number;
  genericnessScore: number;
  fearBasedScore: number;
  groundingScore: number;
  specificityScore: number;
  practicalValueScore: number;
  missingRequiredElements: string[];
  unsafeClaims: string[];
  inventedFacts: string[];
  unsupportedTimingClaims: string[];
  unsupportedRemedies: string[];
  genericPhrases: string[];
  emotionalGaps: string[];
  rewriteInstructions: string[];
  shouldRewrite: boolean;
  shouldFallback: boolean;
  source: "ollama" | "skipped" | "fallback";
  rejectedReason?: string;
  warnings: string[];
  answersQuestion: boolean;
  tooGeneric: boolean;
  missingAnchors: string[];
  missingSections: string[];
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
    ok: true,
    safe: true,
    grounded: true,
    specific: true,
    compassionate: true,
    feelsHeardScore: 0.5,
    genericnessScore: 0.5,
    fearBasedScore: 0,
    groundingScore: 0.5,
    specificityScore: 0.5,
    practicalValueScore: 0.5,
    missingRequiredElements: [],
    unsafeClaims: [],
    inventedFacts: [],
    unsupportedTimingClaims: [],
    unsupportedRemedies: [],
    genericPhrases: [],
    emotionalGaps: [],
    rewriteInstructions: [],
    shouldRewrite: false,
    shouldFallback: false,
    source: "fallback",
    warnings: [],
    answersQuestion: false,
    tooGeneric: false,
    missingAnchors: [],
    missingSections: [],
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
  const source = raw.source === "ollama" || raw.source === "skipped" || raw.source === "fallback" ? raw.source : "fallback";
  return {
    ok: true,
    value: {
      ok: typeof raw.ok === "boolean" ? raw.ok : true,
      safe: typeof raw.safe === "boolean" ? raw.safe : true,
      grounded: typeof raw.grounded === "boolean" ? raw.grounded : true,
      specific: typeof raw.specific === "boolean" ? raw.specific : true,
      compassionate: typeof raw.compassionate === "boolean" ? raw.compassionate : true,
      feelsHeardScore: clamp01(raw.feelsHeardScore),
      genericnessScore: clamp01(raw.genericnessScore ?? raw.genericness),
      fearBasedScore: clamp01(raw.fearBasedScore),
      groundingScore: clamp01(raw.groundingScore),
      specificityScore: clamp01(raw.specificityScore),
      practicalValueScore: clamp01(raw.practicalValueScore),
      missingRequiredElements: normalizeStringArray(raw.missingRequiredElements),
      unsafeClaims: normalizeStringArray(raw.unsafeClaims),
      inventedFacts: normalizeStringArray(raw.inventedFacts),
      unsupportedTimingClaims: normalizeStringArray(raw.unsupportedTimingClaims),
      unsupportedRemedies: normalizeStringArray(raw.unsupportedRemedies),
      genericPhrases: normalizeStringArray(raw.genericPhrases),
      emotionalGaps: normalizeStringArray(raw.emotionalGaps),
      rewriteInstructions: normalizeStringArray(raw.rewriteInstructions),
      shouldRewrite: typeof raw.shouldRewrite === "boolean" ? raw.shouldRewrite : Boolean(raw.shouldRetry),
      shouldFallback: typeof raw.shouldFallback === "boolean" ? raw.shouldFallback : false,
      source,
      rejectedReason: normalizeString(raw.rejectedReason, 300) || undefined,
      warnings: normalizeStringArray(raw.warnings),
      answersQuestion: typeof raw.answersQuestion === "boolean" ? raw.answersQuestion : false,
      tooGeneric: typeof raw.tooGeneric === "boolean" ? raw.tooGeneric : false,
      missingAnchors: normalizeStringArray(raw.missingAnchors),
      missingSections: normalizeStringArray(raw.missingSections),
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
