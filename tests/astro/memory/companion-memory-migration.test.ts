/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const migrationPath = join(process.cwd(), "supabase/migrations/20260430101000_astro_companion_memory.sql");
const migration = readFileSync(migrationPath, "utf8");

describe("astro companion memory migration", () => {
  it("exists", () => expect(migration).toContain("astro_companion_memory"));
  it("creates memory table", () => expect(migration).toContain("create table if not exists public.astro_companion_memory"));
  it("creates feedback table", () => expect(migration).toContain("create table if not exists public.astro_reading_feedback"));
  it("references auth users", () => expect(migration).toContain("references auth.users(id)"));
  it("has memory type check", () => expect(migration).toContain("memory_type in ('preference'"));
  it("has confidence check", () => expect(migration).toContain("confidence in ('low', 'medium', 'high')"));
  it("has indexes", () => {
    expect(migration).toContain("idx_astro_companion_memory_user_topic");
    expect(migration).toContain("idx_astro_companion_memory_user_seen");
  });
  it("enables rls", () => {
    expect(migration).toContain("enable row level security");
  });
  it("has select insert update policies", () => {
    expect(migration).toContain("Users can read own astrology memory");
    expect(migration).toContain("Users can insert own astrology memory");
    expect(migration).toContain("Users can update own astrology memory");
    expect(migration).toContain("Users can read own astrology feedback");
    expect(migration).toContain("Users can insert own astrology feedback");
  });
  it("uses auth uid rules", () => {
    expect(migration).toContain("auth.uid() = user_id");
  });
  it("includes archived and last seen fields", () => {
    expect(migration).toContain("archived_at timestamptz");
    expect(migration).toContain("last_seen_at timestamptz not null default now()");
  });
  it("includes feedback rating check", () => {
    expect(migration).toContain("rating smallint check (rating between 1 and 5)");
  });
  it("does not grant service role policy", () => {
    expect(migration).not.toContain("service_role");
  });
  it("does not allow public all users policy", () => {
    expect(migration).not.toContain("for all");
  });
});
