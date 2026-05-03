/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { loadVedicQA } from "@/lib/astro/benchmark/vedicqa-loader";

const fixture = "tests/fixtures/astro/vedicQA-sample.md";

describe("loadVedicQA", () => {
  it("loads representative markdown questions", () => {
    const items = loadVedicQA(fixture);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.question).toContain("Lagna");
  });
  it("generates stable ids", () => {
    const items = loadVedicQA(fixture);
    expect(items[0]?.id).toBe(loadVedicQA(fixture)[0]?.id);
  });
  it("normalizes whitespace", () => {
    const items = loadVedicQA(fixture);
    expect(items[0]?.question).not.toMatch(/\s{2,}/);
  });
  it("does not expose raw snapshots", () => {
    const items = loadVedicQA(fixture).slice(0, 1);
    expect(JSON.stringify(items)).not.toContain("Birth details");
  });
  it("returns empty on missing file", () => {
    expect(loadVedicQA("missing-file-does-not-exist.md")).toEqual([]);
  });
  it("loads all rows from the sanitized fixture", () => {
    expect(loadVedicQA(fixture)).toHaveLength(4);
  });
  it("keeps expected answers prefixed with aadesh", () => {
    expect(loadVedicQA(fixture)[0]?.expectedAnswer.toLowerCase()).toContain("aadesh:");
  });
});
