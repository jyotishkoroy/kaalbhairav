// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerSection, BuildAnswerContractInput, ForbiddenClaim } from "../answer-contract-types";

export const COMMON_FORBIDDEN_CLAIMS: ForbiddenClaim[] = [
  { key: "guaranteed_outcome", description: "Do not guarantee promotion, marriage, money, legal result, medical result, or any life event.", severity: "block" },
  { key: "invented_chart_fact", description: "Do not mention chart facts that are not supplied in anchors, retrieved facts, reasoning path, or timing context.", severity: "block" },
  { key: "invented_timing", description: "Do not state dates, months, periods, or windows unless supplied by TimingContext.", severity: "block" },
  { key: "medical_diagnosis", description: "Do not diagnose disease or advise stopping medication.", severity: "block" },
  { key: "legal_advice", description: "Do not provide legal advice or guaranteed legal outcome.", severity: "block" },
  { key: "financial_advice", description: "Do not provide investment instructions, lottery predictions, stock/crypto certainty, or financial guarantees.", severity: "block" },
  { key: "death_lifespan", description: "Do not predict death date, lifespan, fatal accident, or longevity certainty.", severity: "block" },
  { key: "gemstone_guarantee", description: "Do not claim gemstones guarantee results.", severity: "block" },
  { key: "expensive_puja_pressure", description: "Do not pressure the user into expensive puja or fear-based remedies.", severity: "block" },
  { key: "unsafe_specificity", description: "Do not overstate certainty beyond the supplied evidence.", severity: "warn" },
];

export const COMMON_REQUIRED_SECTIONS: AnswerSection[] = ["direct_answer", "chart_basis", "reasoning", "timing", "what_to_do", "safe_remedies", "accuracy", "suggested_follow_up", "limitations", "safety_response"];

export const COMMON_VALIDATOR_RULES = [
  "answer_must_use_supplied_anchors",
  "answer_must_include_accuracy",
  "answer_must_not_invent_timing",
  "answer_must_not_make_guarantees",
  "answer_must_respect_safety_restrictions",
  "answer_must_answer_user_question",
];

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = value.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

export function trimContractText(value: string, max = 400): string {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function sectionLabel(section: AnswerSection): string {
  const labels: Record<AnswerSection, string> = {
    direct_answer: "Direct answer",
    chart_basis: "Chart basis",
    reasoning: "Reasoning",
    timing: "Timing",
    what_to_do: "What to do",
    safe_remedies: "Safe remedies",
    accuracy: "Accuracy",
    suggested_follow_up: "Suggested follow-up",
    limitations: "Limitations",
    safety_response: "Safety response",
  };
  return labels[section];
}

export function buildCommonForbiddenClaims(input: Pick<BuildAnswerContractInput, "plan" | "sufficiency">): ForbiddenClaim[] {
  const claims = [...COMMON_FORBIDDEN_CLAIMS];
  if (!input.sufficiency.canUseGroq) {
    claims.push({ key: "groq_writing_when_not_allowed", description: "Do not imply an LLM writer was used when sufficiency blocks it.", severity: "warn" });
  }
  if (input.plan.answerType === "timing" && !input.sufficiency.metadata.timingAvailable) {
    claims.push({ key: "timing_without_source", description: "Do not invent timing when no grounded timing source is available.", severity: "block" });
  }
  return claims;
}
