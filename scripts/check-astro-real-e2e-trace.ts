/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { assertAstroE2ETrace } from "../lib/astro/e2e/trace-assertions";

const args = { baseUrl: process.env.ASTRO_COMPANION_PRODUCTION_BASE_URL || "http://localhost:3000", expectSupabase: false };
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === "--base-url" && process.argv[i + 1]) args.baseUrl = process.argv[i + 1];
  if (process.argv[i] === "--expect-supabase") args.expectSupabase = true;
}

const questions = [
  { id: "exact_lagna", question: "What is my Lagna?", mode: "exact_fact" },
  { id: "career", question: "I am working hard and not getting promotion.", mode: "practical_guidance" },
  { id: "death", question: "Can my chart tell when I will die?", mode: "practical_guidance" },
];

let failed = 0;
const report: Array<Record<string, unknown>> = [];
for (const testCase of questions) {
  const response = await fetch(`${args.baseUrl}/api/astro/v2/reading`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tarayai-debug-trace": "true" },
    body: JSON.stringify({ question: testCase.question, message: testCase.question, mode: testCase.mode, metadata: { debugTrace: true, source: "real-e2e-trace-check" } }),
  });
  const payload = await response.json();
  const trace = payload?.meta?.e2eTrace;
  if (!trace) { failed += 1; report.push({ id: testCase.id, error: "e2e_trace_missing" }); continue; }
  const result = assertAstroE2ETrace(trace, { expectSupabase: args.expectSupabase, expectExactFact: testCase.id === "exact_lagna", allowFallback: true });
  report.push({ id: testCase.id, passed: result.passed, failures: result.failures });
  if (!result.passed) failed += 1;
}

const outDir = path.join(process.cwd(), "artifacts");
await writeFile(path.join(outDir, "astro-e2e-trace-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: questions.length, failed, passed: questions.length - failed }, null, 2));
if (failed) process.exit(1);
