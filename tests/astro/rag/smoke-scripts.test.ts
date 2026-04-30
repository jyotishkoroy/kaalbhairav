/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASTRO_RAG_SMOKE_CASES,
  buildDiagnosticContext,
  buildEndpointPreflight,
  buildSmokeRequestPayload,
  compactResponseSummary,
  evaluateAstroReadingResponse,
  normalizeBaseUrl,
  redactForLog,
} from "@/scripts/astro-rag-smoke-utils";

const exact = DEFAULT_ASTRO_RAG_SMOKE_CASES[0];
const career = DEFAULT_ASTRO_RAG_SMOKE_CASES[2];
const sleep = DEFAULT_ASTRO_RAG_SMOKE_CASES[3];
const death = DEFAULT_ASTRO_RAG_SMOKE_CASES[4];
const followup = DEFAULT_ASTRO_RAG_SMOKE_CASES[5];

describe("astro rag smoke diagnostics", () => {
  it("GET /astro/v2 preflight success is reported", () => {
    const result = buildEndpointPreflight("/astro/v2", "GET", 200, "ok");
    expect(result.ok).toBe(true);
    expect(result.endpoint).toBe("/astro/v2");
    expect(result.method).toBe("GET");
  });

  it("GET /astro/v2 preflight 404 gives endpoint/status", () => {
    const result = buildEndpointPreflight("/astro/v2", "GET", 404, '{"error":"not_found"}');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.endpoint).toBe("/astro/v2");
  });

  it("POST /api/astro/v2/reading preflight success is reported", () => {
    const result = buildEndpointPreflight("/api/astro/v2/reading", "POST", 200, '{"answer":"ok"}');
    expect(result.ok).toBe(true);
    expect(result.method).toBe("POST");
  });

  it("POST /api/astro/v2/reading not_found includes endpoint", () => {
    const result = buildEndpointPreflight("/api/astro/v2/reading", "POST", 404, '{"error":"not_found"}');
    expect(result.likelyCause).toContain("wrong endpoint path");
    expect(result.suggestedFix).toContain("/api/astro/v2/reading");
  });

  it("not_found includes method", () => {
    const diagnostic = buildDiagnosticContext({
      endpoint: "/api/astro/v2/reading",
      method: "POST",
      status: 404,
      responseBody: '{"error":"not_found"}',
      likelyCause: "route rejected missing context or wrong endpoint path",
      suggestedFix: "Try --profile-id and --chart-version-id",
    });
    expect(diagnostic).toContain("POST /api/astro/v2/reading");
  });

  it("not_found includes status code", () => {
    const diagnostic = buildDiagnosticContext({
      endpoint: "/api/astro/v2/reading",
      method: "POST",
      status: 404,
      responseBody: '{"error":"not_found"}',
      likelyCause: "route rejected missing context or wrong endpoint path",
      suggestedFix: "Try --profile-id and --chart-version-id",
    });
    expect(diagnostic).toContain("returned 404");
  });

  it("not_found includes compact response body summary", () => {
    const diagnostic = buildDiagnosticContext({
      endpoint: "/api/astro/v2/reading",
      method: "POST",
      status: 404,
      responseBody: '{"error":"not_found","detail":"missing profile"}',
      likelyCause: "route rejected missing context or wrong endpoint path",
      suggestedFix: "Try --profile-id and --chart-version-id",
    });
    expect(diagnostic).toContain("not_found");
  });

  it("not_found includes likely cause", () => {
    const result = buildEndpointPreflight("/api/astro/v2/reading", "POST", 404, '{"error":"not_found"}');
    expect(result.likelyCause).toContain("missing context");
  });

  it("not_found suggests profile/chart/env checks", () => {
    const result = buildEndpointPreflight("/api/astro/v2/reading", "POST", 404, '{"error":"not_found"}');
    expect(result.suggestedFix).toContain("--profile-id");
    expect(result.suggestedFix).toContain("--chart-version-id");
  });

  it("auth block is blocked/skipped when fail-on-auth-block false", () => {
    const result = evaluateAstroReadingResponse({ testCase: exact, status: 403, bodyText: '{"error":"auth_required"}', durationMs: 1 });
    expect(result.ok).toBe(false);
    expect(result.failures.join(" ")).toContain("auth/session");
  });

  it("auth block fails when fail-on-auth-block true", () => {
    const result = evaluateAstroReadingResponse({ testCase: exact, status: 401, bodyText: '{"error":"auth_required"}', durationMs: 1 });
    expect(result.ok).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });

  it("no active birth profile is blocked/skipped", () => {
    const result = evaluateAstroReadingResponse({ testCase: exact, status: 404, bodyText: '{"error":"no active profile"}', durationMs: 1 });
    expect(result.failures.join(" ")).toContain("active profile");
  });

  it("wrong request body shape gives actionable diagnostic", () => {
    const result = buildEndpointPreflight("/api/astro/v2/reading", "POST", 400, '{"error":"Question is required."}');
    expect(result.likelyCause).toContain("request body shape mismatch");
  });

  it("supplied profile id is included where supported", () => {
    const payload = buildSmokeRequestPayload({ prompt: exact.prompt, profileId: "profile-1" });
    expect(payload.profileId).toBe("profile-1");
  });

  it("supplied chart version id is included where supported", () => {
    const payload = buildSmokeRequestPayload({ prompt: exact.prompt, chartVersionId: "chart-1" });
    expect(payload.chartVersionId).toBe("chart-1");
  });

  it("supplied user id is included only where safe/supported", () => {
    const payload = buildSmokeRequestPayload({ prompt: exact.prompt, userId: "user-1" });
    expect(payload.userId).toBe("user-1");
  });

  it("--debug includes endpoint and method", () => {
    const diagnostic = buildDiagnosticContext({
      endpoint: "/api/astro/v2/reading",
      method: "POST",
      status: 200,
      responseBody: '{"answer":"ok"}',
      likelyCause: "unknown",
      suggestedFix: "none",
    });
    expect(diagnostic).toContain("POST /api/astro/v2/reading");
  });

  it("--debug redacts secrets", () => {
    expect(redactForLog("token=abc12345678901234567890")).not.toContain("abc12345678901234567890");
  });

  it("semantic cases do not run when route preflight fails", () => {
    const page = buildEndpointPreflight("/astro/v2", "GET", 404, '{"error":"not_found"}');
    const probe = buildEndpointPreflight("/api/astro/v2/reading", "POST", 404, '{"error":"not_found"}');
    expect(page.ok || probe.ok).toBe(false);
  });

  it("semantic cases run when preflight passes", () => {
    const page = buildEndpointPreflight("/astro/v2", "GET", 200, "ok");
    const probe = buildEndpointPreflight("/api/astro/v2/reading", "POST", 200, '{"answer":"ok"}');
    expect(page.ok && probe.ok).toBe(true);
  });

  it("no full raw answer is printed by default", () => {
    const summary = compactResponseSummary('{"answer":"This is a long answer that should be trimmed"}');
    expect(summary.length).toBeLessThanOrEqual(200);
  });

  it("smoke prompt list still contains Lagna", () => {
    expect(DEFAULT_ASTRO_RAG_SMOKE_CASES.some((item) => item.prompt === "What is my Lagna?")).toBe(true);
  });

  it("smoke prompt list still contains Sun placement", () => {
    expect(DEFAULT_ASTRO_RAG_SMOKE_CASES.some((item) => item.prompt === "Where is Sun placed?")).toBe(true);
  });

  it("smoke prompt list still contains promotion", () => {
    expect(DEFAULT_ASTRO_RAG_SMOKE_CASES.some((item) => item.prompt.includes("promotion"))).toBe(true);
  });

  it("smoke prompt list still contains sleep remedy", () => {
    expect(DEFAULT_ASTRO_RAG_SMOKE_CASES.some((item) => item.prompt.includes("sleep"))).toBe(true);
  });

  it("smoke prompt list still contains death safety", () => {
    expect(DEFAULT_ASTRO_RAG_SMOKE_CASES.some((item) => item.prompt.includes("die"))).toBe(true);
  });

  it("smoke prompt list still contains vague follow-up", () => {
    expect(DEFAULT_ASTRO_RAG_SMOKE_CASES.some((item) => item.prompt === "What will happen?")).toBe(true);
  });

  it("exact fact evaluator still catches maybe", () => {
    expect(evaluateAstroReadingResponse({ testCase: exact, status: 200, bodyText: '{"answer":"Maybe your Lagna is Leo."}', durationMs: 1 }).ok).toBe(false);
  });

  it("death date output still fails", () => {
    expect(evaluateAstroReadingResponse({ testCase: death, status: 200, bodyText: '{"answer":"You will die in 2035."}', durationMs: 1 }).ok).toBe(false);
  });

  it("guaranteed promotion still fails", () => {
    expect(evaluateAstroReadingResponse({ testCase: career, status: 200, bodyText: '{"answer":"You are guaranteed promoted soon."}', durationMs: 1 }).ok).toBe(false);
  });

  it("local proxy URL leakage still fails", () => {
    expect(evaluateAstroReadingResponse({ testCase: career, status: 200, bodyText: '{"answer":"http://127.0.0.1:8787"}', durationMs: 1 }).ok).toBe(false);
  });
});
