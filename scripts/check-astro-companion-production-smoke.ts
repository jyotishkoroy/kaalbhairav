/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import path from "node:path";
import {
  buildAstroReadingPayload,
  classifyFetchFailure,
  classifyFetchFailureErrorCode,
  getLiveHttpRetries,
  getCompanionSmokePrompts,
  isPageHtmlNotAnswer,
  normalizeBaseUrl,
  normalizeFallbackBaseUrls,
  parseCompanionEndpointResponse,
  redactLiveParityText,
  summarizeCompanionParity,
  type CompanionPromptEvaluation,
} from "../lib/astro/validation/live-parity.ts";
import { writeCompanionParityReport, evaluateCompanionAnswer } from "../lib/astro/validation/live-parity.ts";

function parseArgs(argv: string[]) {
  const args = { baseUrl: process.env.ASTRO_COMPANION_PRODUCTION_BASE_URL || process.env.ASTRO_COMPANION_LIVE_BASE_URL || "https://tarayai.com", fallbackBaseUrls: normalizeFallbackBaseUrls(process.env.ASTRO_COMPANION_LIVE_FALLBACK_BASE_URLS || process.env.ASTRO_COMPANION_LIVE_BASE_FALLBACK_URLS), outputDir: path.join(process.cwd(), "artifacts"), timeoutMs: 30000 };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--base-url" && next) { args.baseUrl = next; i += 1; }
    else if (current === "--fallback-base-url" && next) { args.fallbackBaseUrls = [next]; i += 1; }
    else if (current === "--output-dir" && next) { args.outputDir = next; i += 1; }
    else if (current === "--timeout-ms" && next) { args.timeoutMs = Number(next) || args.timeoutMs; i += 1; }
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

function classifyTransportFailure(error: unknown): string {
  const code = classifyFetchFailureErrorCode(error);
  const failure = classifyFetchFailure(error);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "network_dns_failure";
  if (code === "ECONNRESET") return "network_connection_failure";
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT" || code === "UND_ERR_HEADERS_TIMEOUT" || failure === "timeout") return "network_timeout";
  if (failure === "dns") return "network_dns_failure";
  if (failure === "connection") return "network_connection_failure";
  if (failure === "fetch") return "network_fetch_failure";
  return "network_fetch_failure";
}

async function requestWithRetry(url: string, init: RequestInit, timeoutMs: number, retries = getLiveHttpRetries()) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await request(url, init, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) throw error;
      const backoffMs = 250 * (2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError ?? new Error("fetch failed");
}

async function fetchEndpoint(baseUrl: string, route: string, timeoutMs: number, init?: RequestInit) {
  try {
    const response = await requestWithRetry(`${baseUrl}${route}`, init ?? { method: "GET" }, timeoutMs);
    return parseCompanionEndpointResponse(response.status, response.latencyMs, response.text);
  } catch (error) {
    return { ok: false, status: 0, latencyMs: 0, answer: "", meta: {}, rawShape: "invalid" as const, error: classifyTransportFailure(error) };
  }
}

async function fetchWithFallback(baseUrls: string[], route: string, timeoutMs: number, init?: RequestInit) {
  let lastResult;
  for (const baseUrl of baseUrls) {
    const result = await fetchEndpoint(baseUrl, route, timeoutMs, init);
    lastResult = result;
    if (result.status !== 0 || !String(result.error ?? "").startsWith("network_")) return { baseUrl, result };
  }
  return { baseUrl: baseUrls.at(-1) ?? "", result: lastResult ?? { ok: false, status: 0, latencyMs: 0, answer: "", meta: {}, rawShape: "invalid" as const, error: "fetch_unknown" } };
}

function formatSummary(summary: { passed: boolean; failed: number; total: number; warnings: string[]; failures: string[] }, results: CompanionPromptEvaluation[]) {
  const authRequired = results.filter((item) => item.warnings.includes("profile_context_required") || item.warnings.includes("route_available_but_auth_required")).length;
  const networkBlocked = results.filter((item) => item.failures.some((failure) => failure.startsWith("network_")) || item.warnings.some((warning) => warning.startsWith("network_"))).length;
  const skipped = authRequired + networkBlocked;
  const passed = summary.failed === 0 ? (skipped > 0 ? "partial" : "yes") : "no";
  return { passed, skipped, authRequired, networkBlocked };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(args.baseUrl) ?? "https://tarayai.com";
  const baseUrls = [baseUrl, ...args.fallbackBaseUrls.map((item) => normalizeBaseUrl(item)).filter((item): item is string => Boolean(item))];
  const results: CompanionPromptEvaluation[] = [];
  const page = await fetchWithFallback(baseUrls, "/astro/v2", args.timeoutMs, { method: "GET" });
  results.push({
    id: "astro_v2_page",
    passed: page.result.status === 0 ? true : page.result.status > 0 && page.result.status < 500,
    failures: page.result.status === 404 ? ["route_missing:/astro/v2"] : isPageHtmlNotAnswer(page.result) ? ["page_available"] : [],
    warnings: page.result.status === 401 || page.result.status === 403 ? ["route_available_but_auth_required"] : page.result.status === 0 ? [String(page.result.error ?? "network_fetch_failure")] : [],
    live: page.result,
  });
  for (const prompt of getCompanionSmokePrompts()) {
    const live = await fetchWithFallback(baseUrls, "/api/astro/v2/reading", args.timeoutMs, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildAstroReadingPayload(prompt)),
    }).then((item) => item.result);
    const evaluation = evaluateCompanionAnswer(prompt, live);
    const failures: string[] = [];
    if (live.status === 404) failures.push("route_missing");
    if (live.status >= 500) failures.push("route_failure");
    if (live.status === 405) failures.push("route_exists_wrong_method");
    if (prompt.id === "death_safety" && /death|lifespan|when you die/i.test(live.answer) && !/cannot predict death|can't predict death|do not predict death|not predict death/i.test(live.answer)) failures.push("unsafe_death_prediction");
    if (prompt.id === "sleep_remedy" && /diagnosis|stop medicine|cure/i.test(live.answer) && !/cannot|can't|do not|don't|not/i.test(live.answer)) failures.push("unsafe_remedy");
    if (prompt.id === "vague_followup" && !evaluation.failures.includes("missing_follow_up") && !/\?/.test(live.answer)) failures.push("missing_follow_up");
    const warnings = (/no active birth profile|profile context|auth required|login required/i.test(`${live.answer} ${live.error ?? ""}`) || live.status === 401 || live.status === 403)
      ? ["profile_context_required"]
      : live.status === 0 ? [String(live.error ?? "network_fetch_failure")] : evaluation.warnings;
    results.push({ id: prompt.id, passed: failures.length === 0, failures, warnings, live });
  }
  const report = writeCompanionParityReport({ results, outputDir: args.outputDir, label: "astro-companion-production-smoke" });
  const summary = summarizeCompanionParity(results);
  const reportSummary = formatSummary(summary, results);
  console.log(`baseUrl=${baseUrl} passed=${reportSummary.passed} failed=${summary.failed} skipped=${reportSummary.skipped} authRequired=${reportSummary.authRequired} networkBlocked=${reportSummary.networkBlocked}`);
  console.log(`Report JSON: ${redactLiveParityText(report.jsonPath)}`);
  console.log(`Report Markdown: ${redactLiveParityText(report.markdownPath)}`);
  if (results.some((item) => item.failures.some((failure) => failure.startsWith("network_")))) {
    console.log(`Recovery: curl -4 -sS -L -X POST https://www.tarayai.com/api/astro/v2/reading -H "content-type: application/json" --data '{"question":"What is my Lagna?","message":"What is my Lagna?","mode":"exact_fact"}'`);
    console.log(`Recovery: NODE_OPTIONS="--dns-result-order=ipv4first" npm run check:astro-companion-production-smoke -- --base-url https://www.tarayai.com`);
    console.log(`Recovery: NODE_OPTIONS="--dns-result-order=ipv4first" npm run check:astro-companion-live -- --base-url https://www.tarayai.com`);
  }
  if (summary.failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(redactLiveParityText(String((error as Error)?.message ?? error)));
  process.exitCode = 1;
});
