/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { QuestionFrame } from "./question-frame-types";

export type StructuredIntent = {
  primaryIntent:
    | "exact_fact"
    | "career"
    | "money"
    | "business"
    | "relationship"
    | "marriage"
    | "family"
    | "education"
    | "foreign_settlement"
    | "remedy"
    | "sleep"
    | "health_adjacent"
    | "death_lifespan"
    | "legal"
    | "financial_risk"
    | "vague"
    | "general";
  secondaryIntents: string[];
  mode: "exact_fact" | "interpretive" | "timing" | "remedy" | "follow_up" | "safety";
  confidence: "low" | "medium" | "high";
  routedFrom: "core_question" | "fallback_raw_question";
};

export type StructuredIntentInput = {
  rawQuestion: string;
  questionFrame?: QuestionFrame;
};
