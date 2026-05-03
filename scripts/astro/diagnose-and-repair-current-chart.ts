/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { buildPublicChartFacts, validatePublicChartFacts } from "@/lib/astro/public-chart-facts";

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
  return "profile_query_failed";
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

async function loadChartVersions(service: ServiceClient, profileId: string, columns: { chartVersions: Set<string> }): Promise<ChartVersionRow[]> {
  const selectCols = Array.from([
    "id", "profile_id", "created_at", "chart_version", "input_hash", "settings_hash", "is_current", "status", "chart_json",
  ].filter((col) => columns.chartVersions.has(col) || ["id", "profile_id", "created_at", "chart_json"].includes(col))).join(", ");
  const { data, error } = await service
    .from("chart_json_versions")
    .select(selectCols)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(String((error as { message?: string } | null)?.message ?? error));
  return (data ?? []) as unknown as ChartVersionRow[];
}

async function repairCurrentChart(service: ServiceClient, profile: Record<string, unknown>, mode: CliMode, columns: { birthProfiles: Set<string>; chartVersions: Set<string> }) {
  const profileId = String(profile.id);
  const chartVersions = await loadChartVersions(service, profileId, columns);
  if (chartVersions.length === 0) throw new Error("chart_not_ready");

  const versionSummaries = chartVersions.map((version) => {
    const facts = buildPublicChartFacts({
      profileId,
      chartVersionId: String(version.id),
      chartJson: version.chart_json,
    });
    const validation = validatePublicChartFacts(facts);
    return { version, facts, validation };
  });

  const valid = versionSummaries.find((row) => row.validation.ok);
  if (!valid) throw new Error("chart_not_ready");

  const failures = validateExpectedFacts(valid.facts);
  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }

  if (mode === "dry-run") {
    return {
      selectedVersionId: String(valid.version.id),
      facts: valid.facts,
      plan: {
        clearCurrent: columns.chartVersions.has("is_current"),
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
  const updates = await Promise.all([
    service.from("chart_json_versions").update({ is_current: false }).eq("profile_id", profileId),
    service.from("chart_json_versions").update({ is_current: true, status: "completed", updated_at: now }).eq("id", valid.version.id),
    service.from("birth_profiles").update({ current_chart_version_id: valid.version.id }).eq("id", profileId),
  ]);
  for (const result of updates) {
    if (result && typeof result === "object" && "error" in result && result.error) {
      throw new Error(String((result.error as { message?: string } | null)?.message ?? result.error));
    }
  }

  return {
    selectedVersionId: String(valid.version.id),
    facts: valid.facts,
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
  const chartCols = new Set<string>(["id", "profile_id", "created_at", "chart_version", "input_hash", "settings_hash", "is_current", "status", "chart_json", "updated_at"]);
  const columns = { birthProfiles: birthCols, chartVersions: chartCols };

  const profile = await fetchBirthProfile(service, args);
  if (args.verbose) safeLog("selected_profile_id", redactId(String(profile.id ?? "")));
  const summary = summarizeProfile(profile);
  safeLog("profile_summary", summary);

  const versions = await loadChartVersions(service, String(profile.id), columns);
  for (const version of versions) {
    const facts = buildPublicChartFacts({
      profileId: String(profile.id),
      chartVersionId: String(version.id),
      chartJson: version.chart_json,
    });
    const validation = validatePublicChartFacts(facts);
    console.log(JSON.stringify({
      chart_version_id: String(version.id),
      created_at: version.created_at ?? null,
      chart_version: version.chart_version ?? null,
      input_hash: version.input_hash ?? null,
      settings_hash: version.settings_hash ?? null,
      is_current: version.is_current ?? null,
      status: version.status ?? null,
      public_facts: {
        lagna: facts.lagnaSign,
        moon: `${facts.moonSign ?? "unknown"} / ${facts.moonHouse ?? "?"}`,
        sun: `${facts.sunSign ?? "unknown"} / ${facts.sunHouse ?? "?"}`,
        nakshatra: `${facts.nakshatra ?? "unknown"}${facts.nakshatraPada ? ` pada ${facts.nakshatraPada}` : ""}`,
        mahadasha: facts.mahadasha ?? null,
        antardasha: facts.antardashaNow ?? null,
        mangal_dosha: facts.mangalDosha ?? null,
        kalsarpa_yoga: facts.kalsarpaYoga ?? null,
      },
      validation,
    }, null, 2));
  }

  const result = await repairCurrentChart(service, profile, args.mode, columns);
  if (args.mode === "dry-run") {
    console.log(JSON.stringify({
      action: "dry-run",
      selected_chart_version_id: result.selectedVersionId,
      plan: result.plan,
      facts: result.facts,
    }, null, 2));
    return 0;
  }

  console.log(JSON.stringify({
    action: "apply",
    profile_id: summary.profileId,
    selected_chart_version_id: result.selectedVersionId,
    facts: result.facts,
  }, null, 2));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(String(error?.message ?? error));
    process.exitCode = 1;
  });
}
