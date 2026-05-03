/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { loadVedicQA } from "../../lib/astro/benchmark/vedicqa-loader.ts";
import { scoreAnswerMatch } from "../../lib/astro/benchmark/answer-match.ts";
import { assertNoSecretLeaks, excerptText, hashText, sanitizeEvent, sanitizeUrlPath, type E2ETraceRow, type SanitizedNetworkEvent } from "../../lib/astro/benchmark/e2e-trace.ts";
import {
  findAstroPage,
  hasStorageState,
  isAstroUrl,
  resolveCdpFinalStatus,
  resolveCdpUrl,
  resolveLiveUrl,
  resolveStorageStatePath,
  shouldRequireStorageState,
  useCdpMode as getUseCdpMode,
} from "./run-vedicqa-live-e2e.helpers.ts";

const inputPath = process.env.VEDICQA_INPUT ?? "vedicQA.md";
const limit = Number(process.env.VEDICQA_LIMIT ?? "30");
const liveUrl = resolveLiveUrl();
const e2eDelayMs = Number(process.env.VEDICQA_E2E_DELAY_MS ?? "100");
const rateLimitBackoffMs = Number(process.env.VEDICQA_E2E_RATE_LIMIT_BACKOFF_MS ?? "5000");
const maxRateLimitRetries = Number(process.env.VEDICQA_E2E_MAX_RATE_LIMIT_RETRIES ?? "3");
const traceOutput = process.env.VEDICQA_TRACE_OUTPUT ?? "artifacts/vedicqa-live-e2e-trace.jsonl";
const reportOutput = process.env.VEDICQA_OUTPUT ?? "artifacts/vedicqa-live-e2e-report.json";
const textOutput = process.env.VEDICQA_TEXT_OUTPUT ?? "artifacts/vedicqa-live-e2e-summary.md";
const screenshotDir = process.env.VEDICQA_SCREENSHOT_DIR ?? "artifacts/vedicqa-live-screenshots";
const requireAuth = (process.env.VEDICQA_REQUIRE_AUTH ?? "true").toLowerCase() !== "false";
const headful = (process.env.VEDICQA_HEADFUL ?? "false").toLowerCase() === "true";
const useCdp = getUseCdpMode();

type RunStatus = "completed" | "blocked";

const items = loadVedicQA(inputPath).slice(0, Number.isFinite(limit) ? limit : 30);
const rows: E2ETraceRow[] = [];
const pageEvents: Array<{ method: string; url: string; status?: number; requestBody?: unknown; responseBody?: unknown }> = [];

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function serializeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function detectBrowserBlock(urls: string[]): "login_loop" | "profile_setup_required" | "not_reached" | null {
  if (urls.some((u) => /\/sign-in|\/login/i.test(u)) && urls.filter((u) => /\/sign-in|\/login/i.test(u)).length > 1) return "login_loop";
  if (urls.some((u) => /\/astro\/setup/i.test(u))) return "profile_setup_required";
  if (!urls.some((u) => /\/astro/i.test(u))) return "not_reached";
  return null;
}

async function recordAskNetwork(page: Page): Promise<void> {
  page.on("request", (request) => {
    if (!request.url().includes("/api/astro/ask")) return;
    const postData = request.postDataJSON?.();
    pageEvents.push({ method: request.method(), url: request.url(), requestBody: postData });
  });
  page.on("response", async (response) => {
    if (!response.url().includes("/api/astro/ask")) return;
    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
    const last = pageEvents[pageEvents.length - 1];
    if (last && last.url === response.url()) {
      last.status = response.status();
      last.responseBody = responseBody;
    } else {
      pageEvents.push({ method: "GET", url: response.url(), status: response.status(), responseBody });
    }
  });
}

async function waitForAskUi(page: Page): Promise<void> {
  await page.getByText(/Ask Guru/i).first().waitFor({ timeout: 30000 });
  await page.locator("textarea").first().waitFor({ timeout: 30000 });
}

async function extractAadeshAnswer(page: Page): Promise<string> {
  const candidates = [
    page.getByText(/^aadesh:/i).first(),
    page.locator("main").getByText(/^aadesh:/i).first(),
    page.locator("textarea").first(),
  ];
  for (const candidate of candidates) {
    try {
      const text = await candidate.textContent({ timeout: 5000 });
      if (text && text.trim()) return text.trim();
    } catch {
      // keep trying
    }
  }
  const bodyText = await page.textContent("body");
  return bodyText?.match(/aadesh:[\s\S]*$/i)?.[0].trim() ?? "";
}

async function submitQuestion(page: Page, question: string): Promise<void> {
  const textarea = page.locator("textarea").first();
  await textarea.fill("");
  await textarea.fill(question);
  const askButton = page.getByRole("button", { name: /^(ask|ask guru|submit)$/i }).first();
  if (await askButton.count()) {
    await askButton.click();
  } else {
    await textarea.press("Enter");
  }
}

function isRateLimited(text: string): boolean {
  return /rate[_ -]?limited|too many requests|429\b/i.test(text);
}

async function readAadeshWithRetries(page: Page, _questionId: string, question: string): Promise<{
  actual: string;
  attempts: number;
  rateLimited: boolean;
  notes: string[];
  networkEvents: SanitizedNetworkEvent[];
}> {
  const notes: string[] = [];
  const networkEvents: SanitizedNetworkEvent[] = [];
  let attempts = 0;
  let rateLimited = false;
  let actual = "";
  while (attempts <= maxRateLimitRetries) {
    attempts += 1;
    const start = Date.now();
    const beforeCount = pageEvents.length;
    const beforeAnswer = await extractAadeshAnswer(page);
    await submitQuestion(page, question);
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);
    actual = await extractAadeshAnswer(page);
    const delta = pageEvents.splice(beforeCount).map((event) => sanitizeEvent({ method: event.method, url: event.url, status: event.status, requestBody: event.requestBody, responseBody: event.responseBody, latencyMs: Date.now() - start }));
    networkEvents.push(...delta);
    if (isRateLimited(actual)) {
      rateLimited = true;
      notes.push(`rate_limited_attempt_${attempts}`);
      if (attempts <= maxRateLimitRetries) {
        await page.waitForTimeout(rateLimitBackoffMs);
        continue;
      }
    }
    if (beforeAnswer === actual) notes.push("answer_unchanged");
    else notes.push("answer_changed");
    break;
  }
  return { actual, attempts, rateLimited, notes, networkEvents };
}

async function run(): Promise<{ status: RunStatus; reason?: string }> {
  const storageState = resolveStorageStatePath();
  if (shouldRequireStorageState() && !hasStorageState(storageState) && requireAuth) {
    return { status: "blocked", reason: "missing_storage_state" };
  }

  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  if (useCdp) {
    browser = await chromium.connectOverCDP(resolveCdpUrl());
    context = browser.contexts()[0];
    if (!context) throw new Error("cdp_no_context");
    const existingAstroPage = findAstroPage(context);
    page = existingAstroPage ?? (await context.newPage());
    if (!existingAstroPage) {
      await page.goto(liveUrl, { waitUntil: "domcontentloaded" });
    } else if (!isAstroUrl(page.url())) {
      await page.goto(liveUrl, { waitUntil: "domcontentloaded" });
    }
    const cdpStatus = resolveCdpFinalStatus(page.url());
    if (cdpStatus) {
      return cdpStatus;
    }
    const finalUrl = new URL(page.url());
    console.log(JSON.stringify({ cdp_connected: true, authenticated_astro_reached: true, finalPath: finalUrl.pathname }, null, 2));
  } else {
    browser = await chromium.launch({ headless: !headful });
    context = await browser.newContext({
      storageState: hasStorageState(storageState) ? storageState : undefined,
      viewport: { width: 1440, height: 1200 },
    });
    page = await context.newPage();
    await page.goto(liveUrl, { waitUntil: "networkidle", timeout: 60000 });
  }
  await recordAskNetwork(page);

  const visitedUrls: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) visitedUrls.push(frame.url());
  });

  try {
    if (!useCdp) {
      // page already navigated in non-CDP mode
    }
    visitedUrls.push(page.url());
    await waitForAskUi(page);
  } catch (error) {
    const blocker = detectBrowserBlock(visitedUrls);
    return { status: "blocked", reason: blocker ?? serializeError(error) };
  }

  const urlAtStart = sanitizeUrlPath(page.url());
  if (!/\/astro/i.test(urlAtStart)) {
    return { status: "blocked", reason: `not_reached:${urlAtStart}` };
  }

  const screenshotPath = path.join(screenshotDir, "initial.png");
  ensureDir(screenshotPath);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  for (const item of items) {
    const start = Date.now();
    const result = await readAadeshWithRetries(page, item.id, item.question);
    const actual = result.actual;
    const score = scoreAnswerMatch({ actual, expected: item.expectedAnswer });
    const row: E2ETraceRow = {
      timestamp: new Date().toISOString(),
      runId: hashText(`${inputPath}:${liveUrl}`),
      questionId: item.id,
      question: item.question,
      expectedAnswerHash: hashText(item.expectedAnswer),
      expectedAnswerExcerpt: excerptText(item.expectedAnswer),
      pageUrl: sanitizeUrlPath(page.url()),
      network: result.networkEvents.map((event) => ({ ...event, latencyMs: Date.now() - start })),
      actualAnswer: actual,
      match: score,
      safety: { blocked: /cannot help|cannot|not able/i.test(actual) || result.rateLimited, reason: /cannot help|cannot|not able/i.test(actual) ? "refusal" : result.rateLimited ? "rate_limited" : null },
      providers: { groqObserved: "unknown", ollamaObserved: "unknown", supabaseObserved: "production-via-app" },
      notes: result.notes,
    };
    assertNoSecretLeaks(JSON.stringify(row));
    rows.push(row);
    if (e2eDelayMs > 0) await page.waitForTimeout(e2eDelayMs);
  }

  await context.close();
  if (!useCdp) await browser.close();
  return { status: "completed" };
}

const status = await run();
const summary = {
  total: rows.length || items.length,
  passed: rows.filter((row) => row.match.matched).length,
  acceptedMatchRate: rows.length ? rows.filter((row) => row.match.matched).length / rows.length : 0,
  exactMatchRate: rows.length ? rows.filter((row) => row.match.exact).length / rows.length : 0,
  normalizedExactRate: rows.length ? rows.filter((row) => row.match.normalizedExact).length / rows.length : 0,
  semanticRate: rows.length ? rows.filter((row) => row.match.semanticScore >= 0.65).length / rows.length : 0,
  blockedSafetyCount: rows.filter((row) => row.safety.blocked).length,
  failedCount: rows.filter((row) => !row.match.matched).length,
  delayMs: e2eDelayMs,
  rateLimitBackoffMs,
  maxRateLimitRetries,
  liveE2ECompleted: status.status === "completed",
  reason: status.reason ?? null,
};

ensureDir(traceOutput);
fs.writeFileSync(traceOutput, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
ensureDir(reportOutput);
fs.writeFileSync(reportOutput, JSON.stringify(summary, null, 2));
ensureDir(textOutput);
fs.writeFileSync(textOutput, `Live VedicQA E2E\nTotal: ${summary.total}\nCompleted: ${summary.liveE2ECompleted}\nReason: ${summary.reason ?? "none"}\nDelay: ${summary.delayMs} ms\nAccepted match rate: ${(summary.acceptedMatchRate * 100).toFixed(1)}%\nExact match rate: ${(summary.exactMatchRate * 100).toFixed(1)}%\nNormalized exact rate: ${(summary.normalizedExactRate * 100).toFixed(1)}%\n`);
console.log(JSON.stringify(summary, null, 2));
