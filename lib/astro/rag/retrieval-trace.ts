/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export interface AstroRetrievalTraceRule {
  ruleId: string;
  score?: number;
  rankingReasons?: string[];
  rejectionReasons?: string[];
  sourceReliability?: string | null;
  lifeAreaTags?: string[];
  conditionTags?: string[];
}

export interface AstroRetrievalTrace {
  traceId: string;
  enabled: boolean;
  questionDomain?: string | null;
  structuredRagEnabled: boolean;
  fallbackUsed: boolean;
  fallbackReason?: string | null;
  candidateCount: number;
  selectedCount: number;
  selectedRules: AstroRetrievalTraceRule[];
  rejectedRules?: AstroRetrievalTraceRule[];
  packedPromptCharacters?: number;
  exactFactMode?: boolean;
  safetyBlocked?: boolean;
}

export function isAstroRetrievalTraceEnabled(): boolean {
  return process.env.ASTRO_RAG_TRACE_ENABLED === "true" && process.env.NODE_ENV !== "production";
}

export function createAstroRetrievalTraceId(): string {
  return `astro_rag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanRule(rule: AstroRetrievalTraceRule): AstroRetrievalTraceRule {
  return {
    ruleId: rule.ruleId,
    score: typeof rule.score === "number" ? rule.score : undefined,
    rankingReasons: Array.isArray(rule.rankingReasons) ? [...new Set(rule.rankingReasons.filter(Boolean))] : undefined,
    rejectionReasons: Array.isArray(rule.rejectionReasons) ? [...new Set(rule.rejectionReasons.filter(Boolean))] : undefined,
    sourceReliability: rule.sourceReliability ?? null,
    lifeAreaTags: Array.isArray(rule.lifeAreaTags) ? [...new Set(rule.lifeAreaTags.filter(Boolean))] : [],
    conditionTags: Array.isArray(rule.conditionTags) ? [...new Set(rule.conditionTags.filter(Boolean))] : [],
  };
}

export function sanitizeAstroRetrievalTrace(trace: AstroRetrievalTrace): AstroRetrievalTrace {
  return {
    traceId: trace.traceId,
    enabled: Boolean(trace.enabled),
    questionDomain: trace.questionDomain ?? null,
    structuredRagEnabled: Boolean(trace.structuredRagEnabled),
    fallbackUsed: Boolean(trace.fallbackUsed),
    fallbackReason: trace.fallbackReason ?? null,
    candidateCount: Number.isFinite(trace.candidateCount) ? trace.candidateCount : 0,
    selectedCount: Number.isFinite(trace.selectedCount) ? trace.selectedCount : 0,
    selectedRules: (trace.selectedRules ?? []).map(cleanRule),
    rejectedRules: (trace.rejectedRules ?? []).map(cleanRule),
    packedPromptCharacters: Number.isFinite(trace.packedPromptCharacters ?? NaN) ? trace.packedPromptCharacters : undefined,
    exactFactMode: trace.exactFactMode,
    safetyBlocked: trace.safetyBlocked,
  };
}
