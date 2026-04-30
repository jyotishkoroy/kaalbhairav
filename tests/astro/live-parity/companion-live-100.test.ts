/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  COMPANION_LIVE_100_PROMPTS,
  getCompanionLive100Prompts,
  isExactFactPrompt,
} from "@/lib/astro/validation/companion-live-100";

describe("companion live 100", () => {
  it("contains exactly 100 prompts", () => {
    expect(COMPANION_LIVE_100_PROMPTS).toHaveLength(100);
  });
  it("prompt numbers are sequential", () => {
    expect(COMPANION_LIVE_100_PROMPTS.map((item) => item.number)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
  });
  it("first and last prompts match the required validation set", () => {
    expect(COMPANION_LIVE_100_PROMPTS[0]?.prompt).toBe("What is my Lagna?");
    expect(COMPANION_LIVE_100_PROMPTS.at(-1)?.prompt).toBe("Should I leave India immediately for success?");
  });
  it("exact fact prompts are marked exact_fact", () => {
    expect(getCompanionLive100Prompts().filter((item) => item.mode === "exact_fact").map((item) => item.number)).toEqual([1, 2, 3, 4, 5, 51, 52, 53, 54, 55]);
  });
  it("exact fact helper matches expected prompt numbers", () => {
    expect([1, 5, 51, 55].every((number) => isExactFactPrompt(number))).toBe(true);
    expect([6, 50, 56, 100].every((number) => !isExactFactPrompt(number))).toBe(true);
  });
  it("package script exposes the 100-question live runner", () => {
    const scripts = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")).scripts as Record<string, string>;
    expect(scripts["check:astro-companion-live-100"]).toContain("scripts/check-astro-companion-live-100.ts");
  });
});
