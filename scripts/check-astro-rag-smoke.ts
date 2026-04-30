/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { DEFAULT_ASTRO_RAG_SMOKE_CASES, buildDiagnosticContext, buildEndpointPreflight, buildSmokeRequestPayload, evaluateAstroReadingResponse, normalizeBaseUrl, redactForLog, type SmokeCheckResult, type SmokeRunSummary } from "./astro-rag-smoke-utils";

function parseArgs(argv: string[]) {
  const args = { baseUrl: "http://127.0.0.1:3000", timeoutMs: 30000, includeV1: false, json: false, verbose: false, debug: false, failOnAuthBlock: false, profileId: undefined as string | undefined, chartVersionId: undefined as string | undefined, userId: undefined as string | undefined };
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
    } else if (current === "--chart-version-id" && next) {
      args.chartVersionId = next;
      i += 1;
    } else if (current === "--timeout-ms" && next) {
      args.timeoutMs = Number(next) || args.timeoutMs;
      i += 1;
    }
    else if (current === "--include-v1") args.includeV1 = true;
    else if (current === "--json") args.json = true;
    else if (current === "--verbose") args.verbose = true;
    else if (current === "--debug") args.debug = true;
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
  const skipped: string[] = [];

  const page = await requestJson(`${baseUrl}/astro/v2`, { method: "GET" }, args.timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error), durationMs: 0 }));
  const pagePreflight = buildEndpointPreflight("/astro/v2", "GET", page.status, page.text);
  results.push({ id: "page", ok: pagePreflight.ok, status: page.status, category: "old_route", prompt: "GET /astro/v2", summary: pagePreflight.summary, failures: pagePreflight.ok ? [] : [buildDiagnosticContext({ endpoint: "/astro/v2", method: "GET", status: page.status, responseBody: page.text, likelyCause: pagePreflight.likelyCause, suggestedFix: pagePreflight.suggestedFix })], durationMs: page.durationMs });

  const probePayload = buildSmokeRequestPayload({ prompt: "What is my Lagna?", profileId: args.profileId, chartVersionId: args.chartVersionId, userId: args.userId, debug: args.debug });
  const probe = await requestJson(`${baseUrl}/api/astro/v2/reading`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(probePayload) }, args.timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error), durationMs: 0 }));
  const probePreflight = buildEndpointPreflight("/api/astro/v2/reading", "POST", probe.status, probe.text);
  results.push({ id: "probe", ok: probePreflight.ok, status: probe.status, category: "old_route", prompt: "POST /api/astro/v2/reading", summary: probePreflight.summary, failures: probePreflight.ok ? [] : [buildDiagnosticContext({ endpoint: "/api/astro/v2/reading", method: "POST", status: probe.status, responseBody: probe.text, likelyCause: probePreflight.likelyCause, suggestedFix: probePreflight.suggestedFix })], durationMs: probe.durationMs });

  const preflightFailed = !pagePreflight.ok || !probePreflight.ok;
  if (preflightFailed) {
    if (pagePreflight.status === 401 || pagePreflight.status === 403 || probePreflight.status === 401 || probePreflight.status === 403 || /auth|profile|no active profile/i.test(`${page.text} ${probe.text}`)) {
      blocked.push("preflight");
      if (!args.failOnAuthBlock) skipped.push(...DEFAULT_ASTRO_RAG_SMOKE_CASES.filter((item) => item.category !== "old_route").map((item) => item.id));
    }
    const summary = summarize(results, baseUrl, Date.now() - started);
    if (args.json) {
      console.log(JSON.stringify({ ...summary, blocked, skipped, preflight: { page: pagePreflight, probe: probePreflight } }, null, 2));
    } else {
      console.log(`baseUrl=${summary.baseUrl} passed=${summary.passed} failed=${summary.failed} blocked=${blocked.length} skipped=${skipped.length} durationMs=${summary.durationMs}`);
      console.log(buildDiagnosticContext({ endpoint: pagePreflight.ok ? "/api/astro/v2/reading" : "/astro/v2", method: pagePreflight.ok ? "POST" : "GET", status: pagePreflight.ok ? probe.status : page.status, responseBody: pagePreflight.ok ? probe.text : page.text, likelyCause: pagePreflight.ok ? probePreflight.likelyCause : pagePreflight.likelyCause, suggestedFix: pagePreflight.ok ? probePreflight.suggestedFix : pagePreflight.suggestedFix }));
      if (args.debug) {
        console.log(JSON.stringify({ preflight: { page: pagePreflight, probe: probePreflight }, payload: probePayload }, null, 2));
      }
    }
    if (!args.failOnAuthBlock && blocked.length > 0) return;
    process.exitCode = 1;
    return;
  }

  for (const testCase of DEFAULT_ASTRO_RAG_SMOKE_CASES) {
    if (testCase.category === "old_route") continue;
    const body = buildSmokeRequestPayload({ prompt: testCase.prompt, profileId: args.profileId, chartVersionId: args.chartVersionId, userId: args.userId, debug: args.debug });
    const response = await requestJson(`${baseUrl}/api/astro/v2/reading`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, args.timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error), durationMs: 0 }));
    const result = evaluateAstroReadingResponse({ testCase, status: response.status, bodyText: response.text, durationMs: response.durationMs });
    if (/auth|profile|not_found/i.test(result.failures.join(" "))) {
      blocked.push(testCase.id);
      if (!args.failOnAuthBlock) {
        skipped.push(testCase.id);
        continue;
      }
    }
    results.push(result);
  }

  const summary = summarize(results, baseUrl, Date.now() - started);
  if (args.json) {
    console.log(JSON.stringify({ ...summary, authBlocked: blocked, blockedCount: blocked.length, skippedCount: skipped.length }, null, 2));
  } else {
    console.log(`baseUrl=${summary.baseUrl} passed=${summary.passed} failed=${summary.failed} blocked=${blocked.length} skipped=${skipped.length} durationMs=${summary.durationMs}`);
    for (const result of results) {
      if (!result.ok || args.verbose) console.log(`${result.id}: ${result.ok ? "ok" : "fail"} ${redactForLog(result.summary)}${result.failures.length ? ` :: ${redactForLog(result.failures.join("; "))}` : ""}`);
    }
    if (args.debug) {
      console.log(JSON.stringify({ preflight: { page: pagePreflight, probe: probePreflight } }, null, 2));
    }
  }

  if (summary.failed > 0 && !(blocked.length > 0 && !args.failOnAuthBlock && summary.failed === blocked.length)) process.exitCode = 1;
}

run().catch((error) => {
  console.error(redactForLog(String(error?.message ?? error)));
  process.exitCode = 1;
});
