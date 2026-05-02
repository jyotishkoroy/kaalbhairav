/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type ConsultationIntentPrimary =
  | "exact_fact"
  | "interpretation"
  | "decision_support"
  | "timing"
  | "remedy"
  | "emotional_support";

export type ConsultationLifeArea =
  | "career"
  | "marriage"
  | "relationship"
  | "money"
  | "family"
  | "health"
  | "spirituality"
  | "general";

export type ConsultationConfidence = "low" | "medium" | "high";

export type ChartEvidenceDomain =
  | "career"
  | "marriage"
  | "relationship"
  | "money"
  | "health"
  | "family"
  | "general";

export type ChartEvidenceSource = "rashi" | "navamsa" | "dasha" | "transit" | "derived_rule";

export type ChartEvidenceFactorPolarity = "supportive" | "challenging" | "neutral";

export type ConsultationEmotionalPrimary =
  | "fear"
  | "anxiety"
  | "confusion"
  | "grief"
  | "anger"
  | "hope"
  | "comparison"
  | "exhaustion"
  | "neutral";

export type ConsultationToneNeeded =
  | "direct"
  | "gentle"
  | "grounding"
  | "analytical"
  | "reassuring";

export type ConsultationRiskTolerance = "low" | "medium" | "high" | "unknown";

export type ConsultationReligiousComfort = "low" | "medium" | "high" | "unknown";

export type ConsultationChartFactSet = {
  readonly source: "not_loaded" | "profile" | "calculation" | "test_fixture";
  readonly facts: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly value: string;
    readonly confidence?: ConsultationConfidence;
  }>;
};

export type PatternRecognitionResult = {
  readonly dominantPattern: string;
  readonly likelyLifeExpression?: string;
  readonly confidence: ConsultationConfidence;
};

export type TimingJudgement = {
  readonly status:
    | "supportive"
    | "mixed"
    | "heavy"
    | "unstable"
    | "clarifying"
    | "delayed"
    | "preparatory";
  readonly currentPeriodMeaning: string;
  readonly recommendedAction:
    | "proceed"
    | "prepare"
    | "wait"
    | "review"
    | "avoid_impulsive_decision"
    | "seek_more_information";
  readonly confidence: ConsultationConfidence;
};

export type RemedyPlan = {
  readonly level: 0 | 1 | 2 | 3 | 4 | 5;
  readonly levelMeaning:
    | "none"
    | "behavioral"
    | "light_spiritual"
    | "traditional"
    | "formal_ritual"
    | "gemstone_caution";
  readonly remedies: ReadonlyArray<{
    readonly type:
      | "behavioral"
      | "lifestyle"
      | "spiritual"
      | "service"
      | "mantra"
      | "ritual"
      | "gemstone_warning";
    readonly instruction: string;
    readonly reason: string;
    readonly duration?: string;
    readonly cost: "free" | "low" | "medium" | "high";
    readonly optional: boolean;
  }>;
  readonly avoid: readonly string[];
};

export type ConsultationResponsePlan = {
  readonly mode:
    | "exact_fact"
    | "interpretive_consultation"
    | "decision_support"
    | "timing_guidance"
    | "remedy_guidance"
    | "emotional_support";
  readonly userNeed: string;
};
