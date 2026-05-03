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
import { findAstroPage, hasStorageState, isAstroUrl, resolveCdpFinalStatus, resolveCdpUrl, resolveLiveUrl, resolveStorageStatePath, shouldRequireStorageState, useCdpMode as getUseCdpMode } from "./run-vedicqa-live-e2e.helpers.ts";

const inputPath = process.env.VEDICQA_INPUT ?? "vedicQA.md";
const limit = Number(process.env.VEDICQA_LIMIT ?? "30");
const liveUrl = resolveLiveUrl();
const delayMs = Number(process.env.VEDICQA_E2E_DELAY_MS ?? "100");
const questionTimeoutMs = Number(process.env.VEDICQA_E2E_QUESTION_TIMEOUT_MS ?? "45000");
const idleTimeoutMs = Number(process.env.VEDICQA_E2E_IDLE_TIMEOUT_MS ?? "90000");
const maxConsecutiveFailures = Number(process.env.VEDICQA_E2E_MAX_CONSECUTIVE_FAILURES ?? "10");
const rateLimitBackoffMs = Number(process.env.VEDICQA_E2E_RATE_LIMIT_BACKOFF_MS ?? "5000");
const maxRateLimitRetries = Number(process.env.VEDICQA_E2E_MAX_RATE_LIMIT_RETRIES ?? "3");
const traceOutput = process.env.VEDICQA_TRACE_OUTPUT ?? "artifacts/vedicqa-live-e2e-trace.jsonl";
const reportOutput = process.env.VEDICQA_OUTPUT ?? "artifacts/vedicqa-live-e2e-report.json";
const textOutput = process.env.VEDICQA_TEXT_OUTPUT ?? "artifacts/vedicqa-live-e2e-summary.md";
const screenshotDir = process.env.VEDICQA_SCREENSHOT_DIR ?? "artifacts/vedicqa-live-screenshots";
const resumeFrom = Number(process.env.VEDICQA_E2E_RESUME_FROM ?? "1");
const useCdp = getUseCdpMode();
const items = loadVedicQA(inputPath).slice(0, Number.isFinite(limit) ? limit : 30);
const runId = hashText(`${inputPath}:${liveUrl}:${new Date().toISOString()}`);
const rows: E2ETraceRow[] = [];
const pageEvents: Array<{ method: string; url: string; status?: number; requestBody?: unknown; responseBody?: unknown }> = [];
let lastActivity = Date.now();

function ensureDir(filePath: string): void { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }
function rotateReport(filePath: string): void { if (fs.existsSync(filePath)) fs.renameSync(filePath, `${filePath}.previous`); }
function writeArtifacts(summary: Record<string, unknown>): void {
  ensureDir(traceOutput); fs.writeFileSync(traceOutput, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
  ensureDir(reportOutput); fs.writeFileSync(reportOutput, JSON.stringify(summary, null, 2));
  ensureDir(textOutput); fs.writeFileSync(textOutput, `Live VedicQA E2E\nRun ID: ${runId}\nTotal: ${(summary.total as number) ?? 0}\nCompleted: ${summary.liveE2ECompleted}\nReason: ${summary.reason ?? "none"}\nAccepted match rate: ${(((summary.acceptedMatchRate as number) ?? 0) * 100).toFixed(1)}%\nExact match rate: ${(((summary.exactMatchRate as number) ?? 0) * 100).toFixed(1)}%\nNormalized exact rate: ${(((summary.normalizedExactRate as number) ?? 0) * 100).toFixed(1)}%\n`);
}
function isRateLimited(text: string): boolean { return /rate[_ -]?limited|too many requests|429\b/i.test(text); }
async function recordAskNetwork(page: Page): Promise<void> {
  page.on("request", (request) => { if (request.url().includes("/api/astro/ask")) { pageEvents.push({ method: request.method(), url: request.url(), requestBody: request.postDataJSON?.() }); lastActivity = Date.now(); } });
  page.on("response", async (response) => { if (response.url().includes("/api/astro/ask")) { let responseBody: unknown = null; try { responseBody = await response.json(); } catch { responseBody = null; } const last = pageEvents[pageEvents.length - 1]; if (last && last.url === response.url()) { last.status = response.status(); last.responseBody = responseBody; } else { pageEvents.push({ method: "GET", url: response.url(), status: response.status(), responseBody }); } lastActivity = Date.now(); } });
}
async function waitForAskUi(page: Page): Promise<void> { await page.getByText(/Ask Guru/i).first().waitFor({ timeout: 30000 }); await page.locator("textarea").first().waitFor({ timeout: 30000 }); }
async function extractAadeshAnswer(page: Page): Promise<string> {
  const candidates = [page.getByText(/^aadesh:/i).first(), page.locator("main").getByText(/^aadesh:/i).first(), page.locator("textarea").first()];
  for (const candidate of candidates) { try { const text = await candidate.textContent({ timeout: 2500 }); if (text?.trim()) return text.trim(); } catch { /* keep trying */ } }
  const bodyText = await page.textContent("body");
  return bodyText?.match(/aadesh:[\s\S]*$/i)?.[0].trim() ?? "";
}
async function submitQuestion(page: Page, question: string): Promise<void> { const textarea = page.locator("textarea").first(); await textarea.fill(""); await textarea.fill(question); const askButton = page.getByRole("button", { name: /^(ask|ask guru|submit)$/i }).first(); if (await askButton.count()) await askButton.click(); else await textarea.press("Enter"); }
async function getLivePage(context: BrowserContext, current?: Page): Promise<Page> { if (current && !current.isClosed()) return current; const page = findAstroPage(context) ?? await context.newPage(); if (!isAstroUrl(page.url())) await page.goto(liveUrl, { waitUntil: "domcontentloaded" }); return page; }
async function runQuestion(page: Page, question: string): Promise<{ actual: string; notes: string[]; networkEvents: SanitizedNetworkEvent[]; rateLimited: boolean; status: "pass" | "fail" | "timeout" }> {
  const notes: string[] = []; const networkEvents: SanitizedNetworkEvent[] = []; const beforeCount = pageEvents.length; const beforeAnswer = await extractAadeshAnswer(page); const start = Date.now();
  await submitQuestion(page, question);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/astro/ask"), { timeout: questionTimeoutMs }).catch(() => null);
  const answerPromise = page.waitForFunction((prev) => {
    const text = document.body.innerText || ""; return /aadesh:/i.test(text) && text.trim() !== prev;
  }, beforeAnswer, { timeout: questionTimeoutMs }).catch(() => null);
  const outcome = await Promise.race([responsePromise, answerPromise, page.waitForTimeout(questionTimeoutMs).then(() => "timeout" as const)]);
  let actual = await extractAadeshAnswer(page);
  if (outcome && outcome !== "timeout") notes.push("answer_changed");
  if (!actual) {
    const response = await responsePromise;
    const json = response ? await response.json().catch(() => null) : null;
    if (json && typeof json === "object" && typeof (json as Record<string, unknown>).answer === "string") { actual = String((json as Record<string, unknown>).answer); notes.push("ui_stale_response_used"); }
  }
  const delta = pageEvents.splice(beforeCount).map((event) => sanitizeEvent({ method: event.method, url: event.url, status: event.status, requestBody: event.requestBody, responseBody: event.responseBody, latencyMs: Date.now() - start }));
  networkEvents.push(...delta);
  const rateLimited = isRateLimited(actual);
  if (outcome === "timeout" || !actual) return { actual: actual || "aadesh: answer_timeout", notes, networkEvents, rateLimited, status: "timeout" };
  const score = scoreAnswerMatch({ actual, expected: question });
  return { actual, notes, networkEvents, rateLimited, status: score.matched ? "pass" : "fail" };
}
async function run(): Promise<{ status: "completed" | "blocked" | "partial"; reason?: string; browser?: Browser; context?: BrowserContext; page?: Page }> {
  const storageState = resolveStorageStatePath();
  if (shouldRequireStorageState() && !hasStorageState(storageState)) return { status: "blocked", reason: "missing_storage_state" };
  let browser: Browser | undefined; let context: BrowserContext | undefined; let page: Page | undefined;
  try {
    if (useCdp) {
      browser = await chromium.connectOverCDP(resolveCdpUrl());
      context = browser.contexts()[0];
      if (!context) return { status: "blocked", reason: "cdp_no_context" };
      page = await getLivePage(context);
      await page.goto(liveUrl, { waitUntil: "domcontentloaded" });
      const cdpStatus = resolveCdpFinalStatus(page.url());
      if (cdpStatus) return { status: "blocked", reason: cdpStatus.reason };
    } else {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({ storageState: hasStorageState(storageState) ? storageState : undefined, viewport: { width: 1440, height: 1200 } });
      page = await context.newPage();
      await page.goto(liveUrl, { waitUntil: "networkidle", timeout: 60000 });
    }
    if (!page || !context) return { status: "blocked", reason: "no_page" };
    await recordAskNetwork(page);
    await waitForAskUi(page);
    const visitedUrls = [page.url()];
    const blocker = visitedUrls.some((url) => /\/sign-in|\/login/i.test(url)) ? "login_loop" : !visitedUrls.some((url) => /\/astro/i.test(url)) ? "not_reached" : null;
    if (blocker) return { status: "blocked", reason: blocker };
    ensureDir(path.join(screenshotDir, "initial.png")); await page.screenshot({ path: path.join(screenshotDir, "initial.png"), fullPage: true });
    let consecutiveFailures = 0;
    for (let index = Math.max(0, resumeFrom - 1); index < items.length; index += 1) {
      if (Date.now() - lastActivity > idleTimeoutMs) return { status: "partial", reason: "idle_timeout", browser, context, page };
      page = await getLivePage(context, page);
      if (!page.isClosed()) { try { await page.bringToFront(); } catch { /* ignore */ } }
      const item = items[index];
      const result = await runQuestion(page, item.question);
      const score = scoreAnswerMatch({ actual: result.actual, expected: item.expectedAnswer });
      const row: E2ETraceRow = { timestamp: new Date().toISOString(), runId, questionId: item.id, question: item.question, expectedAnswerHash: hashText(item.expectedAnswer), expectedAnswerExcerpt: excerptText(item.expectedAnswer), pageUrl: sanitizeUrlPath(page.url()), network: result.networkEvents, actualAnswer: result.actual, match: score, safety: { blocked: result.rateLimited, reason: result.rateLimited ? "rate_limited" : null }, providers: { groqObserved: "unknown", ollamaObserved: "unknown", supabaseObserved: "production-via-app" }, notes: result.notes };
      assertNoSecretLeaks(JSON.stringify(row));
      rows.push(row);
      consecutiveFailures = score.matched ? 0 : consecutiveFailures + 1;
      console.log(`q=${index + 1} status=${result.status} score=${score.semanticScore.toFixed(2)} latencyMs=${Math.max(0, Date.now() - lastActivity)}`);
      if (result.status === "timeout") return { status: "partial", reason: "answer_timeout", browser, context, page };
      if (consecutiveFailures >= maxConsecutiveFailures) return { status: "partial", reason: "max_consecutive_failures", browser, context, page };
      if (delayMs > 0) await page.waitForTimeout(delayMs);
    }
    return { status: "completed", browser, context, page };
  } catch (error) {
    return { status: "partial", reason: error instanceof Error ? error.message : String(error), browser, context, page };
  }
}

rotateReport(reportOutput);
const status = await run();
const summary = { runId, timestamp: new Date().toISOString(), total: items.length, completedQuestionCount: rows.length, passed: rows.filter((row) => row.match.matched).length, acceptedMatchRate: rows.length ? rows.filter((row) => row.match.matched).length / rows.length : 0, exactMatchRate: rows.length ? rows.filter((row) => row.match.exact).length / rows.length : 0, normalizedExactRate: rows.length ? rows.filter((row) => row.match.normalizedExact).length / rows.length : 0, semanticRate: rows.length ? rows.filter((row) => row.match.semanticScore >= 0.65).length / rows.length : 0, blockedSafetyCount: rows.filter((row) => row.safety.blocked).length, failedCount: rows.filter((row) => !row.match.matched).length, delayMs, rateLimitBackoffMs, maxRateLimitRetries, liveE2ECompleted: status.status === "completed", reason: status.reason ?? null };
writeArtifacts(summary);
if (status.browser) { await status.context?.close().catch(() => undefined); if (!useCdp) await status.browser.close().catch(() => undefined); }
console.log(JSON.stringify(summary, null, 2));
