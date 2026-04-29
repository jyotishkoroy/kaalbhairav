/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { UserConcern } from "@/lib/astro/reading/reading-types";

export type AstroInterpretationContext = {
  concern: UserConcern;
  chart?: unknown;
  dasha?: unknown;
  transits?: unknown;
  profile?: unknown;
  metadata?: Record<string, unknown>;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getRecordField(
  source: unknown,
  key: string,
): Record<string, unknown> | undefined {
  if (!isRecord(source)) return undefined;

  const value = source[key];
  return isRecord(value) ? value : undefined;
}

export function getStringField(
  source: unknown,
  keys: string[],
): string | undefined {
  if (!isRecord(source)) return undefined;

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

export function getArrayField<T = unknown>(source: unknown, keys: string[]): T[] {
  if (!isRecord(source)) return [];

  for (const key of keys) {
    const value = source[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

export function matchesAny(
  value: string | undefined,
  candidates: string[],
): boolean {
  if (!value) return false;

  const lower = value.toLowerCase();

  return candidates.some((candidate) => lower.includes(candidate.toLowerCase()));
}

export function getMahadasha(ctx: AstroInterpretationContext): string | undefined {
  return (
    getStringField(ctx.dasha, ["mahadasha", "mahaDasha", "major", "majorDasha"]) ??
    getStringField(getRecordField(ctx.dasha, "current"), [
      "mahadasha",
      "mahaDasha",
      "major",
      "majorDasha",
    ]) ??
    getStringField(ctx.chart, ["mahadasha", "mahaDasha", "currentDasha"])
  );
}

export function getAntardasha(ctx: AstroInterpretationContext): string | undefined {
  return (
    getStringField(ctx.dasha, ["antardasha", "antarDasha", "minor", "minorDasha"]) ??
    getStringField(getRecordField(ctx.dasha, "current"), [
      "antardasha",
      "antarDasha",
      "minor",
      "minorDasha",
    ]) ??
    getStringField(ctx.chart, ["antardasha", "antarDasha", "currentAntardasha"])
  );
}

export function getMoonSign(ctx: AstroInterpretationContext): string | undefined {
  return (
    getStringField(ctx.chart, ["moonSign", "moon_sign", "rasi", "rashi"]) ??
    getStringField(getRecordField(ctx.chart, "summary"), [
      "moonSign",
      "moon_sign",
      "rasi",
      "rashi",
    ])
  );
}

export function getLagna(ctx: AstroInterpretationContext): string | undefined {
  return (
    getStringField(ctx.chart, ["lagna", "ascendant", "asc"]) ??
    getStringField(getRecordField(ctx.chart, "summary"), ["lagna", "ascendant", "asc"])
  );
}
