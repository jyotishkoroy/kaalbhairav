/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { routeLocalModelTask, type LocalModelProfile } from "./local-model-router";

export type QueryExpansionDomain =
  | "career"
  | "marriage"
  | "relationship"
  | "money"
  | "education"
  | "foreign"
  | "health"
  | "sleep"
  | "remedy"
  | "spirituality"
  | "timing"
  | "safety"
  | "exact_fact"
  | "general";

export type QueryExpansionMode = "deterministic" | "local_model" | "disabled" | "fallback";

export type QueryExpansionInput = {
  question: string;
  topicHint?: string | null;
  intentHint?: string | null;
  exactFactMatched?: boolean;
  safetyRisks?: string[];
  availableChartAnchors?: string[];
  maxTerms?: number;
  env?: Record<string, string | undefined>;
  now?: string;
};

export type QueryExpansionOutput = {
  mode: QueryExpansionMode;
  originalQuestion: string;
  normalizedQuestion: string;
  domains: QueryExpansionDomain[];
  searchTerms: string[];
  chartAnchors: string[];
  requiredEvidence: string[];
  forbiddenExpansions: string[];
  safetyNotes: string[];
  shouldUseExpandedQuery: boolean;
  fallbackReason?: string;
  warnings: string[];
  source: "deterministic" | "ollama" | "disabled";
};

export type LocalQueryExpanderClient = {
  expand: (input: { question: string; deterministic: QueryExpansionOutput; profile: LocalModelProfile }) => Promise<unknown>;
};

const DEFAULT_MAX_TERMS = 16;
const MIN_MAX_TERMS = 3;
const MAX_MAX_TERMS = 30;

const DATE_PATTERN = /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+[a-z]{3,9}\s+\d{2,4}|[a-z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/i;
const TIME_PATTERN = /\b\d{1,2}:\d{2}(?:\s?[ap]m)?\b/i;
const EMAIL_PATTERN = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?){2,4}\d{2,4}\b/;
const TOKEN_PATTERN = /\b(?:sk|pk|rk|tok|token|secret|bearer|api[_-]?key|access[_-]?token)[a-z0-9._=-]{8,}\b/i;
const PERSON_DATA_PATTERN = /\b(?:dob|date of birth|birth date|birth time|born at|birthplace|place of birth)\b/i;
const PATH_PATTERN = /[a-z]:\\|\/[a-z0-9._-]+(?:\/[a-z0-9._-]+)+/i;

function clampMaxTerms(value: number | undefined): number {
  if (!Number.isFinite(value ?? NaN)) return DEFAULT_MAX_TERMS;
  return Math.min(MAX_MAX_TERMS, Math.max(MIN_MAX_TERMS, Math.trunc(value as number)));
}

function normalizeQuestionText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripSensitiveFragments(text: string): string {
  return text
    .replace(EMAIL_PATTERN, " ")
    .replace(PHONE_PATTERN, " ")
    .replace(TOKEN_PATTERN, " ")
    .replace(DATE_PATTERN, " ")
    .replace(TIME_PATTERN, " ")
    .replace(PERSON_DATA_PATTERN, " ")
    .replace(PATH_PATTERN, " ");
}

function cleanTerm(term: string): string {
  const normalized = stripSensitiveFragments(term.toLowerCase()).replace(/[^a-z0-9_+\-\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length > 64) return "";
  if (/(exact date|grounded source|timing prediction|guaranteed remedy|guaranteed profit|death date|lifespan prediction)/i.test(normalized)) return "";
  if (EMAIL_PATTERN.test(normalized) || PHONE_PATTERN.test(normalized) || TOKEN_PATTERN.test(normalized)) return "";
  if (DATE_PATTERN.test(normalized) || TIME_PATTERN.test(normalized)) return "";
  if (PERSON_DATA_PATTERN.test(normalized)) return "";
  return normalized;
}

function dedupeTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of terms) {
    const cleaned = cleanTerm(term);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }
  return out;
}

export function sanitizeQueryExpansionTerms(terms: string[]): string[] {
  return dedupeTerms(terms).filter((term) => term.length >= 2);
}

export function normalizeQueryExpansionQuestion(question: string): string {
  return stripSensitiveFragments(normalizeQuestionText(question)).replace(/\s+/g, " ").trim();
}

function includesAny(question: string, values: string[]): boolean {
  return values.some((value) => question.includes(value));
}

function addUnique(target: string[], values: string[]): void {
  for (const value of values) target.push(value);
}

function inferSafetyRisksFromQuestion(question: string): string[] {
  const risks: string[] = [];
  if (/(death|lifespan|how long will i live|when will i die|fatal|maraka)/i.test(question)) risks.push("death", "lifespan");
  if (/(self[- ]harm|suicide|kill myself|i want to die|end my life)/i.test(question)) risks.push("self_harm");
  if (/(diagnos|medical|doctor|medicine|medication|cancer|illness|pregnancy|pregnant|miscarriage|surgery)/i.test(question)) risks.push("medical");
  if (/(court|legal|lawyer|jail|contract|lawsuit)/i.test(question)) risks.push("legal");
  if (/(guaranteed profit|lottery|stock|crypto|investment|rich|crorepati|money sure shot)/i.test(question)) risks.push("financial_guarantee");
  if (/(gemstone|blue sapphire|puja|ritual)/i.test(question)) risks.push("unsafe_remedy");
  return [...new Set(risks)];
}

function combinedSafetyRisks(input: QueryExpansionInput): string[] {
  return [...new Set([...(input.safetyRisks ?? []), ...inferSafetyRisksFromQuestion(normalizeQueryExpansionQuestion(input.question))].map((value) => value.toLowerCase()))];
}

function deriveDomains(input: QueryExpansionInput, normalizedQuestion: string): QueryExpansionDomain[] {
  if (input.exactFactMatched) return ["exact_fact"];
  const safety = combinedSafetyRisks(input);
  const domains: QueryExpansionDomain[] = [];
  const q = normalizedQuestion;

  if (safety.some((item) => ["death", "lifespan", "self_harm", "medical", "legal", "financial_guarantee"].includes(item))) return ["safety"];
  if (includesAny(q, ["promotion", "recognition", "authority", "career", "job", "workplace", "professional"])) domains.push("career");
  if (includesAny(q, ["marriage", "spouse", "wedding", "relationship", "partner", "engagement", "divorce"])) {
    if (includesAny(q, ["marriage", "spouse", "wedding", "engagement"])) domains.push("marriage");
    if (includesAny(q, ["relationship", "partner", "divorce"])) domains.push("relationship");
  }
  if (includesAny(q, ["money", "income", "savings", "debt", "business", "finance", "profit"])) domains.push("money");
  if (includesAny(q, ["study", "exam", "education", "college", "school", "learning"])) domains.push("education");
  if (includesAny(q, ["foreign", "abroad", "settle", "relocate", "immigration"])) domains.push("foreign");
  if (includesAny(q, ["sleep", "insomnia", "restless", "rest"])) domains.push("sleep", "remedy");
  if (includesAny(q, ["mantra", "spiritual", "meditation", "puja"])) domains.push("spirituality", "remedy");
  if (includesAny(q, ["health", "medical", "disease", "illness", "doctor", "medicine", "diagnos"])) domains.push("health", "safety");
  if (includesAny(q, ["court", "legal", "lawyer", "jail", "contract", "lawsuit"])) domains.push("safety");
  if (includesAny(q, ["death", "lifespan", "die", "fatal", "maraka"])) domains.push("safety");
  if (includesAny(q, ["timing", "when", "exact date", "exactly"])) domains.push("timing");
  if (!domains.length) domains.push("general");
  return [...new Set(domains)];
}

function collectChartAnchors(input: QueryExpansionInput, normalizedQuestion: string, domains: QueryExpansionDomain[]): string[] {
  const anchors = new Set((input.availableChartAnchors ?? []).map((value) => cleanTerm(value)).filter(Boolean));
  if (input.exactFactMatched) {
    addUnique([...anchors], []);
  }
  if (domains.includes("career")) addUnique([...anchors], []);
  if (domains.includes("career")) {
    ["house_10", "lord_10", "house_11", "current_dasha"].forEach((anchor) => anchors.add(anchor));
  }
  if (domains.includes("sleep")) ["house_12", "house_6", "moon_placement"].forEach((anchor) => anchors.add(anchor));
  if (domains.includes("marriage")) ["house_7", "venus", "current_dasha"].forEach((anchor) => anchors.add(anchor));
  if (domains.includes("money")) ["house_2", "house_11", "current_dasha"].forEach((anchor) => anchors.add(anchor));
  if (domains.includes("education")) ["house_5", "house_9"].forEach((anchor) => anchors.add(anchor));
  if (domains.includes("foreign")) ["house_9", "house_12"].forEach((anchor) => anchors.add(anchor));
  if (domains.includes("health")) ["house_6", "house_8", "moon_placement"].forEach((anchor) => anchors.add(anchor));
  if (domains.includes("exact_fact")) {
    if (normalizedQuestion.includes("lagna") || normalizedQuestion.includes("ascendant")) anchors.add("lagna");
    if (normalizedQuestion.includes("sun")) anchors.add("sun_placement");
    if (normalizedQuestion.includes("moon")) anchors.add("moon_sign");
  }
  return [...anchors].filter(Boolean);
}

function collectSearchTerms(input: QueryExpansionInput, normalizedQuestion: string, domains: QueryExpansionDomain[]): string[] {
  const safety = combinedSafetyRisks(input);
  const terms: string[] = [];
  if (input.exactFactMatched) {
    addUnique(terms, ["exact fact", "structured chart fact"]);
    if (normalizedQuestion.includes("lagna") || normalizedQuestion.includes("ascendant")) addUnique(terms, ["lagna", "ascendant"]);
    if (normalizedQuestion.includes("sun")) addUnique(terms, ["sun placement"]);
    if (normalizedQuestion.includes("moon")) addUnique(terms, ["moon sign"]);
    return sanitizeQueryExpansionTerms(terms);
  }

  if (domains.includes("career")) addUnique(terms, ["career", "promotion", "recognition", "authority", "work delay", "10th house", "11th house", "dasha", "profession", "workplace visibility"]);
  if (domains.includes("sleep")) addUnique(terms, ["sleep", "restlessness", "moon", "12th house", "6th house", "routine", "safe remedy", "grounding", "mantra"]);
  if (domains.includes("remedy")) addUnique(terms, ["safe remedy", "low cost", "optional", "non coercive"]);
  if (domains.includes("marriage")) addUnique(terms, ["marriage", "delay", "relationship", "spouse", "7th house", "venus", "dasha", "family pressure"]);
  if (domains.includes("relationship")) addUnique(terms, ["relationship", "partner", "compatibility", "communication", "boundaries"]);
  if (domains.includes("money")) addUnique(terms, ["money", "income", "savings", "2nd house", "11th house", "debt", "business", "finance safety"]);
  if (domains.includes("education")) addUnique(terms, ["education", "exam", "study", "learning", "5th house", "9th house"]);
  if (domains.includes("foreign")) addUnique(terms, ["foreign", "abroad", "relocation", "immigration", "12th house", "9th house"]);
  if (domains.includes("health")) addUnique(terms, ["health", "wellbeing", "6th house", "8th house", "medical safety"]);
  if (domains.includes("safety")) addUnique(terms, ["safety boundary", "supportive response", "risk boundary", "careful language"]);
  if (domains.includes("timing")) addUnique(terms, ["timing", "time window", "current dasha", "grounded timing"]);
  if (domains.includes("general")) addUnique(terms, ["follow up", "missing context", "specific question", "life direction"]);
  if (safety.includes("death") || safety.includes("lifespan")) addUnique(terms, ["safety boundary", "death lifespan refusal", "supportive response", "crisis boundary"]);
  if (safety.includes("medical")) addUnique(terms, ["medical safety", "do not diagnose", "do not stop medicine"]);
  if (safety.includes("legal")) addUnique(terms, ["legal safety", "do not guarantee", "lawyer guidance"]);
  if (safety.includes("self_harm")) addUnique(terms, ["crisis support", "supportive response", "immediate help"]);
  if (safety.includes("financial_guarantee")) addUnique(terms, ["financial safety", "no guarantee", "risk aware"]);
  if (safety.includes("gemstone_guarantee")) addUnique(terms, ["safe remedy", "no guarantee", "optional"]);
  if (safety.includes("unsafe_remedy")) addUnique(terms, ["safe remedy", "non coercive", "low cost"]);
  return sanitizeQueryExpansionTerms(terms);
}

function collectRequiredEvidence(input: QueryExpansionInput, domains: QueryExpansionDomain[]): string[] {
  const safety = combinedSafetyRisks(input);
  const evidence = new Set<string>();
  if (domains.includes("career")) {
    evidence.add("career_rules");
    evidence.add("chart_career_anchors");
    evidence.add("dasha_context");
  }
  if (domains.includes("sleep")) {
    evidence.add("safe_remedy_rules");
    evidence.add("health_safety_boundary");
  }
  if (domains.includes("remedy")) evidence.add("safe_remedy_rules");
  if (domains.includes("marriage")) {
    evidence.add("marriage_rules");
    evidence.add("chart_marriage_anchors");
    evidence.add("dasha_context");
  }
  if (domains.includes("relationship")) evidence.add("relationship_context");
  if (domains.includes("money")) evidence.add("money_rules");
  if (domains.includes("education")) evidence.add("education_rules");
  if (domains.includes("foreign")) evidence.add("foreign_rules");
  if (domains.includes("health")) evidence.add("health_safety_boundary");
  if (domains.includes("safety")) evidence.add("death_lifespan_safety_policy");
  if (domains.includes("timing")) evidence.add("timing_source_availability");
  if (domains.includes("exact_fact")) evidence.add("exact_fact_policy");
  if (domains.includes("general")) evidence.add("sufficiency_policy");
  if (safety.some((item) => ["medical", "legal", "self_harm", "financial_guarantee", "death", "lifespan"].includes(item.toLowerCase()))) {
    evidence.add("safety_boundary_policy");
  }
  return [...evidence];
}

function collectForbiddenExpansions(input: QueryExpansionInput, domains: QueryExpansionDomain[]): string[] {
  const safety = combinedSafetyRisks(input);
  const forbidden = new Set<string>();
  if (domains.includes("career")) forbidden.add("guaranteed promotion");
  if (domains.includes("sleep")) {
    forbidden.add("cure insomnia");
    forbidden.add("stop medicine");
    forbidden.add("guaranteed remedy");
  }
  if (domains.includes("marriage")) forbidden.add("guaranteed marriage date");
  if (domains.includes("money")) forbidden.add("guaranteed profit");
  if (domains.includes("education")) forbidden.add("guaranteed exam success");
  if (domains.includes("foreign")) forbidden.add("guaranteed relocation date");
  if (domains.includes("health")) {
    forbidden.add("diagnosis");
    forbidden.add("cure");
  }
  if (domains.includes("timing")) forbidden.add("exact date without grounded source");
  if (domains.includes("exact_fact")) {
    forbidden.add("interpretive reading");
    forbidden.add("timing prediction");
    forbidden.add("generic life prediction");
  }
  if (safety.some((item) => ["death", "lifespan", "self_harm", "medical", "legal", "financial_guarantee"].includes(item.toLowerCase()))) {
    forbidden.add("death date");
    forbidden.add("lifespan prediction");
    forbidden.add("fatal timing");
    forbidden.add("maraka prediction");
    forbidden.add("diagnosis");
    forbidden.add("legal advice");
    forbidden.add("financial guarantee");
  }
  return sanitizeQueryExpansionTerms([...forbidden]);
}

function collectSafetyNotes(input: QueryExpansionInput, domains: QueryExpansionDomain[]): string[] {
  const safety = combinedSafetyRisks(input);
  const notes: string[] = [];
  if (domains.includes("safety")) notes.push("Keep safety terms bounded and non-predictive.");
  if (domains.includes("health")) notes.push("Use health-supportive retrieval language only; do not diagnose.");
  if (domains.includes("remedy")) notes.push("Remedies must stay optional, low-cost, and non-guaranteed.");
  if (safety.length) notes.push("Safety risk input should dominate expansion choices.");
  return sanitizeQueryExpansionTerms(notes);
}

export function shouldSkipQueryExpansion(input: QueryExpansionInput): { skip: boolean; reason?: string } {
  const question = normalizeQueryExpansionQuestion(input.question);
  if (!question) return { skip: true, reason: "empty_question" };
  if ((input.exactFactMatched ?? false) && !((input.safetyRisks ?? []).length)) return { skip: true, reason: "exact_fact_matched" };
  if (question.length < 8) return { skip: true, reason: "too_short" };
  if (combinedSafetyRisks(input).some((item) => ["death", "lifespan", "self_harm", "medical", "legal", "financial_guarantee"].includes(item.toLowerCase()))) return { skip: false };
  return { skip: false };
}

export function buildDeterministicQueryExpansion(input: QueryExpansionInput): QueryExpansionOutput {
  const normalizedQuestion = normalizeQueryExpansionQuestion(input.question);
  const maxTerms = clampMaxTerms(input.maxTerms);
  const domains = deriveDomains(input, normalizedQuestion);
  const chartAnchors = collectChartAnchors(input, normalizedQuestion, domains).slice(0, maxTerms);
  const searchTerms = collectSearchTerms(input, normalizedQuestion, domains).slice(0, maxTerms);
  const requiredEvidence = collectRequiredEvidence(input, domains);
  const forbiddenExpansions = collectForbiddenExpansions(input, domains);
  const safetyNotes = collectSafetyNotes(input, domains);
  const skipped = shouldSkipQueryExpansion(input);
  const shouldUseExpandedQuery = !skipped.skip && domains[0] !== "exact_fact" && domains[0] !== "general" && searchTerms.length >= 3;
  return {
    mode: "deterministic",
    originalQuestion: input.question,
    normalizedQuestion,
    domains,
    searchTerms,
    chartAnchors,
    requiredEvidence,
    forbiddenExpansions,
    safetyNotes,
    shouldUseExpandedQuery,
    fallbackReason: skipped.reason,
    warnings: searchTerms.length < 3 ? ["query expansion is conservative because the question is underspecified"] : [],
    source: "deterministic",
  };
}

export function validateQueryExpansionOutput(output: unknown, input: QueryExpansionInput): QueryExpansionOutput {
  const deterministic = buildDeterministicQueryExpansion(input);
  if (!output || typeof output !== "object") return deterministic;
  const candidate = output as Record<string, unknown>;
  const domains = Array.isArray(candidate.domains) ? candidate.domains.filter((item): item is QueryExpansionDomain => typeof item === "string" && deterministic.domains.includes(item as QueryExpansionDomain)) : deterministic.domains;
  const searchTerms = sanitizeQueryExpansionTerms(Array.isArray(candidate.searchTerms) ? candidate.searchTerms.filter((item): item is string => typeof item === "string") : deterministic.searchTerms);
  const chartAnchors = sanitizeQueryExpansionTerms(Array.isArray(candidate.chartAnchors) ? candidate.chartAnchors.filter((item): item is string => typeof item === "string") : deterministic.chartAnchors);
  const requiredEvidence = sanitizeQueryExpansionTerms(Array.isArray(candidate.requiredEvidence) ? candidate.requiredEvidence.filter((item): item is string => typeof item === "string") : deterministic.requiredEvidence);
  const forbiddenExpansions = sanitizeQueryExpansionTerms(Array.isArray(candidate.forbiddenExpansions) ? candidate.forbiddenExpansions.filter((item): item is string => typeof item === "string") : deterministic.forbiddenExpansions);
  const safetyNotes = sanitizeQueryExpansionTerms(Array.isArray(candidate.safetyNotes) ? candidate.safetyNotes.filter((item): item is string => typeof item === "string") : deterministic.safetyNotes);
  const safe = {
    ...deterministic,
    mode: typeof candidate.mode === "string" ? (candidate.mode as QueryExpansionMode) : deterministic.mode,
    domains: domains.length ? domains : deterministic.domains,
    searchTerms: searchTerms.slice(0, clampMaxTerms(input.maxTerms)),
    chartAnchors: chartAnchors.filter((anchor) => deterministic.chartAnchors.includes(anchor) || (input.availableChartAnchors ?? []).map((item) => cleanTerm(item)).includes(anchor)).slice(0, clampMaxTerms(input.maxTerms)),
    requiredEvidence,
    forbiddenExpansions,
    safetyNotes,
    shouldUseExpandedQuery: Boolean(candidate.shouldUseExpandedQuery) && deterministic.shouldUseExpandedQuery,
    fallbackReason: typeof candidate.fallbackReason === "string" ? candidate.fallbackReason : deterministic.fallbackReason,
    warnings: sanitizeQueryExpansionTerms(Array.isArray(candidate.warnings) ? candidate.warnings.filter((item): item is string => typeof item === "string") : deterministic.warnings),
    source: candidate.source === "ollama" ? "ollama" : deterministic.source,
  } satisfies QueryExpansionOutput;

  if (safe.searchTerms.length > clampMaxTerms(input.maxTerms)) safe.searchTerms = safe.searchTerms.slice(0, clampMaxTerms(input.maxTerms));
  if (safe.domains.includes("safety")) {
    safe.searchTerms = sanitizeQueryExpansionTerms(["safety boundary", ...safe.searchTerms]);
  }
  if (input.exactFactMatched) {
    safe.shouldUseExpandedQuery = false;
    safe.domains = ["exact_fact"];
  }
  if (safe.source === "ollama" && safe.searchTerms.some((term) => /date of birth|birth time|address|phone|email|secret|token/i.test(term))) {
    return deterministic;
  }
  return safe;
}

export function mergeQueryExpansions(input: { deterministic: QueryExpansionOutput; local?: QueryExpansionOutput | null; maxTerms?: number }): QueryExpansionOutput {
  const maxTerms = clampMaxTerms(input.maxTerms);
  const deterministic = input.deterministic;
  if (!input.local) return { ...deterministic, searchTerms: deterministic.searchTerms.slice(0, maxTerms), chartAnchors: deterministic.chartAnchors.slice(0, maxTerms) };
  const local = input.local;
  const mergedTerms = sanitizeQueryExpansionTerms([...deterministic.searchTerms, ...local.searchTerms]).slice(0, maxTerms);
  const mergedAnchors = sanitizeQueryExpansionTerms([...deterministic.chartAnchors, ...local.chartAnchors]).slice(0, maxTerms);
  const mergedDomains = [...new Set([...deterministic.domains, ...local.domains])];
  const forbidden = sanitizeQueryExpansionTerms([...deterministic.forbiddenExpansions, ...local.forbiddenExpansions]);
  const requiredEvidence = sanitizeQueryExpansionTerms([...deterministic.requiredEvidence, ...local.requiredEvidence]);
  const safetyNotes = sanitizeQueryExpansionTerms([...deterministic.safetyNotes, ...local.safetyNotes]);
  const shouldUseExpandedQuery = Boolean(local.shouldUseExpandedQuery && mergedTerms.length >= 3 && local.source !== "disabled");
  return {
    ...deterministic,
    mode: local.mode === "local_model" ? "local_model" : local.mode === "fallback" ? "fallback" : deterministic.mode,
    domains: mergedDomains as QueryExpansionDomain[],
    searchTerms: mergedTerms,
    chartAnchors: mergedAnchors,
    requiredEvidence,
    forbiddenExpansions: forbidden,
    safetyNotes,
    shouldUseExpandedQuery,
    fallbackReason: local.fallbackReason ?? deterministic.fallbackReason,
    warnings: sanitizeQueryExpansionTerms([...deterministic.warnings, ...local.warnings]),
    source: local.source,
  };
}

function safeParseLocalExpansion(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function expandQueryWithLocalModel(input: QueryExpansionInput & { client?: LocalQueryExpanderClient }): Promise<QueryExpansionOutput> {
  const deterministic = buildDeterministicQueryExpansion(input);
  const routed = routeLocalModelTask("query_expander", input.env ?? process.env);
  if (!routed.useLocal || !input.client) {
    return routed.useLocal ? { ...deterministic, mode: "fallback", source: "deterministic", fallbackReason: routed.fallbackReason ?? "local_client_missing" } : { ...deterministic, mode: "disabled", source: "disabled", fallbackReason: routed.fallbackReason ?? "query_expander_disabled" };
  }

  try {
    const raw = await input.client.expand({ question: input.question, deterministic, profile: routed.profile });
    const parsed = safeParseLocalExpansion(raw);
    const validated = validateQueryExpansionOutput(parsed ?? raw, input);
    return mergeQueryExpansions({ deterministic, local: validated, maxTerms: input.maxTerms });
  } catch (error) {
    return { ...deterministic, mode: "fallback", source: "deterministic", fallbackReason: error instanceof Error ? error.message : "local_query_expansion_failed" };
  }
}
