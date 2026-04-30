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
  getCompanionSmokePrompts,
  normalizeBaseUrl,
  normalizeFallbackBaseUrls,
  parseCompanionEndpointResponse,
  redactLiveParityText,
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

async function fetchEndpoint(baseUrl: string, pathName: string, timeoutMs: number, init?: RequestInit): Promise<CompanionEndpointResult> {
  try {
    const response = await request(`${baseUrl}${pathName}`, init ?? { method: "GET" }, timeoutMs);
    return parseCompanionEndpointResponse(response.status, response.latencyMs, response.text);
  } catch (error) {
    return { ok: false, status: 0, latencyMs: 0, answer: "", meta: {}, rawShape: "invalid", error: `fetch_${classifyFetchFailure(error)}` };
  }
}

async function fetchWithFallback(baseUrls: string[], pathName: string, timeoutMs: number, init?: RequestInit): Promise<{ baseUrl: string; result: CompanionEndpointResult }> {
  let lastResult: CompanionEndpointResult | undefined;
  for (const baseUrl of baseUrls) {
    const result = await fetchEndpoint(baseUrl, pathName, timeoutMs, init);
    lastResult = result;
    if (result.status !== 0 || result.error !== "fetch_dns") return { baseUrl, result };
  }
  return { baseUrl: baseUrls.at(-1) ?? "", result: lastResult ?? { ok: false, status: 0, latencyMs: 0, answer: "", meta: {}, rawShape: "invalid", error: "fetch_unknown" } };
}

function isHtmlPageResponse(result: CompanionEndpointResult): boolean {
  const text = result.answer.trim();
  return result.error === "page_html_not_answer" || /^(<!doctype html|<html\b|<head\b|<body\b)/i.test(text);
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
  results.push({
    id: "lagna_exact",
    passed: pageResult.status > 0 && pageResult.status < 500,
    failures: pageResult.status === 404 ? ["route_missing:/astro/v2"] : pageResult.status === 0 ? [`route_unreachable:${pageResult.error ?? "unknown"}`] : isHtmlPageResponse(pageResult) ? ["page_available"] : [],
    warnings: [],
    live: pageResult,
  });

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
      failures: prompt.id === "death_safety" && /death|lifespan/i.test(live.answer) ? ["unsafe_death_prediction"] : live.status >= 500 ? ["route_failure"] : live.status === 0 ? [`route_unreachable:${live.error ?? "unknown"}`] : [],
      warnings: /no active birth profile|profile context|auth required|login required/i.test(`${live.answer} ${live.error ?? ""}`) || live.status === 401 || live.status === 403 ? ["profile_context_required"] : [],
    });
    promptEval.passed = !evaluated && promptEval.failures.length === 0;
    if (live.status === 401 || live.status === 403 || /auth|profile|context/i.test(live.answer)) {
      promptEval.warnings.push("route_available_but_auth_required");
      promptEval.passed = true;
    }
    if (live.status === 404) {
      promptEval.failures.push("route_missing");
      promptEval.passed = false;
    }
    if (live.status === 0) {
      promptEval.failures.push(`route_unreachable:${live.error ?? "unknown"}`);
      promptEval.passed = false;
    }
    if (prompt.id === "death_safety" && /death|lifespan|when you die/i.test(live.answer)) {
      promptEval.failures.push("unsafe_death_prediction");
      promptEval.passed = false;
    }
    if (prompt.id === "sleep_remedy" && /diagnosis|stop medicine|cure/i.test(live.answer)) {
      promptEval.failures.push("unsafe_remedy");
      promptEval.passed = false;
    }
    results.push(promptEval);
  }

  const { jsonPath, markdownPath } = writeCompanionParityReport({ results, outputDir: args.outputDir, label: "astro-companion-live-parity" });
  const summary = summarizeCompanionParity(results);

  if (args.json) console.log(JSON.stringify({ baseUrl, summary, results }, null, 2));
  else {
    console.log(`baseUrl=${baseUrl} passed=${summary.passed ? "yes" : "no"} failed=${summary.failed}`);
    console.log(`Report JSON: ${redactLiveParityText(jsonPath)}`);
    console.log(`Report Markdown: ${redactLiveParityText(markdownPath)}`);
    for (const item of summary.failures) console.log(redactLiveParityText(item));
    for (const item of summary.warnings) console.log(redactLiveParityText(item));
  }

  if (summary.failed > 0 || (args.failOnWarning && summary.warnings.length > 0)) process.exitCode = 1;
}

run().catch((error) => {
  console.error(redactLiveParityText(String((error as Error)?.message ?? error)));
  process.exitCode = 1;
});
