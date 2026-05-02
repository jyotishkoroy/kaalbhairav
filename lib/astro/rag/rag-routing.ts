/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { parseQuestionFrame } from "./question-frame-parser";
import { routeStructuredIntent } from "./structured-intent-router";
import type { AstroRagFlags } from "./feature-flags";

export type AstroRagRouteKind = "old_v2" | "rag" | "fallback";

export type AstroRagRouteDecision = {
  kind: AstroRagRouteKind;
  question: string;
  questionFrame?: ReturnType<typeof parseQuestionFrame>;
  structuredIntent?: ReturnType<typeof routeStructuredIntent>;
  reason?: "rag_disabled" | "routing_disabled" | "missing_question" | "missing_user_id" | "direct_rag_enabled";
};

export type AstroRagRouteInput = {
  question?: string;
  userId?: string | null;
  flags: AstroRagFlags;
  routingEnabled: boolean;
};

function normalizeQuestion(question?: string): string {
  return typeof question === "string" ? question.trim() : "";
}

export function shouldUseAstroRagRoute(flags: AstroRagFlags, question: string): boolean {
  if (!flags.ragEnabled) return false;
  return Boolean(question.trim());
}

export function routeAstroRagRequest(input: AstroRagRouteInput): AstroRagRouteDecision {
  const question = normalizeQuestion(input.question);
  if (!question) {
    return { kind: "fallback", question, reason: "missing_question" };
  }
  if (!input.userId) {
    return { kind: "fallback", question, reason: "missing_user_id" };
  }
  if (!input.flags.ragEnabled) {
    return { kind: "old_v2", question, reason: "rag_disabled" };
  }
  if (!input.routingEnabled) {
    return { kind: "old_v2", question, reason: "routing_disabled" };
  }
  const questionFrame = parseQuestionFrame(question);
  const structuredIntent = routeStructuredIntent({ rawQuestion: question, questionFrame });
  return {
    kind: "rag",
    question,
    questionFrame,
    structuredIntent,
    reason: "direct_rag_enabled",
  };
}
