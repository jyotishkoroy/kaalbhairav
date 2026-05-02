// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import fs from "node:fs";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

export type DumpRecordType = "source_note" | "retrieval_tag" | "rule" | "example" | "validation_check" | "answer_log_schema";

export type DumpImportReport = {
  input: string;
  mode: "existing-db" | "local" | "backfill-normalized";
  validateOnly: boolean;
  dryRun: boolean;
  verifyCounts: boolean;
  totalLines: number;
  validLines: number;
  invalidLines: number;
  recordCounts: Record<string, number>;
  writtenCounts: Record<string, number>;
  skippedCounts: Record<string, number>;
  errors: Array<{ line: number; code: string; message: string }>;
  missingEnv?: string[];
};

type DumpImportMode = DumpImportReport["mode"];

type DumpRow = Record<string, unknown> & { record_type?: string };

type SupabaseLike = {
  from: (table: string) => {
    upsert: (rows: Record<string, unknown>[], options?: { onConflict?: string }) => Promise<{ data: unknown; error: { message?: string } | null }>;
    update?: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    select?: (columns?: string, options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) => {
      order?: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => unknown;
      limit?: (count: number) => Promise<{ data: unknown; error: { message?: string } | null; count?: number | null }>;
    };
  };
};

const RECORD_TYPES: DumpRecordType[] = ["source_note", "retrieval_tag", "rule", "example", "validation_check", "answer_log_schema"];
const WRITE_BATCH_SIZE = 200;
const COUNT_TABLES = [
  "astro_reasoning_rules",
  "astro_benchmark_examples",
  "astro_source_notes",
  "astro_retrieval_tags",
  "astro_validation_checks",
] as const;

function trimText(value: unknown, max = 2000): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePlanetName(value: unknown): string | null {
  const raw = normalizeString(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const planetMap: Record<string, string> = {
    sun: "Sun",
    surya: "Sun",
    moon: "Moon",
    chandra: "Moon",
    mars: "Mars",
    mangal: "Mars",
    kuja: "Mars",
    mercury: "Mercury",
    budha: "Mercury",
    jupiter: "Jupiter",
    guru: "Jupiter",
    venus: "Venus",
    shukra: "Venus",
    saturn: "Saturn",
    shani: "Saturn",
    rahu: "Rahu",
    ketu: "Ketu",
  };
  return planetMap[lower] ?? raw;
}

function normalizeSignName(value: unknown): string | null {
  const raw = normalizeString(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const signMap: Record<string, string> = {
    aries: "Aries",
    taurus: "Taurus",
    gemini: "Gemini",
    cancer: "Cancer",
    leo: "Leo",
    virgo: "Virgo",
    libra: "Libra",
    scorpio: "Scorpio",
    sagittarius: "Sagittarius",
    capricorn: "Capricorn",
    aquarius: "Aquarius",
    pisces: "Pisces",
    mesha: "Aries",
    vrishabha: "Taurus",
    mithuna: "Gemini",
    karkata: "Cancer",
    simha: "Leo",
    kanya: "Virgo",
    tula: "Libra",
    vrischika: "Scorpio",
    dhanu: "Sagittarius",
    makara: "Capricorn",
    kumbha: "Aquarius",
    meena: "Pisces",
  };
  return signMap[lower] ?? raw;
}

function normalizeYogaName(value: unknown, keywords: unknown): string | null {
  const direct = normalizeString(value);
  if (direct) return direct;
  const keywordList = Array.isArray(keywords) ? keywords.filter((item): item is string => typeof item === "string") : [];
  const yogaKeyword = keywordList.find((keyword) => /\byoga\b/i.test(keyword) || /raja|dhana|gaja|kesari|kemadruma|viparita|neecha|bhanga|mahapurusha/i.test(keyword));
  return normalizeString(yogaKeyword);
}

function extractRuleCondition(record: unknown): Record<string, unknown> {
  if (!record || typeof record !== "object") return {};
  const maybe = record as Record<string, unknown>;
  const structuredRule = maybe.structured_rule;
  if (!structuredRule || typeof structuredRule !== "object") return {};
  const condition = (structuredRule as Record<string, unknown>).condition;
  return condition && typeof condition === "object" ? (condition as Record<string, unknown>) : {};
}

function extractRuleInterpretation(record: unknown): Record<string, unknown> {
  if (!record || typeof record !== "object") return {};
  const maybe = record as Record<string, unknown>;
  const structuredRule = maybe.structured_rule;
  if (!structuredRule || typeof structuredRule !== "object") return {};
  const interpretation = (structuredRule as Record<string, unknown>).interpretation;
  return interpretation && typeof interpretation === "object" ? (interpretation as Record<string, unknown>) : {};
}

function mapRuleNormalizedColumns(record: Record<string, unknown>) {
  const condition = extractRuleCondition(record);
  const interpretation = extractRuleInterpretation(record);
  return {
    primary_planet: normalizePlanetName(condition.planet),
    secondary_planet: normalizePlanetName(condition.conjunction),
    house: normalizeInteger(condition.house),
    target_house: normalizeInteger(condition.lordship),
    sign: normalizeSignName(condition.sign),
    lordship: normalizeString(condition.lordship),
    dignity: normalizeString(condition.dignity),
    aspect_type: normalizeString(condition.aspect),
    yoga_name: normalizeYogaName((record as Record<string, unknown>).yoga_name, record.retrieval_keywords),
    divisional_chart: normalizeString(condition.divisional_chart),
    dasha_condition: normalizeString(condition.dasha_condition),
    transit_condition: normalizeString(condition.transit_condition),
    normalized_source_text: normalizeString(record.source_text),
    normalized_source_reference: normalizeString(record.source_reference),
    normalized_source_reliability: normalizeString(record.source_reliability),
    normalized_embedding_text: normalizeString(record.embedding_text),
    normalized_prompt_compact_summary: normalizeString(record.prompt_compact_summary),
    normalized_condition: condition,
    normalized_interpretation: interpretation,
    normalized_updated_at: new Date().toISOString(),
  };
}

function listStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const text = typeof item === "string" ? item.trim() : "";
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function normalizeReference(value: unknown): string {
  return trimText(value, 300) ?? "exact_reference_unknown";
}

function normalizeRecordType(value: unknown): DumpRecordType | null {
  return typeof value === "string" && (RECORD_TYPES as string[]).includes(value) ? (value as DumpRecordType) : null;
}

export function parseDumpLine(line: string): { ok: true; value: DumpRow } | { ok: false; error: string } {
  try {
    const value = JSON.parse(line) as DumpRow;
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "not_object" };
    return { ok: true, value };
  } catch {
    return { ok: false, error: "invalid_json" };
  }
}

export function normalizeDumpRecord(row: DumpRow): { table: string; conflictKey?: string; row: Record<string, unknown> } | null {
  const type = normalizeRecordType(row.record_type ?? row.type);
  if (!type) return null;

  if (type === "source_note") {
    const sourceId = trimText(row.source_id, 120);
    if (!sourceId) return null;
    return {
      table: "astro_source_notes",
      conflictKey: "source_id",
      row: {
        source_id: sourceId,
        source_name: trimText(row.source_name, 250) ?? sourceId,
        source_type: trimText(row.source_type, 100) ?? "unknown",
        reliability_level: trimText(row.reliability_level, 80),
        recommended_usage: trimText(row.recommended_usage, 1200),
        limitations: trimText(row.limitations, 1200),
        citation_guidance: trimText(row.citation_guidance, 1200),
        metadata: {
          source_reference: normalizeReference(row.source_reference),
          raw_record_type: type,
        },
      },
    };
  }

  if (type === "retrieval_tag") {
    const tagId = trimText(row.tag_id, 120);
    if (!tagId) return null;
    return {
      table: "astro_retrieval_tags",
      conflictKey: "tag_id",
      row: {
        tag_id: tagId,
        tag_name: trimText(row.tag_name, 200) ?? tagId,
        tag_category: trimText(row.tag_category, 120),
        description: trimText(row.description, 1500),
        synonyms: listStrings(row.synonyms),
        related_tags: listStrings(row.related_tags),
        metadata: { source_reference: normalizeReference(row.source_reference), raw_record_type: type },
      },
    };
  }

  if (type === "rule") {
    const ruleId = trimText(row.rule_id, 160);
    if (!ruleId) return null;
    const structuredRule = typeof row.structured_rule === "object" && row.structured_rule && !Array.isArray(row.structured_rule) ? { ...(row.structured_rule as Record<string, unknown>) } : {};
    return {
      table: "astro_reasoning_rules",
      conflictKey: "rule_key",
      row: {
        rule_key: ruleId,
        domain: trimText(row.tradition, 120) ?? trimText(row.domain, 120) ?? "general",
        title: trimText(row.rule_statement, 300) ?? ruleId,
        description: trimText(row.source_text, 2000) ?? "",
        required_fact_types: listStrings(row.required_fact_types ?? row.condition_tags),
        required_tags: listStrings(row.life_area_tags),
        reasoning_template: trimText(structuredRule.interpretation ?? row.rule_statement ?? row.source_text, 2000) ?? "",
        source_reference: normalizeReference(row.source_reference),
        source_reliability: trimText(row.source_reliability, 120),
        structured_rule: {
          condition: trimText(structuredRule.condition ?? row.condition, 2000),
          interpretation: trimText(structuredRule.interpretation ?? row.interpretation, 4000),
        },
        life_area_tags: listStrings(row.life_area_tags),
        condition_tags: listStrings(row.condition_tags),
        retrieval_keywords: listStrings(row.retrieval_keywords),
        weight: Number.isFinite(Number(row.weight)) ? Number(row.weight) : 100,
        safety_notes: listStrings(row.safety_notes),
        enabled: true,
        metadata: {
          source_reference: normalizeReference(row.source_reference),
          raw_record_type: type,
        },
        ...mapRuleNormalizedColumns(row),
      },
    };
  }

  if (type === "example") {
    const exampleId = trimText(row.example_id, 160);
    if (!exampleId) return null;
    return {
      table: "astro_benchmark_examples",
      conflictKey: "example_key",
      row: {
        example_key: exampleId,
        domain: trimText(row.example_type, 120) ?? trimText(row.domain, 120) ?? "general",
        question: trimText(row.user_question, 2000) ?? "",
        answer: trimText(row.good_answer_example, 4000) ?? "",
        reasoning: trimText(row.why_good_answer_is_good, 2000),
        accuracy_class: "unknown",
        reading_style: null,
        follow_up_question: null,
        tags: listStrings(row.life_area_tags),
        linked_rule_ids: listStrings(row.linked_rule_ids),
        example_type: trimText(row.example_type, 120),
        user_question: trimText(row.user_question, 4000),
        chart_condition_summary: trimText(row.chart_condition_summary, 4000),
        retrieved_rules: listStrings(row.retrieved_rules),
        good_answer_example: trimText(row.good_answer_example, 4000),
        bad_answer_example: trimText(row.bad_answer_example, 4000),
        why_good_answer_is_good: trimText(row.why_good_answer_is_good, 4000),
        why_bad_answer_is_bad: trimText(row.why_bad_answer_is_bad, 4000),
        life_area_tags: listStrings(row.life_area_tags),
        condition_tags: listStrings(row.condition_tags),
        safety_notes: listStrings(row.safety_notes),
        metadata: { source_reference: normalizeReference(row.source_reference), raw_record_type: type },
        enabled: true,
      },
    };
  }

  if (type === "validation_check") {
    const checkId = trimText(row.check_id, 160);
    if (!checkId) return null;
    return {
      table: "astro_validation_checks",
      conflictKey: "check_id",
      row: {
        check_id: checkId,
        check_category: trimText(row.check_category, 120),
        check_statement: trimText(row.check_statement, 2000) ?? checkId,
        failure_pattern: trimText(row.failure_pattern, 2000),
        correction_instruction: trimText(row.correction_instruction, 4000),
        metadata: { source_reference: normalizeReference(row.source_reference), raw_record_type: type },
      },
    };
  }

  return {
    table: "",
    row: {
      schema_id: trimText(row.schema_id, 160) ?? trimText(row.answer_log_schema_id, 160) ?? "answer_log_schema_unknown",
      schema_name: trimText(row.schema_name, 200) ?? "answer_log_schema",
      schema_description: trimText(row.schema_description, 4000),
      schema_definition: row.schema_definition && typeof row.schema_definition === "object" ? { ...(row.schema_definition as Record<string, unknown>) } : {},
      metadata: { source_reference: normalizeReference(row.source_reference), raw_record_type: type },
    },
  };
}

function isWritableRecord(normalized: { table: string; conflictKey?: string; row: Record<string, unknown> }): normalized is { table: string; conflictKey: string; row: Record<string, unknown> } {
  return Boolean(normalized.table && normalized.conflictKey);
}

async function upsertRows(client: SupabaseLike, table: string, conflictKey: string, rows: Record<string, unknown>[]): Promise<{ ok: boolean; error?: string }> {
  const result = await client.from(table).upsert(rows, { onConflict: conflictKey });
  if (result.error) return { ok: false, error: result.error.message ?? "write failed" };
  return { ok: true };
}

const BACKFILL_NORMALIZED_COLUMNS = [
  "primary_planet",
  "secondary_planet",
  "house",
  "target_house",
  "sign",
  "lordship",
  "dignity",
  "aspect_type",
  "yoga_name",
  "divisional_chart",
  "dasha_condition",
  "transit_condition",
  "normalized_source_text",
  "normalized_source_reference",
  "normalized_source_reliability",
  "normalized_embedding_text",
  "normalized_prompt_compact_summary",
  "normalized_condition",
  "normalized_interpretation",
  "normalized_updated_at",
] as const;

function pickBackfillNormalizedColumns(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(BACKFILL_NORMALIZED_COLUMNS.map((column) => [column, row[column] ?? null]));
}

async function updateBackfillNormalizedRows(
  client: SupabaseLike,
  rows: Array<{ ruleId: string; row: Record<string, unknown> }>,
): Promise<{ ok: boolean; error?: string }> {
  const table = client.from("astro_reasoning_rules");
  if (!table.update) return { ok: false, error: "update not supported" };
  const results = await Promise.all(rows.map((item) => table.update?.(item.row).eq("rule_key", item.ruleId)));
  const firstError = results.find((result) => result?.error);
  if (firstError?.error) return { ok: false, error: firstError.error.message ?? "write failed" };
  return { ok: true };
}

export async function verifyAstroDumpCounts(client: SupabaseLike): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of COUNT_TABLES) {
    const query = client.from(table).select?.("*", { count: "exact", head: true });
    const countResult = query && typeof query.limit === "function" ? await query.limit(1) : null;
    if (!countResult || countResult.error) {
      throw new Error(`failed to verify count for ${table}${countResult?.error?.message ? `: ${countResult.error.message}` : ""}`);
    }
    counts[table] = typeof countResult.count === "number" ? countResult.count : 0;
  }
  return counts;
}

export async function ingestAstroDump(input: {
  filePath: string;
  mode?: DumpImportMode;
  validateOnly?: boolean;
  dryRun?: boolean;
  verifyCounts?: boolean;
  limit?: number;
  supabase?: SupabaseLike;
}): Promise<DumpImportReport> {
  const report: DumpImportReport = {
    input: input.filePath,
    mode: input.mode ?? "local",
    validateOnly: input.validateOnly ?? false,
    dryRun: input.dryRun ?? false,
    verifyCounts: input.verifyCounts ?? false,
    totalLines: 0,
    validLines: 0,
    invalidLines: 0,
    recordCounts: Object.fromEntries(RECORD_TYPES.map((type) => [type, 0])),
    writtenCounts: {},
    skippedCounts: {},
    errors: [],
  };
  const stream = fs.createReadStream(input.filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let processed = 0;
  const batches = new Map<string, Array<{ conflictKey: string; row: Record<string, unknown> }>>();
  const backfillBatches: Array<{ ruleId: string; row: Record<string, unknown> }> = [];

  async function flushBackfillBatches() {
    if (!input.supabase || !backfillBatches.length) return;
    const pending = backfillBatches.splice(0, backfillBatches.length);
    const result = await updateBackfillNormalizedRows(input.supabase, pending);
    if (!result.ok) {
      report.skippedCounts.astro_reasoning_rules = (report.skippedCounts.astro_reasoning_rules ?? 0) + pending.length;
      if (report.errors.length < 50) report.errors.push({ line: report.totalLines, code: "write_error", message: result.error ?? "write failed" });
      return;
    }
    report.writtenCounts.astro_reasoning_rules = (report.writtenCounts.astro_reasoning_rules ?? 0) + pending.length;
  }

  for await (const line of rl) {
    report.totalLines += 1;
    if (input.limit && processed >= input.limit) break;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = parseDumpLine(trimmed);
    if (!parsed.ok) {
      report.invalidLines += 1;
      if (report.errors.length < 50) report.errors.push({ line: report.totalLines, code: parsed.error, message: "malformed jsonl line" });
      continue;
    }
    const normalized = normalizeDumpRecord(parsed.value);
    if (!normalized) {
      report.invalidLines += 1;
      if (report.errors.length < 50) report.errors.push({ line: report.totalLines, code: "unsupported_record", message: "unsupported or incomplete dump record" });
      continue;
    }
    report.validLines += 1;
    const type = normalizeRecordType(parsed.value.record_type ?? parsed.value.type) as DumpRecordType;
    report.recordCounts[type] = (report.recordCounts[type] ?? 0) + 1;
    processed += 1;
    if (!isWritableRecord(normalized)) {
      report.skippedCounts.answer_log_schema = (report.skippedCounts.answer_log_schema ?? 0) + 1;
      continue;
    }
    if (input.mode === "backfill-normalized" && normalized.table !== "astro_reasoning_rules") continue;
    if (input.mode === "backfill-normalized" && normalized.table === "astro_reasoning_rules") {
      const ruleId = trimText(parsed.value.rule_id, 160);
      if (!ruleId) continue;
      backfillBatches.push({
        ruleId,
        row: pickBackfillNormalizedColumns(mapRuleNormalizedColumns(parsed.value)),
      });
      if (!input.validateOnly && !input.dryRun && input.supabase && backfillBatches.length >= WRITE_BATCH_SIZE) await flushBackfillBatches();
      continue;
    }
    if (input.validateOnly || input.dryRun || !input.supabase) continue;
    const current = normalized as { table: string; conflictKey: string; row: Record<string, unknown> };
    const bucket = batches.get(current.table) ?? [];
    bucket.push({ conflictKey: current.conflictKey, row: current.row });
    batches.set(current.table, bucket);
    if (bucket.length >= WRITE_BATCH_SIZE) {
      const rows = bucket.splice(0, bucket.length).map((item) => item.row);
      const result = await upsertRows(input.supabase, current.table, current.conflictKey, rows);
      if (!result.ok) {
        report.skippedCounts[current.table] = (report.skippedCounts[current.table] ?? 0) + 1;
        if (report.errors.length < 50) report.errors.push({ line: report.totalLines, code: "write_error", message: result.error ?? "write failed" });
        continue;
      }
      report.writtenCounts[normalized.table] = (report.writtenCounts[normalized.table] ?? 0) + rows.length;
    }
  }

  if (input.mode === "backfill-normalized" && !input.validateOnly && !input.dryRun && input.supabase) {
    await flushBackfillBatches();
  }

  if (!input.validateOnly && !input.dryRun && input.supabase) {
    for (const [table, pending] of batches.entries()) {
      if (!pending.length) continue;
      const conflictKey = pending[0]?.conflictKey;
      if (!conflictKey) continue;
      const rows = pending.map((item) => item.row);
      const result = await upsertRows(input.supabase, table, conflictKey, rows);
      if (!result.ok) {
        report.skippedCounts[table] = (report.skippedCounts[table] ?? 0) + 1;
        if (report.errors.length < 50) report.errors.push({ line: report.totalLines, code: "write_error", message: result.error ?? "write failed" });
        continue;
      }
      report.writtenCounts[table] = (report.writtenCounts[table] ?? 0) + rows.length;
    }
  }

  if (input.verifyCounts && input.supabase) {
    const counts = await verifyAstroDumpCounts(input.supabase);
    (report as Record<string, unknown>).verifiedCounts = counts;
  }

  return report;
}

function parseArgs(argv: string[]) {
  const args: Record<string, unknown> = { mode: "local" };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--input") args.input = argv[++i];
    else if (value === "--validate-only") args.validateOnly = true;
    else if (value === "--dry-run") args.dryRun = true;
    else if (value === "--verify-counts") args.verifyCounts = true;
    else if (value === "--limit") args.limit = Number(argv[++i]);
    else if (value === "--report") args.report = argv[++i];
    else if (value === "--mode") args.mode = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const input = typeof args.input === "string" ? args.input : "";
  if (!input) {
    console.error("missing --input");
    process.exit(1);
  }
  const mode = args.mode === "existing-db" || args.mode === "backfill-normalized" ? args.mode : "local";
  const validateOnly = Boolean(args.validateOnly);
  const dryRun = Boolean(args.dryRun);
  const verifyCounts = Boolean(args.verifyCounts);
  let supabase: SupabaseLike | undefined;
  const missingEnv: string[] = [];
  if ((!validateOnly || verifyCounts) && !dryRun && (mode === "existing-db" || mode === "backfill-normalized")) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_KEY;
    if (!url) missingEnv.push("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
    if (!key) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!missingEnv.length) supabase = createClient(url as string, key as string, { auth: { persistSession: false } }) as never;
  }
  const report = await ingestAstroDump({
    filePath: input,
    mode,
    validateOnly,
    dryRun,
    verifyCounts,
    limit: typeof args.limit === "number" ? args.limit : undefined,
    supabase,
  });
  if (missingEnv.length) report.missingEnv = missingEnv;
  const json = JSON.stringify(report, null, 2);
  if (typeof args.report === "string") {
    fs.writeFileSync(String(args.report), json);
  }
  process.stdout.write(json);
  if (missingEnv.length) process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
