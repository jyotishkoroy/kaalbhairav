/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroReasoningRule, AstroStructuredRuleFilters } from "./types";
import type { ReasoningRule, RepositoryResult, SupabaseLikeClient } from "./retrieval-types";
import type { SupabaseQueryResult } from "./retrieval-types";
import { compactRecord, normalizeStringArray, snakeToCamelRecord } from "./retrieval-types";

export type FetchReasoningRulesInput = {
  supabase: SupabaseLikeClient;
  domains: string[];
  tags: string[];
  limit?: number;
};

const DEFAULT_CANDIDATE_LIMIT = 120;
const MAX_CANDIDATE_LIMIT = 240;
const RELIABILITY_PRIORITY: Record<string, number> = {
  primary_classical: 20,
  classical_translation: 16,
  traditional_commentary: 12,
  modern_interpretation: 4,
};

function asErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return String((error as { message: string }).message);
  }
  return "failed to fetch reasoning rules";
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function uniqueNumbers(values: readonly number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value))));
}

function mapRule(row: Record<string, unknown>): ReasoningRule {
  const camel = snakeToCamelRecord(row);
  return {
    id: String(camel.id ?? ""),
    ruleKey: String(camel.ruleKey ?? ""),
    domain: String(camel.domain ?? ""),
    title: String(camel.title ?? ""),
    description: String(camel.description ?? ""),
    requiredFactTypes: normalizeStringArray(camel.requiredFactTypes),
    requiredTags: normalizeStringArray(camel.requiredTags),
    reasoningTemplate: String(camel.reasoningTemplate ?? ""),
    sourceReference: camel.sourceReference == null ? undefined : String(camel.sourceReference),
    sourceReliability: camel.sourceReliability == null ? undefined : String(camel.sourceReliability),
    primaryPlanet: camel.primaryPlanet == null ? null : String(camel.primaryPlanet),
    secondaryPlanet: camel.secondaryPlanet == null ? null : String(camel.secondaryPlanet),
    house: camel.house == null || !Number.isFinite(Number(camel.house)) ? null : Number(camel.house),
    targetHouse: camel.targetHouse == null || !Number.isFinite(Number(camel.targetHouse)) ? null : Number(camel.targetHouse),
    sign: camel.sign == null ? null : String(camel.sign),
    lordship: camel.lordship == null ? null : String(camel.lordship),
    dignity: camel.dignity == null ? null : String(camel.dignity),
    aspectType: camel.aspectType == null ? null : String(camel.aspectType),
    yogaName: camel.yogaName == null ? null : String(camel.yogaName),
    divisionalChart: camel.divisionalChart == null ? null : String(camel.divisionalChart),
    dashaCondition: camel.dashaCondition == null ? null : String(camel.dashaCondition),
    transitCondition: camel.transitCondition == null ? null : String(camel.transitCondition),
    normalizedSourceText: camel.normalizedSourceText == null ? null : String(camel.normalizedSourceText),
    normalizedSourceReference: camel.normalizedSourceReference == null ? null : String(camel.normalizedSourceReference),
    normalizedSourceReliability: camel.normalizedSourceReliability == null ? null : String(camel.normalizedSourceReliability),
    normalizedEmbeddingText: camel.normalizedEmbeddingText == null ? null : String(camel.normalizedEmbeddingText),
    normalizedPromptCompactSummary: camel.normalizedPromptCompactSummary == null ? null : String(camel.normalizedPromptCompactSummary),
    structuredRule: camel.structuredRule && typeof camel.structuredRule === "object" ? compactRecord(camel.structuredRule) as ReasoningRule["structuredRule"] : undefined,
    lifeAreaTags: normalizeStringArray(camel.lifeAreaTags),
    conditionTags: normalizeStringArray(camel.conditionTags),
    retrievalKeywords: normalizeStringArray(camel.retrievalKeywords),
    weight: Number.isFinite(Number(camel.weight)) ? Number(camel.weight) : 0,
    safetyNotes: normalizeStringArray(camel.safetyNotes),
    enabled: Boolean(camel.enabled),
    metadata: compactRecord(camel.metadata),
  };
}

function mapAstroReasoningRule(row: Record<string, unknown>): AstroReasoningRule {
  const rule = mapRule(row);
  return {
    ruleId: rule.ruleKey || rule.id,
    ruleStatement: rule.title,
    promptCompactSummary: rule.normalizedPromptCompactSummary ?? rule.reasoningTemplate ?? null,
    sourceText: rule.normalizedSourceText ?? rule.description ?? null,
    sourceReference: rule.normalizedSourceReference ?? rule.sourceReference ?? null,
    sourceReliability: rule.normalizedSourceReliability ?? rule.sourceReliability ?? null,
    primaryPlanet: rule.primaryPlanet ?? null,
    secondaryPlanet: rule.secondaryPlanet ?? null,
    house: rule.house ?? null,
    targetHouse: rule.targetHouse ?? null,
    sign: rule.sign ?? null,
    lordship: rule.lordship ?? null,
    dignity: rule.dignity ?? null,
    aspectType: rule.aspectType ?? null,
    yogaName: rule.yogaName ?? null,
    divisionalChart: rule.divisionalChart ?? null,
    dashaCondition: rule.dashaCondition ?? null,
    transitCondition: rule.transitCondition ?? null,
    normalizedSourceText: rule.normalizedSourceText ?? null,
    normalizedSourceReference: rule.normalizedSourceReference ?? null,
    normalizedSourceReliability: rule.normalizedSourceReliability ?? null,
    normalizedEmbeddingText: rule.normalizedEmbeddingText ?? null,
    normalizedPromptCompactSummary: rule.normalizedPromptCompactSummary ?? null,
    lifeAreaTags: rule.lifeAreaTags,
    conditionTags: rule.conditionTags,
    retrievalKeywords: rule.retrievalKeywords,
    requiredTags: rule.requiredTags,
    enabled: rule.enabled,
    metadata: rule.metadata,
  };
}

function mergeRulesById(...lists: AstroReasoningRule[][]): AstroReasoningRule[] {
  const map = new Map<string, AstroReasoningRule>();
  for (const list of lists) {
    for (const rule of list) {
      if (!map.has(rule.ruleId)) map.set(rule.ruleId, rule);
    }
  }
  return Array.from(map.values());
}

function compareRulePriority(left: AstroReasoningRule, right: AstroReasoningRule): number {
  const leftReliability = RELIABILITY_PRIORITY[left.normalizedSourceReliability ?? left.sourceReliability ?? ""] ?? 0;
  const rightReliability = RELIABILITY_PRIORITY[right.normalizedSourceReliability ?? right.sourceReliability ?? ""] ?? 0;
  return rightReliability - leftReliability || (right.retrievalKeywords?.length ?? 0) - (left.retrievalKeywords?.length ?? 0) || right.ruleId.localeCompare(left.ruleId);
}

function mapToAstroReasoningRules(rows: Record<string, unknown>[]): AstroReasoningRule[] {
  return rows.map(mapAstroReasoningRule).sort(compareRulePriority);
}

function buildStructuredFilters(filters: AstroStructuredRuleFilters) {
  return {
    domains: uniqueStrings(filters.domains ?? []),
    lifeAreaTags: uniqueStrings(filters.lifeAreaTags ?? []),
    conditionTags: uniqueStrings(filters.conditionTags ?? []),
    planets: uniqueStrings(filters.planets ?? []),
    houses: uniqueNumbers(filters.houses ?? []),
    signs: uniqueStrings(filters.signs ?? []),
    sourceReliability: uniqueStrings((filters.sourceReliability ?? []) as readonly string[]),
    requiredTags: uniqueStrings(filters.requiredTags ?? []),
    chartFactTags: uniqueStrings(filters.chartFactTags ?? []),
  };
}

async function fetchRulesWithQuery(supabase: SupabaseLikeClient, queryBuilder: (query: ReturnType<SupabaseLikeClient["from"]>) => ReturnType<SupabaseLikeClient["from"]>, limit: number): Promise<AstroReasoningRule[]> {
  const result = (await (queryBuilder(supabase.from("astro_reasoning_rules")).limit(limit) as PromiseLike<SupabaseQueryResult<Record<string, unknown>>>)) as SupabaseQueryResult<Record<string, unknown>>;
  if (result.error) {
    throw new Error(asErrorMessage(result.error));
  }
  const rows = Array.isArray(result.data) ? (result.data as unknown[]).filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
  return mapToAstroReasoningRules(rows);
}

export async function fetchStructuredReasoningRuleCandidates(
  supabase: SupabaseLikeClient,
  filters: AstroStructuredRuleFilters,
): Promise<AstroReasoningRule[]> {
  const normalized = buildStructuredFilters(filters);
  const candidateLimit = Math.min(Math.max(filters.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT, filters.limit ?? 8), MAX_CANDIDATE_LIMIT);
  const limit = Math.min(filters.limit ?? 8, candidateLimit);

  const structured = await fetchRulesWithQuery(supabase, (query) => {
    let next = query.select("*");
    if (normalized.domains.length) next = next.in("domain", normalized.domains);
    if (normalized.lifeAreaTags.length) next = next.overlaps("life_area_tags", normalized.lifeAreaTags);
    if (normalized.conditionTags.length) next = next.overlaps("condition_tags", normalized.conditionTags);
    if (normalized.planets.length) next = next.in("primary_planet", normalized.planets);
    if (normalized.houses.length) next = next.in("house", normalized.houses);
    if (normalized.signs.length) next = next.in("sign", normalized.signs);
    if (normalized.sourceReliability.length) next = next.in("normalized_source_reliability", normalized.sourceReliability);
    if (normalized.requiredTags.length) next = next.overlaps("required_tags", normalized.requiredTags);
    if (normalized.chartFactTags.length) next = next.overlaps("retrieval_keywords", normalized.chartFactTags);
    return next;
  }, candidateLimit).catch(() => []);

  if (structured.length >= limit) {
    return structured.slice(0, limit);
  }

  const broad = await fetchRulesWithQuery(supabase, (query) => {
    let next = query.select("*");
    if (normalized.domains.length) next = next.in("domain", normalized.domains);
    if (normalized.requiredTags.length) next = next.overlaps("required_tags", normalized.requiredTags);
    if (normalized.lifeAreaTags.length) next = next.overlaps("life_area_tags", normalized.lifeAreaTags);
    if (normalized.conditionTags.length) next = next.overlaps("condition_tags", normalized.conditionTags);
    return next;
  }, candidateLimit).catch(() => []);

  return mergeRulesById(structured, broad).slice(0, limit);
}

export async function fetchReasoningRules(input: FetchReasoningRulesInput): Promise<RepositoryResult<ReasoningRule>> {
  const limit = input.limit ?? 12;
  try {
    let query = input.supabase
      .from<ReasoningRule>("astro_reasoning_rules")
      .select("id, rule_key, domain, title, description, required_fact_types, required_tags, reasoning_template, source_reference, source_reliability, structured_rule, life_area_tags, condition_tags, retrieval_keywords, weight, safety_notes, enabled, metadata")
      .eq("enabled", true);

    if (input.domains.length) {
      query = query.in("domain", input.domains);
    }
    if (input.tags.length) {
      query = query.overlaps("required_tags", input.tags);
    }

    const result = (await (query.order("weight", { ascending: false }).limit(limit) as PromiseLike<SupabaseQueryResult<ReasoningRule>>)) as SupabaseQueryResult<ReasoningRule>;
    if (result.error) {
      return { ok: false, data: [], error: asErrorMessage(result.error) };
    }
    const rows = Array.isArray(result.data) ? (result.data as unknown[]).filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
    const data = rows.map(mapRule).sort((a, b) => b.weight - a.weight || a.domain.localeCompare(b.domain) || a.ruleKey.localeCompare(b.ruleKey));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, data: [], error: asErrorMessage(error) };
  }
}
