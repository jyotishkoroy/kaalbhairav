/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { validateFinalAnswerQuality } from "../lib/astro/validation/final-answer-quality-validator.ts";

type FocusedRolloutCase = {
  id: string;
  category:
    | "exact_fact_safety_suffix"
    | "money"
    | "relationship"
    | "career"
    | "remedy_safety";
  question: string;
  mode?: "exact_fact" | "practical_guidance";
  expected?: {
    mustContainAny?: string[];
    mustNotContain?: string[];
    qualityFailuresAllowed?: string[];
  };
};

type FocusedRolloutResult = {
  id: string;
  category: string;
  passed: boolean;
  status: "passed" | "failed" | "network_blocked" | "auth_required" | "skipped";
  failures: string[];
  answerSnippet?: string;
};

const DEFAULT_BASE_URL = "https://www.tarayai.com";
const API_PATH = "/api/astro/v2/reading";
const DEFAULT_RETRIES = Number.parseInt(process.env.ASTRO_LIVE_HTTP_RETRIES ?? "3", 10);

function parseArgs(argv: string[]): { baseUrl: string } {
  const baseUrlArgIndex = argv.indexOf("--base-url");
  return {
    baseUrl:
      baseUrlArgIndex >= 0 && argv[baseUrlArgIndex + 1]
        ? argv[baseUrlArgIndex + 1]
        : DEFAULT_BASE_URL,
  };
}

async function postReading(baseUrl: string, testCase: FocusedRolloutCase): Promise<unknown> {
  const url = new URL(API_PATH, baseUrl).toString();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      question: testCase.question,
      message: testCase.question,
      mode: testCase.mode ?? "practical_guidance",
      metadata: {
        source: "focused-rollout-check",
        promptId: testCase.id,
        category: testCase.category,
      },
    }),
  });

  if (response.status === 401 || response.status === 403) {
    return {
      authRequired: true,
      status: response.status,
    };
  }

  if (!response.ok) {
    return {
      httpError: true,
      status: response.status,
      body: await response.text().catch(() => ""),
    };
  }

  return response.json();
}

function classifyNetworkError(error: unknown): "network_dns_failure" | "network_timeout" | "network_connection_failure" | "network_unknown" {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);

  if (/ENOTFOUND|EAI_AGAIN|Could not resolve host/i.test(message)) {
    return "network_dns_failure";
  }

  if (/ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|timeout/i.test(message)) {
    return "network_timeout";
  }

  if (/ECONNRESET|socket hang up|fetch failed/i.test(message)) {
    return "network_connection_failure";
  }

  return "network_unknown";
}

async function withRetries<T>(operation: () => Promise<T>, retries = DEFAULT_RETRIES): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await sleep(250 * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

function extractAnswer(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const record = payload as Record<string, unknown>;
  const direct = record.answer ?? record.text ?? record.message;
  if (typeof direct === "string") return direct;

  const data = record.data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (typeof nested.answer === "string") return nested.answer;
  }

  return "";
}

function evaluateCase(testCase: FocusedRolloutCase, payload: unknown): FocusedRolloutResult {
  const answer = extractAnswer(payload);
  const failures: string[] = [];

  if (!answer.trim()) {
    failures.push("empty_answer");
  }

  for (const forbidden of testCase.expected?.mustNotContain ?? []) {
    if (answer.toLowerCase().includes(forbidden.toLowerCase())) {
      failures.push(`forbidden_text:${forbidden}`);
    }
  }

  const mustContainAny = testCase.expected?.mustContainAny ?? [];
  if (mustContainAny.length > 0) {
    const matched = mustContainAny.some((text) => answer.toLowerCase().includes(text.toLowerCase()));

    if (!matched) {
      failures.push(`missing_any:${mustContainAny.join("|")}`);
    }
  }

  const quality = validateFinalAnswerQuality({
    answerText: answer,
    rawQuestion: testCase.question,
    mode: testCase.mode,
    exactFactExpected: testCase.mode === "exact_fact",
  });

  const allowedQualityFailures = new Set(testCase.expected?.qualityFailuresAllowed ?? []);
  const unallowedQualityFailures = quality.failures.filter((failure) => !allowedQualityFailures.has(failure));

  if (!quality.allowed && unallowedQualityFailures.length > 0) {
    failures.push(...unallowedQualityFailures.map((failure) => `quality:${failure}`));
  }

  return {
    id: testCase.id,
    category: testCase.category,
    passed: failures.length === 0,
    status: failures.length === 0 ? "passed" : "failed",
    failures,
    answerSnippet: answer.slice(0, 240),
  };
}

export async function runFocusedRolloutBank(input: {
  baseUrl: string;
  cases: FocusedRolloutCase[];
}): Promise<FocusedRolloutResult[]> {
  const results: FocusedRolloutResult[] = [];

  for (const testCase of input.cases) {
    try {
      const payload = await withRetries(() => postReading(input.baseUrl, testCase));

      if (payload && typeof payload === "object" && "authRequired" in payload) {
        results.push({
          id: testCase.id,
          category: testCase.category,
          passed: false,
          status: "auth_required",
          failures: ["auth_required"],
        });
        continue;
      }

      if (payload && typeof payload === "object" && "httpError" in payload) {
        const httpPayload = payload as { status?: number; body?: string };
        const failures = [`http_${httpPayload.status ?? "unknown"}`];
        results.push({
          id: testCase.id,
          category: testCase.category,
          passed: false,
          status: "failed",
          failures,
          answerSnippet: (httpPayload.body ?? "").slice(0, 240),
        });
        continue;
      }

      results.push(evaluateCase(testCase, payload));
    } catch (error) {
      const classification = classifyNetworkError(error);

      results.push({
        id: testCase.id,
        category: testCase.category,
        passed: false,
        status: "network_blocked",
        failures: [classification],
      });
    }
  }

  return results;
}

async function main(): Promise<void> {
  const { baseUrl } = parseArgs(process.argv.slice(2));
  const fixturePath = path.resolve(process.cwd(), "tests/astro/fixtures/focused-rollout-bank.json");
  const cases = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as FocusedRolloutCase[];
  const results = await runFocusedRolloutBank({ baseUrl, cases });

  const failed = results.filter((result) => result.status === "failed");
  const networkBlocked = results.filter((result) => result.status === "network_blocked");
  const authRequired = results.filter((result) => result.status === "auth_required");
  const passed = results.filter((result) => result.status === "passed");

  console.log(
    JSON.stringify(
      {
        total: results.length,
        passed: passed.length,
        failed: failed.length,
        networkBlocked: networkBlocked.length,
        authRequired: authRequired.length,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0 || networkBlocked.length > 0 || authRequired.length > 0) {
    console.error(
      JSON.stringify(
        {
          failures: results
            .filter((result) => result.status !== "passed")
            .slice(0, 25),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("check-astro-focused-rollout.ts")) {
  void main();
}
