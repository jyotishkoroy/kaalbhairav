/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { normalizeBaseUrl, redactForLog, parseJsonSafely } from "./astro-rag-smoke-utils";

function parseArgs(argv: string[]) {
  const args = { baseUrl: process.env.ASTRO_LOCAL_ANALYZER_BASE_URL || "http://127.0.0.1:8787", timeoutMs: 10000, json: false, verbose: false, checkAnalyzer: false, checkCritic: false, requireDefaultModel: false };
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
    else if (current === "--check-analyzer") args.checkAnalyzer = true;
    else if (current === "--check-critic") args.checkCritic = true;
    else if (current === "--require-default-model") args.requireDefaultModel = true;
  }
  return args;
}

async function requestJson(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    return { status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(args.baseUrl);
  const health = await requestJson(`${baseUrl}/health`, { method: "GET" }, args.timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error) }));
  const healthBody = parseJsonSafely(health.text);
  const secret = process.env.TARAYAI_LOCAL_SECRET || process.env.ASTRO_LOCAL_ANALYZER_SECRET || process.env.ASTRO_LOCAL_CRITIC_SECRET || "";
  const failures: string[] = [];
  const warnings: string[] = [];

  if (health.status === 0) failures.push("proxy unreachable");
  if (!healthBody || typeof healthBody !== "object") failures.push("health response was not JSON");
  const model = typeof healthBody === "object" && healthBody ? String((healthBody as Record<string, unknown>).model ?? "") : "";
  const ok = Boolean((healthBody as Record<string, unknown> | undefined)?.ok);
  if (!ok) warnings.push("service ok is false");
  if (model === "qwen2.5:7b") {
    const message = "qwen2.5:7b is slow for normal app flow";
    if (args.requireDefaultModel) failures.push(message);
    else warnings.push(message);
  }
  if (model === "qwen2.5:1.5b") warnings.push("qwen2.5:1.5b is a fallback model");
  if (model && model !== "qwen2.5:3b" && model !== "qwen2.5:1.5b" && model !== "qwen2.5:7b") warnings.push(`unexpected model ${model}`);

  if (args.checkAnalyzer || args.checkCritic) {
    if (!secret) {
      failures.push("missing secret for analyzer/critic check");
    } else {
      const route = args.checkAnalyzer ? "/analyze-question" : "/critic";
      const body = args.checkAnalyzer ? { question: "What is my Lagna?" } : { question: "Q", answer: "A", contract: {}, facts: [] };
      const response = await requestJson(`${baseUrl}${route}`, { method: "POST", headers: { "content-type": "application/json", "x-tarayai-local-secret": secret }, body: JSON.stringify(body) }, args.timeoutMs).catch((error) => ({ status: 0, text: String(error?.message ?? error) }));
      const parsed = parseJsonSafely(response.text);
      if (response.status !== 200) failures.push(`${route} returned ${response.status}`);
      if (!parsed || typeof parsed !== "object") failures.push(`${route} response was not JSON`);
      if (args.verbose) console.log(redactForLog(response.text.slice(0, 240)));
    }
  }

  const summary = { ok: failures.length === 0, baseUrl, health: { status: health.status, body: healthBody }, failures, warnings };
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`baseUrl=${baseUrl} ok=${summary.ok} failures=${failures.length} warnings=${warnings.length}`);
    for (const line of [...failures, ...warnings]) console.log(redactForLog(line));
    console.log("Dell proxy is optional.");
  }
  if (failures.length > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(redactForLog(String(error?.message ?? error)));
  process.exitCode = 1;
});
