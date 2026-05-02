/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ChartFact } from "./chart-fact-extractor";
import type { RequiredDataPlan } from "./required-data-planner";
import type {
  RetrievalContext,
  RetrievalQueryExpansionMeta,
  RetrievalServiceInput,
  RepositoryResult,
  SafeRemedy,
  SupabaseLikeClient,
  SupabaseQueryResult,
} from "./retrieval-types";
import { compactRecord, normalizeStringArray, snakeToCamelRecord } from "./retrieval-types";
import { buildDeterministicQueryExpansion, expandQueryWithLocalModel, sanitizeQueryExpansionTerms } from "./local-query-expander";
import { fetchBenchmarkExamples } from "./benchmark-repository";
import { fetchReasoningRules, fetchStructuredReasoningRuleCandidates } from "./reasoning-rule-repository";
import { fetchTimingWindows } from "./timing-repository";
import { buildStructuredRuleRankingContext, inferHousesFromQuestion, inferLifeAreaTagsFromQuestion, inferPlanetsFromQuestion } from "./chart-fact-extractor";
import { packAstroRagPromptContext } from "./prompt-packer";
import { selectStructuredReasoningRules } from "./reasoning-rule-selector";
import {
  createAstroRetrievalTraceId,
  isAstroRetrievalTraceEnabled,
  sanitizeAstroRetrievalTrace,
  type AstroRetrievalTrace,
} from "./retrieval-trace";

export type FetchChartFactsInput = {
  supabase: SupabaseLikeClient;
  userId: string;
  profileId?: string | null;
  requiredFacts: string[];
  optionalFacts: string[];
  tags: string[];
  limit?: number;
};

type RetrievalExpansionInput = {
  question: string;
  env?: Record<string, string | undefined>;
  exactFactMatched?: boolean;
  safetyRisks?: string[];
  availableChartAnchors?: string[];
  queryExpansionClient?: NonNullable<RetrievalServiceInput["queryExpansionClient"]>;
  maxTerms?: number;
};

function clampList(values: string[], limit: number): string[] {
  return sanitizeQueryExpansionTerms(values).slice(0, limit);
}

function buildQueryExpansionMeta(
  output: ReturnType<typeof buildDeterministicQueryExpansion>,
  used: boolean,
): RetrievalQueryExpansionMeta {
  return {
    used,
    mode: output.mode,
    source: output.source,
    domains: output.domains,
    searchTerms: clampList(output.searchTerms, 12),
    chartAnchors: clampList(output.chartAnchors, 12),
    requiredEvidence: clampList(output.requiredEvidence, 12),
    safetyNotes: clampList(output.safetyNotes, 12),
    fallbackReason: output.fallbackReason,
    warnings: clampList(output.warnings, 12),
  };
}

function mapSourceNote(row: Record<string, unknown>) {
  const camel = snakeToCamelRecord(row);
  return {
    sourceId: String(camel.sourceId ?? ""),
    sourceName: String(camel.sourceName ?? ""),
    sourceType: String(camel.sourceType ?? ""),
    reliabilityLevel: camel.reliabilityLevel == null ? null : String(camel.reliabilityLevel),
    recommendedUsage: camel.recommendedUsage == null ? null : String(camel.recommendedUsage),
    limitations: camel.limitations == null ? null : String(camel.limitations),
    citationGuidance: camel.citationGuidance == null ? null : String(camel.citationGuidance),
    metadata: compactRecord(camel.metadata),
  };
}

function mapRetrievalTag(row: Record<string, unknown>) {
  const camel = snakeToCamelRecord(row);
  return {
    tagId: String(camel.tagId ?? ""),
    tagName: String(camel.tagName ?? ""),
    tagCategory: camel.tagCategory == null ? null : String(camel.tagCategory),
    description: camel.description == null ? null : String(camel.description),
    synonyms: normalizeStringArray(camel.synonyms),
    relatedTags: normalizeStringArray(camel.relatedTags),
    metadata: compactRecord(camel.metadata),
  };
}

function mapValidationCheck(row: Record<string, unknown>) {
  const camel = snakeToCamelRecord(row);
  return {
    checkId: String(camel.checkId ?? ""),
    checkCategory: camel.checkCategory == null ? null : String(camel.checkCategory),
    checkStatement: String(camel.checkStatement ?? ""),
    failurePattern: camel.failurePattern == null ? null : String(camel.failurePattern),
    correctionInstruction: camel.correctionInstruction == null ? null : String(camel.correctionInstruction),
    metadata: compactRecord(camel.metadata),
  };
}

async function fetchSourceNotes(input: { supabase: SupabaseLikeClient; limit?: number }) {
  try {
    const result = (await input.supabase
      .from("astro_source_notes")
      .select("source_id, source_name, source_type, reliability_level, recommended_usage, limitations, citation_guidance, metadata")
      .limit(input.limit ?? 64)) as SupabaseQueryResult<Record<string, unknown>>;
    if (result.error) return { ok: false, data: [], error: asErrorMessage(result.error) };
    const rows = Array.isArray(result.data) ? result.data.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
    return { ok: true, data: rows.map(mapSourceNote) };
  } catch (error) {
    return { ok: false, data: [], error: asErrorMessage(error) };
  }
}

async function fetchRetrievalTags(input: { supabase: SupabaseLikeClient; limit?: number }) {
  try {
    const result = (await input.supabase
      .from("astro_retrieval_tags")
      .select("tag_id, tag_name, tag_category, description, synonyms, related_tags, metadata")
      .limit(input.limit ?? 64)) as SupabaseQueryResult<Record<string, unknown>>;
    if (result.error) return { ok: false, data: [], error: asErrorMessage(result.error) };
    const rows = Array.isArray(result.data) ? result.data.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
    return { ok: true, data: rows.map(mapRetrievalTag) };
  } catch (error) {
    return { ok: false, data: [], error: asErrorMessage(error) };
  }
}

async function fetchValidationChecks(input: { supabase: SupabaseLikeClient; limit?: number }) {
  try {
    const result = (await input.supabase
      .from("astro_validation_checks")
      .select("check_id, check_category, check_statement, failure_pattern, correction_instruction, metadata")
      .limit(input.limit ?? 64)) as SupabaseQueryResult<Record<string, unknown>>;
    if (result.error) return { ok: false, data: [], error: asErrorMessage(result.error) };
    const rows = Array.isArray(result.data) ? result.data.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
    return { ok: true, data: rows.map(mapValidationCheck) };
  } catch (error) {
    return { ok: false, data: [], error: asErrorMessage(error) };
  }
}

async function resolveQueryExpansion(input: RetrievalExpansionInput): Promise<{ meta: RetrievalQueryExpansionMeta; expandedSearchTerms: string[]; requiredEvidenceHints: string[]; chartAnchorHints: string[] }> {
  const deterministic = buildDeterministicQueryExpansion({
    question: input.question,
    exactFactMatched: input.exactFactMatched,
    safetyRisks: input.safetyRisks,
    availableChartAnchors: input.availableChartAnchors,
    maxTerms: input.maxTerms,
    env: input.env,
  });

  if (!input.env?.ASTRO_LOCAL_QUERY_EXPANDER_ENABLED || input.env.ASTRO_LOCAL_QUERY_EXPANDER_ENABLED !== "true") {
    return {
      meta: buildQueryExpansionMeta({ ...deterministic, mode: "disabled", source: "disabled", shouldUseExpandedQuery: false }, false),
      expandedSearchTerms: [],
      requiredEvidenceHints: [],
      chartAnchorHints: [],
    };
  }

  if (input.exactFactMatched) {
    return {
      meta: buildQueryExpansionMeta({ ...deterministic, mode: "disabled", source: "disabled", shouldUseExpandedQuery: false, fallbackReason: "exact_fact_matched" }, false),
      expandedSearchTerms: [],
      requiredEvidenceHints: [],
      chartAnchorHints: [],
    };
  }

  if (!input.queryExpansionClient) {
    return {
      meta: buildQueryExpansionMeta(
        { ...deterministic, mode: "fallback", source: "deterministic", fallbackReason: "local_client_missing" },
        Boolean(deterministic.shouldUseExpandedQuery && deterministic.searchTerms.length && deterministic.domains[0] !== "general" && deterministic.domains[0] !== "exact_fact"),
      ),
      expandedSearchTerms: clampList(deterministic.searchTerms, 12),
      requiredEvidenceHints: clampList(deterministic.requiredEvidence, 12),
      chartAnchorHints: clampList(deterministic.chartAnchors, 12),
    };
  }

  const local = await expandQueryWithLocalModel({
    question: input.question,
    exactFactMatched: input.exactFactMatched,
    safetyRisks: input.safetyRisks,
    availableChartAnchors: input.availableChartAnchors,
    maxTerms: input.maxTerms,
    env: input.env,
    client: input.queryExpansionClient,
  });
  const merged = local.mode === "disabled" ? deterministic : local;
  const used = Boolean(merged.shouldUseExpandedQuery && merged.searchTerms.length && merged.domains[0] !== "general" && merged.domains[0] !== "exact_fact");
  return {
    meta: buildQueryExpansionMeta(merged, used),
    expandedSearchTerms: clampList(merged.searchTerms, 12),
    requiredEvidenceHints: clampList(merged.requiredEvidence, 12),
    chartAnchorHints: clampList(merged.chartAnchors, 12),
  };
}

function asErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return String((error as { message: string }).message);
  }
  return "retrieval failed";
}

function isStructuredRagEnabled(env?: Record<string, string | undefined>): boolean {
  return env?.ASTRO_STRUCTURED_RAG_ENABLED === "true";
}

function mapChartFact(row: Record<string, unknown>): ChartFact {
  const camel = snakeToCamelRecord(row);
  return {
    userId: camel.userId == null ? undefined : String(camel.userId),
    profileId: camel.profileId == null ? null : String(camel.profileId),
    chartVersionId: camel.chartVersionId == null ? null : String(camel.chartVersionId),
    factType: String(camel.factType ?? ""),
    factKey: String(camel.factKey ?? ""),
    factValue: String(camel.factValue ?? ""),
    planet: camel.planet == null ? null : String(camel.planet),
    house: camel.house == null || !Number.isFinite(Number(camel.house)) ? null : Number(camel.house),
    sign: camel.sign == null ? null : String(camel.sign),
    degreeNumeric: camel.degreeNumeric == null || !Number.isFinite(Number(camel.degreeNumeric)) ? null : Number(camel.degreeNumeric),
    source: ["chart_json", "derived", "report_json"].includes(String(camel.source)) ? (String(camel.source) as ChartFact["source"]) : "unknown",
    confidence: ["deterministic", "derived", "imported"].includes(String(camel.confidence))
      ? (String(camel.confidence) as ChartFact["confidence"])
      : "deterministic",
    tags: normalizeStringArray(camel.tags),
    metadata: compactRecord(camel.metadata),
  };
}

function dedupeAndSortFacts(facts: ChartFact[], requiredFacts: string[], optionalFacts: string[]): ChartFact[] {
  const requiredOrder = new Map(requiredFacts.map((key, index) => [key, index]));
  const optionalOrder = new Map(optionalFacts.map((key, index) => [key, index]));
  const seen = new Set<string>();
  return [...facts].sort((a, b) => {
    const aRequired = requiredOrder.has(a.factKey);
    const bRequired = requiredOrder.has(b.factKey);
    if (aRequired !== bRequired) return aRequired ? -1 : 1;
    if (aRequired && bRequired) return (requiredOrder.get(a.factKey) ?? 0) - (requiredOrder.get(b.factKey) ?? 0);
    const aOptional = optionalOrder.has(a.factKey);
    const bOptional = optionalOrder.has(b.factKey);
    if (aOptional !== bOptional) return aOptional ? -1 : 1;
    if (aOptional && bOptional) return (optionalOrder.get(a.factKey) ?? 0) - (optionalOrder.get(b.factKey) ?? 0);
    return a.factType.localeCompare(b.factType) || a.factKey.localeCompare(b.factKey);
  }).filter((fact) => {
    const key = `${fact.factType}::${fact.factKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function emptyRepositoryResult<T>(): RepositoryResult<T> {
  return { ok: true, data: [] as T[] };
}

async function fetchFactsByKeys(input: FetchChartFactsInput, keys: string[]): Promise<RepositoryResult<ChartFact>> {
  if (!keys.length) return { ok: true, data: [] };
  try {
    let query = input.supabase
      .from<ChartFact>("astro_chart_facts")
      .select("id, user_id, profile_id, chart_version_id, fact_type, fact_key, fact_value, planet, house, sign, degree_numeric, source, confidence, tags, metadata")
      .eq("user_id", input.userId)
      .in("fact_key", keys);
    if (input.profileId != null) {
      query = query.eq("profile_id", input.profileId);
    }
    const result = (await (query.limit(input.limit ?? 80) as PromiseLike<SupabaseQueryResult<ChartFact>>)) as SupabaseQueryResult<ChartFact>;
    if (result.error) return { ok: false, data: [], error: asErrorMessage(result.error) };
    const rows = (result.data ?? []) as unknown[];
    const data = rows.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)).map(mapChartFact);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, data: [], error: asErrorMessage(error) };
  }
}

async function fetchFactsByTags(input: FetchChartFactsInput, tags: string[]): Promise<RepositoryResult<ChartFact>> {
  if (!tags.length) return { ok: true, data: [] };
  try {
    let query = input.supabase
      .from<ChartFact>("astro_chart_facts")
      .select("id, user_id, profile_id, chart_version_id, fact_type, fact_key, fact_value, planet, house, sign, degree_numeric, source, confidence, tags, metadata")
      .eq("user_id", input.userId)
      .overlaps("tags", tags);
    if (input.profileId != null) {
      query = query.eq("profile_id", input.profileId);
    }
    const result = (await (query.limit(input.limit ?? 80) as PromiseLike<SupabaseQueryResult<ChartFact>>)) as SupabaseQueryResult<ChartFact>;
    if (result.error) return { ok: false, data: [], error: asErrorMessage(result.error) };
    const rows = (result.data ?? []) as unknown[];
    const data = rows.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)).map(mapChartFact);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, data: [], error: asErrorMessage(error) };
  }
}

export async function fetchChartFacts(input: FetchChartFactsInput): Promise<RepositoryResult<ChartFact>> {
  const keys = [...new Set([...input.requiredFacts, ...input.optionalFacts].filter(Boolean))];
  const keyResult = await fetchFactsByKeys(input, keys);
  const tagResult = await fetchFactsByTags(input, input.tags);
  const data = dedupeAndSortFacts([...(keyResult.ok ? keyResult.data : []), ...(tagResult.ok ? tagResult.data : [])], input.requiredFacts, input.optionalFacts);

  if (!keyResult.ok && !tagResult.ok) {
    return { ok: false, data: [], error: [keyResult.error, tagResult.error].filter(Boolean).join("; ") };
  }

  if (!keyResult.ok || !tagResult.ok) {
    return { ok: true, data, partial: true, error: [keyResult.error, tagResult.error].filter(Boolean).join("; ") };
  }

  return { ok: true, data };
}

export function buildSafeRemedies(plan: RequiredDataPlan): SafeRemedy[] {
  if (!plan.needsRemedy && !plan.remedyAllowed) return [];
  if (plan.blockedBySafety && !plan.remedyAllowed) return [];

  const restrictions = ["optional", "low-cost", "not medical/legal/financial advice", "no guarantee"];
  const make = (id: string, domain: string, title: string, description: string): SafeRemedy => ({
    id,
    domain,
    title,
    description,
    tags: [domain, "safe_remedy"],
    restrictions,
    source: "deterministic",
  });

  if (plan.domain === "sleep") {
    return [
      make("sleep-consistent-routine", "sleep", "Consistent sleep routine", "Keep a fixed sleep and wake time."),
      make("sleep-evening-practice", "sleep", "Gentle evening mantra or breath practice", "Use a brief calming practice before bed."),
      make("sleep-reduce-stimulation", "sleep", "Reduce late-night stimulation", "Lower screens, stimulation, and late heavy activity."),
    ];
  }

  if (plan.domain === "spirituality") {
    return [
      make("spiritual-short-mantra", "spirituality", "Short daily mantra", "Repeat a simple mantra consistently."),
      make("spiritual-grounded-meditation", "spirituality", "Grounded meditation", "Practice a short grounded meditation each day."),
    ];
  }

  if (plan.remedyAllowed && ["career", "marriage", "foreign", "education", "health"].includes(plan.domain)) {
    return [make(`${plan.domain}-simple-consistency`, plan.domain, "Simple consistency remedy", "Keep a simple, steady daily practice rather than expensive rituals.")];
  }

  return [];
}

async function safeRepository<T>(promise: Promise<RepositoryResult<T>>): Promise<RepositoryResult<T>> {
  try {
    return await promise;
  } catch (error) {
    return { ok: false, data: [], error: asErrorMessage(error) };
  }
}

export async function retrieveAstroRagContext(input?: RetrievalServiceInput): Promise<RetrievalContext> {
  if (!input?.supabase || !input.userId || !input.plan) {
    return {
      chartFacts: [],
      reasoningRules: [],
      benchmarkExamples: [],
      sourceNotes: [],
      retrievalTags: [],
      validationChecks: [],
      timingWindows: [],
      safeRemedies: [],
      metadata: {
        userId: input?.userId ?? "",
        profileId: input?.profileId ?? null,
        domain: input?.plan?.domain ?? "general",
        requestedFactKeys: input?.plan?.requiredFacts ?? [],
        retrievalTags: input?.plan?.retrievalTags ?? [],
        errors: ["missing retrieval input"],
        partial: true,
      },
    };
  }

  const plan = input.plan;
  const includeBenchmarks = input.includeBenchmarks !== false;
  const includeKnowledge = input.includeKnowledge !== false;
  const includeTiming = input.includeTiming !== false;
  const includeRemedies = input.includeRemedies !== false;
  const question = input.question ?? `${plan.domain} ${plan.retrievalTags.join(" ")} ${plan.requiredFacts.join(" ")}`.trim();
  const expansion = await resolveQueryExpansion({
    question,
    env: input.env ?? process.env,
    exactFactMatched: input.exactFactMatched,
    safetyRisks: input.safetyRisks,
    availableChartAnchors: input.availableChartAnchors,
    queryExpansionClient: input.queryExpansionClient,
    maxTerms: input.limit ?? 80,
  });
  const expandedSearchTerms = expansion.expandedSearchTerms;
  const expandedTags = [...new Set([...plan.retrievalTags, ...expandedSearchTerms])].slice(0, 24);
  const inferredLifeAreaTags = inferLifeAreaTagsFromQuestion(question);
  const inferredPlanets = inferPlanetsFromQuestion(question);
  const inferredHouses = inferHousesFromQuestion(question);
  const structuredEnabled = isStructuredRagEnabled(input.env ?? process.env);
  const traceEnabled = isAstroRetrievalTraceEnabled();
  const trace: AstroRetrievalTrace | undefined = traceEnabled
    ? {
        traceId: createAstroRetrievalTraceId(),
        enabled: true,
        questionDomain: plan.domain ?? null,
        structuredRagEnabled: structuredEnabled,
        fallbackUsed: false,
        candidateCount: 0,
        selectedCount: 0,
        selectedRules: [],
        exactFactMode: plan.answerType === "exact_fact",
        safetyBlocked: plan.blockedBySafety,
      }
    : undefined;

  const [facts, rules, benchmarks, sourceNotes, retrievalTags, validationChecks, timing] = await Promise.all([
    safeRepository(
      fetchChartFacts({
        supabase: input.supabase,
        userId: input.userId,
        profileId: input.profileId ?? null,
        requiredFacts: plan.requiredFacts,
        optionalFacts: plan.optionalFacts,
        tags: expandedTags,
        limit: input.limit ?? 80,
      }),
    ),
    plan.answerType === "exact_fact" ? Promise.resolve(emptyRepositoryResult<never>()) : safeRepository(fetchReasoningRules({ supabase: input.supabase, domains: plan.reasoningRuleDomains, tags: expandedTags, limit: 12 })),
    includeBenchmarks
      ? (plan.answerType === "exact_fact" ? Promise.resolve(emptyRepositoryResult<never>()) : safeRepository(fetchBenchmarkExamples({ supabase: input.supabase, domains: plan.benchmarkDomains, tags: expandedTags, limit: 6 })))
      : Promise.resolve(emptyRepositoryResult<Awaited<ReturnType<typeof fetchBenchmarkExamples>> extends RepositoryResult<infer T> ? T : never>()),
    includeKnowledge && plan.answerType !== "exact_fact" ? safeRepository(fetchSourceNotes({ supabase: input.supabase, limit: 32 })) : Promise.resolve(emptyRepositoryResult<never>()),
    includeKnowledge && plan.answerType !== "exact_fact" ? safeRepository(fetchRetrievalTags({ supabase: input.supabase, limit: 64 })) : Promise.resolve(emptyRepositoryResult<never>()),
    includeKnowledge && plan.answerType !== "exact_fact" ? safeRepository(fetchValidationChecks({ supabase: input.supabase, limit: 64 })) : Promise.resolve(emptyRepositoryResult<never>()),
    includeTiming && (plan.requiresTimingSource || plan.needsTiming || plan.timingAllowed)
      ? safeRepository(
        fetchTimingWindows({
          supabase: input.supabase,
          userId: input.userId,
          profileId: input.profileId ?? null,
          domain: plan.domain,
          tags: expandedTags,
          limit: 8,
        }),
      )
      : Promise.resolve(emptyRepositoryResult<Awaited<ReturnType<typeof fetchTimingWindows>> extends RepositoryResult<infer T> ? T : never>()),
  ]);

  let reasoningRules = rules.data;
  let structuredRanked: ReturnType<typeof selectStructuredReasoningRules> = [];
  let structuredUsed = false;
  let structuredFallbackReason: string | undefined;
  if (structuredEnabled && String(plan.answerType) !== "exact_fact") {
    try {
      const structuredCandidates = await fetchStructuredReasoningRuleCandidates(input.supabase, {
        domains: plan.reasoningRuleDomains,
        lifeAreaTags: inferredLifeAreaTags,
        conditionTags: expandedTags,
        planets: inferredPlanets,
        houses: inferredHouses,
        signs: facts.data.map((fact) => fact.sign).filter((value): value is string => Boolean(value)),
        sourceReliability: [],
        requiredTags: plan.retrievalTags,
        chartFactTags: expandedTags,
        limit: 8,
        candidateLimit: 120,
      });
      if (structuredCandidates.length) {
        if (trace) trace.candidateCount = structuredCandidates.length;
        const rankingContext = buildStructuredRuleRankingContext({
          userQuestion: question,
          chartFacts: facts.data,
          domains: plan.reasoningRuleDomains,
          exactFactMode: plan.answerType === "exact_fact",
          safetyBlocked: plan.blockedBySafety,
        });
        const ranked = selectStructuredReasoningRules(structuredCandidates, rankingContext, { limit: 8 });
        if (ranked.length) {
          structuredRanked = ranked;
          if (trace) {
            trace.selectedCount = ranked.length;
            trace.selectedRules = ranked.map((item) => ({
              ruleId: item.rule.ruleId,
              score: item.score,
              rankingReasons: item.rankingReasons,
              rejectionReasons: item.rejectionReasons,
              sourceReliability: item.rule.normalizedSourceReliability ?? item.rule.sourceReliability ?? null,
              lifeAreaTags: item.rule.lifeAreaTags ? [...item.rule.lifeAreaTags] : [],
              conditionTags: item.rule.conditionTags ? [...item.rule.conditionTags] : [],
            }));
          }
          reasoningRules = ranked.map((item) => ({
            id: item.rule.ruleId,
            ruleKey: item.rule.ruleId,
            domain: plan.domain,
            title: item.rule.ruleStatement ?? item.rule.promptCompactSummary ?? item.rule.ruleId,
            description: item.rule.normalizedSourceText ?? item.rule.sourceText ?? "",
            requiredFactTypes: [],
            requiredTags: item.rule.requiredTags ? [...item.rule.requiredTags] : [],
            reasoningTemplate: item.rule.normalizedPromptCompactSummary ?? item.rule.promptCompactSummary ?? "",
            sourceReference: item.rule.normalizedSourceReference ?? item.rule.sourceReference ?? undefined,
            sourceReliability: item.rule.normalizedSourceReliability ?? item.rule.sourceReliability ?? undefined,
            structuredRule: undefined,
            lifeAreaTags: item.rule.lifeAreaTags ? [...item.rule.lifeAreaTags] : [],
            conditionTags: item.rule.conditionTags ? [...item.rule.conditionTags] : [],
            retrievalKeywords: item.rule.retrievalKeywords ? [...item.rule.retrievalKeywords] : [],
            weight: item.score,
            safetyNotes: [],
            enabled: Boolean(item.rule.enabled ?? true),
            metadata: { rankingReasons: item.rankingReasons },
          }));
          structuredUsed = true;
        } else {
          structuredFallbackReason = "no_structured_ranked_rules";
          if (trace) trace.fallbackUsed = true;
        }
      } else {
        structuredFallbackReason = "no_structured_candidates";
        if (trace) trace.fallbackUsed = true;
      }
    } catch (error) {
      structuredFallbackReason = asErrorMessage(error);
      if (trace) {
        trace.fallbackUsed = true;
        trace.fallbackReason = structuredFallbackReason;
      }
    }
  }

  const packedPrompt = structuredUsed
    ? packAstroRagPromptContext({
        rankedRules: structuredRanked,
        validationChecks: validationChecks.data,
        examples: benchmarks.data,
      })
    : undefined;

  const safeRemedies = includeRemedies ? buildSafeRemedies(plan) : [];
  const errors = [facts.error, rules.error, benchmarks.error, timing.error].filter(Boolean) as string[];

  return {
    chartFacts: facts.data,
    reasoningRules,
    benchmarkExamples: benchmarks.data,
    sourceNotes: sourceNotes.data,
    retrievalTags: retrievalTags.data,
    validationChecks: validationChecks.data,
    timingWindows: timing.data,
    safeRemedies,
    memorySummary: input.memorySummary && input.memorySummary.trim() ? input.memorySummary : undefined,
    queryExpansion: expansion.meta,
    expandedSearchTerms,
    requiredEvidenceHints: expansion.requiredEvidenceHints,
    chartAnchorHints: expansion.chartAnchorHints,
    promptContextText: packedPrompt?.text,
    promptIncludedRuleIds: packedPrompt?.includedRuleIds,
    promptIncludedValidationCheckIds: packedPrompt?.includedValidationCheckIds,
    promptIncludedExampleIds: packedPrompt?.includedExampleIds,
    structuredRagUsed: structuredUsed,
    structuredRagFallbackReason: structuredFallbackReason,
    retrievalTrace: trace ? sanitizeAstroRetrievalTrace({ ...trace, fallbackReason: structuredFallbackReason ?? trace.fallbackReason ?? null }) : undefined,
    metadata: {
      userId: input.userId,
      profileId: input.profileId ?? null,
      domain: plan.domain,
      requestedFactKeys: [...plan.requiredFacts],
      retrievalTags: [...plan.retrievalTags],
      expandedSearchTerms,
      errors,
      partial: Boolean(facts.partial || rules.partial || benchmarks.partial || sourceNotes.partial || retrievalTags.partial || validationChecks.partial || timing.partial || errors.length),
    },
  };
}
