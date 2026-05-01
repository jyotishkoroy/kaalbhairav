/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import bank from "./fixtures/focused-rollout-bank.json";
import { runFocusedRolloutBank } from "../../scripts/check-astro-focused-rollout.ts";

type FocusedRolloutCase = {
  id: string;
  category: "exact_fact_safety_suffix" | "money" | "relationship" | "career" | "remedy_safety";
  question: string;
  mode?: "exact_fact" | "practical_guidance";
  expected?: {
    mustContainAny?: string[];
    mustNotContain?: string[];
    qualityFailuresAllowed?: string[];
  };
};

describe("focused rollout bank", () => {
  it("contains 500 curated cases", () => {
    expect(Array.isArray(bank)).toBe(true);
    expect(bank.length).toBe(500);
  });

  it("has unique ids", () => {
    const ids = bank.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers the required phase 10 categories", () => {
    const categories = new Set(bank.map((item) => item.category));
    expect(categories).toContain("exact_fact_safety_suffix");
    expect(categories).toContain("money");
    expect(categories).toContain("relationship");
    expect(categories).toContain("career");
    expect(categories).toContain("remedy_safety");
  });

  it("keeps the package script wired", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["check:astro-focused-rollout"]).toContain("scripts/check-astro-focused-rollout.ts");
  });

  it("exposes a runner that can evaluate fixture-shaped cases without live calls", async () => {
    const cases = bank.slice(0, 2) as FocusedRolloutCase[];

    const results = await runFocusedRolloutBank({
      baseUrl: "http://127.0.0.1:1",
      cases,
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ id: cases[0].id, category: cases[0].category });
  });
});
