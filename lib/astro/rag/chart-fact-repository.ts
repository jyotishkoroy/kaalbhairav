import type { ChartFact } from "./chart-fact-extractor";

export type SupabaseLikeClient = {
  from: (table: string) => {
    upsert: (
      rows: Record<string, unknown>[],
      options?: { onConflict?: string; ignoreDuplicates?: boolean },
    ) => {
      select?: (columns?: string) => PromiseLike<{ data: unknown; error: unknown }>;
      then?: unknown;
    } | PromiseLike<{ data: unknown; error: unknown }>;
  };
};

export type UpsertChartFactsInput = {
  supabase: SupabaseLikeClient;
  facts: ChartFact[];
  userId: string;
  profileId?: string | null;
  chartVersionId?: string | null;
};

export type UpsertChartFactsResult = {
  ok: boolean;
  insertedOrUpdated: number;
  facts: ChartFact[];
  error?: string;
};

export function toChartFactRow(
  fact: ChartFact,
  input: { userId: string; profileId?: string | null; chartVersionId?: string | null },
): Record<string, unknown> {
  const profileId = fact.profileId != null ? fact.profileId : input.profileId ?? null;
  const chartVersionId = fact.chartVersionId != null ? fact.chartVersionId : input.chartVersionId ?? null;
  return {
    user_id: fact.userId ?? input.userId,
    profile_id: profileId,
    chart_version_id: chartVersionId,
    fact_type: fact.factType,
    fact_key: fact.factKey,
    fact_value: fact.factValue,
    planet: fact.planet ?? null,
    house: fact.house ?? null,
    sign: fact.sign ?? null,
    degree_numeric: fact.degreeNumeric ?? null,
    source: fact.source,
    confidence: fact.confidence,
    tags: fact.tags,
    metadata: fact.metadata,
  };
}

function dedupeFacts(facts: ChartFact[]): ChartFact[] {
  const seen = new Set<string>();
  const output: ChartFact[] = [];
  for (const fact of facts) {
    const key = `${fact.factType}::${fact.factKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(fact);
  }
  return output;
}

function asErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "supabase upsert failed";
}

async function resolveUpsertResult(result: unknown): Promise<{ data: unknown; error: unknown }> {
  if (result && typeof result === "object" && "select" in result && typeof (result as { select?: unknown }).select === "function") {
    const selected = await (result as { select: (columns?: string) => PromiseLike<unknown> }).select("*");
    return selected as { data: unknown; error: unknown };
  }
  if (result && typeof result === "object" && "then" in result && typeof (result as { then?: unknown }).then === "function") {
    const resolved = await (result as PromiseLike<unknown>);
    return resolved as { data: unknown; error: unknown };
  }
  return { data: null, error: null };
}

export async function upsertChartFacts(input: UpsertChartFactsInput): Promise<UpsertChartFactsResult> {
  if (!input.userId) {
    return { ok: false, insertedOrUpdated: 0, facts: [], error: "userId is required" };
  }
  const facts = dedupeFacts(input.facts ?? []);
  if (!facts.length) {
    return { ok: true, insertedOrUpdated: 0, facts: [] };
  }
  const rows = facts.map((fact) => toChartFactRow(fact, input));
  try {
    const result = await resolveUpsertResult(
      input.supabase.from("astro_chart_facts").upsert(rows, {
        onConflict: "user_id,profile_id,chart_version_id,fact_type,fact_key",
      }),
    );
    if (result.error) {
      return { ok: false, insertedOrUpdated: 0, facts, error: asErrorMessage(result.error) };
    }
    return { ok: true, insertedOrUpdated: rows.length, facts };
  } catch (error) {
    return { ok: false, insertedOrUpdated: 0, facts, error: asErrorMessage(error) };
  }
}
