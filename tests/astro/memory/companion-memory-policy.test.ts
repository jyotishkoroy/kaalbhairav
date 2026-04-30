/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import {
  buildMemorySummary,
  filterRetrievedMemories,
  getCompanionMemoryMaxItems,
  isCompanionMemoryEnabled,
  isCompanionMemoryRetrieveEnabled,
  isCompanionMemoryWriteEnabled,
  shouldRetrieveCompanionMemory,
  shouldStoreCompanionMemory,
  shouldStoreDraft,
} from "@/lib/astro/memory";

const safeMemory = {
  id: "1",
  userId: "u1",
  memoryType: "preference" as const,
  topic: "career",
  content: "User prefers practical remedies.",
  confidence: "high" as const,
  lastSeenAt: "2026-04-01T00:00:00.000Z",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
};

describe("companion memory policy", () => {
  it("master flag false disables retrieve", () => expect(isCompanionMemoryEnabled({})).toBe(false));
  it("retrieve flag false disables retrieve", () => expect(isCompanionMemoryRetrieveEnabled({ ASTRO_COMPANION_MEMORY_ENABLED: "true" })).toBe(false));
  it("write flag false disables write", () => expect(isCompanionMemoryWriteEnabled({ ASTRO_COMPANION_MEMORY_ENABLED: "true" })).toBe(false));
  it("companion pipeline alone does not enable memory", () => expect(isCompanionMemoryEnabled({ ASTRO_COMPANION_PIPELINE_ENABLED: "true" })).toBe(false));
  it("rag flag alone does not enable memory", () => expect(isCompanionMemoryEnabled({ ASTRO_RAG_ENABLED: "true" })).toBe(false));
  it("missing userId disallows retrieve", () => expect(shouldRetrieveCompanionMemory({ userId: "", env: { ASTRO_COMPANION_MEMORY_ENABLED: "true", ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED: "true" } }).allowed).toBe(false));
  it("max items default 8", () => expect(getCompanionMemoryMaxItems({})).toBe(8));
  it("max items caps at 12", () => expect(getCompanionMemoryMaxItems({ ASTRO_COMPANION_MEMORY_MAX_ITEMS: "30" })).toBe(12));
  it("low confidence excluded by default", () => expect(filterRetrievedMemories({ memories: [{ ...safeMemory, confidence: "low", id: "2" }], topic: "career" })).toHaveLength(0));
  it("low confidence included when requested", () => expect(filterRetrievedMemories({ memories: [{ ...safeMemory, confidence: "low", id: "2" }], topic: "career", includeLowConfidence: true })).toHaveLength(1));
  it("archived memory excluded", () => expect(filterRetrievedMemories({ memories: [{ ...safeMemory, archivedAt: "2026-04-01T00:00:00.000Z", id: "3" }], topic: "career" })).toHaveLength(0));
  it("same topic preferred", () => {
    const result = filterRetrievedMemories({ memories: [safeMemory, { ...safeMemory, id: "4", topic: "money", lastSeenAt: "2026-04-02T00:00:00.000Z" }], topic: "career" });
    expect(result[0]?.topic).toBe("career");
  });
  it("relationship retrieves marriage related memory", () => expect(filterRetrievedMemories({ memories: [{ ...safeMemory, id: "5", topic: "marriage" }], topic: "relationship" })[0]?.topic).toBe("marriage"));
  it("marriage retrieves relationship related memory", () => expect(filterRetrievedMemories({ memories: [{ ...safeMemory, id: "6", topic: "relationship" }], topic: "marriage" })[0]?.topic).toBe("relationship"));
  it("career retrieves money related memory", () => expect(filterRetrievedMemories({ memories: [{ ...safeMemory, id: "7", topic: "money" }], topic: "career" })[0]?.topic).toBe("money"));
  it("remedy retrieves health related memory", () => expect(filterRetrievedMemories({ memories: [{ ...safeMemory, id: "8", topic: "health" }], topic: "remedy" })[0]?.topic).toBe("health"));
  it("sensitive memory filtered", () => expect(filterRetrievedMemories({ memories: [{ ...safeMemory, id: "9", content: "When will I die?" }], topic: "career" })).toHaveLength(0));
  it("build summary is concise", () => expect(buildMemorySummary([safeMemory]).length).toBeLessThanOrEqual(260));
  it("build summary avoids creepy language", () => expect(buildMemorySummary([safeMemory])).not.toMatch(/remember you said|I remember/i));
  it("shouldStore rejects death_lifespan risk", () => expect(shouldStoreCompanionMemory({ userId: "u1", question: "When will I die?", finalAnswer: "No answer" }).allowed).toBe(false));
  it("shouldStore rejects self_harm risk", () => expect(shouldStoreCompanionMemory({ userId: "u1", question: "I want to die", finalAnswer: "No answer" }).allowed).toBe(false));
  it("shouldStore rejects medical risk", () => expect(shouldStoreCompanionMemory({ userId: "u1", question: "Cancer diagnosis?", finalAnswer: "No answer" }).allowed).toBe(false));
  it("shouldStore rejects legal risk", () => expect(shouldStoreCompanionMemory({ userId: "u1", question: "Legal dispute?", finalAnswer: "No answer" }).allowed).toBe(false));
  it("shouldStore allows safe preference", () => expect(shouldStoreCompanionMemory({ userId: "u1", question: "I prefer practical remedies", finalAnswer: "Use practical remedies", env: { ASTRO_COMPANION_MEMORY_ENABLED: "true", ASTRO_COMPANION_MEMORY_WRITE_ENABLED: "true" } }).allowed).toBe(true));
  it("shouldStoreDraft rejects sensitive draft", () => expect(shouldStoreDraft({ memoryType: "preference", topic: "health", content: "Cancer diagnosis" }).allowed).toBe(false));
});
