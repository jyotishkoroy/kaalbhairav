/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroRankedReasoningRule, AstroRuleRankingContext, AstroReasoningRule } from "./types";
import type { ChartFact } from "./chart-fact-extractor";
import type { RequiredDataPlan } from "./required-data-planner";
import type { ReasoningRule, RetrievalContext } from "./retrieval-types";

export type ReasoningRuleMatch = {
  rule: ReasoningRule;
  score: number;
  matchedFactKeys: string[];
  matchedTags: string[];
  missingFactTypes: string[];
  missingTags: string[];
  reasons: string[];
};

export type ReasoningRuleSelection = {
  domain: RequiredDataPlan["domain"] | string;
  selectedRules: ReasoningRuleMatch[];
  rejectedRules: ReasoningRuleMatch[];
  metadata: {
    candidateCount: number;
    selectedCount: number;
    requiredFactKeys: string[];
    retrievalTags: string[];
    partial: boolean;
    warnings: string[];
  } & {
    selectedRuleIds?: string[];
  };
  selectedRuleIds?: string[];
};

export type SelectReasoningRulesInput = {
  plan: RequiredDataPlan;
  context: RetrievalContext;
  maxRules?: number;
  minScore?: number;
};

const SOURCE_RELIABILITY_SCORE: Record<string, number> = {
  primary_classical: 20,
  classical_translation: 16,
  traditional_commentary: 12,
  modern_interpretation: 4,
};

const DEFAULT_SELECTED_RULE_LIMIT = 8;
const MIN_SELECTED_RULE_LIMIT = 3;
const MAX_SELECTED_RULE_LIMIT = 8;

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function hasAnyOverlap(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.some((value) => rightSet.has(value.toLowerCase()));
}

function normalizeRuleStatement(rule: { ruleId?: string; ruleStatement?: string | null; promptCompactSummary?: string | null }): string {
  return (rule.ruleStatement ?? rule.promptCompactSummary ?? rule.ruleId ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeByRuleStatementOrId(items: AstroRankedReasoningRule[]): AstroRankedReasoningRule[] {
  const seenIds = new Set<string>();
  const seenStatements = new Set<string>();
  const out: AstroRankedReasoningRule[] = [];
  for (const item of items) {
    const id = item.rule.ruleId;
    const statement = normalizeRuleStatement(item.rule);
    if (seenIds.has(id) || (statement && seenStatements.has(statement))) continue;
    seenIds.add(id);
    if (statement) seenStatements.add(statement);
    out.push(item);
  }
  return out;
}

function trimTemplate(value: string): string {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.length > 300 ? `${text.slice(0, 297)}...` : text;
}

function emptySelection(domain: string, warnings: string[] = [], partial = true): ReasoningRuleSelection {
  return {
    domain,
    selectedRules: [],
    rejectedRules: [],
    selectedRuleIds: [],
    metadata: {
      candidateCount: 0,
      selectedCount: 0,
      requiredFactKeys: [],
      retrievalTags: [],
      partial,
      warnings,
      selectedRuleIds: [],
    },
  };
}

function factTagsForMatch(fact: ChartFact): string[] {
  return [...new Set((fact.tags ?? []).map(normalizeKey).filter(Boolean))];
}

function normalizePlanKeys(plan: RequiredDataPlan): { requiredFactKeys: string[]; retrievalTags: string[] } {
  return {
    requiredFactKeys: [...new Set((plan.requiredFacts ?? []).map(normalizeKey).filter(Boolean))],
    retrievalTags: [...new Set((plan.retrievalTags ?? []).map(normalizeKey).filter(Boolean))],
  };
}

function hasTimingSource(context: RetrievalContext): boolean {
  return (context.timingWindows ?? []).length > 0;
}

function factMatchesRequiredFactType(fact: ChartFact, requiredFactType: string, context: RetrievalContext): boolean {
  const key = normalizeKey(requiredFactType);
  const factType = normalizeKey(fact.factType);
  const factKey = normalizeKey(fact.factKey);
  const planet = normalizeKey(fact.planet);
  const sign = normalizeKey(fact.sign);
  const tags = factTagsForMatch(fact);

  if (!key) return false;
  if (key === factType || key === factKey) return true;
  if (key === "timing_source") return hasTimingSource(context);
  if (key === "current_dasha") {
    return factType === "dasha" || factKey === "current_mahadasha" || factKey === "current_antardasha";
  }
  if (key === "sun_placement") return factType === "planet_placement" && planet === "sun";
  if (key === "moon_placement") return factType === "planet_placement" && planet === "moon";
  if (key === "rahu_placement") return factType === "planet_placement" && planet === "rahu";
  if (key === "venus_placement") return factType === "planet_placement" && planet === "venus";
  if (key === "mercury_placement") return factType === "planet_placement" && planet === "mercury";
  if (key === "jupiter_placement") return factType === "planet_placement" && planet === "jupiter";
  if (/^house_\d+$/.test(key)) {
    const house = Number(key.split("_")[1]);
    return (factType === "house" && factKey === key) || fact.house === house || tags.includes(key);
  }
  if (/^lord_\d+$/.test(key)) return factKey === key || factType === "house_lord";
  if (key === "lagna") return factType === "lagna" || factKey === "lagna" || factKey === "ascendant" || factKey === "asc";
  if (key === "sun" || key === "moon" || key === "mercury" || key === "venus" || key === "jupiter" || key === "saturn" || key === "rahu" || key === "ketu") {
    return planet === key || factKey === key;
  }
  return tags.includes(key) || tags.includes(factType) || tags.includes(factKey) || tags.includes(sign);
}

function factMatchesRequiredTag(fact: ChartFact, tag: string, planTags: string[]): boolean {
  const key = normalizeKey(tag);
  return factTagsForMatch(fact).includes(key) || planTags.includes(key);
}

function scoreRule(rule: ReasoningRule, plan: RequiredDataPlan, context: RetrievalContext): ReasoningRuleMatch {
  const { requiredFactKeys, retrievalTags } = normalizePlanKeys(plan);
  const facts = context.chartFacts ?? [];
  const reasons: string[] = [];
  const matchedFactKeys = new Set<string>();
  const matchedTags = new Set<string>();
  const missingFactTypes: string[] = [];
  const missingTags: string[] = [];
  let score = 0;
  const domain = normalizeKey(rule.domain);
  const planDomain = normalizeKey(plan.domain);

  if (domain === planDomain) score += 40;
  else if (plan.reasoningRuleDomains.map(normalizeKey).includes(domain)) score += 20;
  else if (domain === "general") score += 10;
  if (plan.domain === "safety" && domain === "safety") score += 15;

  for (const requiredFactType of rule.requiredFactTypes ?? []) {
    const matched = facts.some((fact) => factMatchesRequiredFactType(fact, requiredFactType, context));
    if (matched) {
      score += 8;
      matchedFactKeys.add(normalizeKey(requiredFactType));
      reasons.push(`matched fact ${normalizeKey(requiredFactType)}`);
    } else {
      score -= 6;
      missingFactTypes.push(normalizeKey(requiredFactType));
    }
  }

  for (const requiredTag of rule.requiredTags ?? []) {
    const matched = facts.some((fact) => factMatchesRequiredTag(fact, requiredTag, retrievalTags));
    if (matched) {
      score += 5;
      matchedTags.add(normalizeKey(requiredTag));
      reasons.push(`matched tag ${normalizeKey(requiredTag)}`);
    } else {
      score -= 3;
      missingTags.push(normalizeKey(requiredTag));
    }
  }

  for (const requiredFactKey of requiredFactKeys) {
    const fact = facts.find((item) => normalizeKey(item.factKey) === requiredFactKey);
    if (!fact) continue;
    const ruleText = `${rule.description} ${rule.reasoningTemplate}`.toLowerCase();
    const factSignals = [requiredFactKey, normalizeKey(fact.factType), ...(fact.tags ?? []).map(normalizeKey)];
    if (factSignals.some((signal) => signal && ruleText.includes(signal))) {
      score += 4;
      matchedFactKeys.add(requiredFactKey);
    }
  }

  score += Math.min(Math.max(Number(rule.weight) || 0, 0) / 20, 20);

  if (plan.blockedBySafety) {
    if (domain === "safety") score += 30;
    else score -= 100;
  }

  if (plan.answerType === "exact_fact" && domain !== "exact_fact" && domain !== "general") {
    score -= 200;
  }

  if (planDomain === "safety" || plan.blockedBySafety) reasons.push("safety restrictions applied");
  if (!requiredFactKeys.length && !rule.requiredFactTypes.length && !rule.requiredTags.length) reasons.push("low-constraint fallback");
  if (rule.reasoningTemplate) reasons.push(trimTemplate(rule.reasoningTemplate));

  return {
    rule,
    score,
    matchedFactKeys: [...matchedFactKeys],
    matchedTags: [...matchedTags],
    missingFactTypes,
    missingTags,
    reasons,
  };
}

export function scoreRuleAgainstContext(rule: AstroReasoningRule, context: AstroRuleRankingContext): AstroRankedReasoningRule {
  let score = 0;
  const rankingReasons: string[] = [];
  const rejectionReasons: string[] = [];
  const domain = normalizeKey(String((rule.metadata as Record<string, unknown>).domain ?? rule.ruleId));
  const sourceReference = rule.sourceReference ?? rule.normalizedSourceReference ?? "";

  if (context.domains.some((candidate) => candidate.toLowerCase() === domain)) {
    score += 40;
    rankingReasons.push("domain_match");
  }

  const rulePlanets = [rule.primaryPlanet, rule.secondaryPlanet].filter(Boolean).map((value) => String(value));
  if (hasAnyOverlap(rulePlanets, context.planets as readonly string[])) {
    score += 18;
    rankingReasons.push("planet_match");
  }
  if (rule.house != null && context.houses.includes(rule.house)) {
    score += 18;
    rankingReasons.push("house_match");
  }
  if (rule.sign && context.signs.some((sign) => sign.toLowerCase() === rule.sign?.toLowerCase())) {
    score += 12;
    rankingReasons.push("sign_match");
  }
  if (rule.primaryPlanet && rule.house != null && hasAnyOverlap([rule.primaryPlanet], context.planets as readonly string[]) && context.houses.includes(rule.house)) {
    score += 12;
    rankingReasons.push("planet_house_specific_match");
  }

  if (hasAnyOverlap(rule.lifeAreaTags ?? [], context.lifeAreaTags)) {
    score += 20;
    rankingReasons.push("life_area_match");
  }

  if (hasAnyOverlap(rule.conditionTags ?? [], [...context.conditionTags, ...context.chartFactTags])) {
    score += 15;
    rankingReasons.push("condition_tag_match");
  }

  const reliability = (rule.normalizedSourceReliability ?? rule.sourceReliability ?? "").toLowerCase();
  if (reliability && SOURCE_RELIABILITY_SCORE[reliability]) {
    score += SOURCE_RELIABILITY_SCORE[reliability];
    rankingReasons.push(`source_${reliability}`);
  }

  const specificityFields = [
    rule.primaryPlanet,
    rule.house,
    rule.sign,
    rule.lordship,
    rule.dignity,
    rule.aspectType,
    rule.yogaName,
    rule.divisionalChart,
    rule.dashaCondition,
    rule.transitCondition,
  ];
  score += Math.min(specificityFields.filter((value) => value != null && String(value).trim()).length * 2, 16);

  if (rule.primaryPlanet && context.planets.length && !hasAnyOverlap([rule.primaryPlanet], context.planets)) {
    score -= 10;
    rejectionReasons.push("planet_mismatch_soft");
  }
  if (rule.house != null && context.houses.length && !context.houses.includes(rule.house)) {
    score -= 10;
    rejectionReasons.push("house_mismatch_soft");
  }
  if (context.exactFactMode && !(domain === "exact_fact" || domain === "safety")) {
    score -= 80;
    rejectionReasons.push("exact_fact_mode_penalty");
  }
  if (context.safetyBlocked && !(domain === "safety" || hasAnyOverlap(rule.conditionTags ?? [], ["safety", "validation"]))) {
    score -= 100;
    rejectionReasons.push("safety_block_penalty");
  }
  if (normalizeKey(sourceReference) === "exact_reference_unknown") {
    score -= 3;
    rankingReasons.push("exact_reference_unknown_minor_penalty");
  }

  return {
    rule,
    score,
    rankingReasons,
    rejectionReasons,
  };
}

export function selectStructuredReasoningRules(
  candidates: readonly AstroReasoningRule[],
  context: AstroRuleRankingContext,
  options?: { limit?: number },
): AstroRankedReasoningRule[] {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_SELECTED_RULE_LIMIT, MIN_SELECTED_RULE_LIMIT), MAX_SELECTED_RULE_LIMIT);
  return dedupeByRuleStatementOrId(
    candidates
      .map((rule) => scoreRuleAgainstContext(rule, context))
      .filter((ranked) => ranked.score > 0)
      .sort((a, b) => b.score - a.score),
  ).slice(0, limit);
}

export function selectReasoningRules(input?: SelectReasoningRulesInput): ReasoningRuleSelection {
  if (!input?.plan || !input?.context) {
    return emptySelection(input?.plan?.domain ?? "general", ["Missing plan or retrieval context."], true);
  }

  const maxRules = input.maxRules ?? 5;
  const minScore = input.minScore ?? 15;
  const plan = input.plan;
  const context = input.context;
  const warnings = [...(context.metadata.partial ? ["Retrieval context was partial; reasoning path may be incomplete."] : [])];
  const candidates = [...(context.reasoningRules ?? [])];
  const scored = candidates.map((rule) => scoreRule(rule, plan, context));
  const selectedRules = scored.filter((match) => match.score >= minScore).sort((a, b) => b.score - a.score || b.rule.weight - a.rule.weight || a.rule.domain.localeCompare(b.rule.domain) || a.rule.ruleKey.localeCompare(b.rule.ruleKey)).slice(0, maxRules);
  const selectedIds = selectedRules.map((match) => match.rule.id);
  const rejectedRules = scored.filter((match) => !selectedIds.includes(match.rule.id)).sort((a, b) => b.score - a.score || b.rule.weight - a.rule.weight || a.rule.domain.localeCompare(b.rule.domain) || a.rule.ruleKey.localeCompare(b.rule.ruleKey));

  if (!selectedRules.length && normalizeKey(plan.answerType) !== "exact_fact") {
    warnings.push("No reasoning rules matched the retrieved context.");
  }

  return {
    domain: plan.domain,
    selectedRules,
    rejectedRules,
    selectedRuleIds: selectedIds,
    metadata: {
      candidateCount: candidates.length,
      selectedCount: selectedRules.length,
      requiredFactKeys: [...new Set((plan.requiredFacts ?? []).map(normalizeKey).filter(Boolean))],
      retrievalTags: [...new Set((plan.retrievalTags ?? []).map(normalizeKey).filter(Boolean))],
      partial: Boolean(context.metadata.partial),
      warnings,
      selectedRuleIds: selectedIds,
    },
  };
}
