/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { getAstroRagFlags } from "../rag/feature-flags";
import { routeLocalModelTask } from "../rag/local-model-router";
import type { ListeningAnalysis, ListeningAnalyzerInput } from "./listening-types";

const allowedTopics = new Set(["relationship", "marriage", "career", "money", "health", "family", "education", "timing", "remedy", "general", "unknown"]);
const allowedTones = new Set(["anxious", "sad", "confused", "hopeful", "fearful", "urgent", "calm", "detached"]);
const allowedNeeds = new Set(["reassurance", "clarity", "decision_support", "grounding", "hope", "boundary_setting", "practical_steps", "spiritual_support"]);
const allowedRisks = new Set(["medical", "legal", "financial_guarantee", "death_lifespan", "pregnancy", "self_harm", "curse_fear", "expensive_remedy_pressure", "deterministic_prediction"]);

function stripMarkdown(value: string): string {
  return value.replace(/[`*_>#]/g, " ").replace(/\s+/g, " ").trim();
}

function redactSecrets(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[REDACTED_PHONE]")
    .replace(/\b(?:sk-|rk-|pk-|token|secret|api[_-]?key)[a-z0-9._-]*\b/gi, "[REDACTED]");
}

export function sanitizeListeningText(value: string, maxLength = 240): string {
  const stripped = redactSecrets(stripMarkdown(String(value ?? "")));
  return stripped.length > maxLength ? stripped.slice(0, maxLength).trim() : stripped;
}

export function sanitizeListeningStringArray(value: unknown, maxItems = 8, maxLength = 80): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => sanitizeListeningText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function isInventedChartFact(value: string): boolean {
  return /lagna|ascendant|dasha|nakshatra|house\s*\d|planet|sun|moon|mars|mercury|jupiter|venus|saturn|rahu|ketu/i.test(value);
}

export function validateListeningAnalysis(raw: unknown): { ok: boolean; analysis?: ListeningAnalysis; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, errors: ["invalid_object"] };
  const candidate = raw as Record<string, unknown>;
  const topic = typeof candidate.topic === "string" && allowedTopics.has(candidate.topic) ? (candidate.topic as ListeningAnalysis["topic"]) : undefined;
  const emotionalTone = typeof candidate.emotionalTone === "string" && allowedTones.has(candidate.emotionalTone) ? (candidate.emotionalTone as ListeningAnalysis["emotionalTone"]) : undefined;
  const emotionalNeed = typeof candidate.emotionalNeed === "string" && allowedNeeds.has(candidate.emotionalNeed) ? (candidate.emotionalNeed as ListeningAnalysis["emotionalNeed"]) : undefined;
  if (!topic) errors.push("bad_topic");
  if (!emotionalTone) errors.push("bad_emotionalTone");
  if (!emotionalNeed) errors.push("bad_emotionalNeed");
  const safetyRisks = sanitizeListeningStringArray(candidate.safetyRisks, 8, 40).filter((risk) => allowedRisks.has(risk)) as ListeningAnalysis["safetyRisks"];
  const missingContext = sanitizeListeningStringArray(candidate.missingContext, 8, 40).filter((item) => ["birth_date", "birth_time", "birth_place", "current_situation", "specific_question", "relationship_status", "career_context", "time_window"].includes(item)) as ListeningAnalysis["missingContext"];
  const userSituationSummary = sanitizeListeningText(String(candidate.userSituationSummary ?? ""), 220);
  const acknowledgementHint = sanitizeListeningText(String(candidate.acknowledgementHint ?? ""), 220);
  if (isInventedChartFact(userSituationSummary) || isInventedChartFact(acknowledgementHint)) errors.push("invented_fact");
  const shouldAskFollowUp = Boolean(candidate.shouldAskFollowUp);
  const followUpQuestion = typeof candidate.followUpQuestion === "string" ? sanitizeListeningText(candidate.followUpQuestion, 160) : undefined;
  const humanizationHints = sanitizeListeningStringArray(candidate.humanizationHints, 6, 80);
  if (!topic || !emotionalTone || !emotionalNeed || !userSituationSummary || !acknowledgementHint || isInventedChartFact(userSituationSummary) || isInventedChartFact(acknowledgementHint)) return { ok: false, errors };
  return {
    ok: true,
    analysis: {
      topic,
      emotionalTone,
      emotionalNeed,
      userSituationSummary,
      acknowledgementHint,
      missingContext,
      shouldAskFollowUp,
      followUpQuestion,
      safetyRisks,
      humanizationHints,
      source: candidate.source === "ollama" ? "ollama" : "deterministic_fallback",
      confidence: candidate.confidence === "high" || candidate.confidence === "medium" ? candidate.confidence : "low",
    },
    errors,
  };
}

export function normalizeListeningAnalysis(raw: unknown, fallback: ListeningAnalysis): ListeningAnalysis {
  const validated = validateListeningAnalysis(raw);
  if (!validated.ok || !validated.analysis) return fallback;
  return {
    ...fallback,
    ...validated.analysis,
    safetyRisks: [...new Set(validated.analysis.safetyRisks)],
    missingContext: [...new Set(validated.analysis.missingContext)],
    humanizationHints: validated.analysis.humanizationHints.slice(0, 6),
    source: validated.analysis.source,
  };
}

export function shouldUseListeningAnalyzer(input: ListeningAnalyzerInput): { allowed: boolean; fallbackReason?: string; warnings: string[] } {
  const env = input.env ?? process.env;
  const flags = getAstroRagFlags(env);
  const routing = routeLocalModelTask("listening_analyzer", env);
  const warnings = [...routing.warnings];
  if (!flags.ragEnabled && !flags.localAnalyzerEnabled && !flags.companionMemoryEnabled) {
    warnings.push("companion pipeline is not broadly enabled");
  }
  if (!flags.localAnalyzerEnabled) return { allowed: false, fallbackReason: "local_analyzer_disabled", warnings };
  if (!flags.companionMemoryEnabled && !flags.ragEnabled && !flags.llmAnswerEngineEnabled && !flags.localCriticEnabled) {
    // Keep listener opt-in only; no production behavior changes from flags alone.
  }
  if (flags.companionMemoryEnabled === false && env.ASTRO_COMPANION_PIPELINE_ENABLED === "true") warnings.push("companion pipeline flag is independent");
  if (!routing.useLocal) return { allowed: false, fallbackReason: routing.fallbackReason ?? "router_disabled", warnings };
  if (!flags.localAnalyzerEnabled || env.ASTRO_LISTENING_ANALYZER_ENABLED !== "true") return { allowed: false, fallbackReason: "listening_analyzer_disabled", warnings };
  return { allowed: true, warnings };
}

export function mapListeningSafetyRisksToExistingSafety(risks: ListeningAnalysis["safetyRisks"]): string[] {
  const mapped = new Set<string>();
  for (const risk of risks) {
    if (risk === "death_lifespan") mapped.add("death");
    if (risk === "medical") mapped.add("medical");
    if (risk === "legal") mapped.add("legal");
    if (risk === "financial_guarantee") mapped.add("financial_guarantee");
    if (risk === "pregnancy") mapped.add("pregnancy");
    if (risk === "self_harm") mapped.add("self_harm");
    if (risk === "curse_fear") mapped.add("unsafe_remedy");
    if (risk === "expensive_remedy_pressure") mapped.add("expensive_puja_pressure");
    if (risk === "deterministic_prediction") mapped.add("timing_certainty");
  }
  return [...mapped];
}
