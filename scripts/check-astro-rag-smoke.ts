/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { DEFAULT_ASTRO_RAG_SMOKE_CASES, evaluateAstroReadingResponse, normalizeBaseUrl, redactForLog, type SmokeCheckResult, type SmokeRunSummary } from "./astro-rag-smoke-utils";

function parseArgs(argv: string[]) {
  const args = { baseUrl: "http://127.0.0.1:3000", timeoutMs: 30000, includeV1: false, json: false, verbose: false, failOnAuthBlock: false, profileId: undefined as string | undefined, userId: undefined as string | undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--base-url" && next) {
      args.baseUrl = next;
      i += 1;
    } else if (current === "--profile-id" && next) {
      args.profileId = next;
      i += 1;
    } else if (current === "--user-id" && next) {
      args.userId = next;
      i += 1;
    } else if (current === "--timeout-ms" && next) {
      args.timeoutMs = Number(next) || args.timeoutMs;
      i += 1;
    }
    else if (current === "--include-v1") args.includeV1 = true;
    else if (current === "--json") args.json = true;
    else if (current === "--verbose") args.verbose = true;
    else if (current === "--fail-on-auth-block") args.failOnAuthBlock = true;
    else if (current === "--fail-on-auth-block=false") args.failOnAuthBlock = false;
  }
  return args;
}

async function requestJson(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    return { status: response.status, text, durationMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

function summarize(results: SmokeCheckResult[], baseUrl: string, durationMs: number): SmokeRunSummary {
  const passed = results.filter((r) => r.ok).length;
  return { ok: results.every((r) => r.ok), baseUrl, total: results.length, passed, failed: results.length - passed, durationMs, results };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(args.baseUrl);
  const started = Date.now();
  const results: SmokeCheckResult[] = [];
  const blocked: string[] = [];

  const page = await requestJson(`${baseUrl}/astro/v2`, { method: "GET" }, args.timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error), durationMs: 0 }));
  if (page.status === 0) {
    const summary = summarize([{ id: "page", ok: false, status: null, category: "old_route", prompt: "GET /astro/v2", summary: redactForLog(page.text), failures: ["local server not reachable; run npm run dev:local"], durationMs: page.durationMs }], baseUrl, Date.now() - started);
    console.log(summary.results[0].failures[0]);
    process.exitCode = 1;
    return;
  }
  results.push({ id: "page", ok: page.status < 500, status: page.status, category: "old_route", prompt: "GET /astro/v2", summary: page.text.slice(0, 160), failures: page.status >= 500 ? [`GET /astro/v2 returned ${page.status}`] : [], durationMs: page.durationMs });

  for (const testCase of DEFAULT_ASTRO_RAG_SMOKE_CASES) {
    if (testCase.category === "old_route") continue;
    const body: Record<string, unknown> = { question: testCase.prompt, message: testCase.prompt, profileId: args.profileId, userId: args.userId, metadata: { source: "phase-23-smoke", smokeCaseId: testCase.id } };
    const response = await requestJson(`${baseUrl}/api/astro/v2/reading`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, args.timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error), durationMs: 0 }));
    const result = evaluateAstroReadingResponse({ testCase, status: response.status, bodyText: response.text, durationMs: response.durationMs });
    results.push(result);
    if (/auth|profile/i.test(result.failures.join(" "))) blocked.push(testCase.id);
  }

  const summary = summarize(results, baseUrl, Date.now() - started);
  if (args.json) {
    console.log(JSON.stringify({ ...summary, authBlocked: blocked, blockedCount: blocked.length }, null, 2));
  } else {
    console.log(`baseUrl=${summary.baseUrl} passed=${summary.passed} failed=${summary.failed} blocked=${blocked.length} durationMs=${summary.durationMs}`);
    for (const result of results) {
      if (!result.ok || args.verbose) console.log(`${result.id}: ${result.ok ? "ok" : "fail"} ${redactForLog(result.summary)}${result.failures.length ? ` :: ${redactForLog(result.failures.join("; "))}` : ""}`);
    }
  }

  if (summary.failed > 0 && !(blocked.length > 0 && !args.failOnAuthBlock && summary.failed === blocked.length)) process.exitCode = 1;
}

run().catch((error) => {
  console.error(redactForLog(String(error?.message ?? error)));
  process.exitCode = 1;
});
