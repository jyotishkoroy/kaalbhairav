import type { BenchmarkExample, RepositoryResult, SupabaseLikeClient } from "./retrieval-types";
import type { SupabaseQueryResult } from "./retrieval-types";
import { compactRecord, normalizeStringArray, snakeToCamelRecord } from "./retrieval-types";

export type FetchBenchmarkExamplesInput = {
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
  return "failed to fetch benchmark examples";
}

function trimText(value: unknown, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? text.slice(0, max) : text;
}

function mapExample(row: Record<string, unknown>): BenchmarkExample {
  const camel = snakeToCamelRecord(row);
  return {
    id: String(camel.id ?? ""),
    exampleKey: String(camel.exampleKey ?? ""),
    domain: String(camel.domain ?? ""),
    question: trimText(camel.question, 300),
    answer: trimText(camel.answer, 1200),
    reasoning: camel.reasoning == null ? null : trimText(camel.reasoning, 800),
    accuracyClass: camel.accuracyClass == null ? null : String(camel.accuracyClass),
    readingStyle: camel.readingStyle == null ? null : String(camel.readingStyle),
    followUpQuestion: camel.followUpQuestion == null ? null : String(camel.followUpQuestion),
    tags: normalizeStringArray(camel.tags),
    metadata: compactRecord(camel.metadata),
    enabled: Boolean(camel.enabled),
  };
}

export async function fetchBenchmarkExamples(input: FetchBenchmarkExamplesInput): Promise<RepositoryResult<BenchmarkExample>> {
  const limit = input.limit ?? 6;
  try {
    let query = input.supabase
      .from<BenchmarkExample>("astro_benchmark_examples")
      .select("id, example_key, domain, question, answer, reasoning, accuracy_class, reading_style, follow_up_question, tags, metadata, enabled")
      .eq("enabled", true);

    if (input.domains.length) {
      query = query.in("domain", input.domains);
    }
    if (input.tags.length) {
      query = query.overlaps("tags", input.tags);
    }

    const result = (await (query.limit(limit) as PromiseLike<SupabaseQueryResult<BenchmarkExample>>)) as SupabaseQueryResult<BenchmarkExample>;
    if (result.error) {
      return { ok: false, data: [], error: asErrorMessage(result.error) };
    }
    const rows = Array.isArray(result.data) ? (result.data as unknown[]).filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
    const data = rows.map(mapExample).sort((a, b) => a.domain.localeCompare(b.domain) || a.exampleKey.localeCompare(b.exampleKey));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, data: [], error: asErrorMessage(error) };
  }
}
