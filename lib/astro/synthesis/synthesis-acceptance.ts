/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ReadingPlan } from "./reading-plan-types";

export type SynthesisAcceptanceResult = {
  accepted: boolean;
  rejectedReason?: string;
  warnings: string[];
};

const INTERNAL_WORDS = /\b(JSON|ReadingPlan|Groq|Ollama|Supabase|validator|metadata)\b/i;
const LOCAL_URL = /\b(?:https?:\/\/127\.0\.0\.1|http:\/\/localhost|127\.0\.0\.1:\d+|localhost:\d+)\b/i;
const TOKEN_LIKE = /\b(?:sk-|rk-|pk-|token|secret|api[_-]?key)[a-z0-9._-]*\b/i;

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function hasAcknowledgement(answer: string): boolean {
  return includesAny(answer, [/i hear/i, /i understand/i, /i can see/i, /that sounds/i, /it makes sense/i, /i know this can/i, /i’m sorry/i, /i am sorry/i]);
}

function hasChartAnchor(answer: string, plan: ReadingPlan): boolean {
  const anchorText = [...plan.chartTruth.chartAnchors, ...plan.chartTruth.evidence.map((item) => `${item.label} ${item.explanation}`)].join(" ").toLowerCase();
  if (!anchorText.trim()) return true;
  return plan.chartTruth.evidence.some((item) => includesAny(answer, [new RegExp(item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), new RegExp(item.explanation.slice(0, 16).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")])) || plan.chartTruth.chartAnchors.some((anchor) => has(answer, new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")));
}

function hasSafetyLimit(answer: string, plan: ReadingPlan, safetyBoundaries: string[] = []): boolean {
  const text = [answer, ...plan.safetyBoundaries, ...safetyBoundaries].join(" ").toLowerCase();
  return includesAny(text, [/cannot guarantee/, /cannot predict/, /not certain/, /not guaranteed/, /timing is uncertain/, /cannot promise/, /will stay grounded/, /boundary/i, /limit/i, /grounded/i, /care/i, /support only/i, /not a cure/i]);
}

function tooGeneric(answer: string): boolean {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  return wordCount < 8 || includesAny(answer, [/stay positive/i, /things will improve/i, /trust the process/i, /work hard/i, /be patient/i]);
}

function hasTiming(answer: string): boolean {
  return /\b\d{4}-\d{2}-\d{2}\b|next month|this month|next week|this year|within \d+\s+months?|second half|first half|by \w+/i.test(answer);
}

function hasBadTone(answer: string): boolean {
  return includesAny(answer, [/cursed/i, /doomed/i, /bad chart/i, /blocked forever/i, /fear/i]);
}

function hasUnsafeStopAdvice(answer: string): boolean {
  return includesAny(answer, [/stop (your )?(medicine|medication)/i, /stop (medical|legal|financial|mental health) support/i]);
}

function hasUnsafeRemedy(answer: string, plan: ReadingPlan): boolean {
  if (!plan.remedies.include) {
    return includesAny(answer, [/remedy/i, /puja/i, /gemstone/i, /blue sapphire/i, /must do/i, /mandatory/i, /pay \d+/i]);
  }
  return includesAny(answer, [/guarantee/i, /certainly/i, /definitely/i, /expensive puja/i, /pay \d+/i, /blue sapphire/i, /stop medicine/i, /cure/i]);
}

function hasPracticalGuidance(answer: string, plan: ReadingPlan): boolean {
  if (!plan.practicalGuidance.length) return true;
  return plan.practicalGuidance.some((item) => answer.toLowerCase().includes(item.slice(0, 18).toLowerCase())) || includesAny(answer, [/practical/i, /step/i, /routine/i, /boundary/i, /action/i]);
}

function hasReassurance(answer: string, plan: ReadingPlan): boolean {
  return answer.toLowerCase().includes(plan.reassurance.closingLine.slice(0, 18).toLowerCase()) || includesAny(answer, [/you are not alone/i, /this can improve/i, /with care/i, /i’ll keep/i, /i will keep/i, /not blocked forever/i, /not rejection/i, /grounded pattern/i, /can improve/i, /steady/i]);
}

function hasFollowUp(answer: string): boolean {
  return /\?/.test(answer);
}

export function validateCompassionateSynthesis(input: {
  plan: ReadingPlan;
  answer: string;
  fallbackAnswer: string;
  question?: string;
  safetyBoundaries?: string[];
}): SynthesisAcceptanceResult {
  const warnings: string[] = [];
  const answer = String(input.answer ?? "").trim();
  const fallback = String(input.fallbackAnswer ?? "").trim();
  const plan = input.plan;

  if (!answer) return { accepted: false, rejectedReason: "empty_answer", warnings };
  if (answer.length < 60) return { accepted: false, rejectedReason: "too_short", warnings };
  if (tooGeneric(answer)) return { accepted: false, rejectedReason: "too_generic", warnings };
  if (!hasAcknowledgement(answer)) return { accepted: false, rejectedReason: "missing_acknowledgement", warnings };
  if (plan.chartTruth.evidence.length > 0 && !hasChartAnchor(answer, plan)) return { accepted: false, rejectedReason: "missing_chart_anchor", warnings };
  if (!hasSafetyLimit(answer, plan, input.safetyBoundaries)) return { accepted: false, rejectedReason: "missing_safety_limitation", warnings };
  if (includesAny(answer, [/jupiter in aries/i, /moon in cancer/i, /lagna in scorpio/i, /10th house aries/i, /10th lord mars/i, /venus in 10th/i, /\brahu\b.*\b7th house\b/i])) return { accepted: false, rejectedReason: "invented_chart_fact", warnings };
  if (hasTiming(answer) && plan.mode !== "timing") return { accepted: false, rejectedReason: "unsupported_timing", warnings };
  if (hasUnsafeRemedy(answer, plan)) return { accepted: false, rejectedReason: plan.remedies.include ? "unsupported_remedy" : "remedy_not_allowed", warnings };
  if (includesAny(answer, [/guaranteed/i, /definitely/i, /certainly/i, /will happen for sure/i])) return { accepted: false, rejectedReason: "guaranteed_outcome", warnings };
  if (includesAny(answer, [/death date/i, /when will i die/i, /lifespan/i])) return { accepted: false, rejectedReason: "death_certainty", warnings };
  if (hasBadTone(answer)) return { accepted: false, rejectedReason: "fear_language", warnings };
  if (hasUnsafeStopAdvice(answer)) return { accepted: false, rejectedReason: "unsafe_support_advice", warnings };
  if (includesAny(answer, [/gemstone.*guarantee/i, /blue sapphire.*fix/i])) return { accepted: false, rejectedReason: "gemstone_certainty", warnings };
  if (includesAny(answer, [/pay \d+/i, /expensive puja/i, /mandatory puja/i])) return { accepted: false, rejectedReason: "expensive_puja_pressure", warnings };
  if (INTERNAL_WORDS.test(answer)) return { accepted: false, rejectedReason: "internal_metadata_exposed", warnings };
  if (LOCAL_URL.test(answer) || TOKEN_LIKE.test(answer)) return { accepted: false, rejectedReason: "secret_or_local_url_exposed", warnings };
  if (plan.mode === "follow_up" && !hasFollowUp(answer)) return { accepted: false, rejectedReason: "missing_follow_up_question", warnings };
  if (plan.practicalGuidance.length && !hasPracticalGuidance(answer, plan)) return { accepted: false, rejectedReason: "missing_practical_guidance", warnings };
  if (!hasReassurance(answer, plan)) return { accepted: false, rejectedReason: "missing_reassurance", warnings };
  if (plan.remedies.include === false && fallback && answer === fallback) warnings.push("fallback_used");
  return { accepted: true, warnings };
}
