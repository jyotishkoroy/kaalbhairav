/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { validateRagAnswer } from "./answer-validator";
import { getAstroRagFlags } from "./feature-flags";
import { routeLocalModelTask, type LocalModelProfile } from "./local-model-router";
import type { AnswerValidationInput, AnswerValidationResult } from "./validation-types";

export type TonePolisherMode = "disabled" | "skipped" | "ollama" | "fallback";

export type TonePolisherInput = {
  question: string;
  answer: string;
  topic?: string | null;
  mode?: "exact_fact" | "interpretive" | "timing" | "remedy" | "follow_up" | "safety" | "general";
  safetyRisks?: string[];
  allowedFacts?: string[];
  requiredBoundaries?: string[];
  forbiddenClaims?: string[];
  maxLength?: number;
  env?: Record<string, string | undefined>;
};

export type TonePolisherResult = {
  answer: string;
  mode: TonePolisherMode;
  changed: boolean;
  accepted: boolean;
  skippedReason?: string;
  rejectedReason?: string;
  warnings: string[];
  source: "ollama" | "skipped" | "fallback";
};

export type LocalTonePolisherClient = {
  polish: (input: {
    question: string;
    answer: string;
    profile: LocalModelProfile;
    prompt: { system: string; user: string };
  }) => Promise<unknown>;
};

const MIN_POLISH_LENGTH = 90;
const MAX_POLISHED_LENGTH = 4000;
const TIMING_WORDS = /\b(\d{4}-\d{2}-\d{2}|next month|this year|within \d+\s+months?|second half|first half|mid[- ]year|year end|by [a-z]+)\b/i;
const LOCAL_SYSTEM_TOKENS = /groq|ollama|supabase|json|debug|metadata|validator/i;
const CLAIM_TOKENS = /guarantee|guaranteed|definitely|certainly|100%|surely|will happen|death date|when you will die|stop your medication|stop medicine|legal advice|win your case|stock|lottery|expensive puja|mandatory puja|blue sapphire|gemstone.*guarantee|cure|heal/i;
const FACT_TOKEN_PATTERNS = [
  /\bsun\b/i,
  /\bmoon\b/i,
  /\bmars\b/i,
  /\bmercury\b/i,
  /\bjupiter\b/i,
  /\bvenus\b/i,
  /\bsaturn\b/i,
  /\brahu\b/i,
  /\bketu\b/i,
  /\blagna\b/i,
  /\bascendant\b/i,
  /\bdasha\b/i,
  /\bmahadasha\b/i,
  /\bhouse\s+\d+\b/i,
  /\b\d+(st|nd|rd|th)\s+house\b/i,
  /\baries\b/i,
  /\btaurus\b/i,
  /\bgemini\b/i,
  /\bcancer\b/i,
  /\bleo\b/i,
  /\bvirgo\b/i,
  /\blibra\b/i,
  /\bscorpio\b/i,
  /\bsagittarius\b/i,
  /\bcapricorn\b/i,
  /\baquarius\b/i,
  /\bpisces\b/i,
];

function readBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function trimText(value: string, max: number): string {
  const text = value.trim();
  return text.length > max ? text.slice(0, max) : text;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parsePolishedAnswer(candidate: unknown): string | null {
  if (typeof candidate === "string") return normalizeWhitespace(candidate);
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const raw = candidate as Record<string, unknown>;
  if (typeof raw.answer === "string") return normalizeWhitespace(raw.answer);
  return null;
}

function hasHighRiskSafety(input: TonePolisherInput): boolean {
  const risks = new Set((input.safetyRisks ?? []).map((item) => item.toLowerCase()));
  return ["death_lifespan", "self_harm", "medical", "legal", "financial_guarantee"].some((risk) => risks.has(risk));
}

export function shouldSkipTonePolishing(input: TonePolisherInput): { skip: boolean; reason?: string } {
  if (!readBool(input.env?.ASTRO_LOCAL_TONE_POLISHER_ENABLED, false)) return { skip: true, reason: "tone_polisher_disabled" };
  if (!input.answer?.trim()) return { skip: true, reason: "empty_answer" };
  if ((input.mode ?? "general") === "exact_fact") return { skip: true, reason: "exact_fact" };
  if (hasHighRiskSafety(input)) return { skip: true, reason: "high_risk_safety" };
  if (normalizeWhitespace(input.answer).length < MIN_POLISH_LENGTH) return { skip: true, reason: "answer_too_short" };
  return { skip: false };
}

export function buildTonePolisherPrompt(input: TonePolisherInput): { system: string; user: string } {
  const system = [
    "You are a tone polisher for a compassionate astrology app.",
    "You do not answer the question.",
    "You only lightly improve clarity, warmth, and flow of the supplied answer.",
    "Do not add astrology facts.",
    "Do not add timing.",
    "Do not add remedies.",
    "Do not add guarantees.",
    "Do not remove safety boundaries.",
    "Do not mention internal systems, JSON, AI, Groq, Ollama, Supabase, validators, or metadata.",
    "Return JSON only.",
  ].join(" ");

  const user = JSON.stringify({
    question: input.question,
    current_answer: input.answer,
    topic: input.topic ?? null,
    allowed_facts: input.allowedFacts ?? [],
    required_boundaries: input.requiredBoundaries ?? [],
    forbidden_claims: input.forbiddenClaims ?? [],
    preserve_meaning: true,
    return_shape: { answer: "string" },
  });

  return { system, user };
}

function validationInputFromTone(input: TonePolisherInput, answer: string): AnswerValidationInput | null {
  const allowedFacts = input.allowedFacts ?? [];
  const requiredBoundaries = input.requiredBoundaries ?? [];
  const forbiddenClaims = input.forbiddenClaims ?? [];
  if (!allowedFacts.length && !requiredBoundaries.length && !forbiddenClaims.length) return null;
  return {
    question: input.question,
    answer,
    contract: {
      domain: input.topic ?? "general",
      answerMode: input.mode === "safety" ? "safety" : input.mode === "exact_fact" ? "exact_fact" : "interpretive",
      question: input.question,
      mustInclude: [],
      mustNotInclude: [],
      requiredSections: [],
      optionalSections: [],
      anchors: allowedFacts.map((fact) => ({ key: fact, label: fact, required: false, source: "chart_fact", factKeys: [fact], ruleKeys: [], description: fact })),
      forbiddenClaims: forbiddenClaims.map((claim) => ({ key: claim, description: claim, severity: "block" })),
      timingAllowed: input.mode !== "timing",
      timingRequired: false,
      remedyAllowed: input.mode === "remedy",
      exactFactsOnly: input.mode === "exact_fact",
      canUseGroq: true,
      canUseOllamaCritic: true,
      accuracyClass: "grounded_interpretive",
      limitations: [],
      safetyRestrictions: input.requiredBoundaries ?? [],
      validatorRules: [],
      writerInstructions: [],
      metadata: {
        requiredFactKeys: allowedFacts,
        missingFacts: [],
        selectedRuleKeys: [],
        timingWindowCount: 0,
        retrievalPartial: false,
        reasoningPartial: false,
        blockedBySafety: false,
      },
    } as never,
    context: {
      chartFacts: [],
      reasoningRules: [],
      benchmarkExamples: [],
      timingWindows: [],
      safeRemedies: [],
      metadata: { userId: "", profileId: null, domain: input.topic ?? "general", requestedFactKeys: [], retrievalTags: [], errors: [], partial: false },
    } as never,
    reasoningPath: { domain: input.topic ?? "general", steps: [], selectedRuleKeys: [], selectedRuleIds: [], missingAnchors: [], warnings: [], summary: "", metadata: { factCount: 0, ruleCount: 0, partial: false, stored: false } } as never,
    timing: { available: false, windows: [], requested: false, allowed: false, missingSources: [], warnings: [], metadata: { domain: input.topic ?? "general", sourceCounts: { dasha: 0, varshaphal: 0, python_transit: 0, stored: 0, user_provided: 0 }, usedStoredWindows: false, usedDashaFacts: false, usedVarshaphalFacts: false, usedPythonAdapter: false, usedUserProvidedDates: false, partial: false } } as never,
  };
}

function looksUnsafe(answer: string, input: TonePolisherInput, original: string): boolean {
  const originalLower = normalizeWhitespace(original).toLowerCase();
  const answerLower = normalizeWhitespace(answer).toLowerCase();
  if (LOCAL_SYSTEM_TOKENS.test(answer)) return true;
  if (CLAIM_TOKENS.test(answer)) return true;
  if (TIMING_WORDS.test(answer) && input.mode !== "timing" && !(input.allowedFacts ?? []).some((fact) => TIMING_WORDS.test(fact))) return true;
  if (/(https?:\/\/|127\.0\.0\.1|localhost|secret=|token=|api_key=)/i.test(answer)) return true;
  for (const pattern of FACT_TOKEN_PATTERNS) {
    const match = answer.match(pattern)?.[0]?.toLowerCase();
    if (!match) continue;
    const allowedByOriginal = originalLower.includes(match);
    const allowedByFacts = (input.allowedFacts ?? []).some((fact) => fact.toLowerCase().includes(match));
    if (!allowedByOriginal && !allowedByFacts) return true;
  }
  for (const fact of input.allowedFacts ?? []) {
    const normalizedFact = fact.trim().toLowerCase();
    if (!normalizedFact) continue;
    if (originalLower.includes(normalizedFact) && !answerLower.includes(normalizedFact)) return true;
  }
  for (const boundary of input.requiredBoundaries ?? []) {
    const normalizedBoundary = boundary.trim().toLowerCase();
    if (!normalizedBoundary) continue;
    if (originalLower.includes(normalizedBoundary) && !answerLower.includes(normalizedBoundary)) return true;
  }
  for (const claim of input.forbiddenClaims ?? []) {
    if (claim && answerLower.includes(claim.toLowerCase())) return true;
  }
  return false;
}

export function sanitizePolishedAnswer(answer: string): string {
  return trimText(normalizeWhitespace(answer), MAX_POLISHED_LENGTH);
}

export function validatePolishedAnswer(candidate: unknown, input: TonePolisherInput): TonePolisherResult {
  const original = sanitizePolishedAnswer(input.answer);
  const parsed = parsePolishedAnswer(candidate);
  if (!parsed) {
    return { answer: original, mode: "fallback", changed: false, accepted: false, rejectedReason: "invalid_shape", warnings: [], source: "fallback" };
  }
  if (parsed.length > MAX_POLISHED_LENGTH) return { answer: original, mode: "fallback", changed: false, accepted: false, rejectedReason: "too_long", warnings: [], source: "fallback" };
  const answer = sanitizePolishedAnswer(parsed);
  if (!answer) return { answer: original, mode: "fallback", changed: false, accepted: false, rejectedReason: "empty_answer", warnings: [], source: "fallback" };
  if (looksUnsafe(answer, input, original)) return { answer: original, mode: "fallback", changed: false, accepted: false, rejectedReason: "unsafe_candidate", warnings: [], source: "fallback" };
  if (!answer || answer === original) return { answer: original, mode: "skipped", changed: false, accepted: true, warnings: ["unchanged"], source: "skipped" };
  return { answer, mode: "ollama", changed: true, accepted: true, warnings: [], source: "ollama" };
}

function buildLocalValidationInput(input: TonePolisherInput, answer: string): AnswerValidationInput | null {
  const validationInput = validationInputFromTone(input, answer);
  if (!validationInput) return null;
  return validationInput;
}

function shouldUseRouter(input: TonePolisherInput): boolean {
  const routed = routeLocalModelTask("tone_polisher", input.env ?? process.env);
  return routed.useLocal;
}

export async function polishAnswerWithLocalTone(input: TonePolisherInput & { client?: LocalTonePolisherClient }): Promise<TonePolisherResult> {
  const skip = shouldSkipTonePolishing(input);
  if (skip.skip) return { answer: sanitizePolishedAnswer(input.answer), mode: "skipped", changed: false, accepted: false, skippedReason: skip.reason, warnings: [], source: "skipped" };
  if (!shouldUseRouter(input)) return { answer: sanitizePolishedAnswer(input.answer), mode: "disabled", changed: false, accepted: false, skippedReason: "router_disabled", warnings: [], source: "skipped" };
  if (!input.client) return { answer: sanitizePolishedAnswer(input.answer), mode: "fallback", changed: false, accepted: false, skippedReason: "missing_client", warnings: [], source: "fallback" };

  const routed = routeLocalModelTask("tone_polisher", input.env ?? process.env);
  const prompt = buildTonePolisherPrompt(input);
  try {
    const raw = await input.client.polish({ question: input.question, answer: input.answer, profile: routed.profile, prompt });
    const candidate = validatePolishedAnswer(raw, input);
    if (!candidate.accepted || !candidate.changed) {
      return { ...candidate, answer: sanitizePolishedAnswer(input.answer), source: "fallback" };
    }

    const validation = buildLocalValidationInput(input, candidate.answer);
    if (validation) {
      const validated = validateRagAnswer(validation);
      if (!validated.ok) {
        return { answer: sanitizePolishedAnswer(input.answer), mode: "fallback", changed: false, accepted: false, rejectedReason: "deterministic_validation_failed", warnings: candidate.warnings, source: "fallback" };
      }
    }

    return candidate;
  } catch {
    return { answer: sanitizePolishedAnswer(input.answer), mode: "fallback", changed: false, accepted: false, skippedReason: "client_failed", warnings: [], source: "fallback" };
  }
}
