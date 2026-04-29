/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { describe, expect, it } from "vitest";
import {
  clearAstrologyMemory,
  getAstrologyMemory,
  saveAstrologyReadingMemory,
} from "@/lib/astro/memory/memory-store";
import { MAX_PREVIOUS_READINGS } from "@/lib/astro/memory/memory-types";

describe("Astrology memory store", () => {
  it("returns undefined for empty memory", async () => {
    await clearAstrologyMemory("empty-user");

    await expect(getAstrologyMemory("empty-user")).resolves.toBeUndefined();
  });

  it("saves a previous reading", async () => {
    const userId = "memory-user-save";
    await clearAstrologyMemory(userId);

    const memory = await saveAstrologyReadingMemory({
      userId,
      topic: "career",
      question: "When will I get a job?",
      summary: "Career improves through steady preparation.",
      guidanceGiven: ["Focus on skill-building."],
      emotionalTone: "anxious",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(memory.previousReadings).toHaveLength(1);
    expect(memory.previousReadings[0]?.topic).toBe("career");
    expect(memory.mainConcerns).toContain("career");
    expect(memory.emotionalPatterns[0]?.tone).toBe("anxious");
  });

  it("does not store sensitive questions", async () => {
    const userId = "memory-user-sensitive";
    await clearAstrologyMemory(userId);

    const memory = await saveAstrologyReadingMemory({
      userId,
      topic: "death",
      question: "When will I die?",
      summary: "Sensitive question should not be stored.",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(memory.previousReadings).toHaveLength(0);
  });

  it("caps previous readings", async () => {
    const userId = "memory-user-cap";
    await clearAstrologyMemory(userId);

    for (let index = 0; index < MAX_PREVIOUS_READINGS + 5; index += 1) {
      await saveAstrologyReadingMemory({
        userId,
        topic: "career",
        question: `Career question ${index}`,
        summary: `Summary ${index}`,
        createdAt: new Date(index * 1000).toISOString(),
      });
    }

    const memory = await getAstrologyMemory(userId);

    expect(memory?.previousReadings).toHaveLength(MAX_PREVIOUS_READINGS);
    expect(memory?.previousReadings[0]?.summary).toBe("Summary 5");
  });
});
