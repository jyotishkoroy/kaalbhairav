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
import { buildAstroChartContext } from "@/lib/astro/chart-context";
import { buildNormalizedChartFacts } from "@/lib/astro/normalized-chart-facts";
import { sha256Canonical } from "@/lib/astro/hashing";
import { isE2ERateLimitDisabled, logE2ERateLimitDisabled } from "@/lib/security/e2e-rate-limit";
import { assertSameOriginRequest, checkRateLimit, getClientIp } from "@/lib/security/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const { data: activeProfile } = await service.from("birth_profiles").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!activeProfile) return NextResponse.json({ error: "setup_required", message: "Please complete birth profile setup first." }, { status: 404 });
  const chartResponse = await service.from("chart_json_versions").select("id, profile_id, chart_json, chart_version, created_at").eq("profile_id", activeProfile.id).order("chart_version", { ascending: false }).order("created_at", { ascending: false }).limit(10);
  let chartVersions = chartResponse && typeof chartResponse === "object" && "data" in chartResponse ? (chartResponse as { data?: unknown }).data : chartResponse;
  if ((!Array.isArray(chartVersions) && (!chartVersions || typeof chartVersions !== "object" || !("chart_json" in (chartVersions as Record<string, unknown>)))) && chartResponse && typeof chartResponse === "object" && "maybeSingle" in chartResponse && typeof (chartResponse as { maybeSingle?: () => Promise<{ data?: unknown }> }).maybeSingle === "function") {
    const single = await (chartResponse as { maybeSingle: () => Promise<{ data?: unknown }> }).maybeSingle();
    chartVersions = single?.data;
  }
  const chartRows = Array.isArray(chartVersions) ? chartVersions : chartVersions && typeof chartVersions === "object" ? [chartVersions as Record<string, unknown>] : [];
  const ranked = chartRows.map((row) => {
    const normalizedFacts = buildNormalizedChartFacts({ chartJson: (row as Record<string, unknown>).chart_json });
    const score = [normalizedFacts.lagnaSign, normalizedFacts.moonSign, normalizedFacts.sunSign, normalizedFacts.mahadasha].filter(Boolean).length;
    return { ...row, normalizedFacts, score };
  }).sort((a, b) => b.score - a.score || String((b as Record<string, unknown>).created_at ?? "").localeCompare(String((a as Record<string, unknown>).created_at ?? "")));
  const latestChart = ranked[0];
  if (!latestChart) return NextResponse.json({ answer: "aadesh: Your birth chart context is not ready yet. Please update your birth details once so Tarayai can calculate your chart before answering." });
  const { data: latestPredictionSummary } = await service.from("prediction_ready_summaries").select("id, chart_version_id, prediction_context, topic, created_at").eq("profile_id", activeProfile.id).eq("chart_version_id", (latestChart as Record<string, unknown>).id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const predictionContext = latestPredictionSummary && typeof latestPredictionSummary === "object" ? (latestPredictionSummary as Record<string, unknown>).prediction_context : undefined;
  const chartContext = buildAstroChartContext({ profileId: activeProfile.id, chartVersionId: String((latestChart as Record<string, unknown>).id), chartJson: (latestChart as Record<string, unknown>).chart_json, predictionSummary: predictionContext });
  if (process.env.ASTRO_DEBUG_CHART_CONTEXT === "true") {
    const chartJsonRecord = (latestChart as Record<string, unknown>).chart_json && typeof (latestChart as Record<string, unknown>).chart_json === "object" && !Array.isArray((latestChart as Record<string, unknown>).chart_json) ? (latestChart as Record<string, unknown>).chart_json as Record<string, unknown> : {};
    const chartVersionHash = sha256Canonical({ chartVersionId: String((latestChart as Record<string, unknown>).id), chartVersion: chartJsonRecord.metadata && typeof chartJsonRecord.metadata === "object" ? (chartJsonRecord.metadata as Record<string, unknown>).chart_version : null, inputHash: chartJsonRecord.metadata && typeof chartJsonRecord.metadata === "object" ? (chartJsonRecord.metadata as Record<string, unknown>).input_hash : null, settingsHash: chartJsonRecord.metadata && typeof chartJsonRecord.metadata === "object" ? (chartJsonRecord.metadata as Record<string, unknown>).settings_hash : null }).slice(0, 12);
    console.log("[astro_chart_context_debug]", { selectedBasis: chartContext.ready ? { lagnaSign: chartContext.normalizedFacts.lagnaSign ?? null, moonSign: chartContext.normalizedFacts.moonSign ?? null, moonHouse: chartContext.normalizedFacts.moonHouse ?? null, sunSign: chartContext.normalizedFacts.sunSign ?? null, sunHouse: chartContext.normalizedFacts.sunHouse ?? null, nakshatra: chartContext.normalizedFacts.nakshatra ?? null, mahadasha: chartContext.normalizedFacts.mahadasha ?? null } : null, warningsCount: chartContext.ready ? chartContext.normalizedFacts.warnings.length : 0, selectedSources: chartContext.ready ? chartContext.normalizedFacts.sourcePriority : [], chartVersionHash });
  }
  const result = await answerCanonicalAstroQuestion({ question, userId: user.id, profileId: activeProfile.id, chartVersionId: String((latestChart as Record<string, unknown>).id), chartJson: (latestChart as Record<string, unknown>).chart_json, predictionSummary: predictionContext, requestId });
  let answer = result.answer;
  if (quality.warnings.length > 0) answer = answer.startsWith("aadesh:") ? `${answer}\n\n${quality.warnings.join(" ")}` : `aadesh: ${quality.warnings.join(" ")} ${answer}`;
  return NextResponse.json({ answer });
}
