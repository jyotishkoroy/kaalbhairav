/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { SafetyAction, SafetyDecision, SafetyRisk } from "./safety-intent-types";

export function selectGradedSafetyAction(risk: SafetyRisk, activation: SafetyDecision["activation"], context: { exactFact?: boolean; severe?: boolean; hasUnsafeSentence?: boolean; hasUnsafeSection?: boolean }): SafetyAction {
  if (context.severe) return "replace_answer";
  if (context.hasUnsafeSentence) return "remove_forbidden_sentence";
  if (context.hasUnsafeSection) return "rewrite_section";
  if (activation === "negative_constraint" && context.exactFact && (risk === "medical" || risk === "legal" || risk === "financial" || risk === "death_lifespan")) {
    return "allow";
  }
  if (activation === "negative_constraint") return "append_boundary";
  if (risk === "curse_fear") return "append_boundary";
  return "replace_answer";
}

export function safetyBoundaryForRisk(risk: SafetyRisk): string {
  switch (risk) {
    case "medical":
      return "I’ll keep this to grounded chart facts and won’t treat astrology as medical diagnosis or treatment advice.";
    case "legal":
      return "I’ll keep this to grounded chart facts and won’t present astrology as legal advice or a case guarantee.";
    case "financial":
      return "I’ll keep this to grounded chart facts and won’t present astrology as financial advice or a profit guarantee.";
    case "death_lifespan":
      return "I won’t predict death, lifespan, or death timing.";
    case "expensive_remedy_pressure":
      return "I’ll avoid expensive or coercive remedy pressure and keep remedies optional.";
    case "deterministic_prediction":
      return "I’ll avoid exact deterministic timing claims and keep the answer grounded.";
    case "self_harm":
      return "I can’t help with self-harm content.";
    case "curse_fear":
      return "I’ll avoid fear-based fatalism and keep the reading grounded.";
  }
}
