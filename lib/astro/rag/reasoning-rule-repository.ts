import type { ReasoningRule, RepositoryResult, SupabaseLikeClient } from "./retrieval-types";
import type { SupabaseQueryResult } from "./retrieval-types";
import { compactRecord, normalizeStringArray, snakeToCamelRecord } from "./retrieval-types";

export type FetchReasoningRulesInput = {
  supabase: SupabaseLikeClient;
  domains: string[];
  tags: string[];
  limit?: number;
};

function asErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return String((error as { message: string }).message);
  }
  return "failed to fetch reasoning rules";
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
    weight: Number.isFinite(Number(camel.weight)) ? Number(camel.weight) : 0,
    safetyNotes: normalizeStringArray(camel.safetyNotes),
    enabled: Boolean(camel.enabled),
    metadata: compactRecord(camel.metadata),
  };
}

export async function fetchReasoningRules(input: FetchReasoningRulesInput): Promise<RepositoryResult<ReasoningRule>> {
  const limit = input.limit ?? 12;
  try {
    let query = input.supabase
      .from<ReasoningRule>("astro_reasoning_rules")
      .select("id, rule_key, domain, title, description, required_fact_types, required_tags, reasoning_template, weight, safety_notes, enabled, metadata")
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
