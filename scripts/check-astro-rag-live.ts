/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { DEFAULT_ASTRO_RAG_SMOKE_CASES, evaluateAstroReadingResponse, normalizeBaseUrl, redactForLog, type SmokeCheckResult } from "./astro-rag-smoke-utils";

function parseArgs(argv: string[]) {
  const args = { baseUrl: "https://tarayai.com", timeoutMs: 30000, json: false, verbose: false, failOnAuthBlock: false };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--base-url" && next) {
      args.baseUrl = next;
      i += 1;
    } else if (current === "--timeout-ms" && next) {
      args.timeoutMs = Number(next) || args.timeoutMs;
      i += 1;
    }
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

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(args.baseUrl);
  const page = await requestJson(`${baseUrl}/astro/v2`, { method: "GET" }, args.timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error), durationMs: 0 }));
  const results: SmokeCheckResult[] = [];
  results.push({ id: "page", ok: page.status > 0 && page.status < 500, status: page.status, category: "old_route", prompt: "GET /astro/v2", summary: page.text.slice(0, 160), failures: page.status === 0 ? ["live base URL unreachable"] : page.status >= 500 ? [`GET /astro/v2 returned ${page.status}`] : [], durationMs: page.durationMs });

  for (const testCase of DEFAULT_ASTRO_RAG_SMOKE_CASES) {
    if (testCase.category === "old_route") continue;
    const body = { question: testCase.prompt, message: testCase.prompt, metadata: { source: "phase-23-live-smoke", smokeCaseId: testCase.id } };
    const response = await requestJson(`${baseUrl}/api/astro/v2/reading`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, args.timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error), durationMs: 0 }));
    results.push(evaluateAstroReadingResponse({ testCase, status: response.status, bodyText: response.text, durationMs: response.durationMs }));
  }

  const passed = results.filter((r) => r.ok).length;
  const authBlocked = results.filter((r) => r.failures.length === 0 && /blocked:/i.test(r.summary));
  const summary = { ok: results.every((r) => r.ok), baseUrl, total: results.length, passed, failed: results.length - passed, authBlocked: authBlocked.map((r) => r.id), durationMs: results.reduce((n, r) => n + r.durationMs, 0), results };
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`baseUrl=${summary.baseUrl} passed=${summary.passed} failed=${summary.failed} blocked=${summary.authBlocked.length}`);
    if (args.verbose) for (const result of results) console.log(`${result.id}: ${result.ok ? "ok" : "fail"} ${redactForLog(result.summary)}`);
  }
  if (summary.failed > 0 && !(summary.authBlocked.length > 0 && !args.failOnAuthBlock)) process.exitCode = 1;
}

run().catch((error) => {
  console.error(redactForLog(String(error?.message ?? error)));
  process.exitCode = 1;
});
