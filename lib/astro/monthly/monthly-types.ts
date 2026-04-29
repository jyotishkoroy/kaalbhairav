/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { ReadingTopic } from "@/lib/astro/interpretation/evidence";

export type MonthlyGuidance = {
  month: string;
  mainTheme: string;
  emotionalTheme: string;
  careerFocus: string;
  relationshipFocus: string;
  avoid: string[];
  doMoreOf: string[];
  remedy: string;
};

export type MonthlyGuidanceInput = {
  month?: string;
  topic?: ReadingTopic;
  chart?: unknown;
  dasha?: unknown;
  transits?: unknown;
  question?: string;
};

export type MonthlyGuidanceTheme =
  | "discipline"
  | "growth"
  | "communication"
  | "emotional_clarity"
  | "relationship_balance"
  | "financial_stability"
  | "wellbeing"
  | "general";

export type MonthlyActionSet = {
  mainTheme: string;
  emotionalTheme: string;
  careerFocus: string;
  relationshipFocus: string;
  avoid: string[];
  doMoreOf: string[];
  remedy: string;
};
