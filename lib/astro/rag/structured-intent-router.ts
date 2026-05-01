/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { parseQuestionFrame } from "./question-frame-parser";
import type { QuestionFrame } from "./question-frame-types";
import type { StructuredIntent, StructuredIntentInput } from "./structured-intent-types";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\u2018\u2019\u201c\u201d]/g, "'").replace(/\s+/g, " ").trim();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function resolvedQuestion(input: StructuredIntentInput): { question: string; routedFrom: StructuredIntent["routedFrom"] } {
  const core = input.questionFrame?.coreQuestion?.trim();
  if (core) return { question: core, routedFrom: "core_question" };
  const parsed = parseQuestionFrame(input.rawQuestion);
  if (parsed.coreQuestion) return { question: parsed.coreQuestion, routedFrom: "core_question" };
  return { question: typeof input.rawQuestion === "string" ? input.rawQuestion.trim() : "", routedFrom: "fallback_raw_question" };
}

function buildIntent(primaryIntent: StructuredIntent["primaryIntent"], mode: StructuredIntent["mode"], confidence: StructuredIntent["confidence"], routedFrom: StructuredIntent["routedFrom"], secondaryIntents: string[] = []): StructuredIntent {
  return { primaryIntent, secondaryIntents, mode, confidence, routedFrom };
}

function detectExactFact(q: string): boolean {
  return hasAny(q, [
    "what is my lagna",
    "what is my ascendant sign exactly",
    "where is sun placed",
    "where is moon placed",
    "where is mars placed",
    "where is venus placed",
    "where is jupiter placed",
    "tell me one exact chart fact you can verify",
    "can you answer one chart fact without guessing",
    "is my sun in the 10th house",
    "which house is connected to my career",
  ]) || /(?:lagna|ascendant|exact chart fact|without guessing|without interpretation)/.test(q);
}

function detectSafety(q: string): boolean {
  return hasAny(q, [
    "can my chart tell when i will die",
    "how long will i live",
    "is there danger to my life this year",
    "is there a death period in my chart",
    "can astrology predict accidents exactly",
    "will i win my court case",
    "can astrology guarantee my court case result",
    "should i stop medical treatment and use mantra only",
    "can astrology diagnose my disease",
    "is foreign settlement guaranteed",
    "should i invest all my savings now",
    "should i take a risky financial opportunity",
    "can astrology guarantee business profit",
    "will i definitely get married soon",
  ]);
}

export function routeStructuredIntent(input: StructuredIntentInput): StructuredIntent {
  const resolved = resolvedQuestion(input);
  const q = normalize(resolved.question);
  if (!q) return buildIntent("general", "follow_up", "low", "fallback_raw_question");
  if (detectExactFact(q)) return buildIntent("exact_fact", "exact_fact", q.includes("exact") ? "high" : "medium", resolved.routedFrom);
  if (hasAny(q, ["why does my career feel stuck", "working hard but not getting promoted", "should i change my job", "how can i improve recognition at work", "should i focus on job, business, or study"])) return buildIntent("career", "interpretive", "high", resolved.routedFrom, ["job", "business", "study"]);
  if (hasAny(q, ["why do i feel anxious about money", "how can i build financial stability"])) return buildIntent("money", "interpretive", "high", resolved.routedFrom);
  if (hasAny(q, ["can astrology guarantee business profit"])) return buildIntent("business", "safety", "high", resolved.routedFrom, ["financial_risk"]);
  if (hasAny(q, ["should i invest all my savings now", "should i take a risky financial opportunity"])) return buildIntent("financial_risk", "safety", "high", resolved.routedFrom);
  if (hasAny(q, ["what relationship pattern should i reflect on", "why do my relationships keep breaking"])) return buildIntent("relationship", "interpretive", "high", resolved.routedFrom);
  if (hasAny(q, ["why is my marriage getting delayed", "will i definitely get married soon", "should i marry someone just because family is pressuring me"])) return buildIntent("marriage", detectSafety(q) ? "safety" : "interpretive", "high", resolved.routedFrom, q.includes("family") ? ["family"] : []);
  if (hasAny(q, ["why do i feel responsible for everyone at home", "how do i set boundaries with family pressure", "why do i carry guilt for everyone", "how should i talk to my family about career stress"])) return buildIntent("family", "interpretive", "high", resolved.routedFrom);
  if (hasAny(q, ["should i continue education or start working"])) return buildIntent("education", "interpretive", "high", resolved.routedFrom, ["career"]);
  if (hasAny(q, ["what should i study next"])) return buildIntent("education", "interpretive", "high", resolved.routedFrom);
  if (hasAny(q, ["will i go abroad", "should i leave india immediately for success", "is foreign settlement guaranteed"])) return buildIntent("foreign_settlement", detectSafety(q) ? "safety" : "timing", "high", resolved.routedFrom);
  if (hasAny(q, ["give me remedy for bad sleep", "i cannot sleep and feel mentally restless"])) return buildIntent("sleep", "remedy", "high", resolved.routedFrom);
  if (hasAny(q, ["what remedy can i do without spending money"])) return buildIntent("remedy", "remedy", "high", resolved.routedFrom);
  if (hasAny(q, ["should i stop medical treatment and use mantra only", "can astrology diagnose my disease"])) return buildIntent("health_adjacent", "safety", "high", resolved.routedFrom);
  if (hasAny(q, ["can my chart tell when i will die", "how long will i live", "is there danger to my life this year", "is there a death period in my chart", "can astrology predict accidents exactly"])) return buildIntent("death_lifespan", "safety", "high", resolved.routedFrom);
  if (hasAny(q, ["will i win my court case", "can astrology guarantee my court case result"])) return buildIntent("legal", "safety", "high", resolved.routedFrom);
  if (hasAny(q, ["what will happen", "tell me my future", "i do not know what to ask", "ask me a better question for my situation"])) return buildIntent("vague", "follow_up", "high", resolved.routedFrom);
  if (detectSafety(q)) return buildIntent("general", "safety", "medium", resolved.routedFrom);
  if (hasAny(q, ["for the next month", "for this year", "when i feel anxious", "when family pressure is high", "when i feel stuck", "without predicting exact timing"])) return buildIntent("general", "interpretive", "low", resolved.routedFrom);
  return buildIntent("general", "interpretive", "low", resolved.routedFrom);
}

export function routeStructuredIntentFromFrame(frame: QuestionFrame): StructuredIntent {
  return routeStructuredIntent({ rawQuestion: frame.rawQuestion, questionFrame: frame });
}
