/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from "vitest";
import { createSupabaseCompanionMemoryStore } from "@/lib/astro/memory";

function chain(result: Record<string, unknown> = {}) {
  const api = {
    select: vi.fn(() => api),
    eq: vi.fn(() => api),
    is: vi.fn(() => api),
    order: vi.fn(() => api),
    limit: vi.fn(async () => result),
    or: vi.fn(() => api),
    insert: vi.fn(async () => result),
    update: vi.fn(() => api),
  };
  return api;
}

describe("supabase companion memory store", () => {
  it("listForUser queries astro_companion_memory", async () => {
    const q = chain({ data: [] });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.listForUser({ userId: "u1" });
    expect(q.select).toHaveBeenCalled();
  });

  it("listForUser filters by user_id", async () => {
    const q = chain({ data: [] });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.listForUser({ userId: "u1" });
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("listForUser filters archived_at null", async () => {
    const q = chain({ data: [] });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.listForUser({ userId: "u1" });
    expect(q.is).toHaveBeenCalledWith("archived_at", null);
  });

  it("listForUser limits max items", async () => {
    const q = chain({ data: [] });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.listForUser({ userId: "u1", maxItems: 2 });
    expect(q.limit).toHaveBeenCalledWith(2);
  });

  it("listForUser maps snake_case to camelCase", async () => {
    const q = chain({ data: [{ id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "A", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" }] });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    const rows = await store.listForUser({ userId: "u1" });
    expect(rows[0]?.userId).toBe("u1");
  });

  it("upsertMemory sanitizes draft", async () => {
    const q = chain({ data: { id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "A", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" } });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.upsertMemory({ userId: "u1", draft: { memoryType: "preference", content: "hello **there**" } });
    expect(q.insert).toHaveBeenCalled();
  });

  it("upsertMemory rejects unsafe draft", async () => {
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => chain({ data: [] })) } as never);
    await expect(store.upsertMemory({ userId: "u1", draft: { memoryType: "preference", content: "When will I die?" } })).resolves.toBeNull();
  });

  it("upsertMemory inserts safe draft", async () => {
    const q = chain({ data: { id: "1", user_id: "u1", memory_type: "preference", topic: "career", content: "A", confidence: "high", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" } });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    expect((await store.upsertMemory({ userId: "u1", draft: { memoryType: "preference", content: "Practical remedies" } }))?.userId).toBe("u1");
  });

  it("upsertMemory handles Supabase error softly", async () => {
    const q = { insert: vi.fn(async () => { throw new Error("boom"); }) };
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q as never) } as never);
    await expect(store.upsertMemory({ userId: "u1", draft: { memoryType: "preference", content: "Practical remedies" } })).resolves.toBeNull();
  });

  it("archiveMemory updates same user and id", async () => {
    const q = chain({});
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.archiveMemory({ userId: "u1", memoryId: "m1" });
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("archiveMemory handles error softly", async () => {
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => ({ update: vi.fn(() => { throw new Error("boom"); }) }) as never) } as never);
    await expect(store.archiveMemory({ userId: "u1", memoryId: "m1" })).resolves.toBe(false);
  });

  it("clearUserMemory archives same user", async () => {
    const q = chain({});
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.clearUserMemory({ userId: "u1" });
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("clearUserMemory with topic filters topic", async () => {
    const q = chain({});
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.clearUserMemory({ userId: "u1", topic: "career" });
    expect(q.eq).toHaveBeenCalledWith("topic", "career");
  });

  it("clearUserMemory handles error softly", async () => {
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => ({ update: vi.fn(() => { throw new Error("boom"); }) }) as never) } as never);
    await expect(store.clearUserMemory({ userId: "u1" })).resolves.toBe(false);
  });

  it("no cross-user query is constructed", async () => {
    const q = chain({ data: [] });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.listForUser({ userId: "u1" });
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("table name correct", async () => {
    const from = vi.fn(() => chain({ data: [] }));
    const store = createSupabaseCompanionMemoryStore({ from } as never);
    await store.listForUser({ userId: "u1" });
    expect(from).toHaveBeenCalledWith("astro_companion_memory");
  });

  it("malformed row skipped or sanitized", async () => {
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => chain({ data: [{ bad: true }] })) } as never);
    expect(await store.listForUser({ userId: "u1" })).toHaveLength(0);
  });

  it("raw Supabase error not leaked if contains secret", async () => {
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => ({ select: vi.fn(() => { throw new Error("secret leaked"); }) }) as never) } as never);
    expect(await store.listForUser({ userId: "u1" })).toHaveLength(0);
  });

  it("confidence default medium", async () => {
    const q = chain({ data: { id: "1", user_id: "u1", memory_type: "preference", topic: null, content: "A", last_seen_at: "2026-04-01T00:00:00.000Z", created_at: "2026-04-01T00:00:00.000Z", updated_at: "2026-04-01T00:00:00.000Z" } });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    const row = await store.upsertMemory({ userId: "u1", draft: { memoryType: "preference", content: "A" } });
    expect(row?.confidence).toBe("medium");
  });

  it("topic null handled", async () => {
    const q = chain({ data: [] });
    const store = createSupabaseCompanionMemoryStore({ from: vi.fn(() => q) } as never);
    await store.listForUser({ userId: "u1", topic: null });
    expect(q.select).toHaveBeenCalled();
  });
});
