import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readLatestMigration(): string {
  const dir = join(process.cwd(), "supabase", "migrations");
  const file = readdirSync(dir)
    .filter((name) => name.endsWith("_astro_rag_foundation.sql"))
    .sort()
    .at(-1);

  expect(file).toBeTruthy();
  return readFileSync(join(dir, file as string), "utf8");
}

function readSeedFile(): string {
  return readFileSync(join(process.cwd(), "supabase", "seed", "astro_reasoning_rules.sql"), "utf8");
}

function normalize(sql: string): string {
  return sql.toLowerCase().replace(/\s+/g, " ");
}

describe("astro rag schema foundation", () => {
  const migration = normalize(readLatestMigration());
  const seed = normalize(readSeedFile());

  it("creates all required tables", () => {
    for (const table of [
      "astro_chart_facts",
      "astro_reasoning_rules",
      "astro_benchmark_examples",
      "astro_reasoning_paths",
      "astro_answer_contracts",
      "astro_validation_results",
      "astro_timing_windows",
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
  });

  it("enables rls on all required tables", () => {
    for (const table of [
      "astro_chart_facts",
      "astro_reasoning_rules",
      "astro_benchmark_examples",
      "astro_reasoning_paths",
      "astro_answer_contracts",
      "astro_validation_results",
      "astro_timing_windows",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("includes owner select policies for user-owned tables", () => {
    for (const table of [
      "astro_chart_facts",
      "astro_reasoning_paths",
      "astro_answer_contracts",
      "astro_validation_results",
      "astro_timing_windows",
    ]) {
      expect(migration).toMatch(new RegExp(`create policy .*${table}.*for select.*using \\(auth\\.uid\\(\\) = user_id\\)`));
    }
  });

  it("includes service role policy support", () => {
    expect(migration).toContain("auth.role() = 'service_role'");
    expect(migration).toContain("for all");
  });

  it("includes enabled-row select policies for reference tables", () => {
    expect(migration).toMatch(/create policy .*astro_reasoning_rules.*for select.*using \(enabled = true\)/);
    expect(migration).toMatch(/create policy .*astro_benchmark_examples.*for select.*using \(enabled = true\)/);
  });

  it("includes pg_trgm and trigram indexes", () => {
    expect(migration).toContain("create extension if not exists pg_trgm");
    expect(migration).toContain("gin_trgm_ops");
    expect(migration).toContain("astro_chart_facts_fact_value_trgm_idx");
    expect(migration).toContain("astro_reasoning_rules_description_trgm_idx");
    expect(migration).toContain("astro_benchmark_examples_question_trgm_idx");
    expect(migration).toContain("astro_benchmark_examples_answer_trgm_idx");
  });

  it("includes gin indexes for tags arrays", () => {
    expect(migration).toContain("astro_chart_facts_tags_idx");
    expect(migration).toContain("astro_reasoning_rules_required_tags_idx");
    expect(migration).toContain("astro_benchmark_examples_tags_idx");
    expect(migration).toContain("astro_timing_windows_tags_idx");
  });

  it("includes timing source, confidence, and date constraints", () => {
    expect(migration).toContain("astro_timing_windows_source_check");
    expect(migration).toContain("astro_timing_windows_confidence_check");
    expect(migration).toContain("astro_timing_windows_dates_check");
  });

  it("includes the minimal seed rule keys and conflict handling", () => {
    for (const ruleKey of [
      "career_promotion_delay_core",
      "career_network_gains_core",
      "sleep_remedy_core",
      "marriage_core",
      "money_income_core",
      "foreign_relocation_core",
      "timing_grounding_required",
      "safety_no_certainty_core",
    ]) {
      expect(seed).toContain(ruleKey);
    }

    expect(seed).toContain("on conflict (rule_key) do update set");
  });

  it("does not reference private artifacts", () => {
    for (const forbidden of [
      "myvedicreport",
      "astro_package",
      "archive",
      "graphify-out.zip",
      ".env.local",
      "raw benchmark",
      "jyotishko private report content",
    ]) {
      expect(migration).not.toContain(forbidden);
      expect(seed).not.toContain(forbidden);
    }
  });
});
