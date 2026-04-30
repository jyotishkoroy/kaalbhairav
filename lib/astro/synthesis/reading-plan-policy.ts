/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ReadingPlan, ReadingPlanBuilderInput, ReadingPlanValidationResult } from "./reading-plan-types";

export function normalizeReadingPlanTopic(value: string | undefined | null): string {
  const lower = String(value ?? "").toLowerCase();
  if (/career|job|promotion|work|salary|business|profession/.test(lower)) return "career";
  if (/marriage|married|spouse|shaadi|wedding/.test(lower)) return "marriage";
  if (/relationship|partner|breakup|love/.test(lower)) return "relationship";
  if (/money|finance|debt|income|savings|loan|profit/.test(lower)) return "money";
  if (/sleep|health|insomnia|rest|wellbeing/.test(lower)) return "sleep";
  if (/education|study|exam|school|college/.test(lower)) return "education";
  if (/family|parents?|mother|father|home/.test(lower)) return "family";
  if (/timing|when|date|window|soon/.test(lower)) return "timing";
  if (/remedy|mantra|puja|gemstone|ritual/.test(lower)) return "remedy";
  if (/death|lifespan|self harm|suicide|medical|legal|pregnan|curse/.test(lower)) return "safety";
  return "general";
}

function normalizeQuestion(question: string): string {
  return String(question ?? "").replace(/\s+/g, " ").trim();
}

export function determineReadingPlanMode(input: ReadingPlanBuilderInput): ReadingPlan["mode"] {
  const question = normalizeQuestion(input.question);
  const concernMode = String(input.concern?.mode ?? "").toLowerCase();
  if ((input.concern?.safetyRisks ?? []).some((risk) => ["death_lifespan", "self_harm", "medical", "legal", "pregnancy"].includes(risk))) return "safety";
  if (/death|die|lifespan|self harm|suicide|medical|legal|pregnan/.test(`${question} ${concernMode}`)) return "safety";
  if (concernMode === "timing" || /\bwhen\b|time window|date|soon/i.test(question)) return "timing";
  if (concernMode === "exact_fact" || /what is my lagna|moon sign|current dasha|which house|which planet/i.test(question)) return "exact_fact";
  if (concernMode === "remedy" || /remedy|mantra|puja|gemstone/i.test(question)) return "remedy";
  if (input.listening?.shouldAskFollowUp || /what will happen|tell me general|too broad|unclear/i.test(question)) return "follow_up";
  return "interpretive";
}

function hasTimingClaim(plan: ReadingPlan): boolean {
  return /(\b\d{4}-\d{2}-\d{2}\b|next\s+(month|week|year)|this\s+(month|week|year)|window|date)/i.test(JSON.stringify(plan));
}

function hasUnsafeRemedy(plan: ReadingPlan): boolean {
  return /(guarantee|must do|blue sapphire|gemstone certainty|expensive puja|stop medicine|cure|fatal)/i.test(JSON.stringify(plan));
}

export function validateReadingPlan(plan: ReadingPlan): ReadingPlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = JSON.stringify(plan).toLowerCase();

  if (!plan.reassurance?.closingLine) errors.push("missing_reassurance");
  if (!plan.reassurance?.avoidFalseCertainty) errors.push("false_certainty_enabled");
  if (plan.mode === "follow_up" && !plan.followUp?.question) errors.push("missing_followup");
  if (plan.mode === "exact_fact" && /(interpret|meaning|pattern|life lesson|broad reading)/i.test(text)) errors.push("broad_claim_in_exact_fact");
  if (plan.mode === "interpretive" && !plan.chartTruth.evidence.length && !plan.chartTruth.limitations.length) warnings.push("no_evidence_or_limitation");
  if (plan.chartTruth.evidence.length && !plan.chartTruth.chartAnchors.length && /(chart|house|dasha|varshaphal)/i.test(text)) warnings.push("missing_chart_anchors");
  if (/death date|lifespan|fatal accident/i.test(text)) errors.push("death_prediction");
  if (hasTimingClaim(plan) && !/timing source|timing unavailable|grounded timing/i.test(text)) errors.push("timing_without_source");
  if (hasUnsafeRemedy(plan) || /guarantee.*remedy|remedy.*guarantee/i.test(text)) errors.push("unsafe_remedy_language");
  if (/(fear|curse|doomed|bad chart)/i.test(text)) errors.push("fear_language");
  if (plan.safetyBoundaries.length === 0 && /medical|legal|death|lifespan|self harm|pregnancy|financial/i.test(text)) errors.push("missing_safety_boundary");

  return { ok: errors.length === 0, errors, warnings };
}

export function applyReadingPlanSafetyPolicy(plan: ReadingPlan, input: ReadingPlanBuilderInput): ReadingPlan {
  const next = structuredClone(plan) as ReadingPlan;
  const risks = new Set([...(input.concern?.safetyRisks ?? []), ...(input.safetyRestrictions ?? [])]);
  if (input.timingContext && !input.timingContext.timingSourceAvailable && !next.chartTruth.limitations.some((item) => /timing/i.test(item))) {
    next.chartTruth.limitations = [...next.chartTruth.limitations, "No grounded timing source is available, so exact date or window claims are prohibited."];
    next.safetyBoundaries = [...new Set([...next.safetyBoundaries, "Do not provide exact timing without a grounded timing source."])];
  }
  if (input.birthContext?.hasBirthTime === false) next.chartTruth.limitations = [...next.chartTruth.limitations, "Birth time is missing, so house and timing precision is limited."];
  if (input.birthContext?.hasBirthDate === false) next.chartTruth.limitations = [...next.chartTruth.limitations, "Birth date is missing, so chart precision is limited."];
  if (input.birthContext?.hasBirthPlace === false) next.chartTruth.limitations = [...next.chartTruth.limitations, "Birth place is missing, so chart precision may be reduced."];
  if (next.chartTruth.evidence.length === 0) next.chartTruth.limitations = [...next.chartTruth.limitations, "No direct evidence was provided, so the reading should stay general and cautious."];
  if (risks.has("death_lifespan")) next.safetyBoundaries = [...new Set([...next.safetyBoundaries, "Do not predict death dates or lifespan."])];
  if (risks.has("medical")) next.safetyBoundaries = [...new Set([...next.safetyBoundaries, "Do not diagnose medical conditions or replace a clinician."])];
  if (risks.has("legal")) next.safetyBoundaries = [...new Set([...next.safetyBoundaries, "Do not give legal advice or guaranteed legal outcomes."])];
  if (risks.has("financial_guarantee")) next.safetyBoundaries = [...new Set([...next.safetyBoundaries, "Do not provide financial guarantees."])];
  if (risks.has("pregnancy")) next.safetyBoundaries = [...new Set([...next.safetyBoundaries, "Do not predict pregnancy or baby health outcomes."])];
  if (risks.has("self_harm")) next.safetyBoundaries = [...new Set([...next.safetyBoundaries, "Provide crisis support and avoid astrology-based self-harm guidance."])];
  return next;
}

export function shouldIncludeRemedies(input: ReadingPlanBuilderInput): { include: boolean; reason: string } {
  if (input.remedyContext?.remedyRequested) return { include: Boolean(input.remedyContext.safeRemediesAvailable), reason: "user_requested_remedy" };
  if (input.concern?.mode === "remedy") return { include: Boolean(input.remedyContext?.safeRemediesAvailable), reason: "contextual_remedy" };
  return { include: false, reason: "not_requested" };
}

export function buildReadingPlanLimitations(input: ReadingPlanBuilderInput): string[] {
  const limitations: string[] = [];
  if (input.birthContext?.hasBirthTime === false) limitations.push("Birth time is missing, so fine-grained timing and house interpretation are limited.");
  if (input.birthContext?.hasBirthDate === false) limitations.push("Birth date is missing, so the chart cannot be treated as fully specific.");
  if (input.birthContext?.hasBirthPlace === false) limitations.push("Birth place is missing, so the chart may be less precise.");
  if (input.timingContext && !input.timingContext.timingSourceAvailable) limitations.push("No grounded timing source is available, so exact windows must not be claimed.");
  if (!input.evidence?.length) limitations.push("Evidence is weak or absent, so confidence should stay low and cautious.");
  if (input.concern?.mode === "exact_fact") limitations.push("Exact fact mode should stay concise and avoid broad interpretation.");
  return [...new Set(limitations)];
}

export function sanitizeReadingPlanText(value: string, maxLength = 240): string {
  const cleaned = String(value ?? "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[`*_#>]/g, " ")
    .replace(/\b(?:sk-|rk-|pk-|token|secret|api[_-]?key)[a-z0-9._-]*\b/gi, "[REDACTED]")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength).trim() : cleaned;
}

export function sanitizeReadingPlanStringArray(value: unknown, maxItems = 8, maxLength = 80): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const cleaned = sanitizeReadingPlanText(item, maxLength);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
    if (output.length >= maxItems) break;
  }
  return output;
}
