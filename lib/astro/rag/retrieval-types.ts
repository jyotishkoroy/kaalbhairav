/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ChartFact } from "./chart-fact-extractor";
import type { RequiredDataPlan } from "./required-data-planner";
import type { QueryExpansionDomain } from "./local-query-expander";

export type RetrievalQueryExpansionMeta = {
  used: boolean;
  mode: "deterministic" | "local_model" | "disabled" | "fallback";
  source: "deterministic" | "ollama" | "disabled";
  domains: QueryExpansionDomain[];
  searchTerms: string[];
  chartAnchors: string[];
  requiredEvidence: string[];
  safetyNotes: string[];
  fallbackReason?: string;
  warnings: string[];
};

export type SupabaseQueryResult<T> = {
  data: T[] | null;
  error: { message?: string; code?: string; details?: string } | null;
};

export type SupabaseQueryLike<T = unknown> = {
  select: (columns?: string) => SupabaseQueryLike<T>;
  eq: (column: string, value: unknown) => SupabaseQueryLike<T>;
  in: (column: string, values: unknown[]) => SupabaseQueryLike<T>;
  contains: (column: string, value: unknown) => SupabaseQueryLike<T>;
  overlaps: (column: string, value: unknown) => SupabaseQueryLike<T>;
  or: (filters: string) => SupabaseQueryLike<T>;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => SupabaseQueryLike<T>;
  limit: (count: number) => PromiseLike<SupabaseQueryResult<T>> | SupabaseQueryLike<T>;
  then?: unknown;
};

export type SupabaseLikeClient = {
  from: <T = unknown>(table: string) => SupabaseQueryLike<T>;
};

export type ReasoningRule = {
  id: string;
  ruleKey: string;
  domain: string;
  title: string;
  description: string;
  requiredFactTypes: string[];
  requiredTags: string[];
  reasoningTemplate: string;
  sourceReference?: string;
  sourceReliability?: string;
  primaryPlanet?: string | null;
  secondaryPlanet?: string | null;
  house?: number | null;
  targetHouse?: number | null;
  sign?: string | null;
  lordship?: string | null;
  dignity?: string | null;
  aspectType?: string | null;
  yogaName?: string | null;
  divisionalChart?: string | null;
  dashaCondition?: string | null;
  transitCondition?: string | null;
  normalizedSourceText?: string | null;
  normalizedSourceReference?: string | null;
  normalizedSourceReliability?: string | null;
  normalizedEmbeddingText?: string | null;
  normalizedPromptCompactSummary?: string | null;
  structuredRule?: {
    condition?: string;
    interpretation?: string;
  };
  lifeAreaTags?: string[];
  conditionTags?: string[];
  retrievalKeywords?: string[];
  weight: number;
  safetyNotes: string[];
  enabled: boolean;
  metadata: Record<string, unknown>;
};

export type BenchmarkExample = {
  id: string;
  exampleKey: string;
  domain: string;
  question: string;
  answer: string;
  reasoning: string | null;
  accuracyClass: string | null;
  readingStyle: string | null;
  followUpQuestion: string | null;
  tags: string[];
  linkedRuleIds?: string[];
  exampleType?: string | null;
  userQuestion?: string | null;
  chartConditionSummary?: string | null;
  retrievedRules?: string[] | null;
  goodAnswerExample?: string | null;
  badAnswerExample?: string | null;
  whyGoodAnswerIsGood?: string | null;
  whyBadAnswerIsBad?: string | null;
  lifeAreaTags?: string[];
  conditionTags?: string[];
  safetyNotes?: string[];
  metadata: Record<string, unknown>;
  enabled: boolean;
};

export type SourceNote = {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  reliabilityLevel: string | null;
  recommendedUsage: string | null;
  limitations: string | null;
  citationGuidance: string | null;
  metadata: Record<string, unknown>;
};

export type RetrievalTag = {
  tagId: string;
  tagName: string;
  tagCategory: string | null;
  description: string | null;
  synonyms: string[];
  relatedTags: string[];
  metadata: Record<string, unknown>;
};

export type ValidationCheck = {
  checkId: string;
  checkCategory: string | null;
  checkStatement: string;
  failurePattern: string | null;
  correctionInstruction: string | null;
  metadata: Record<string, unknown>;
};

export type TimingWindow = {
  id: string;
  userId: string;
  profileId: string | null;
  domain: string;
  label: string;
  startsOn: string | null;
  endsOn: string | null;
  interpretation: string;
  source: "dasha" | "varshaphal" | "python_transit" | "stored" | "user_provided";
  confidence: "partial" | "strong";
  tags: string[];
  metadata: Record<string, unknown>;
};

export type SafeRemedy = {
  id: string;
  domain: string;
  title: string;
  description: string;
  tags: string[];
  restrictions: string[];
  source: "rule" | "benchmark" | "deterministic";
};

export type RetrievalContext = {
  chartFacts: ChartFact[];
  reasoningRules: ReasoningRule[];
  benchmarkExamples: BenchmarkExample[];
  sourceNotes?: SourceNote[];
  retrievalTags?: RetrievalTag[];
  validationChecks?: ValidationCheck[];
  timingWindows: TimingWindow[];
  safeRemedies: SafeRemedy[];
  memorySummary?: string;
  queryExpansion?: RetrievalQueryExpansionMeta;
  expandedSearchTerms?: string[];
  requiredEvidenceHints?: string[];
  chartAnchorHints?: string[];
  promptContextText?: string;
  promptIncludedRuleIds?: string[];
  promptIncludedValidationCheckIds?: string[];
  promptIncludedExampleIds?: string[];
  structuredRagUsed?: boolean;
  structuredRagFallbackReason?: string;
  metadata: {
    userId: string;
    profileId: string | null;
    domain: RequiredDataPlan["domain"];
    requestedFactKeys: string[];
    retrievalTags: string[];
    expandedSearchTerms?: string[];
    errors: string[];
    partial: boolean;
  };
};

export type RetrievalServiceInput = {
  question?: string;
  supabase: SupabaseLikeClient;
  userId: string;
  profileId?: string | null;
  plan: RequiredDataPlan;
  limit?: number;
  includeBenchmarks?: boolean;
  includeKnowledge?: boolean;
  includeTiming?: boolean;
  includeRemedies?: boolean;
  memorySummary?: string;
  exactFactMatched?: boolean;
  safetyRisks?: string[];
  availableChartAnchors?: string[];
  queryExpansionClient?: import("./local-query-expander").LocalQueryExpanderClient;
  env?: Record<string, string | undefined>;
};

export type RepositoryResult<T> = {
  ok: boolean;
  data: T[];
  error?: string;
  partial?: boolean;
};

export function normalizeStringArray(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of values) {
    const text = typeof item === "string" ? item.trim() : typeof item === "number" && Number.isFinite(item) ? String(item) : "";
    if (!text) continue;
    const normalized = text.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(text);
  }
  return out;
}

export function compactRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

export function snakeToCamelRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    out[camel] = value;
  }
  return out;
}
