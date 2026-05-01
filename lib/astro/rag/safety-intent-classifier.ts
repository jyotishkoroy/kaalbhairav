/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { QuestionFrame } from "./question-frame-types";
import type { StructuredIntent } from "./structured-intent-types";
import { selectGradedSafetyAction } from "./safety-policy";
import type { SafetyDecision, SafetyIntentInput, SafetyRisk } from "./safety-intent-types";
import { hasNegatedUnsafePhrase, normalizeText, textIncludesLoose } from "./validators/validator-utils";

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => textIncludesLoose(text, term));
}

function exactFactIntent(structuredIntent?: StructuredIntent): boolean {
  return structuredIntent?.primaryIntent === "exact_fact" || structuredIntent?.mode === "exact_fact";
}

function classifyRisk(text: string, structuredIntent?: StructuredIntent): SafetyRisk | null {
  if (structuredIntent?.primaryIntent === "death_lifespan" || hasAny(text, ["when will i die", "how long will i live", "death date", "lifespan", "death timing", "fatal accident", "death period", "die soon", "will my family member die", "death in my family"])) return "death_lifespan";
  if (structuredIntent?.primaryIntent === "legal" || hasAny(text, ["court case", "legal advice", "win my case", "guarantee my court case result", "will i go to jail", "contract"])) return "legal";
  if (structuredIntent?.primaryIntent === "financial_risk" || hasAny(text, ["invest all my savings", "financial guarantee", "business profit", "guaranteed profit", "100% return", "stock", "crypto", "lottery", "become rich"])) return "financial";
  if (structuredIntent?.primaryIntent === "health_adjacent" || hasAny(text, ["diagnose my disease", "stop medical treatment", "stop medication", "replace treatment", "medical advice", "cure diabetes"])) return "medical";
  if (hasAny(text, ["gemstone", "puja", "ritual", "fix all my problems", "mandatory puja", "expensive puja"])) return "expensive_remedy_pressure";
  if (hasAny(text, ["suicide", "self harm", "kill myself", "end my life", "i want to die"])) return "self_harm";
  if (hasAny(text, ["cursed", "curse", "doomed", "bad chart", "ruined destiny", "destiny ruined"])) return "curse_fear";
  if (hasAny(text, ["exact prediction", "exactly when", "definitely", "guarantee", "sure shot", "without guessing", "death timing"])) return "deterministic_prediction";
  return null;
}

function decisionReason(risk: SafetyRisk, activation: string): string {
  return `${risk}:${activation}`;
}

function activationFromFrame(frame?: QuestionFrame, structuredIntent?: StructuredIntent): SafetyDecision["activation"] {
  if (structuredIntent?.routedFrom === "core_question" || frame?.coreQuestion) return "actual_user_request";
  return "none";
}

export function classifySafetyIntent(input: SafetyIntentInput): SafetyDecision[] {
  const raw = typeof input.rawQuestion === "string" ? input.rawQuestion : "";
  const answerText = typeof input.answerText === "string" ? input.answerText : "";
  const frame = input.questionFrame;
  const structuredIntent = input.structuredIntent;
  const normalizedCore = normalizeText(frame?.coreQuestion ?? raw);
  const normalizedAnswer = normalizeText(answerText);
  const exactFact = exactFactIntent(structuredIntent);
  const coreRisk = classifyRisk(normalizedCore, structuredIntent);
  const negativeConstraintOnly = Boolean(frame && frame.negativeSafetyConstraints.length > 0 && exactFact && !coreRisk);
  const hasNegativeConstraintText = /without/i.test(raw);
  const activation = frame?.negativeSafetyConstraints.length || hasNegativeConstraintText ? "negative_constraint" : activationFromFrame(frame, structuredIntent);
  const textForRisk = `${normalizedCore} ${normalizedAnswer}`;
  const risk = classifyRisk(textForRisk, structuredIntent);
  if (!risk) {
    if (exactFact && frame?.requestedStyle.includes("verifiable_facts_only")) {
      return [{ risk: "deterministic_prediction", activation: negativeConstraintOnly ? "negative_constraint" : "actual_user_request", action: "allow", reason: "exact_fact_verifiable" }];
    }
    if (frame?.negativeSafetyConstraints.length || /without /i.test(raw)) {
      return [
        {
          risk: "deterministic_prediction",
          activation: negativeConstraintOnly ? "negative_constraint" : "actual_user_request",
          action: exactFact ? "allow" : "append_boundary",
          reason: "benign_negative_constraint",
        },
      ];
    }
    return [];
  }

  const severe = hasAny(textForRisk, [
    "stop treatment and only chant this mantra",
    "you will definitely become rich",
    "you will die at age",
    "will die at age",
    "replace treatment",
    "diagnose my disease",
    "guarantee my court case",
    "should i invest all my savings now",
    "gemstone will fix all my problems",
    "this gemstone will fix all your problems",
  ]) || Boolean(answerText) && hasAny(normalizedAnswer, ["will definitely", "guarantee", "cure diabetes", "replace treatment", "win your case", "die at age", "fix all my problems"]) && !hasNegatedUnsafePhrase(answerText, "guarantee");
  const hasUnsafeSentence = Boolean(answerText) && (hasAny(normalizedAnswer, ["will definitely", "guarantee", "cure diabetes", "replace treatment", "win your case", "die at age", "fix all my problems"]) && !hasNegatedUnsafePhrase(answerText, "guarantee"));
  const hasUnsafeSection = hasAny(normalizedAnswer, ["safety response", "remedy", "direct answer"]) && hasUnsafeSentence;
  const action = selectGradedSafetyAction(risk, activation, { exactFact, severe, hasUnsafeSentence, hasUnsafeSection });

  return [
    {
      risk,
      activation,
      action,
      reason: decisionReason(risk, activation),
    },
  ];
}
