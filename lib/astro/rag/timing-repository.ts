import type { RepositoryResult, SupabaseLikeClient, TimingWindow } from "./retrieval-types";
import type { SupabaseQueryResult } from "./retrieval-types";
import { compactRecord, normalizeStringArray, snakeToCamelRecord } from "./retrieval-types";

export type FetchTimingWindowsInput = {
  supabase: SupabaseLikeClient;
  userId: string;
  profileId?: string | null;
  domain?: string;
  tags?: string[];
  limit?: number;
};

function asErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return String((error as { message: string }).message);
  }
  return "failed to fetch timing windows";
}

function toConfidenceRank(confidence: TimingWindow["confidence"]): number {
  return confidence === "strong" ? 0 : 1;
}

function mapWindow(row: Record<string, unknown>): TimingWindow {
  const camel = snakeToCamelRecord(row);
  return {
    id: String(camel.id ?? ""),
    userId: String(camel.userId ?? ""),
    profileId: camel.profileId == null ? null : String(camel.profileId),
    domain: String(camel.domain ?? ""),
    label: String(camel.label ?? ""),
    startsOn: camel.startsOn == null ? null : String(camel.startsOn),
    endsOn: camel.endsOn == null ? null : String(camel.endsOn),
    interpretation: String(camel.interpretation ?? ""),
    source: ["dasha", "varshaphal", "python_transit", "stored", "user_provided"].includes(String(camel.source)) ? (String(camel.source) as TimingWindow["source"]) : "stored",
    confidence: String(camel.confidence) === "partial" ? "partial" : "strong",
    tags: normalizeStringArray(camel.tags),
    metadata: compactRecord(camel.metadata),
  };
}

export async function fetchTimingWindows(input: FetchTimingWindowsInput): Promise<RepositoryResult<TimingWindow>> {
  const limit = input.limit ?? 8;
  try {
    let query = input.supabase
      .from<TimingWindow>("astro_timing_windows")
      .select("id, user_id, profile_id, domain, label, starts_on, ends_on, interpretation, source, confidence, tags, metadata")
      .eq("user_id", input.userId);

    if (input.profileId != null) {
      query = query.eq("profile_id", input.profileId);
    }
    if (input.domain && input.domain !== "general") {
      query = query.or(`domain.eq.${input.domain},domain.eq.general`);
    }
    if (input.tags && input.tags.length) {
      query = query.overlaps("tags", input.tags);
    }

    const result = (await (query.order("starts_on", { ascending: true }).order("created_at", { ascending: false }).limit(limit) as PromiseLike<SupabaseQueryResult<TimingWindow>>)) as SupabaseQueryResult<TimingWindow>;
    if (result.error) {
      return { ok: false, data: [], error: asErrorMessage(result.error) };
    }
    const rows = Array.isArray(result.data) ? (result.data as unknown[]).filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
    const data = rows
      .map(mapWindow)
      .sort((a, b) => {
        if (a.startsOn && b.startsOn && a.startsOn !== b.startsOn) return a.startsOn.localeCompare(b.startsOn);
        if (a.startsOn && !b.startsOn) return -1;
        if (!a.startsOn && b.startsOn) return 1;
        const confidenceDelta = toConfidenceRank(a.confidence) - toConfidenceRank(b.confidence);
        if (confidenceDelta) return confidenceDelta;
        return a.label.localeCompare(b.label);
      });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, data: [], error: asErrorMessage(error) };
  }
}
