/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { guardOneShotAstroQuestion } from "@/lib/astro/app/one-shot-question-guard";
import { analyzeQuestionQuality } from "@/lib/astro/app/question-quality";
import { answerCanonicalAstroQuestion } from "@/lib/astro/ask/answer-canonical-astro-question";
import { loadCurrentAstroChartForUser } from "@/lib/astro/current-chart-version";
import { buildPublicChartFacts, validatePublicChartFacts, sanitizeVisibleAstroAnswer } from "@/lib/astro/public-chart-facts";
import { extractChartFactsFromVersion } from "@/lib/astro/rag/chart-fact-extractor";
import { answerExactFactIfPossible } from "@/lib/astro/rag/exact-fact-router";
import { isE2ERateLimitDisabled, logE2ERateLimitDisabled } from "@/lib/security/e2e-rate-limit";
import { assertSameOriginRequest, checkRateLimit, getClientIp } from "@/lib/security/request-guards";
import { answerExactFactFromPublicFacts } from "@/lib/astro/exact-chart-facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function looksLikeExactAstroQuestion(question: string): boolean {
  return /\b(lagna|ascendant|moon sign|sun sign|nakshatra|pada|mahadasha|antardasha|which house|what house|house is my|what is my moon|what is my sun|what is my nakshatra|what is my current dasha)\b/i.test(question);
}

function getChartJsonFromCurrentChartResult(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== "object") return null;
  const maybe = result as { chartVersion?: unknown };
  if (!maybe.chartVersion || typeof maybe.chartVersion !== "object") return null;
  const chartVersion = maybe.chartVersion as { chart_json?: unknown };
  return chartVersion.chart_json && typeof chartVersion.chart_json === "object"
    ? (chartVersion.chart_json as Record<string, unknown>)
    : null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const originCheck = assertSameOriginRequest(req as unknown as Request);
  if (!originCheck.ok) return NextResponse.json({ error: originCheck.error }, { status: originCheck.status });
  if (!isE2ERateLimitDisabled()) {
    const rl = checkRateLimit(`ask:${user.id}`, 10, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "rate_limited", retryAfterSeconds: rl.retryAfterSeconds }, { status: 429 });
    const ip = getClientIp(req as unknown as Request);
    const rlIp = checkRateLimit(`ask-ip:${ip}`, 20, 60_000);
    if (!rlIp.ok) return NextResponse.json({ error: "rate_limited", retryAfterSeconds: rlIp.retryAfterSeconds }, { status: 429 });
  } else {
    logE2ERateLimitDisabled("/api/astro/ask", "ask-user-and-ip");
  }
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const raw = body as Record<string, unknown>;
  const questionRaw = typeof raw.question === "string" ? raw.question : "";
  const requestId = typeof raw.requestId === "string" ? raw.requestId.slice(0, 120) : undefined;
  if (questionRaw.length > 2000) return NextResponse.json({ answer: "aadesh: Your question is too long. Please ask one focused question." });
  const guard = guardOneShotAstroQuestion(questionRaw);
  if (!guard.allowed) return NextResponse.json({ answer: guard.answer }, { status: 200 });
  const quality = analyzeQuestionQuality(guard.normalizedQuestion);
  const question = quality.normalizedQuestion;
  const service = createServiceClient();

  // Load current chart using priority-based selection (not just latest)
  const loaded = await loadCurrentAstroChartForUser({
    service,
    userId: user.id,
    options: { mode: "strict_user_runtime" },
  });
  if (!loaded.ok) {
    if (loaded.error === "chart_not_ready" || loaded.error === "setup_required") {
      return NextResponse.json({ answer: loaded.message });
    }
    return NextResponse.json({ error: loaded.error, message: loaded.message }, { status: loaded.status });
  }

  const chartJson = getChartJsonFromCurrentChartResult(loaded);
  if (!chartJson) {
    return NextResponse.json({
      answer: "aadesh: Your current chart is saved, but the structured chart facts are unavailable. Please recalculate once before asking exact chart questions.",
    });
  }

  const predictionContext = loaded.predictionSummary && typeof loaded.predictionSummary === "object"
    ? ((loaded.predictionSummary as Record<string, unknown>).prediction_context ?? loaded.predictionSummary)
    : undefined;

  const publicFacts = buildPublicChartFacts({
    profileId: String(loaded.profile.id),
    chartVersionId: String(loaded.chartVersion.id),
    chartJson: loaded.chartVersion.chart_json,
    predictionSummary: predictionContext,
    now: new Date(),
  });

  const exactFactPublic = answerExactFactFromPublicFacts(question, publicFacts);
  if (exactFactPublic.matched) {
    return NextResponse.json({ answer: exactFactPublic.answer });
  }

  const chartFacts = extractChartFactsFromVersion(chartJson, {
    userId: user.id,
    profileId: String(loaded.profile.id),
    chartVersionId: String(loaded.chartVersion.id),
  });
  if (looksLikeExactAstroQuestion(question)) {
    const exactFactAnswer = answerExactFactIfPossible(question, chartFacts);
    if (exactFactAnswer?.answer) {
      return NextResponse.json({
        answer: exactFactAnswer.answer,
      });
    }
  }

  if (process.env.ASTRO_DEBUG_CHART_CONTEXT === "true") {
    console.log("[astro_chart_context_debug]", { route: "/api/astro/ask", lagnaSign: publicFacts.lagnaSign, moonSign: publicFacts.moonSign, moonHouse: publicFacts.moonHouse, sunSign: publicFacts.sunSign, sunHouse: publicFacts.sunHouse, nakshatra: publicFacts.nakshatra, mahadasha: publicFacts.mahadasha, confidence: publicFacts.confidence, warnings: publicFacts.warnings });
  }

  const validation = validatePublicChartFacts(publicFacts);
  if (!validation.ok) {
    return NextResponse.json({
      answer: "aadesh: Your birth chart context needs to be recalculated before I can answer reliably. Please update your birth details once and try again.",
      ...(process.env.ASTRO_DEBUG_CHART_CONTEXT === "true" ? { meta: { missing: validation.missing, contradictions: validation.contradictions } } : {}),
    });
  }

  const result = await answerCanonicalAstroQuestion({
    question,
    userId: user.id,
    profileId: String(loaded.profile.id),
    chartVersionId: String(loaded.chartVersion.id),
    chartJson: loaded.chartVersion.chart_json,
    predictionSummary: predictionContext,
    publicChartFacts: publicFacts,
    requestId,
  });

  let answer = result.answer;
  if (quality.warnings.length > 0) {
    answer = answer.startsWith("aadesh:") ? `${answer}\n\n${quality.warnings.join(" ")}` : `aadesh: ${quality.warnings.join(" ")} ${answer}`;
  }
  answer = sanitizeVisibleAstroAnswer(answer);
  return NextResponse.json({ answer });
}
