/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type AstroRagSource =
  | "deterministic"
  | "supabase"
  | "ollama"
  | "groq"
  | "fallback";

export type AstroRagStatus =
  | "not_enabled"
  | "exact_fact"
  | "answer_now"
  | "ask_followup"
  | "fallback";

export type AstroRagMetadata = {
  engine: "old_v2" | "rag_llm";
  exactFactAnswered: boolean;
  safetyGatePassed: boolean;
  ollamaAnalyzerUsed: boolean;
  groqUsed: boolean;
  ollamaCriticUsed: boolean;
  validationPassed: boolean;
  fallbackUsed: boolean;
};

export type AstroRagQuestion = {
  userId?: string;
  profileId?: string;
  question: string;
  language?: string;
};

export type AstroRagAnswer = {
  answer: string;
  followUpQuestion?: string | null;
  followUpAnswer?: string | null;
  status: AstroRagStatus;
  meta: AstroRagMetadata;
};

export type AstroSourceReliability =
  | "primary_classical"
  | "classical_translation"
  | "traditional_commentary"
  | "modern_interpretation"
  | string;

export interface AstroReasoningRule {
  ruleId: string;
  ruleStatement?: string | null;
  promptCompactSummary?: string | null;
  sourceText?: string | null;
  sourceReference?: string | null;
  sourceReliability?: AstroSourceReliability | null;
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
  lifeAreaTags?: readonly string[];
  conditionTags?: readonly string[];
  retrievalKeywords?: readonly string[];
  requiredTags?: readonly string[];
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AstroStructuredRuleFilters {
  domains?: readonly string[];
  lifeAreaTags?: readonly string[];
  conditionTags?: readonly string[];
  planets?: readonly string[];
  houses?: readonly number[];
  signs?: readonly string[];
  sourceReliability?: readonly AstroSourceReliability[];
  requiredTags?: readonly string[];
  chartFactTags?: readonly string[];
  limit?: number;
  candidateLimit?: number;
}

export interface AstroRuleRankingContext {
  userQuestion?: string;
  domains: readonly string[];
  lifeAreaTags: readonly string[];
  conditionTags: readonly string[];
  chartFactTags: readonly string[];
  planets: readonly string[];
  houses: readonly number[];
  signs: readonly string[];
  exactFactMode?: boolean;
  safetyBlocked?: boolean;
}

export interface AstroRankedReasoningRule {
  rule: AstroReasoningRule;
  score: number;
  rankingReasons: string[];
  rejectionReasons?: string[];
}
