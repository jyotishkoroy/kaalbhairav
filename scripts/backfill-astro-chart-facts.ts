import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { extractChartFactsFromVersion } from "../lib/astro/rag/chart-fact-extractor";
import { upsertChartFacts } from "../lib/astro/rag/chart-fact-repository";

type CliOptions = {
  input?: string;
  userId?: string;
  profileId?: string;
  chartVersionId?: string;
  write: boolean;
  limit?: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") options.input = argv[++index];
    else if (arg === "--user-id") options.userId = argv[++index];
    else if (arg === "--profile-id") options.profileId = argv[++index];
    else if (arg === "--chart-version-id") options.chartVersionId = argv[++index];
    else if (arg === "--limit") options.limit = Number(argv[++index]);
    else if (arg === "--write") options.write = true;
  }
  return options;
}

function loadChartJson(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        return record.chartJson ?? record.chart_json ?? record.chart ?? item;
      }
      return item;
    });
  }
  return [input];
}

function summarizeFacts(facts: ReturnType<typeof extractChartFactsFromVersion>): string {
  const counts = new Map<string, number>();
  for (const fact of facts) {
    counts.set(fact.factType, (counts.get(fact.factType) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => `${type}:${count}`).join(", ");
}

export async function backfillAstroChartFactsCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const options = parseArgs(argv);
  const chartInputs: unknown[] = [];
  if (options.input) {
    const raw = await readFile(options.input, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    chartInputs.push(...loadChartJson(parsed));
  } else {
    chartInputs.push({});
  }
  const limit = Number.isFinite(options.limit ?? Number.NaN) ? Math.max(0, Math.trunc(options.limit as number)) : undefined;
  const selected = typeof limit === "number" ? chartInputs.slice(0, limit) : chartInputs;
  let recordsProcessed = 0;
  let factsExtracted = 0;
  const allFacts: ReturnType<typeof extractChartFactsFromVersion> = [];
  for (const chartJson of selected) {
    const facts = extractChartFactsFromVersion(chartJson, {
      userId: options.userId,
      profileId: options.profileId ?? null,
      chartVersionId: options.chartVersionId ?? null,
    });
    recordsProcessed += 1;
    factsExtracted += facts.length;
    allFacts.push(...facts);
  }
  const summary = summarizeFacts(allFacts);
  console.log(`records processed: ${recordsProcessed}`);
  console.log(`facts extracted: ${factsExtracted}`);
  console.log(`fact types: ${summary || "none"}`);
  console.log(`write mode: ${options.write}`);
  if (!options.write) {
    return 0;
  }
  if (!options.userId) {
    console.error("missing --user-id for write mode");
    return 1;
  }
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return 1;
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await upsertChartFacts({
    supabase,
    facts: allFacts,
    userId: options.userId,
    profileId: options.profileId ?? null,
    chartVersionId: options.chartVersionId ?? null,
  });
  if (!result.ok) {
    console.error(result.error ?? "backfill failed");
    return 1;
  }
  console.log(`upserted: ${result.insertedOrUpdated}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  backfillAstroChartFactsCli().then((code) => process.exit(code));
}
