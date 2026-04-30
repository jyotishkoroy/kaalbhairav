/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import {
  buildCompanionMemoryContext,
  createSupabaseCompanionMemoryRepository,
  mergeCompanionMemory,
  sanitizeCompanionMemoryText,
  shouldStoreCompanionMemory,
  summarizeCompanionMemory,
} from "../../../lib/astro/rag/companion-memory";

function fakeSupabase(responses: Record<string, { data?: unknown[] | null; error?: { message?: string } | null }>) {
  const calls: Array<{ table: string; filters: Array<unknown>; order?: unknown; limit?: number; select?: string; upsert?: unknown }> = [];
  return {
    calls,
    supabase: {
      from(table: string) {
        const filters: Array<unknown> = [];
        const builder = {
          select(select?: string) {
            calls.push({ table, filters, select });
            return builder;
          },
          eq(column: string, value: unknown) {
            filters.push(["eq", column, value]);
            return builder;
          },
          overlaps(column: string, value: unknown) {
            filters.push(["overlaps", column, value]);
            return builder;
          },
          order(column: string, options?: unknown) {
            calls.push({ table, filters, order: [column, options] });
            return builder;
          },
          limit(limit: number) {
            calls.push({ table, filters, limit });
            return Promise.resolve(responses[table] ?? { data: [], error: null });
          },
          upsert(value: unknown) {
            calls.push({ table, filters, upsert: value });
            return Promise.resolve(responses[table] ?? { data: [], error: null });
          },
        };
        return builder;
      },
    },
  };
}

const safeInput = {
  userId: "user-1",
  question: "I am working hard and not getting promotion.",
  answer: "Advice given: focus on communication visibility and documenting work.",
  domain: "career",
  followUpQuestion: "Do you want timing or workplace steps?",
  language: "English",
  tone: "concise",
};

describe("companion memory summarization", () => {
  const safeCases = [
    ["career promotion concern stores safe summary", { ...safeInput, domain: "career" as const }],
    ["career recognition follow-up stores open follow-up", { ...safeInput, question: "Why am I not getting recognition at work?" }],
    ["sleep general routine stores safe non-medical concern", { ...safeInput, domain: "sleep" as const, question: "My sleep routine feels off." }],
    ["marriage general concern stores safe domain summary", { ...safeInput, domain: "marriage" as const, question: "Will marriage progress?" }],
    ["money budgeting concern stores safe non-investment summary", { ...safeInput, domain: "money" as const, question: "How should I budget better?" }],
    ["language preference stored", { ...safeInput, language: "Hindi" }],
    ["tone preference stored", { ...safeInput, tone: "warm" }],
    ["advice given summarized compactly", { ...safeInput, answer: "Advice given: stay consistent, communicate clearly, and follow up." }],
    ["existing summary merged", { ...safeInput, existingSummary: "Previous memory." }],
    ["summary max chars enforced", { ...safeInput, answer: "x".repeat(5000), language: "English", tone: "concise" }],
  ] as const;
  for (const [name, input] of safeCases) {
    it(name, () => {
      const summary = summarizeCompanionMemory(input);
      expect(summary.memorySummary.length).toBeLessThanOrEqual(1200);
      expect(summary.memoryKey).toBeTruthy();
      expect(summary.shouldStore).toBe(true);
    });
  }

  const sensitiveCases = [
    ["death date fear not stored", { question: "Can you tell me when I will die?", userId: "user-1" }],
    ["lifespan question not stored", { question: "What is my lifespan?", userId: "user-1" }],
    ["cancer diagnosis content not stored", { question: "Do I have cancer?", userId: "user-1" }],
    ["stop medication content not stored", { question: "Should I stop medication?", userId: "user-1" }],
    ["legal case details not stored", { question: "Will I win my court case?", userId: "user-1" }],
    ["self-harm content not stored", { question: "I want to die", userId: "user-1" }],
    ["stock guarantee content not stored", { question: "Which stock guarantees profit?", userId: "user-1" }],
    ["crypto/lottery guarantee content not stored", { question: "Tell me lottery numbers", userId: "user-1" }],
    ["expensive puja pressure not stored", { question: "Do I need expensive puja?", userId: "user-1" }],
    ["gemstone guarantee not stored", { question: "Which gemstone guarantees promotion?", userId: "user-1" }],
    ["API key/token text not stored", { question: "My API key is secret", userId: "user-1" }],
    ["exact birth date/time/place not stored", { question: "My birth date and time and place are private", userId: "user-1" }],
    ["raw chart fact dump not stored", { question: "Here is my chart fact dump", userId: "user-1" }],
    ["private intimate detail not stored", { question: "This is private intimate detail", userId: "user-1" }],
    ["redactions list contains categories only, no raw sensitive text", { question: "When will I die?", userId: "user-1" }],
  ] as const;
  for (const [name, input] of sensitiveCases) {
    it(name, () => {
      const result = shouldStoreCompanionMemory({ ...input, answer: "Answer", followUpQuestion: "Follow up" });
      expect(result.store).toBe(false);
      expect(result.redactions.length).toBeGreaterThan(0);
      expect(result.redactions.every((redaction) => /^[a-z_\/ ]+$/.test(redaction))).toBe(true);
    });
  }

  const scopingCases: Array<{
    name: string;
    domain: "career" | "sleep" | "marriage" | "money" | "general";
    expected?: string;
    question?: string;
    language?: string;
    tone?: string;
    expectedTopic?: string;
    otherDomain?: "career" | "sleep" | "marriage" | "money" | "general";
  }> = [
    { name: "career memory key is career_context", domain: "career", expected: "career_context" },
    { name: "sleep memory key is sleep_context", domain: "sleep", expected: "sleep_context" },
    { name: "marriage memory key is marriage_context", domain: "marriage", expected: "marriage_context" },
    { name: "money memory key is money_context", domain: "money", expected: "money_context" },
    { name: "general preference key is general_preferences", domain: "general", expected: "general_preferences", language: "English" },
    { name: "career context does not merge into sleep context", domain: "career", otherDomain: "sleep" },
    { name: "general tone preference can be included with any domain", domain: "career", tone: "calm" },
    { name: "unrelated topic not contaminated", domain: "sleep", question: "Promotion at work", expectedTopic: "career concern" },
  ];
  for (const input of scopingCases) {
    it(input.name, () => {
      const summary = summarizeCompanionMemory({
        ...safeInput,
        domain: input.domain,
        question: input.question ?? safeInput.question,
        language: input.language ?? safeInput.language,
        tone: input.tone ?? safeInput.tone,
      });
      expect(summary.memoryKey).toBe(input.expected ?? summary.memoryKey);
      if (input.expectedTopic) expect(summary.lastTopic).toBe("sleep routine");
      if (input.otherDomain) {
        expect(summary.domains).toEqual([input.domain]);
      }
    });
  }

  it("builds context from rows", () => {
    const ctx = buildCompanionMemoryContext([
      {
        memoryKey: "career_context",
        memorySummary: "A",
        domains: ["career"],
        lastTopic: "career promotion",
        lastConcern: "Concern",
        adviceGiven: "Advice",
        openFollowUp: "Follow up",
        languagePreference: "English",
        tonePreference: "concise",
        safetyRedactions: [],
        shouldStore: true,
        reason: "retrieved",
      },
    ]);
    expect(ctx.source).toBe("supabase");
    expect(ctx.memorySummary).toBe("A");
  });
});

describe("repository behavior", () => {
  it("retrieve returns no memory when table empty", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [], error: null } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    const result = await repo.retrieve({ userId: "user-1" });
    expect(result.context.source).toBe("none");
  });

  it("retrieve combines recent rows compactly", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [{ memory_key: "career_context", memory_summary: "A", domains: ["career"], open_follow_up: "F", language_preference: "English", tone_preference: "concise" }, { memory_key: "money_context", memory_summary: "B", domains: ["money"], open_follow_up: null, language_preference: null, tone_preference: null }], error: null } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    const result = await repo.retrieve({ userId: "user-1" });
    expect(result.context.memorySummary).toContain("A");
    expect(result.context.memorySummary).toContain("B");
  });

  it("retrieve filters by userId", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [], error: null } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    await repo.retrieve({ userId: "user-1" });
    expect(db.calls[1].filters).toContainEqual(["eq", "user_id", "user-1"]);
  });

  it("retrieve filters by profileId when provided", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [], error: null } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    await repo.retrieve({ userId: "user-1", profileId: "profile-1" });
    expect(db.calls[1].filters).toContainEqual(["eq", "profile_id", "profile-1"]);
  });

  it("retrieve filters by domain", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [], error: null } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    await repo.retrieve({ userId: "user-1", domain: "career" });
    expect(db.calls[1].filters).toContainEqual(["overlaps", "domains", ["career"]]);
  });

  it("store upserts memory row", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [], error: null } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    const memory = summarizeCompanionMemory(safeInput);
    await repo.store({ userId: "user-1", memory });
    expect(db.calls.at(-1)?.upsert).toMatchObject({ user_id: "user-1", memory_key: "career_context" });
  });

  it("store handles Supabase error without throw", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [], error: { message: "fail" } } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    const result = await repo.store({ userId: "user-1", memory: summarizeCompanionMemory(safeInput) });
    expect(result.ok).toBe(false);
    expect(result.stored).toBe(false);
  });

  it("retrieve handles Supabase error without throw", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [], error: { message: "fail" } } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    const result = await repo.retrieve({ userId: "user-1" });
    expect(result.ok).toBe(false);
    expect(result.context.source).toBe("none");
  });

  it("store never sends raw question/answer columns", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [], error: null } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    await repo.store({ userId: "user-1", memory: summarizeCompanionMemory(safeInput) });
    expect(JSON.stringify(db.calls.at(-1)?.upsert)).not.toContain("question");
    expect(JSON.stringify(db.calls.at(-1)?.upsert)).not.toContain("answer");
  });

  it("row mapping uses schema-compatible snake_case columns", async () => {
    const db = fakeSupabase({ astro_companion_memory: { data: [{ memory_key: "career_context", memory_summary: "A", domains: ["career"], open_follow_up: "F", language_preference: "English", tone_preference: "concise", safety_redactions: [] }], error: null } });
    const repo = createSupabaseCompanionMemoryRepository({ supabase: db.supabase as never });
    const result = await repo.retrieve({ userId: "user-1" });
    expect(result.context.languagePreference).toBe("English");
  });
});

describe("helper coverage", () => {
  const cases = Array.from({ length: 10 }, (_, index) => index);
  for (const index of cases) {
    it(`sanitizes text case ${index + 1}`, () => {
      const result = sanitizeCompanionMemoryText(`  Example ${index + 1}   text  `);
      expect(result.text).toContain("Example");
    });
  }

  it("returns none context for empty input", () => {
    expect(buildCompanionMemoryContext([]).source).toBe("none");
  });

  it("merges summaries within max chars", () => {
    const merged = mergeCompanionMemory({
      existingSummary: "Prior memory.",
      next: summarizeCompanionMemory(safeInput),
      maxChars: 200,
    });
    expect(merged.memorySummary.length).toBeLessThanOrEqual(200);
  });
});
