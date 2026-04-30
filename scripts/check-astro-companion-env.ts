/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import fs from "node:fs";
import path from "node:path";
import { normalizeBaseUrl, redactLiveParityText } from "../lib/astro/validation/live-parity.ts";

type EnvCheckResult = { ok: boolean; warnings: string[]; failures: string[]; summary: Record<string, string> };

function readFlag(value: string | undefined): boolean {
  return value === "true";
}

function redactedPresence(value: string | undefined): string {
  return value ? "present" : "missing";
}

function checkEnv(env: NodeJS.ProcessEnv): EnvCheckResult {
  const warnings: string[] = [];
  const failures: string[] = [];
  const summary: Record<string, string> = {};
  const liveUrl = normalizeBaseUrl(env.ASTRO_COMPANION_LIVE_BASE_URL || "https://tarayai.com");
  const localUrl = normalizeBaseUrl(env.ASTRO_COMPANION_LOCAL_BASE_URL || "http://127.0.0.1:3000");

  if (!liveUrl) failures.push("invalid ASTRO_COMPANION_LIVE_BASE_URL");
  if (!localUrl) failures.push("invalid ASTRO_COMPANION_LOCAL_BASE_URL");

  summary.liveBaseUrl = liveUrl ?? "invalid";
  summary.localBaseUrl = localUrl ?? "invalid";
  summary.requireLive = String(readFlag(env.ASTRO_COMPANION_REQUIRE_LIVE));
  summary.requireSupabase = String(readFlag(env.ASTRO_COMPANION_REQUIRE_SUPABASE));
  summary.requireGroq = String(readFlag(env.ASTRO_COMPANION_REQUIRE_GROQ));
  summary.requireOllama = String(readFlag(env.ASTRO_COMPANION_REQUIRE_OLLAMA));

  const companionEnabled = readFlag(env.ASTRO_COMPANION_PIPELINE_ENABLED);
  const compassionateEnabled = readFlag(env.ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED);
  const memoryEnabled = readFlag(env.ASTRO_COMPANION_MEMORY_ENABLED);
  const uiEnabled = readFlag(env.ASTRO_COMPANION_UI_ENABLED);

  summary.pipelineEnabled = String(companionEnabled);
  summary.compassionateEnabled = String(compassionateEnabled);
  summary.memoryEnabled = String(memoryEnabled);
  summary.uiEnabled = String(uiEnabled);

  if (companionEnabled && !compassionateEnabled) warnings.push("companion pipeline is enabled while compassionate synthesis is off");
  if (companionEnabled && !memoryEnabled) warnings.push("companion pipeline is enabled while memory is off");
  if (companionEnabled && !uiEnabled) warnings.push("companion pipeline is enabled while UI is off");

  if (readFlag(env.ASTRO_COMPANION_REQUIRE_SUPABASE)) {
    summary.supabaseUrl = redactedPresence(env.SUPABASE_URL);
    summary.supabaseKey = redactedPresence(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY);
    if (!env.SUPABASE_URL) failures.push("SUPABASE_URL missing");
    if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_ANON_KEY) failures.push("supabase key missing");
  } else {
    summary.supabaseUrl = redactedPresence(env.SUPABASE_URL);
    summary.supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY ? "present" : "missing";
    if (!env.SUPABASE_URL || (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_ANON_KEY)) warnings.push("supabase not required for this check mode");
  }

  if (readFlag(env.ASTRO_COMPANION_REQUIRE_GROQ)) {
    summary.groqKey = redactedPresence(env.GROQ_API_KEY);
    if (!env.GROQ_API_KEY) failures.push("GROQ_API_KEY missing");
  } else {
    summary.groqKey = env.GROQ_API_KEY ? "present" : "missing";
  }

  if (readFlag(env.ASTRO_COMPANION_REQUIRE_OLLAMA)) {
    summary.ollamaUrl = redactedPresence(env.ASTRO_LOCAL_ANALYZER_BASE_URL || env.OLLAMA_BASE_URL);
    if (!env.ASTRO_LOCAL_ANALYZER_BASE_URL && !env.OLLAMA_BASE_URL) failures.push("ollama/proxy url missing");
  } else {
    summary.ollamaUrl = env.ASTRO_LOCAL_ANALYZER_BASE_URL || env.OLLAMA_BASE_URL ? "present" : "missing";
  }

  if (env.VERCEL_URL) summary.vercelUrl = "present";
  if (env.VERCEL_PROJECT_PRODUCTION_URL) summary.vercelProjectProductionUrl = "present";
  if (env.VERCEL_ENV) summary.vercelEnv = env.VERCEL_ENV;

  return { ok: failures.length === 0, warnings, failures, summary };
}

function writeSummary(report: EnvCheckResult): string {
  const outputDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(outputDir, { recursive: true });
  const summaryPath = path.join(outputDir, "astro-companion-env-summary.md");
  const lines = [
    "# Astro Companion Env Summary",
    "",
    `Status: ${report.ok ? "ok" : "failed"}`,
    "",
    "## Summary",
    ...Object.entries(report.summary).map(([key, value]) => `- ${key}: ${redactLiveParityText(value)}`),
    "",
    "## Failures",
    ...(report.failures.length ? report.failures.map((item) => `- ${redactLiveParityText(item)}`) : ["- none"]),
    "",
    "## Warnings",
    ...(report.warnings.length ? report.warnings.map((item) => `- ${redactLiveParityText(item)}`) : ["- none"]),
  ];
  fs.writeFileSync(summaryPath, `${lines.join("\n")}\n`);
  return summaryPath;
}

const report = checkEnv(process.env);
const summaryPath = writeSummary(report);

console.log(`ok=${report.ok} failures=${report.failures.length} warnings=${report.warnings.length}`);
for (const line of [...report.failures, ...report.warnings]) console.log(redactLiveParityText(line));
console.log(`Summary: ${summaryPath}`);

if (report.failures.length > 0) process.exitCode = 1;
