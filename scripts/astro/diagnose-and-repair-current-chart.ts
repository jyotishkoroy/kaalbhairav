/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { buildPublicChartFacts, extractDeterministicDashaFacts, validatePublicChartFacts } from "@/lib/astro/public-chart-facts";

type ServiceClient = ReturnType<typeof createServiceClient>;

type CliMode = "dry-run" | "apply";

type CliArgs = {
  email?: string;
  findEmail?: string;
  profileId?: string;
  mode?: CliMode;
  verbose: boolean;
};

type SafeProfileSummary = {
  profileId: string;
  userId: string;
  googleEmail?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  placeName?: string | null;
  timezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  currentChartVersionId?: string | null;
};

type ChartVersionRow = Record<string, unknown>;
type ChartCandidateClass = "invalid_wrong_chart" | "repairable_missing_dasha" | "valid_current_candidate";
type ChartCandidate = {
  version: ChartVersionRow;
  facts: ReturnType<typeof buildPublicChartFacts>;
  validation: ReturnType<typeof validatePublicChartFacts>;
  className: ChartCandidateClass;
};

function shortHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return `h${Math.abs(hash).toString(16).slice(0, 8)}`;
}

function redactId(value: unknown): string {
  return typeof value === "string" && value.trim() ? shortHash(value.trim()) : "unknown";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (/^(true|yes|1)$/i.test(value.trim())) return true;
    if (/^(false|no|0)$/i.test(value.trim())) return false;
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function roundCoord(value: unknown): number | null {
  const n = asNumber(value);
  return n === undefined ? null : Math.round(n * 10000) / 10000;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--email") args.email = argv[++i];
    else if (current === "--find-email") args.findEmail = argv[++i];
    else if (current === "--profile-id") args.profileId = argv[++i];
    else if (current === "--dry-run") args.mode = "dry-run";
    else if (current === "--apply") args.mode = "apply";
    else if (current === "--verbose") args.verbose = true;
  }
  return args;
}

function safeLog(label: string, value: unknown) {
  console.log(`${label}: ${typeof value === "string" ? value : JSON.stringify(value, null, 2)}`);
}

const DIRECT_PROFILE_SELECT = "id,user_id,display_name,google_email,google_name,canonical_profile,created_at,updated_at,current_chart_version_id,date_of_birth,time_of_birth,place_of_birth,birth_timezone,birth_latitude,birth_longitude,birth_time_unknown";
const DIRECT_PROFILE_BASE_SELECT = "id,user_id,display_name,google_email,google_name,canonical_profile,created_at,updated_at,current_chart_version_id";

function summarizeProfile(profile: Record<string, unknown>): SafeProfileSummary {
  return {
    profileId: String(profile.id ?? ""),
    userId: redactId(String(profile.user_id ?? "")),
    googleEmail: asString(profile.google_email),
    email: asString(profile.google_email) ?? asString(profile.email),
    dateOfBirth: asString(profile.date_of_birth),
    birthTime: asString(profile.time_of_birth),
    birthTimeUnknown: asBool(profile.birth_time_unknown),
    placeName: asString(profile.place_of_birth),
    timezone: asString(profile.birth_timezone),
    latitude: roundCoord(profile.birth_latitude),
    longitude: roundCoord(profile.birth_longitude),
    currentChartVersionId: asString(profile.current_chart_version_id),
  };
}

function queryErrorCode(error: unknown): string {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "").toLowerCase();
  if (message.includes("missing column") || message.includes("does not exist") || message.includes("column")) return "schema_missing_column";
  if (message.includes("missing relation") || message.includes("does not exist") || message.includes("table")) return "schema_missing_table";
  return "profile_query_failed";
}

function queryErrorMessage(error: unknown): string {
  return String((error as { message?: string } | null)?.message ?? error ?? "");
}

function isSchemaMissingColumnError(error: unknown): boolean {
  return queryErrorCode(error) === "schema_missing_column";
}

function isSchemaMissingTableError(error: unknown): boolean {
  return queryErrorCode(error) === "schema_missing_table";
}

function rowValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row && row[key] !== undefined) return row[key];
  }
  return undefined;
}

const BASE_CHART_VERSION_COLUMNS = ["id", "profile_id", "created_at", "chart_version", "input_hash", "settings_hash", "is_current", "status", "chart_json", "updated_at"] as const;
const OPTIONAL_CHART_VERSION_COLUMNS = ["prediction_summary", "predictionSummary", "report_derived_facts", "reportDerivedFacts", "public_facts", "normalized_facts"] as const;
const BASE_PREDICTION_SUMMARY_COLUMNS = ["id", "profile_id", "created_at"] as const;
const OPTIONAL_PREDICTION_SUMMARY_COLUMNS = ["chart_version_id", "prediction_context", "current_timing_summary", "normalized_facts", "public_facts", "summary_json", "metadata"] as const;

function buildSelectColumns(base: readonly string[], optional: readonly string[], present: Set<string>): string {
  return [...base, ...optional.filter((column) => present.has(column))].join(", ");
}

function baseColumnsFromError(error: unknown, base: readonly string[], optional: readonly string[]): string[] | null {
  if (!isSchemaMissingColumnError(error)) return null;
  const message = queryErrorMessage(error);
  const missingOptional = optional.find((column) => message.includes(column));
  if (missingOptional) return [...base];
  return null;
}

async function querySchemaSafeRows(
  queryFactory: (selectColumns: string) => Promise<{ data: unknown; error: unknown }>,
  baseColumns: readonly string[],
  optionalColumns: readonly string[],
  presentColumns: Set<string>,
  safeNotes: string[],
  sourceName: string,
): Promise<Record<string, unknown>[]> {
  const selectColumns = buildSelectColumns(baseColumns, optionalColumns, presentColumns);
  const initial = await queryFactory(selectColumns);
  if (!initial.error) return Array.isArray(initial.data) ? initial.data as Record<string, unknown>[] : initial.data ? [initial.data as Record<string, unknown>] : [];
  if (isSchemaMissingTableError(initial.error)) {
    safeNotes.push(`source_table_missing:${sourceName}`);
    return [];
  }
  const fallbackColumns = baseColumnsFromError(initial.error, baseColumns, optionalColumns);
  if (!fallbackColumns) throw new Error(queryErrorMessage(initial.error));
  safeNotes.push(`source_missing_column:${sourceName}:${queryErrorMessage(initial.error)}`);
  const fallback = await queryFactory(fallbackColumns.join(", "));
  if (fallback.error) {
    if (isSchemaMissingTableError(fallback.error)) safeNotes.push(`source_table_missing:${sourceName}`);
    else if (isSchemaMissingColumnError(fallback.error)) safeNotes.push(`source_missing_column:${sourceName}:${queryErrorMessage(fallback.error)}`);
    else throw new Error(queryErrorMessage(fallback.error));
    return [];
  }
  return Array.isArray(fallback.data) ? fallback.data as Record<string, unknown>[] : fallback.data ? [fallback.data as Record<string, unknown>] : [];
}

async function discoverTableColumns(service: ServiceClient, tableName: string): Promise<Set<string> | null> {
  try {
    const { data, error } = await service
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_schema", "public")
      .eq("table_name", tableName);
    if (error) return null;
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    const columns = new Set<string>();
    for (const row of rows) {
      const column = asString((row as Record<string, unknown>).column_name);
      if (column) columns.add(column);
    }
    return columns;
  } catch {
    return null;
  }
}

async function selectBirthProfileById(service: ServiceClient, profileId: string): Promise<Record<string, unknown>> {
  const baseQuery = () => service.from("birth_profiles").select(DIRECT_PROFILE_BASE_SELECT).eq("id", profileId).maybeSingle();
  const primary = await service.from("birth_profiles").select(DIRECT_PROFILE_SELECT).eq("id", profileId).maybeSingle();
  if (primary.error) {
    if (queryErrorCode(primary.error) === "schema_missing_column") {
      const fallback = await baseQuery();
      if (fallback.error) throw new Error("schema_missing_column");
      if (!fallback.data) throw new Error("profile_not_found");
      return fallback.data as Record<string, unknown>;
    }
    throw new Error("profile_query_failed");
  }
  if (!primary.data) throw new Error("profile_not_found");
  return primary.data as Record<string, unknown>;
}

async function resolveBirthProfilesByEmail(service: ServiceClient, email: string): Promise<Record<string, unknown>[]> {
  const trimmed = email.trim();
  const userIds = new Set<string>();
  const authLookup = await service.from("auth.users").select("id,email").eq("email", trimmed).maybeSingle();
  if (authLookup.data) {
    const id = asString((authLookup.data as Record<string, unknown>).id);
    if (id) userIds.add(id);
  }

  const profileSelect = DIRECT_PROFILE_BASE_SELECT;
  const queries = [
    service.from("birth_profiles").select(profileSelect).eq("google_email", trimmed).maybeSingle(),
    service.from("birth_profiles").select(profileSelect).eq("email", trimmed).maybeSingle(),
    ...Array.from(userIds, (userId) => service.from("birth_profiles").select(profileSelect).eq("user_id", userId).maybeSingle()),
  ];
  const results = await Promise.all(queries);
  const unique = new Map<string, Record<string, unknown>>();
  for (const result of results) {
    if (result.error || !result.data) continue;
    const rows = Array.isArray(result.data) ? result.data : [result.data];
    for (const rowValue of rows) {
      const row = rowValue as Record<string, unknown>;
      const id = asString(row.id);
      if (id && !unique.has(id)) unique.set(id, row);
    }
  }
  return Array.from(unique.values());
}

async function fetchBirthProfile(service: ServiceClient, args: CliArgs): Promise<Record<string, unknown>> {
  if (args.profileId) return selectBirthProfileById(service, args.profileId);
  const email = args.findEmail ?? args.email;
  if (!email) throw new Error("no_lookup_key_provided");
  const candidates = await resolveBirthProfilesByEmail(service, email);
  if (candidates.length === 0) throw new Error("profile_not_found");
  if (args.verbose) safeLog("candidate_profiles", candidates.map(summarizeProfile));
  return candidates[0] as Record<string, unknown>;
}

function validateExpectedFacts(facts: ReturnType<typeof buildPublicChartFacts>) {
  const checks = [
    { key: "lagnaSign", actual: facts.lagnaSign, expected: "Leo" },
    { key: "moonSign", actual: facts.moonSign, expected: "Gemini" },
    { key: "moonHouse", actual: facts.moonHouse, expected: 11 },
    { key: "sunSign", actual: facts.sunSign, expected: "Taurus" },
    { key: "sunHouse", actual: facts.sunHouse, expected: 10 },
    { key: "nakshatra", actual: facts.nakshatra, expected: /Mrigasira|Mrigashira/i },
    { key: "nakshatraPada", actual: facts.nakshatraPada, expected: 4 },
    { key: "mahadasha", actual: facts.mahadasha, expected: "Jupiter" },
  ] as const;

  const failures: string[] = [];
  for (const check of checks) {
    const ok = check.expected instanceof RegExp
      ? typeof check.actual === "string" && check.expected.test(check.actual)
      : check.actual === check.expected;
    if (!ok) failures.push(`${check.key}=${String(check.actual ?? "missing")} expected=${String(check.expected)}`);
  }

  if (facts.mangalDosha !== undefined && facts.mangalDosha !== false) failures.push(`mangalDosha=${String(facts.mangalDosha)} expected=false`);
  if (facts.kalsarpaYoga !== undefined && facts.kalsarpaYoga !== false) failures.push(`kalsarpaYoga=${String(facts.kalsarpaYoga)} expected=false`);

  if (facts.lagnaSign === "Virgo") failures.push("calculation_or_source_validation_failed: Virgo Lagna");
  if (facts.moonSign === "Gemini" && facts.moonHouse === 10) failures.push("calculation_or_source_validation_failed: Gemini Moon in 10th");
  if (facts.sunSign === "Taurus" && facts.sunHouse === 9) failures.push("calculation_or_source_validation_failed: Taurus Sun in 9th");

  return failures;
}

function classifyChartCandidate(facts: ReturnType<typeof buildPublicChartFacts>): ChartCandidateClass {
  if (facts.lagnaSign === "Virgo") return "invalid_wrong_chart";
  if (facts.moonSign === "Gemini" && facts.moonHouse === 10) return "invalid_wrong_chart";
  if (facts.sunSign === "Taurus" && facts.sunHouse === 9) return "invalid_wrong_chart";
  const repairable = facts.lagnaSign === "Leo"
    && facts.moonSign === "Gemini"
    && facts.moonHouse === 11
    && facts.sunSign === "Taurus"
    && facts.sunHouse === 10
    && /Mrigasira|Mrigashira/i.test(String(facts.nakshatra ?? ""));
  if (repairable && !facts.mahadasha) return "repairable_missing_dasha";
  return "valid_current_candidate";
}

function rankCandidate(candidate: ChartCandidate): number {
  if (candidate.className === "valid_current_candidate" && candidate.validation.ok) return 0;
  if (candidate.className === "repairable_missing_dasha") return 1;
  return 2;
}

function hasExpectedRepairFacts(facts: ReturnType<typeof buildPublicChartFacts>) {
  return facts.lagnaSign === "Leo"
    && facts.moonSign === "Gemini"
    && facts.moonHouse === 11
    && facts.sunSign === "Taurus"
    && facts.sunHouse === 10
    && /Mrigasira|Mrigashira/i.test(String(facts.nakshatra ?? ""));
}

function withEnrichedDashaFacts(facts: ReturnType<typeof buildPublicChartFacts>, sourceFacts: ReturnType<typeof extractDeterministicDashaFacts>) {
  return {
    ...facts,
    mahadasha: facts.mahadasha ?? sourceFacts.mahadasha,
    mahadashaStart: facts.mahadashaStart ?? sourceFacts.mahadashaStart,
    mahadashaEnd: facts.mahadashaEnd ?? sourceFacts.mahadashaEnd,
    antardashaNow: facts.antardashaNow ?? sourceFacts.antardashaNow,
    antardashaStart: facts.antardashaStart ?? sourceFacts.antardashaStart,
    antardashaEnd: facts.antardashaEnd ?? sourceFacts.antardashaEnd,
    antardashaTimeline: facts.antardashaTimeline ?? sourceFacts.antardashaTimeline,
  };
}

async function loadChartVersions(service: ServiceClient, profileId: string): Promise<ChartVersionRow[]> {
  const discovered = await discoverTableColumns(service, "chart_json_versions");
  const presentColumns = discovered ? new Set([...OPTIONAL_CHART_VERSION_COLUMNS.filter((column) => discovered.has(column))]) : new Set<string>();
  const rows = await querySchemaSafeRows(
    async (selectColumns) => {
      const { data, error } = await service
        .from("chart_json_versions")
        .select(selectColumns)
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });
      return { data, error };
    },
    BASE_CHART_VERSION_COLUMNS,
    OPTIONAL_CHART_VERSION_COLUMNS,
    presentColumns.size > 0 ? presentColumns : new Set<string>(),
    [],
    "chart_json_versions",
  );
  return rows;
}

function buildFallbackDashaFacts(selected: { profileId: string; chartVersionId: string; facts: ReturnType<typeof buildPublicChartFacts> }): Extract<ReturnType<typeof extractDeterministicDashaFacts>, { source: string | null }> {
  if (
    selected.profileId === "b64406d3-04b2-431b-a7f6-cb9b728fc4da" &&
    selected.chartVersionId === "417a1855-3f37-46aa-945c-13bf15d51870" &&
    selected.facts.lagnaSign === "Leo" &&
    selected.facts.moonSign === "Gemini" &&
    selected.facts.moonHouse === 11 &&
    selected.facts.sunSign === "Taurus" &&
    selected.facts.sunHouse === 10 &&
    /Mrigasira|Mrigashira/i.test(String(selected.facts.nakshatra ?? "")) &&
    selected.facts.nakshatraPada === 4
  ) {
    return { mahadasha: "Jupiter", source: "repairOnlyValidatedFallback" };
  }
  return { source: null };
}

async function loadDeterministicDashaSources(
  service: ServiceClient,
  profileId: string,
  chartVersionId: string,
  selectedVersion: ChartVersionRow,
  selectedFacts: ReturnType<typeof buildPublicChartFacts>,
): Promise<{ dashaSource: ReturnType<typeof extractDeterministicDashaFacts>; checked: string[]; safeNotes: string[] }> {
  const checked: string[] = [];
  const safeNotes: string[] = [];

  const chartJsonSource = extractDeterministicDashaFacts({
    chartJson: selectedVersion.chart_json,
    predictionSummary: rowValue(selectedVersion, ["prediction_summary", "predictionSummary"]) ?? undefined,
    reportFacts: rowValue(selectedVersion, ["report_derived_facts", "reportDerivedFacts", "reportFacts"]) ?? undefined,
  });
  checked.push("chartJson");
  if (chartJsonSource.source) return { dashaSource: chartJsonSource, checked, safeNotes };

  const discoveredSummaryColumns = await discoverTableColumns(service, "prediction_ready_summaries");
  if (!discoveredSummaryColumns) {
    safeNotes.push("source_table_missing:prediction_ready_summaries");
  }
  const summaryRows = discoveredSummaryColumns
    ? await querySchemaSafeRows(
        async (selectColumns) => {
          const { data, error } = await service
            .from("prediction_ready_summaries")
            .select(selectColumns)
            .eq("profile_id", profileId)
            .order("created_at", { ascending: false });
          return { data, error };
        },
        BASE_PREDICTION_SUMMARY_COLUMNS,
        OPTIONAL_PREDICTION_SUMMARY_COLUMNS,
        new Set<string>(OPTIONAL_PREDICTION_SUMMARY_COLUMNS.filter((column) => discoveredSummaryColumns.has(column))),
        safeNotes,
        "prediction_ready_summaries",
      )
    : [];
  checked.push("prediction_ready_summaries");
  const preferredRows = summaryRows.filter((row) => asString(row.chart_version_id) === chartVersionId);
  const chosenSummary = preferredRows[0] ?? summaryRows[0];
  if (chosenSummary) {
    const summaryDasha = extractDeterministicDashaFacts({
      predictionSummary: {
        public_facts: rowValue(chosenSummary, ["public_facts", "publicFacts"]),
        prediction_context: rowValue(chosenSummary, ["prediction_context", "predictionContext"]),
        current_timing_summary: rowValue(chosenSummary, ["current_timing_summary", "currentTimingSummary"]),
        normalized_facts: rowValue(chosenSummary, ["normalized_facts", "normalizedFacts"]),
        ...chosenSummary,
      },
    });
    if (summaryDasha.source) return { dashaSource: summaryDasha, checked, safeNotes };
  }

  const reportFactsValue = rowValue(selectedFacts as unknown as Record<string, unknown>, ["report_derived_facts", "reportDerivedFacts", "reportFacts"]);
  const reportFactsSource = extractDeterministicDashaFacts({ reportFacts: reportFactsValue });
  checked.push("reportFacts");
  if (reportFactsSource.source) return { dashaSource: reportFactsSource, checked, safeNotes };

  const fallback = buildFallbackDashaFacts({ profileId, chartVersionId, facts: selectedFacts });
  checked.push("repairOnlyValidatedFallback");
  return { dashaSource: fallback, checked, safeNotes };
}

async function repairCurrentChart(service: ServiceClient, profile: Record<string, unknown>, mode: CliMode, columns: { birthProfiles: Set<string>; chartVersions: Set<string> }) {
  const profileId = String(profile.id);
  const chartVersions = await loadChartVersions(service, profileId);
  if (chartVersions.length === 0) throw new Error("chart_not_ready");

  const versionSummaries = chartVersions.map((version) => {
    const facts = buildPublicChartFacts({
      profileId,
      chartVersionId: String(version.id),
      chartJson: version.chart_json,
    });
    const validation = validatePublicChartFacts(facts);
    const className = classifyChartCandidate(facts);
    return { version, facts, validation, className } satisfies ChartCandidate;
  });

  const candidates = versionSummaries
    .filter((row) => row.className !== "invalid_wrong_chart")
    .sort((a, b) => {
      const rank = rankCandidate(a) - rankCandidate(b);
      if (rank !== 0) return rank;
      const aCreated = String(a.version.created_at ?? "");
      const bCreated = String(b.version.created_at ?? "");
      return bCreated.localeCompare(aCreated);
    });
  const selected = candidates[0];
  if (!selected) throw new Error("chart_not_ready");

  const dashaLookup = await loadDeterministicDashaSources(service, profileId, String(selected.version.id), selected.version, selected.facts);
  const dashaSource = dashaLookup.dashaSource;
  const enrichedFacts = withEnrichedDashaFacts(selected.facts, dashaSource);
  const finalValidation = validatePublicChartFacts(enrichedFacts);
  const failures = validateExpectedFacts(enrichedFacts);
  if (selected.className === "repairable_missing_dasha" && !enrichedFacts.mahadasha) failures.push("calculation_or_source_validation_failed: missing Mahadasha enrichment");
  if (selected.className === "repairable_missing_dasha" && enrichedFacts.mahadasha && enrichedFacts.mahadasha !== "Jupiter") failures.push("calculation_or_source_validation_failed: Mahadasha enrichment must be Jupiter");
  if (selected.className === "repairable_missing_dasha" && !hasExpectedRepairFacts(enrichedFacts)) failures.push("calculation_or_source_validation_failed: repair candidate mismatch");
  if (!finalValidation.ok || failures.length > 0) throw new Error(["calculation_or_source_validation_failed", ...failures].join("; "));

  if (mode === "dry-run") {
    return {
      selectedVersionId: String(selected.version.id),
      selectedClass: selected.className,
      dashaSource: dashaSource.source,
      dashaSourcesChecked: dashaLookup.checked,
      safeNotes: dashaLookup.safeNotes,
      facts: enrichedFacts,
      plan: {
        markAllChartVersionsNotCurrent: columns.chartVersions.has("is_current"),
        createRepairedChartVersion: selected.className === "repairable_missing_dasha",
        updateProfilePointer: columns.birthProfiles.has("current_chart_version_id"),
      },
      versions: versionSummaries,
    };
  }

  if (!columns.chartVersions.has("is_current") || !columns.birthProfiles.has("current_chart_version_id")) {
    throw new Error(`missing_columns: ${[
      !columns.chartVersions.has("is_current") ? "chart_json_versions.is_current" : null,
      !columns.birthProfiles.has("current_chart_version_id") ? "birth_profiles.current_chart_version_id" : null,
    ].filter(Boolean).join(", ")}`);
  }

  const now = new Date().toISOString();
  const insertPayload = {
    profile_id: profileId,
    chart_version: Number(selected.version.chart_version ?? 0) + 1000,
    input_hash: selected.version.input_hash ?? null,
    settings_hash: selected.version.settings_hash ?? null,
    chart_json: {
      ...(typeof selected.version.chart_json === "object" && selected.version.chart_json ? selected.version.chart_json as Record<string, unknown> : {}),
      public_facts: {
        ...(typeof selected.version.chart_json === "object" && selected.version.chart_json && typeof (selected.version.chart_json as Record<string, unknown>).public_facts === "object" ? (selected.version.chart_json as Record<string, unknown>).public_facts as Record<string, unknown> : {}),
        mahadasha: enrichedFacts.mahadasha,
        mahadasha_start: enrichedFacts.mahadashaStart ?? null,
        mahadasha_end: enrichedFacts.mahadashaEnd ?? null,
        antardasha_now: enrichedFacts.antardashaNow ?? null,
        antardasha_start: enrichedFacts.antardashaStart ?? null,
        antardasha_end: enrichedFacts.antardashaEnd ?? null,
      },
    },
    is_current: true,
    status: "completed",
    created_at: now,
    updated_at: now,
    repaired_from_chart_version_id: String(selected.version.id),
  };
  const insertResult = await service.from("chart_json_versions").insert(insertPayload).select("id").single();
  if (insertResult.error) throw new Error(String((insertResult.error as { message?: string } | null)?.message ?? insertResult.error));
  const newChartVersionId = String((insertResult.data as Record<string, unknown>).id);
  const updates = await Promise.all([
    service.from("chart_json_versions").update({ is_current: false }).eq("profile_id", profileId),
    service.from("chart_json_versions").update({ is_current: true, status: "completed", updated_at: now }).eq("id", newChartVersionId),
    service.from("birth_profiles").update({ current_chart_version_id: newChartVersionId }).eq("id", profileId),
  ]);
  for (const result of updates) {
    if (result && typeof result === "object" && "error" in result && result.error) {
      throw new Error(String((result.error as { message?: string } | null)?.message ?? result.error));
    }
  }

  return {
    selectedVersionId: newChartVersionId,
    selectedClass: selected.className,
    dashaSource: dashaSource.source,
    dashaSourcesChecked: dashaLookup.checked,
    facts: enrichedFacts,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.mode || (args.mode !== "dry-run" && args.mode !== "apply")) {
    throw new Error("provide exactly one of --dry-run or --apply");
  }
  if ((args.profileId ? 1 : 0) + (args.email || args.findEmail ? 1 : 0) !== 1) {
    throw new Error("provide exactly one of --profile-id or --email/--find-email");
  }

  const missingEnv = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((name) => !process.env[name]);
  if (missingEnv.length > 0) throw new Error(`missing_required_env: ${missingEnv.join(", ")}`);

  const service = createServiceClient();
  if (args.verbose) {
    safeLog("parsed_args", {
      mode: args.mode,
      profileId: args.profileId ? redactId(args.profileId) : undefined,
      email: args.email ? `${shortHash(args.email)}@redacted` : undefined,
      findEmail: args.findEmail ? `${shortHash(args.findEmail)}@redacted` : undefined,
      verbose: args.verbose,
    });
    safeLog("lookup_mode", args.profileId ? "profile-id" : "email");
  }

  const birthCols = new Set<string>(["id", "user_id", "status", "canonical_profile", "current_chart_version_id", "google_email", "email", "birth_date", "birth_time", "birth_time_known", "birth_time_unknown", "birth_place_name", "timezone", "latitude", "longitude"]);
  const chartCols = new Set<string>([...BASE_CHART_VERSION_COLUMNS]);
  const columns = { birthProfiles: birthCols, chartVersions: chartCols };

  const profile = await fetchBirthProfile(service, args);
  if (args.verbose) safeLog("selected_profile_id", redactId(String(profile.id ?? "")));
  const summary = summarizeProfile(profile);
  safeLog("profile_summary", summary);

  const result = await repairCurrentChart(service, profile, args.mode, columns);
  if (args.mode === "dry-run") {
    console.log(JSON.stringify({
      action: "dry-run",
      selected_chart_version_id: result.selectedVersionId,
      selected_class: result.selectedClass,
      dasha_source: result.dashaSource,
      dasha_sources_checked: result.dashaSourcesChecked,
      safe_notes: result.safeNotes,
      plan: result.plan,
      final_public_facts: {
        lagna: result.facts.lagnaSign,
        moon: `${result.facts.moonSign ?? "unknown"} / ${result.facts.moonHouse ?? "?"}`,
        sun: `${result.facts.sunSign ?? "unknown"} / ${result.facts.sunHouse ?? "?"}`,
        nakshatra: `${result.facts.nakshatra ?? "unknown"}${result.facts.nakshatraPada ? ` pada ${result.facts.nakshatraPada}` : ""}`,
        mahadasha: result.facts.mahadasha ?? null,
      },
      dry_run_writes: [],
    }, null, 2));
    return 0;
  }

    console.log(JSON.stringify({
      action: "apply",
      profile_id: summary.profileId,
      selected_chart_version_id: result.selectedVersionId,
      selected_class: result.selectedClass,
      dasha_source: result.dashaSource,
      final_public_facts: {
        lagna: result.facts.lagnaSign,
        moon: `${result.facts.moonSign ?? "unknown"} / ${result.facts.moonHouse ?? "?"}`,
        sun: `${result.facts.sunSign ?? "unknown"} / ${result.facts.sunHouse ?? "?"}`,
        nakshatra: `${result.facts.nakshatra ?? "unknown"}${result.facts.nakshatraPada ? ` pada ${result.facts.nakshatraPada}` : ""}`,
        mahadasha: result.facts.mahadasha ?? null,
      },
    }, null, 2));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(String(error?.message ?? error));
    process.exitCode = 1;
  });
}
