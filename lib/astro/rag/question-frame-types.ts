/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type QuestionRequestedStyle =
  | "practical_guidance"
  | "fear_free"
  | "bounded_certainty"
  | "compassionate_grounded"
  | "no_guarantees"
  | "verifiable_facts_only"
  | "one_next_step"
  | "no_expensive_remedies"
  | "emotional_acknowledgement"
  | "non_generic"
  | "concise";

export type QuestionSituationContext =
  | "next_month"
  | "this_year"
  | "anxious"
  | "family_pressure"
  | "stuck"
  | "old_behavior_safe"
  | "no_exact_timing"
  | "follow_up_if_needed";

export type QuestionNegativeSafetyConstraint =
  | "medical"
  | "legal"
  | "financial"
  | "exact_timing"
  | "expensive_remedy"
  | "fear_based_language"
  | "guarantee";

export type QuestionFrame = {
  rawQuestion: string;
  coreQuestion: string;
  requestedStyle: QuestionRequestedStyle[];
  situationContext: QuestionSituationContext[];
  negativeSafetyConstraints: QuestionNegativeSafetyConstraint[];
  extractedSuffixes: string[];
};
