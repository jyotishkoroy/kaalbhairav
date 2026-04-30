/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { vi } from "vitest";
import {
  COMPANION_LIVE_100_PROMPTS,
  getCompanionLive100Prompts,
  isExactFactPrompt,
} from "@/lib/astro/validation/companion-live-100";
import { runCompanionLive100 } from "@/scripts/check-astro-companion-live-100";

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
  it("preflight success allows the 100-prompt run to proceed", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "astro-100-"));
    const fetch = vi.fn(async (url: RequestInfo | URL) => {
      const target = String(url);
      if (target.endsWith("/api/astro/v2/reading")) {
        return new Response(JSON.stringify({ answer: "Leo", meta: { directV2Route: true } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ answer: "Your chart is grounded." }), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetch);
    const result = await runCompanionLive100(["--base-url", "https://www.tarayai.com", "--output-dir", dir]);
    expect(result.networkBlocked).toBe(false);
    expect(result.results).toHaveLength(101);
    expect(result.results[0]?.httpStatus).toBe(200);
    expect(result.results.filter((item) => item.number > 0)).toHaveLength(100);
    vi.unstubAllGlobals();
  });
  it("dns blocked preflight stops early under fail-on-network-block", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "astro-100-"));
    const fetch = vi.fn(async () => { throw new Error("getaddrinfo ENOTFOUND www.tarayai.com"); });
    vi.stubGlobal("fetch", fetch);
    const result = await runCompanionLive100(["--base-url", "https://www.tarayai.com", "--output-dir", dir, "--fail-on-network-block"]);
    expect(result.networkBlocked).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.warnings).toContain("network_blocked");
    vi.unstubAllGlobals();
  });
  it("allow-network-warnings keeps the diagnostic warning result but does not claim 100 passed", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "astro-100-"));
    const fetch = vi.fn(async () => { throw new Error("getaddrinfo ENOTFOUND www.tarayai.com"); });
    vi.stubGlobal("fetch", fetch);
    const result = await runCompanionLive100(["--base-url", "https://www.tarayai.com", "--output-dir", dir, "--allow-network-warnings"]);
    expect(result.networkBlocked).toBe(true);
    expect(result.results[0]?.passFailWarning).toBe("warning");
    expect(result.results.filter((item) => item.passFailWarning === "pass")).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});
