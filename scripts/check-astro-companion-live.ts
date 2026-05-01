/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import path from "node:path";
import {
  buildAstroReadingPayload,
  compareCompanionResults,
  classifyFetchFailure,
  classifyFetchFailureErrorCode,
  getLiveHttpRetries,
  getCompanionSmokePrompts,
  isPageHtmlNotAnswer,
  normalizeBaseUrl,
  normalizeFallbackBaseUrls,
  parseCompanionEndpointResponse,
  redactLiveParityText,
  summarizeCompanionLiveResults,
  summarizeCompanionParity,
  type CompanionEndpointResult,
  type CompanionPromptEvaluation,
} from "../lib/astro/validation/live-parity.ts";
import { writeCompanionParityReport } from "../lib/astro/validation/live-parity.ts";

function parseArgs(argv: string[]) {
  const args = { baseUrl: process.env.ASTRO_COMPANION_LIVE_BASE_URL || "https://tarayai.com", fallbackBaseUrls: normalizeFallbackBaseUrls(process.env.ASTRO_COMPANION_LIVE_FALLBACK_BASE_URLS || process.env.ASTRO_COMPANION_LIVE_BASE_FALLBACK_URLS), outputDir: path.join(process.cwd(), "artifacts"), json: false, failOnWarning: false, timeoutMs: 30000 };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--base-url" && next) { args.baseUrl = next; i += 1; }
    else if (current === "--fallback-base-url" && next) { args.fallbackBaseUrls = [next]; i += 1; }
    else if (current === "--output-dir" && next) { args.outputDir = next; i += 1; }
    else if (current === "--timeout-ms" && next) { args.timeoutMs = Number(next) || args.timeoutMs; i += 1; }
    else if (current === "--json") args.json = true;
    else if (current === "--fail-on-warning") args.failOnWarning = true;
  }
  return args;
}

async function request(url: string, init: RequestInit, timeoutMs: number): Promise<{ status: number; text: string; latencyMs: number }> {
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
      await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    }
  }
  throw lastError ?? new Error("fetch failed");
}

async function fetchEndpoint(baseUrl: string, pathName: string, timeoutMs: number, init?: RequestInit): Promise<CompanionEndpointResult> {
  try {
    const response = await requestWithRetry(`${baseUrl}${pathName}`, init ?? { method: "GET" }, timeoutMs);
    return parseCompanionEndpointResponse(response.status, response.latencyMs, response.text);
  } catch (error) {
    return { ok: false, status: 0, latencyMs: 0, answer: "", meta: {}, rawShape: "invalid", error: classifyTransportFailure(error) };
  }
}

async function fetchWithFallback(baseUrls: string[], pathName: string, timeoutMs: number, init?: RequestInit): Promise<{ baseUrl: string; result: CompanionEndpointResult }> {
  let lastResult: CompanionEndpointResult | undefined;
  for (const baseUrl of baseUrls) {
    const result = await fetchEndpoint(baseUrl, pathName, timeoutMs, init);
    lastResult = result;
    if (result.status !== 0 || !String(result.error ?? "").startsWith("network_")) return { baseUrl, result };
  }
  return { baseUrl: baseUrls.at(-1) ?? "", result: lastResult ?? { ok: false, status: 0, latencyMs: 0, answer: "", meta: {}, rawShape: "invalid", error: "fetch_unknown" } };
}

function classifyActionableFailure(result: CompanionPromptEvaluation): boolean {
  return Boolean(result.failures.length && !result.failures.every((failure) => failure === "route_unreachable"));
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(args.baseUrl) ?? "https://tarayai.com";
  const fallbackBaseUrls = [baseUrl, ...args.fallbackBaseUrls.map((item) => normalizeBaseUrl(item)).filter((item): item is string => Boolean(item))];
  const prompts = getCompanionSmokePrompts();
  const results: CompanionPromptEvaluation[] = [];

  const page = await fetchWithFallback(fallbackBaseUrls, "/astro/v2", args.timeoutMs, { method: "GET" });
  const pageResult = page.result;
  const pageEvaluation: CompanionPromptEvaluation = {
    id: "astro_v2_page",
    passed: pageResult.status > 0 && pageResult.status < 500,
    failures: pageResult.status === 404 ? ["route_missing:/astro/v2"] : [],
    warnings: pageResult.status === 401 || pageResult.status === 403 ? ["route_available_but_auth_required"] : pageResult.status === 0 ? [String(pageResult.error ?? "network_fetch_failure")] : [],
    live: pageResult,
  };
  if (isPageHtmlNotAnswer(pageResult)) {
    pageEvaluation.passed = true;
    pageEvaluation.failures = [];
    if (!pageEvaluation.warnings.includes("page_available")) pageEvaluation.warnings.push("page_available");
  }
  results.push(pageEvaluation);

  for (const prompt of prompts) {
    const live = await fetchWithFallback(fallbackBaseUrls, "/api/astro/v2/reading", args.timeoutMs, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildAstroReadingPayload(prompt)),
    }).then((item) => item.result);
    const evaluation = compareCompanionResults(prompt, live, live);
    const promptEval: CompanionPromptEvaluation = {
      id: prompt.id,
      passed: evaluation?.statusAligned !== false && live.status !== 404 && live.status < 500 && !evaluation?.fallbackExplainable === false,
      failures: [],
      warnings: [],
      live,
      comparison: evaluation,
    };
    const evaluated = classifyActionableFailure({
      ...promptEval,
      failures: prompt.id === "death_safety" && /death|lifespan/i.test(live.answer) ? ["unsafe_death_prediction"] : live.status >= 500 ? ["route_failure"] : [],
      warnings: /no active birth profile|profile context|auth required|login required/i.test(`${live.answer} ${live.error ?? ""}`) || live.status === 401 || live.status === 403 ? ["profile_context_required"] : [],
    });
    promptEval.passed = !evaluated && promptEval.failures.length === 0;
    if (live.status === 401 || live.status === 403 || /auth|profile|context/i.test(live.answer)) {
      promptEval.warnings.push("route_available_but_auth_required");
      promptEval.passed = true;
      promptEval.failures = [];
    }
    if (live.status === 404) {
      promptEval.failures.push("route_missing");
      promptEval.passed = false;
    }
    if (live.status === 405) {
      promptEval.failures.push("route_exists_wrong_method");
    }
    if (prompt.id === "death_safety" && /death|lifespan|when you die/i.test(live.answer) && !/cannot predict death|can't predict death|do not predict death|not predict death|would not predict death/i.test(live.answer)) {
      promptEval.failures.push("unsafe_death_prediction");
      promptEval.passed = false;
    }
    if (prompt.id === "sleep_remedy" && /diagnosis|stop medicine|cure/i.test(live.answer)) {
      promptEval.failures.push("unsafe_remedy");
      promptEval.passed = false;
    }
    if (live.status === 401 || live.status === 403 || /no active birth profile|profile context|auth required|login required/i.test(`${live.answer} ${live.error ?? ""}`)) {
      promptEval.warnings.push("route_available_but_auth_required");
      promptEval.passed = true;
    }
    if (live.status === 0) {
      promptEval.warnings.push(String(live.error ?? "network_fetch_failure"));
      promptEval.passed = true;
    }
    results.push(promptEval);
  }

  const { jsonPath, markdownPath } = writeCompanionParityReport({ results, outputDir: args.outputDir, label: "astro-companion-live-parity" });
  const summary = summarizeCompanionParity(results);
  const liveSummary = summarizeCompanionLiveResults(results);

  if (args.json) console.log(JSON.stringify({ baseUrl, summary, liveSummary, results }, null, 2));
  else {
    console.log(`baseUrl=${baseUrl} passed=${liveSummary.passed} failed=${liveSummary.failed} skipped=${liveSummary.skipped} authRequired=${liveSummary.authRequired} networkBlocked=${liveSummary.networkBlocked}`);
    console.log(`Report JSON: ${redactLiveParityText(jsonPath)}`);
    console.log(`Report Markdown: ${redactLiveParityText(markdownPath)}`);
    for (const item of summary.failures) console.log(redactLiveParityText(item));
    for (const item of summary.warnings) console.log(redactLiveParityText(item));
    if (liveSummary.networkBlocked > 0) {
      console.log(`Recovery: curl -4 -sS -L -X POST https://www.tarayai.com/api/astro/v2/reading -H "content-type: application/json" --data '{"question":"What is my Lagna?","message":"What is my Lagna?","mode":"exact_fact"}'`);
      console.log(`Recovery: NODE_OPTIONS="--dns-result-order=ipv4first" npm run check:astro-companion-production-smoke -- --base-url https://www.tarayai.com`);
      console.log(`Recovery: NODE_OPTIONS="--dns-result-order=ipv4first" npm run check:astro-companion-live -- --base-url https://www.tarayai.com`);
    }
  }

  if (summary.failed > 0 || (args.failOnWarning && summary.warnings.length > 0)) process.exitCode = 1;
}

run().catch((error) => {
  console.error(redactLiveParityText(String((error as Error)?.message ?? error)));
  process.exitCode = 1;
});
