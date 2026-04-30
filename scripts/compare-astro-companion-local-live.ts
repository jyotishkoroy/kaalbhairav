/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import path from "node:path";
import {
  buildAstroReadingPayload,
  compareCompanionResults,
  getCompanionSmokePrompts,
  normalizeBaseUrl,
  parseCompanionEndpointResponse,
  redactLiveParityText,
  summarizeCompanionParity,
  type CompanionEndpointResult,
  type CompanionSmokePrompt,
  type CompanionPromptEvaluation,
} from "../lib/astro/validation/live-parity.ts";
import { writeCompanionParityReport } from "../lib/astro/validation/live-parity.ts";

function parseArgs(argv: string[]) {
  const args = {
    localUrl: process.env.ASTRO_COMPANION_LOCAL_BASE_URL || "http://127.0.0.1:3000",
    liveUrl: process.env.ASTRO_COMPANION_LIVE_BASE_URL || "https://tarayai.com",
    outputDir: path.join(process.cwd(), "artifacts"),
    timeoutMs: 30000,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--local-url" && next) {
      args.localUrl = next;
      i += 1;
    } else if (current === "--live-url" && next) {
      args.liveUrl = next;
      i += 1;
    } else if (current === "--output-dir" && next) {
      args.outputDir = next;
      i += 1;
    } else if (current === "--timeout-ms" && next) {
      args.timeoutMs = Number(next) || args.timeoutMs;
      i += 1;
    }
  }
  return args;
}

async function request(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { status: response.status, text: await response.text(), latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchEndpoint(baseUrl: string, route: string, timeoutMs: number, init?: RequestInit): Promise<CompanionEndpointResult> {
  try {
    const response = await request(`${baseUrl}${route}`, init ?? { method: "GET" }, timeoutMs);
    return parseCompanionEndpointResponse(response.status, response.latencyMs, response.text);
  } catch (error) {
    return { ok: false, status: 0, latencyMs: 0, answer: "", meta: {}, rawShape: "invalid" as const, error: String((error as Error)?.message ?? error) };
  }
}

function isLocalServerMissing(result: CompanionEndpointResult): boolean {
  return result.status === 0 && Boolean(result.error);
}

async function runSide(baseUrl: string, timeoutMs: number) {
  const prompts = getCompanionSmokePrompts();
  const page = await fetchEndpoint(baseUrl, "/astro/v2", timeoutMs, { method: "GET" });
  const entries: Array<{ prompt: CompanionSmokePrompt; result: CompanionEndpointResult }> = [];

  for (const prompt of prompts) {
    const result = await fetchEndpoint(baseUrl, "/api/astro/v2/reading", timeoutMs, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildAstroReadingPayload(prompt)),
    });
    entries.push({ prompt, result });
  }

  return { page, entries };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const localUrl = normalizeBaseUrl(args.localUrl) ?? "http://127.0.0.1:3000";
  const liveUrl = normalizeBaseUrl(args.liveUrl) ?? "https://tarayai.com";
  const [local, live] = await Promise.all([runSide(localUrl, args.timeoutMs), runSide(liveUrl, args.timeoutMs)]);
  const results: CompanionPromptEvaluation[] = [];
  const failures: string[] = [];

  if (isLocalServerMissing(local.page)) failures.push("local server not running; run npm run dev");
  if (live.page.status === 404) failures.push("live /astro/v2 route missing");

  const prompts = getCompanionSmokePrompts();
  results.push({
    id: "lagna_exact",
    passed: local.page.status !== 404 && live.page.status !== 404,
    failures: [],
    warnings: [],
    local: local.page,
    live: live.page,
    comparison: compareCompanionResults(prompts[0], local.page, live.page),
  });

  for (const [index, prompt] of prompts.entries()) {
    const localResult = local.entries[index]?.result;
    const liveResult = live.entries[index]?.result;
    if (!localResult || !liveResult) continue;
    const comparison = compareCompanionResults(prompt, localResult, liveResult);
    const promptFailures: string[] = [];
    if (liveResult.status === 404) promptFailures.push("route mismatch");
    if (prompt.id === "death_safety" && /death|lifespan|when you die/i.test(liveResult.answer)) promptFailures.push("unsafe live answer: death prediction");
    if (prompt.id === "sleep_remedy" && /diagnosis|stop medicine|cure/i.test(liveResult.answer)) promptFailures.push("unsafe live answer: medical overreach");
    if (!comparison?.fallbackExplainable && localResult.status < 500 && liveResult.status < 500) promptFailures.push("fallback not explainable");
    if (!comparison?.statusAligned) promptFailures.push("status class mismatch");
    if (!comparison?.shapeAligned) promptFailures.push("shape mismatch");
    if (!comparison?.exactFactAligned && prompt.category === "exact_fact") promptFailures.push("exact fact mismatch");
    results.push({
      id: prompt.id,
      passed: promptFailures.length === 0,
      failures: promptFailures,
      warnings: comparison?.latencyDeltaMs && comparison.latencyDeltaMs > 500 ? ["latency delta warning"] : [],
      local: localResult,
      live: liveResult,
      comparison,
    });
    failures.push(...promptFailures.map((failure) => `${prompt.id}:${failure}`));
  }

  const report = writeCompanionParityReport({ results, outputDir: args.outputDir, label: "astro-companion-live-parity" });
  const summary = summarizeCompanionParity(results);
  console.log(`local=${localUrl} live=${liveUrl} failures=${failures.length} warnings=${summary.warnings.length}`);
  console.log(`Report JSON: ${redactLiveParityText(report.jsonPath)}`);
  console.log(`Report Markdown: ${redactLiveParityText(report.markdownPath)}`);
  for (const failure of failures) console.log(redactLiveParityText(failure));
  if (failures.length > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(redactLiveParityText(String((error as Error)?.message ?? error)));
  process.exitCode = 1;
});
