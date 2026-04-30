/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from "vitest";
import { retrieveCompanionMemorySafely } from "@/lib/astro/memory";

function makeStore(rows: unknown[] = [], error?: Error) {
  return {
    listForUser: vi.fn(async () => {
      if (error) throw error;
      return rows as never;
    }),
    upsertMemory: vi.fn(),
    archiveMemory: vi.fn(),
    clearUserMemory: vi.fn(),
  };
}

const env = { ASTRO_COMPANION_MEMORY_ENABLED: "true", ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED: "true" };

describe("companion memory retriever", () => {
  it("disabled returns source disabled", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore(), env: {} })).source).toBe("disabled"));
  it("missing store returns fallback", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", env })).source).toBe("fallback"));
  it("store error returns fallback", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([], new Error("x")), env })).source).toBe("fallback"));
  it("no memories returns used false", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([]), env })).used).toBe(false));
  it("safe memories return used true", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "Practical remedies", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env })).used).toBe(true));
  it("filters archived memories", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", userId: "u1", memoryType: "preference", topic: "career", content: "Practical remedies", confidence: "high", archivedAt: "2026-04-01T00:00:00.000Z", lastSeenAt: "2026-04-01T00:00:00.000Z", createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-01T00:00:00.000Z" }]), env })).used).toBe(false));
  it("filters low confidence", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "Practical remedies", confidence: "low", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env })).used).toBe(false));
  it("filters sensitive content", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "health", content: "When will I die", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env })).used).toBe(false));
  it("respects maxItems", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "A", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env, maxItems: 1 })).memories).toHaveLength(1));
  it("same topic sorted before unrelated", async () => {
    const result = await retrieveCompanionMemorySafely({ userId: "u1", topic: "career", store: makeStore([
      { id: "1", user_id: "u1", memory_type: "preference", topic: "money", content: "B", confidence: "high", last_seen_at: "2026-04-02T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" },
      { id: "2", user_id: "u1", memory_type: "preference", topic: "career", content: "A", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" },
    ]), env });
    expect(result.memories[0]?.topic).toBe("career");
  });
  it("related topic included", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", topic: "relationship", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "marriage", content: "A", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env })).memories[0]?.topic).toBe("marriage"));
  it("unrelated topic excluded when enough relevant", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", topic: "career", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "A", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }, { id: "2", user_id: "u1", memory_type: "preference", topic: "family", content: "B", confidence: "high", last_seen_at: "2026-04-02T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env, maxItems: 1 })).memories[0]?.topic).toBe("career"));
  it("summary generated", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "Practical remedies", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env })).summary).toContain("career"));
  it("summary does not include sensitive content", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "When will I die", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env })).summary ?? "").not.toMatch(/die/i));
  it("long prior answer is compressed to short safe summary", async () => {
    const result = await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "Career recognition and practical guidance only.", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env });
    expect((result.summary ?? "").length).toBeLessThan(180);
  });
  it("previous answer body is not injected", async () => {
    const result = await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "From the earlier context, please repeat the full answer body.", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env });
    expect(result.summary ?? "").not.toContain("full answer body");
  });
  it("from the earlier context is not emitted for unsafe or overlong memory", async () => {
    const result = await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "Earlier context should not be replayed.", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env });
    expect(result.summary ?? "").not.toMatch(/from the earlier context/i);
  });
  it("irrelevant memory excluded", async () => {
    const result = await retrieveCompanionMemorySafely({ userId: "u1", topic: "career", store: makeStore([
      { id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "Career recognition.", confidence: "high", last_seen_at: "2026-04-02T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" },
      { id: "2", user_id: "u1", memory_type: "preference", topic: "money", content: "Budget only.", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" },
    ]), env, maxItems: 1 });
    expect(result.memories[0]?.topic).toBe("career");
  });
  it("memory summary still works for safe preference", async () => {
    const result = await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "Prefer practical, non-fear-based guidance.", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env });
    expect(result.summary ?? "").toContain("career");
  });
  it("no throw on malformed store data", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([null, {}]), env })).used).toBe(false));
  it("missing userId no store call", async () => {
    const store = makeStore([]);
    await retrieveCompanionMemorySafely({ userId: "", store, env });
    expect(store.listForUser).not.toHaveBeenCalled();
  });
  it("retrieve disabled no store call", async () => {
    const store = makeStore([]);
    await retrieveCompanionMemorySafely({ userId: "u1", store, env: {} });
    expect(store.listForUser).not.toHaveBeenCalled();
  });
  it("memory failure does not break", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([], new Error("boom")), env })).source).toBe("fallback"));
  it("warnings preserved", async () => expect((await retrieveCompanionMemorySafely({ userId: "", store: makeStore([]), env })).warnings.length).toBeGreaterThan(0));
  it("source supabase when store succeeds", async () => expect((await retrieveCompanionMemorySafely({ userId: "u1", store: makeStore([{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "A", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }]), env })).source).toBe("supabase"));
});
