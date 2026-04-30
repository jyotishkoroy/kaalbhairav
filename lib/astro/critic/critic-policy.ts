/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ReadingCriticInput, ReadingCriticPolicyResult, ReadingCriticResult, ReadingRewritePolicyResult } from "./reading-critic-types";
import { routeLocalModelTask } from "../rag/local-model-router";

const MISSING_VALUES = new Set([
  "emotional_acknowledgement",
  "chart_anchor",
  "lived_experience",
  "practical_guidance",
  "reassurance",
  "follow_up",
  "safety_boundary",
]);

const INTERNAL_WORDS = /\b(?:JSON|ReadingPlan|ListeningAnalysis|Ollama|Groq|Supabase|metadata|prompt|system|user)\b/i;
const LOCAL_URL = /\b(?:https?:\/\/127\.0\.0\.1|http:\/\/localhost|127\.0\.0\.1:\d+|localhost:\d+)\b/i;
const TOKEN_LIKE = /\b(?:sk-|rk-|pk-|token|secret|api[_-]?key|bearer)[a-z0-9._-]*/i;

function clamp01(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_~`>#-]/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeCriticString(value: string, maxLength = 800): string {
  const cleaned = stripMarkdown(String(value ?? ""))
    .replace(LOCAL_URL, "[REDACTED_URL]")
    .replace(TOKEN_LIKE, "[REDACTED]")
    .replace(INTERNAL_WORDS, "[REDACTED]");
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

export function sanitizeCriticStringArray(value: unknown, maxItems = 12, maxLength = 240): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const cleaned = sanitizeCriticString(entry, maxLength);
    if (!cleaned) continue;
    const normalized = cleaned.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(cleaned);
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeMissingRequiredElements(value: unknown): ReadingCriticResult["missingRequiredElements"] {
  if (!Array.isArray(value)) return [];
  const out: ReadingCriticResult["missingRequiredElements"] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const normalized = entry.trim().toLowerCase().replace(/\s+/g, "_");
    if (!MISSING_VALUES.has(normalized as ReadingCriticResult["missingRequiredElements"][number])) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized as ReadingCriticResult["missingRequiredElements"][number]);
    if (out.length >= 12) break;
  }
  return out;
}

function buildBaseResult(source: ReadingCriticResult["source"], reason?: string): ReadingCriticResult {
  const result: ReadingCriticResult = {
    safe: false,
    grounded: false,
    specific: false,
    compassionate: true,
    feelsHeardScore: 0.5,
    genericnessScore: 1,
    fearBasedScore: 0,
    missingRequiredElements: [],
    unsafeClaims: [],
    inventedFacts: [],
    unsupportedTimingClaims: [],
    unsupportedRemedies: [],
    shouldRewrite: false,
    rewriteInstructions: [],
    source,
  };
  if (reason) result.rewriteInstructions.push(sanitizeCriticString(reason, 160));
  return result;
}

export function buildSkippedReadingCriticResult(reason?: string): ReadingCriticResult {
  return buildBaseResult("skipped", reason);
}

export function buildFallbackReadingCriticResult(reason?: string): ReadingCriticResult {
  return buildBaseResult("fallback", reason);
}

export function validateReadingCriticResult(raw: unknown, fallback?: ReadingCriticResult): ReadingCriticResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback ?? buildFallbackReadingCriticResult("invalid_object");
  const record = raw as Record<string, unknown>;
  const source = record.source === "ollama" || record.source === "skipped" || record.source === "fallback" ? record.source : (fallback?.source ?? "fallback");
  return {
    safe: typeof record.safe === "boolean" ? record.safe : fallback?.safe ?? false,
    grounded: typeof record.grounded === "boolean" ? record.grounded : fallback?.grounded ?? false,
    specific: typeof record.specific === "boolean" ? record.specific : fallback?.specific ?? false,
    compassionate: typeof record.compassionate === "boolean" ? record.compassionate : fallback?.compassionate ?? true,
    feelsHeardScore: clamp01(record.feelsHeardScore ?? fallback?.feelsHeardScore),
    genericnessScore: clamp01(record.genericnessScore ?? fallback?.genericnessScore),
    fearBasedScore: clamp01(record.fearBasedScore ?? fallback?.fearBasedScore),
    missingRequiredElements: normalizeMissingRequiredElements(record.missingRequiredElements ?? fallback?.missingRequiredElements),
    unsafeClaims: sanitizeCriticStringArray(record.unsafeClaims ?? fallback?.unsafeClaims),
    inventedFacts: sanitizeCriticStringArray(record.inventedFacts ?? fallback?.inventedFacts),
    unsupportedTimingClaims: sanitizeCriticStringArray(record.unsupportedTimingClaims ?? fallback?.unsupportedTimingClaims),
    unsupportedRemedies: sanitizeCriticStringArray(record.unsupportedRemedies ?? fallback?.unsupportedRemedies),
    shouldRewrite: typeof record.shouldRewrite === "boolean" ? record.shouldRewrite : fallback?.shouldRewrite ?? false,
    rewriteInstructions: sanitizeCriticStringArray(record.rewriteInstructions ?? fallback?.rewriteInstructions, 16, 320),
    source,
  };
}

export function normalizeReadingCriticResult(raw: unknown, fallback?: ReadingCriticResult): ReadingCriticResult {
  const validated = validateReadingCriticResult(raw, fallback);
  if (validated.source !== "ollama" && validated.source !== "skipped" && validated.source !== "fallback") {
    return fallback ?? buildFallbackReadingCriticResult("invalid_source");
  }
  return validated;
}

export function shouldUseReadingCritic(input: ReadingCriticInput): ReadingCriticPolicyResult {
  const env = input.env ?? process.env;
  const routed = routeLocalModelTask("critic", env);
  const warnings: string[] = [...routed.warnings];
  const ollamaCriticEnabled = env.ASTRO_OLLAMA_CRITIC_ENABLED === "true";
  const companionPipelineEnabled = env.ASTRO_COMPANION_PIPELINE_ENABLED === "true";
  const localCriticEnabled = env.ASTRO_LOCAL_CRITIC_ENABLED === "true";

  if (!ollamaCriticEnabled) return { allowed: false, fallbackReason: "ollama_critic_disabled", warnings };
  if (!companionPipelineEnabled) return { allowed: false, fallbackReason: "companion_pipeline_disabled", warnings };
  if (!routed.useLocal) return { allowed: false, fallbackReason: routed.fallbackReason ?? "critic_disabled", warnings };
  if (localCriticEnabled && !ollamaCriticEnabled) return { allowed: false, fallbackReason: "local_critic_not_authorized", warnings };
  return { allowed: true, warnings };
}

function hasTimingLanguage(answer: string): boolean {
  return /\d{4}-\d{2}-\d{2}|next month|this month|next week|this year|within \d+\s+months?|by \w+/i.test(answer);
}

function containsFear(answer: string): boolean {
  return /\b(cursed|doomed|blocked forever|terrified|fear|scared|bad chart)\b/i.test(answer);
}

export function buildRewritePolicy(input: { critic: ReadingCriticResult; attemptCount?: number }): ReadingRewritePolicyResult {
  const attemptCount = input.attemptCount ?? 0;
  const critic = input.critic;
  if (attemptCount >= 1) return { allowed: false, reason: "rewrite_already_used", instructions: [] };
  if (critic.unsafeClaims.length) return { allowed: false, reason: "unsafe_claims_present", instructions: [] };
  if (critic.inventedFacts.length) return { allowed: false, reason: "invented_facts_present", instructions: [] };
  if (critic.unsupportedTimingClaims.length) return { allowed: false, reason: "unsupported_timing_present", instructions: [] };
  if (critic.unsupportedRemedies.length) return { allowed: false, reason: "unsupported_remedies_present", instructions: [] };
  if (critic.fearBasedScore >= 0.7) return { allowed: false, reason: "fear_based_score_high", instructions: [] };

  const instructions = sanitizeCriticStringArray([
    ...critic.rewriteInstructions,
    ...(critic.missingRequiredElements.includes("emotional_acknowledgement") ? ["Begin with emotional acknowledgement."] : []),
    ...(critic.missingRequiredElements.includes("lived_experience") ? ["Translate the reading into lived experience."] : []),
    ...(critic.missingRequiredElements.includes("practical_guidance") ? ["Add one or two concrete practical steps already supported by the plan."] : []),
    ...(critic.missingRequiredElements.includes("reassurance") ? ["End with grounded reassurance without certainty."] : []),
    ...(critic.genericnessScore >= 0.65 ? ["Reduce generic language and be more specific to the question."] : []),
  ], 16, 280);

  const reason = instructions.length ? "rewrite_allowed" : "no_rewrite_needed";
  return { allowed: instructions.length > 0, reason, instructions };
}

export function applyDeterministicCriticChecks(input: { plan: import("../synthesis").ReadingPlan; answer: string; critic: ReadingCriticResult }): ReadingCriticResult {
  const answer = sanitizeCriticString(input.answer, 4000);
  const critic = { ...input.critic };
  const issues = new Set(critic.missingRequiredElements);
  const chartAnchors = input.plan.chartTruth.chartAnchors.join(" ").toLowerCase();
  const evidenceText = input.plan.chartTruth.evidence.map((item) => `${item.label} ${item.explanation}`).join(" ").toLowerCase();
  const hasChartEvidence = Boolean(chartAnchors.trim() || evidenceText.trim());

  if (!/\b(i hear|i understand|i can see|that sounds|it makes sense|i'm sorry|i am sorry)\b/i.test(answer)) issues.add("emotional_acknowledgement");
  if (hasChartEvidence && !input.plan.chartTruth.chartAnchors.some((anchor) => new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(answer)) && !input.plan.chartTruth.evidence.some((item) => new RegExp(item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(answer) || new RegExp(item.explanation.slice(0, 16).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(answer))) issues.add("chart_anchor");
  if (!/\b(step|routine|practical|action|boundary|try|do)\b/i.test(answer)) issues.add("practical_guidance");
  if (!/\b(experience|feels|feeling|life|work|relationship|situation|stuck|pressure|tired|heavy)\b/i.test(answer)) issues.add("lived_experience");
  if (!/\b(you are not alone|this can improve|with care|steady|grounded|support only|cannot promise|cannot guarantee|not fixed)\b/i.test(answer)) issues.add("reassurance");
  if (input.plan.mode === "follow_up" && !/\?/.test(answer)) issues.add("follow_up");
  if (input.plan.safetyBoundaries.length && !/\b(support only|not certainty|cannot promise|cannot guarantee|boundary|grounded)\b/i.test(answer)) issues.add("safety_boundary");
  if (/\b(stay positive|things will improve|trust the process|work hard|be patient)\b/i.test(answer) || answer.trim().split(/\s+/).length < 8) critic.genericnessScore = Math.max(critic.genericnessScore, 0.8);
  if (containsFear(answer)) critic.fearBasedScore = Math.max(critic.fearBasedScore, 0.8);
  if (hasTimingLanguage(answer) && input.plan.mode !== "timing") critic.unsupportedTimingClaims = sanitizeCriticStringArray([...critic.unsupportedTimingClaims, "unsupported timing claim"], 12, 120);
  if (/\b(gemstone|puja|remedy|cure)\b/i.test(answer) && !input.plan.remedies.include) critic.unsupportedRemedies = sanitizeCriticStringArray([...critic.unsupportedRemedies, "unsupported remedy"], 12, 120);
  if (/\b(jupiter in aries|moon in cancer|lagna in scorpio|10th house aries|10th lord mars|venus in 10th|rahu\b.*\b7th house\b|venus in the 7th house|rahu mahadasha|mahadasha)\b/i.test(answer)) critic.inventedFacts = sanitizeCriticStringArray([...critic.inventedFacts, "invented chart fact"], 12, 120);
  if (/\b(death date|lifespan|when will i die)\b/i.test(answer)) critic.unsafeClaims = sanitizeCriticStringArray([...critic.unsafeClaims, "death/lifespan certainty"], 12, 120);
  if (/\b(medical|legal|financial).*(guarantee|certain|definite)|\bguaranteed (medical|legal|financial)\b|\bguarantees?\b/i.test(answer)) critic.unsafeClaims = sanitizeCriticStringArray([...critic.unsafeClaims, "guarantee claim"], 12, 120);
  if (INTERNAL_WORDS.test(answer) || LOCAL_URL.test(answer) || TOKEN_LIKE.test(answer)) critic.unsafeClaims = sanitizeCriticStringArray([...critic.unsafeClaims, "internal metadata exposure"], 12, 120);
  critic.missingRequiredElements = Array.from(issues) as ReadingCriticResult["missingRequiredElements"];
  critic.safe = critic.safe && !critic.unsafeClaims.length && !critic.inventedFacts.length && !critic.unsupportedTimingClaims.length && !critic.unsupportedRemedies.length;
  critic.grounded = critic.grounded && !critic.inventedFacts.length && critic.missingRequiredElements.indexOf("chart_anchor") === -1;
  critic.specific = critic.specific && critic.genericnessScore < 0.7;
  critic.compassionate = critic.compassionate && critic.fearBasedScore < 0.7;
  critic.shouldRewrite = buildRewritePolicy({ critic }).allowed;
  if (!critic.rewriteInstructions.length) {
    critic.rewriteInstructions = buildRewritePolicy({ critic }).instructions;
  }
  if (critic.unsafeClaims.length || critic.inventedFacts.length || critic.unsupportedTimingClaims.length || critic.unsupportedRemedies.length || critic.fearBasedScore >= 0.7) {
    critic.safe = false;
    critic.shouldRewrite = false;
  }
  return critic;
}
