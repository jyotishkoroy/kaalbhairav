// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.
// 
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { ParsedBenchmarkExample } from "../lib/astro/rag/benchmark-parser";
import { parseBenchmarkMarkdownFiles } from "../lib/astro/rag/benchmark-parser";

export type SupabaseLike = {
  from: (table: string) => {
    upsert?: (rows: Record<string, unknown> | Record<string, unknown>[]) => Promise<{ data: unknown; error: { message?: string } | null }>;
    insert?: (rows: Record<string, unknown> | Record<string, unknown>[]) => Promise<{ data: unknown; error: { message?: string } | null }>;
    select?: (columns?: string) => { eq?: (column: string, value: unknown) => { maybeSingle?: () => Promise<{ data: unknown; error: { message?: string } | null }> } };
  };
};

export type IngestBenchmarkResult = {
  parsed: number;
  skipped: number;
  inserted: number;
  updated: number;
  dryRun: boolean;
  issues: Array<{ sourceFile: string; code: string; message: string }>;
  domainCounts: Record<string, number>;
  tagCounts: Record<string, number>;
};

export function mapBenchmarkExampleToRow(example: ParsedBenchmarkExample): Record<string, unknown> {
  return {
    example_key: example.sourceHash,
    domain: example.domain,
    question: example.question,
    answer: example.answer,
    reasoning: example.reasoning || null,
    accuracy_class: example.accuracyClass,
    reading_style: example.readingStyle,
    follow_up_question: example.followUp,
    tags: example.tags,
    metadata: {
      ...example.metadata,
      source_file: example.sourceFile,
      source_slug: example.sourceSlug,
      source_hash: example.sourceHash,
      safety_flags: example.safetyFlags,
      required_anchors: example.requiredAnchors,
      forbidden_claims: example.forbiddenClaims,
    },
    enabled: true,
  };
}

function parseFileList(inputPath: string): Array<{ sourceFile: string; content: string }> {
  const stats = fs.statSync(inputPath);
  if (stats.isFile() && inputPath.endsWith(".json")) {
    return [];
  }
  if (stats.isFile()) return [{ sourceFile: inputPath, content: fs.readFileSync(inputPath, "utf8") }];
  return fs.readdirSync(inputPath, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => ({ sourceFile: path.join(inputPath, entry.name), content: fs.readFileSync(path.join(inputPath, entry.name), "utf8") }));
}

async function maybeExistingSource(supabase: SupabaseLike, row: Record<string, unknown>): Promise<boolean> {
  const query = supabase.from("astro_benchmark_examples").select?.("id")?.eq?.("example_key", row.example_key as string);
  const result = query && "maybeSingle" in query && typeof query.maybeSingle === "function" ? await query.maybeSingle() : { data: null, error: null };
  return Boolean(result.data) && !result.error;
}

export async function ingestBenchmarkExamples(input: {
  examples: ParsedBenchmarkExample[];
  supabase: SupabaseLike;
  dryRun?: boolean;
  limit?: number;
  domain?: string;
}): Promise<IngestBenchmarkResult> {
  const dryRun = input.dryRun ?? true;
  const selected = (input.examples ?? []).filter((example) => !input.domain || example.domain === input.domain).slice(0, input.limit ?? Infinity);
  const result: IngestBenchmarkResult = { parsed: selected.length, skipped: 0, inserted: 0, updated: 0, dryRun, issues: [], domainCounts: {}, tagCounts: {} };
  for (const example of selected) {
    result.domainCounts[example.domain] = (result.domainCounts[example.domain] ?? 0) + 1;
    for (const tag of example.tags) result.tagCounts[tag] = (result.tagCounts[tag] ?? 0) + 1;
    if (dryRun) continue;
    const row = mapBenchmarkExampleToRow(example);
    const exists = await maybeExistingSource(input.supabase, row);
    if (exists) {
      result.updated += 1;
      continue;
    }
    const response = await input.supabase.from("astro_benchmark_examples").upsert?.(row);
    if (response?.error) {
      result.issues.push({ sourceFile: example.sourceFile, code: "write_error", message: response.error.message ?? "write failed" });
      result.skipped += 1;
      continue;
    }
    result.inserted += 1;
  }
  return result;
}

function parseArgs(argv: string[]) {
  const args: Record<string, unknown> = { dryRun: true };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--input") args.input = argv[++i];
    else if (value === "--parsed-json") args.parsedJson = argv[++i];
    else if (value === "--default-domain") args.defaultDomain = argv[++i];
    else if (value === "--source-root") args.sourceRoot = argv[++i];
    else if (value === "--dry-run") args.dryRun = true;
    else if (value === "--write") args.write = true;
    else if (value === "--limit") args.limit = Number(argv[++i]);
    else if (value === "--domain") args.domain = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!(args.input || args.parsedJson)) {
    console.error("missing --input or --parsed-json");
    process.exit(1);
  }
  let examples: ParsedBenchmarkExample[] = [];
  if (typeof args.parsedJson === "string") {
    const raw = JSON.parse(fs.readFileSync(args.parsedJson, "utf8"));
    examples = Array.isArray(raw.examples) ? raw.examples : [];
  } else {
    const files = parseFileList(String(args.input));
    const parsed = parseBenchmarkMarkdownFiles({ files, options: { defaultDomain: typeof args.defaultDomain === "string" ? args.defaultDomain : undefined, sourceRoot: typeof args.sourceRoot === "string" ? args.sourceRoot : undefined } });
    examples = parsed.examples;
  }
  const dryRun = args.write ? false : true;
  if (!args.write) {
    const report = await ingestBenchmarkExamples({ examples, supabase: { from: () => ({}) }, dryRun, limit: typeof args.limit === "number" ? args.limit : undefined, domain: typeof args.domain === "string" ? args.domain : undefined });
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("missing Supabase credentials");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const report = await ingestBenchmarkExamples({ examples, supabase: supabase as never, dryRun: false, limit: typeof args.limit === "number" ? args.limit : undefined, domain: typeof args.domain === "string" ? args.domain : undefined });
  process.stdout.write(JSON.stringify(report, null, 2));
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
