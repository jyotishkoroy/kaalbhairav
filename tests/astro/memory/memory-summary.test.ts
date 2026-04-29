import { describe, expect, it } from "vitest";
import {
  buildMemorySummary,
  extractGuidanceForMemory,
  summarizeReadingForMemory,
} from "@/lib/astro/memory/memory-summary";
import { createEmptyAstrologyUserMemory } from "@/lib/astro/memory/memory-types";

describe("Astrology memory summary", () => {
  it("returns undefined for empty memory", () => {
    expect(buildMemorySummary()).toBeUndefined();
    expect(buildMemorySummary(createEmptyAstrologyUserMemory("user"))).toBeUndefined();
  });

  it("builds summary from last reading", () => {
    const memory = {
      ...createEmptyAstrologyUserMemory("user"),
      previousReadings: [
        {
          topic: "career" as const,
          question: "When will I get a job?",
          summary: "Career improves through steady preparation.",
          guidanceGiven: ["Focus on skill-building."],
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };

    expect(buildMemorySummary(memory)).toContain("career");
    expect(buildMemorySummary(memory)).toContain("steady preparation");
  });

  it("summarizes long reading answers", () => {
    const longAnswer = "A".repeat(400);
    const summary = summarizeReadingForMemory(longAnswer);

    expect(summary.length).toBeLessThanOrEqual(240);
    expect(summary.endsWith("...")).toBe(true);
  });

  it("extracts guidance-like sentences", () => {
    const guidance = extractGuidanceForMemory(
      "This is general. My practical guidance is this: focus on skill-building. Avoid panic decisions.",
    );

    expect(guidance.length).toBeGreaterThan(0);
    expect(guidance.join(" ")).toMatch(/guidance|focus|avoid/i);
  });
});
