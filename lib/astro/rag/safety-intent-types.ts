/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { QuestionFrame } from "./question-frame-types";
import type { StructuredIntent } from "./structured-intent-types";

export type SafetyActivation =
  | "actual_user_request"
  | "negative_constraint"
  | "quoted_or_instructional"
  | "metadata"
  | "none";

export type SafetyAction =
  | "allow"
  | "append_boundary"
  | "remove_forbidden_sentence"
  | "rewrite_section"
  | "replace_answer";

export type SafetyRisk =
  | "medical"
  | "legal"
  | "financial"
  | "death_lifespan"
  | "expensive_remedy_pressure"
  | "deterministic_prediction"
  | "self_harm"
  | "curse_fear";

export type SafetyDecision = {
  risk: SafetyRisk;
  activation: SafetyActivation;
  action: SafetyAction;
  reason: string;
};

export type SafetyIntentInput = {
  rawQuestion: string;
  coreQuestion?: string;
  questionFrame?: QuestionFrame;
  structuredIntent?: StructuredIntent;
  answerText?: string;
};
