/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { DEFAULT_ASTRO_RAG_SMOKE_CASES, evaluateAstroReadingResponse, normalizeBaseUrl, redactForLog, type SmokeCheckResult } from "./astro-rag-smoke-utils";

function parseArgs(argv: string[]) {
  const args = { localBaseUrl: "http://127.0.0.1:3000", liveBaseUrl: "https://tarayai.com", timeoutMs: 30000, json: false, verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--local-base-url" && next) {
      args.localBaseUrl = next;
      i += 1;
    } else if (current === "--live-base-url" && next) {
      args.liveBaseUrl = next;
      i += 1;
    } else if (current === "--timeout-ms" && next) {
      args.timeoutMs = Number(next) || args.timeoutMs;
      i += 1;
    }
    else if (current === "--json") args.json = true;
    else if (current === "--verbose") args.verbose = true;
  }
  return args;
}

async function requestJson(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { status: response.status, text: await response.text(), durationMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function runSide(baseUrl: string, timeoutMs: number, source: "local" | "live") {
  const page = await requestJson(`${baseUrl}/astro/v2`, { method: "GET" }, timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error), durationMs: 0 }));
  const results: SmokeCheckResult[] = [];
  results.push({ id: `${source}-page`, ok: page.status > 0 && page.status < 500, status: page.status, category: "old_route", prompt: "GET /astro/v2", summary: page.text.slice(0, 160), failures: page.status === 0 && source === "local" ? ["local server not reachable; run npm run dev:local"] : page.status === 0 ? ["base URL unreachable"] : page.status >= 500 ? [`GET /astro/v2 returned ${page.status}`] : [], durationMs: page.durationMs });
  for (const testCase of DEFAULT_ASTRO_RAG_SMOKE_CASES) {
    if (testCase.category === "old_route") continue;
    const response = await requestJson(`${baseUrl}/api/astro/v2/reading`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: testCase.prompt, message: testCase.prompt, metadata: { source: `phase-23-${source}` } }) }, timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error), durationMs: 0 }));
    results.push(evaluateAstroReadingResponse({ testCase, status: response.status, bodyText: response.text, durationMs: response.durationMs }));
  }
  return results;
}

function compare(local: SmokeCheckResult[], live: SmokeCheckResult[]) {
  const keyed = new Map(live.map((item) => [item.id, item]));
  const failures: string[] = [];
  for (const localResult of local) {
    const liveResult = keyed.get(localResult.id);
    if (!liveResult) continue;
    if (!localResult.ok && localResult.status === 0) failures.push("local server not reachable; run npm run dev:local");
    if (localResult.category === "exact_fact" && localResult.ok && !liveResult.ok) failures.push(`exact fact degraded for ${localResult.id}`);
    if (localResult.category === "safety" && (!localResult.ok || !liveResult.ok)) failures.push(`death safety degraded for ${localResult.id}`);
    if (localResult.category === "followup" && !liveResult.ok) failures.push("vague follow-up did not stay safe in live");
    if (liveResult.responseMeta && Object.keys(liveResult.responseMeta).some((key) => /debug|artifact|raw|supabase/i.test(key))) failures.push("live route exposed debug metadata");
  }
  return failures;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const localBaseUrl = normalizeBaseUrl(args.localBaseUrl);
  const liveBaseUrl = normalizeBaseUrl(args.liveBaseUrl);
  const [local, live] = await Promise.all([runSide(localBaseUrl, args.timeoutMs, "local"), runSide(liveBaseUrl, args.timeoutMs, "live")]);
  const failures = compare(local, live);
  const summary = { ok: failures.length === 0 && local.every((r) => r.ok || /blocked:/i.test(r.summary)) && live.every((r) => r.ok || /blocked:/i.test(r.summary)), localBaseUrl, liveBaseUrl, local, live, failures };
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`local=${localBaseUrl} live=${liveBaseUrl} failures=${failures.length}`);
    if (args.verbose) {
      for (const result of [...local, ...live]) console.log(`${result.id}: ${result.ok ? "ok" : "fail"} ${redactForLog(result.summary)}`);
    }
    for (const failure of failures) console.log(failure);
  }
  if (failures.length > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(redactForLog(String(error?.message ?? error)));
  process.exitCode = 1;
});
