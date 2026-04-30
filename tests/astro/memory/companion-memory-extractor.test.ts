/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from "vitest";
import { extractCompanionMemoryDrafts, saveCompanionMemorySafely } from "@/lib/astro/memory";

function store() {
  return { upsertMemory: vi.fn(async ({ draft }) => ({ ...draft, id: "1" })), listForUser: vi.fn(), archiveMemory: vi.fn(), clearUserMemory: vi.fn() };
}

const env = { ASTRO_COMPANION_MEMORY_ENABLED: "true", ASTRO_COMPANION_MEMORY_WRITE_ENABLED: "true" };

describe("companion memory extractor", () => {
  it("write disabled skipped", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "q", finalAnswer: "a", env: {} }).skipped).toBe(true));
  it("missing userId skipped", () => expect(extractCompanionMemoryDrafts({ userId: null, question: "q", finalAnswer: "a", env }).skipped).toBe(true));
  it("safe Vedic preference extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "I prefer Vedic astrology", finalAnswer: "Use Vedic astrology", env }).drafts[0]?.memoryType).toBe("preference"));
  it("safe practical remedy preference extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "I prefer practical remedies", finalAnswer: "Use practical remedies", env }).drafts[0]?.memoryType).toBe("preference"));
  it("career recognition recurring concern extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "career recognition delay", finalAnswer: "Recurring concern", env }).drafts.some((d) => d.memoryType === "recurring_concern")).toBe(true));
  it("marriage delay recurring concern extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "marriage delay", finalAnswer: "Recurring concern", env }).drafts.some((d) => d.topic === "marriage")).toBe(true));
  it("relationship confusion extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "relationship confusion", finalAnswer: "Recurring concern", env }).drafts.some((d) => d.topic === "marriage" || d.topic === "relationship")).toBe(true));
  it("money anxiety extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "money anxiety", finalAnswer: "Recurring concern", env }).drafts.some((d) => d.topic === "money")).toBe(true));
  it("education confusion extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "education confusion", finalAnswer: "Recurring concern", env }).drafts.some((d) => d.topic === "education" || d.topic === "general")).toBe(true));
  it("family pressure extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "family pressure", finalAnswer: "Recurring concern", env }).drafts.some((d) => d.topic === "family")).toBe(true));
  it("safe guidance consistency over intensity extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "q", finalAnswer: "consistency over intensity", env }).drafts.some((d) => d.memoryType === "guidance_given")).toBe(true));
  it("sleep routine guidance extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "q", finalAnswer: "sleep routine", env }).drafts.some((d) => d.memoryType === "guidance_given")).toBe(true));
  it("communication boundary guidance extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "q", finalAnswer: "communication boundaries", env }).drafts.some((d) => d.memoryType === "guidance_given")).toBe(true));
  it("avoid fear boundary extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "avoid fear", finalAnswer: "avoid fear", env }).drafts.some((d) => d.memoryType === "boundary")).toBe(true));
  it("avoid expensive remedy boundary extracted", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "avoid expensive", finalAnswer: "avoid expensive", env }).drafts.some((d) => d.memoryType === "boundary")).toBe(true));
  it("death/lifespan not stored", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "When will I die?", finalAnswer: "?", env }).drafts).toHaveLength(0));
  it("medical detail not stored", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "cancer diagnosis", finalAnswer: "?", env }).drafts).toHaveLength(0));
  it("legal dispute not stored", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "legal dispute", finalAnswer: "?", env }).drafts).toHaveLength(0));
  it("self-harm not stored", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "kill myself", finalAnswer: "?", env }).drafts).toHaveLength(0));
  it("pregnancy detail not stored", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "pregnancy", finalAnswer: "?", env }).drafts).toHaveLength(0));
  it("curse fear not stored except safe boundary", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "curse fear", finalAnswer: "?", env }).drafts.length).toBeLessThanOrEqual(1));
  it("third-party name not stored", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "my wife Priya", finalAnswer: "?", env }).drafts).toHaveLength(0));
  it("raw birth data not stored", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "born at 10:30 Kolkata", finalAnswer: "?", env }).drafts).toHaveLength(0));
  it("one-off venting not stored", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "I just need to vent", finalAnswer: "?", env }).drafts).toHaveLength(0));
  it("exact date/time/place not stored", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "born at 10:30 on 1990-01-01 in Kolkata", finalAnswer: "?", env }).drafts).toHaveLength(0));
  it("drafts capped at 3", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "vedic career marriage money avoid fear practical remedies", finalAnswer: "Use practical remedies and consistency over intensity for career recognition and marriage delay", env }).drafts.length).toBeLessThanOrEqual(3));
  it("save calls store for allowed drafts", async () => {
    const s = store();
    await saveCompanionMemorySafely({ userId: "u1", question: "I prefer practical remedies", finalAnswer: "Use practical remedies", store: s, env });
    expect(s.upsertMemory).toHaveBeenCalled();
  });
  it("store error returns warning no throw", async () => {
    const s = { ...store(), upsertMemory: vi.fn(async () => { throw new Error("boom"); }) };
    const result = await saveCompanionMemorySafely({ userId: "u1", question: "I prefer practical remedies", finalAnswer: "Use practical remedies", store: s, env });
    expect(result.warnings).toContain("store_failed");
  });
  it("no duplicate unsafe drafts", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "I prefer practical remedies I prefer practical remedies", finalAnswer: "Use practical remedies", env }).drafts.length).toBeLessThanOrEqual(1));
  it("sourceMessageId preserved only if safe UUID-like", () => expect(extractCompanionMemoryDrafts({ userId: "u1", question: "I prefer practical remedies", finalAnswer: "Use practical remedies", sourceMessageId: "123e4567-e89b-12d3-a456-426614174000", env }).drafts[0]?.sourceMessageId).toBe("123e4567-e89b-12d3-a456-426614174000"));
});
