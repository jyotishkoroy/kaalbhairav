/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextResponse } from "next/server";
import {
  resolveConsultationFeatureFlags,
  runConsultationProductionWrapper,
  type ConsultationProductionWrapperInput,
} from "@/lib/astro/consultation";
import {
  createAstroE2ETrace,
  sanitizeTraceForResponse,
  shouldExposeAstroE2ETrace,
} from "@/lib/astro/e2e/trace";
import {
  ragReadingOrchestrator,
  type RagReadingOrchestratorInput,
  type RagReadingOrchestratorResult,
} from "@/lib/astro/rag/rag-reading-orchestrator";
import { getAstroRagFlags } from "@/lib/astro/rag/feature-flags";
import { routeAstroRagRequest } from "@/lib/astro/rag/rag-routing";
import type { ChartEvidence } from "@/lib/astro/consultation/chart-evidence-builder";
import { generateReadingV2 } from "@/lib/astro/reading/reading-orchestrator-v2";
import type { ReadingMode } from "@/lib/astro/reading/reading-types";
import { buildDomainAwareCompanionAnswer } from "@/lib/astro/rag/domain-aware-companion-answer";

type AstroV2ReadingRequestBody = {
  question?: unknown;
  message?: unknown;
  mode?: unknown;
  birthDetails?: unknown;
  metadata?: unknown;
  userId?: unknown;
  sessionId?: unknown;
  chart?: unknown;
  context?: unknown;
  dasha?: unknown;
  transits?: unknown;
  chartContext?: unknown;
  deterministicChartFacts?: unknown;
  predictionSummary?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function readString(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function readNumber(value: unknown): number | undefined { if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value === "string" && value.trim()) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; } return undefined; }
function readMode(value: unknown): ReadingMode { const allowed: ReadingMode[] = ["short_comfort", "practical_guidance", "timing_prediction", "remedy_focused", "deep_astrology", "human_conversation"]; return typeof value === "string" && allowed.includes(value as ReadingMode) ? (value as ReadingMode) : "practical_guidance"; }
function removeUndefinedFields<T extends Record<string, unknown>>(value: T): Partial<T> { return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)) as Partial<T>; }

const SAFE_SECTION_KEYS = ["safety_response", "direct_answer", "chart_basis", "reasoning", "timing", "what_to_do", "safe_remedies", "accuracy", "limitations", "suggested_follow_up"] as const;
const UNSAFE_SECTION_PATTERNS = ["debug", "artifact", "artifacts", "env", "secret", "raw", "payload", "supabase", "groq", "ollama", "token", "key", "password", "credential", "url", "endpoint", "proxy", "header", "cookie"];
const SAFE_META_KEYS = ["engine", "ragEnabled", "exactFactAnswered", "safetyGatePassed", "safetyBlocked", "followupAsked", "fallbackUsed", "validationPassed", "groqUsed", "groqRetryUsed", "ollamaCriticUsed", "deterministicAnalyzerUsed", "timingsAvailable"] as const;
function normalizeSections(value: unknown): Record<string, string> | undefined { if (!isRecord(value)) return undefined; const sections = Object.fromEntries(Object.entries(value).filter(([key, sectionValue]) => { const lower = key.toLowerCase(); if (UNSAFE_SECTION_PATTERNS.some((pattern) => lower.includes(pattern))) return false; return SAFE_SECTION_KEYS.includes(key as never) && typeof sectionValue === "string" && sectionValue.trim().length > 0; }).map(([key, sectionValue]) => [key, (sectionValue as string).trim()])); return Object.keys(sections).length ? sections : undefined; }
function normalizeMeta(value: unknown): Record<string, unknown> | undefined { if (!isRecord(value)) return undefined; const meta = Object.fromEntries(SAFE_META_KEYS.map((key) => [key, value[key]]).filter(([, fieldValue]) => fieldValue !== undefined)); return Object.keys(meta).length ? meta : undefined; }
function parseBirthDetails(value: unknown) { if (!isRecord(value)) return undefined; const latitude = readNumber(value.latitude); const longitude = readNumber(value.longitude); return removeUndefinedFields({ dateOfBirth: readString(value.dateOfBirth), timeOfBirth: readString(value.timeOfBirth), placeOfBirth: readString(value.placeOfBirth), latitude, longitude, timezone: readString(value.timezone) }); }
function parseMetadata(value: unknown): Record<string, unknown> | undefined { if (!isRecord(value)) return undefined; return removeUndefinedFields({ ...value }); }
function parseChartContext(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
type AstroV2ReadingDependencies = { oldRoute: typeof generateReadingV2; ragOrchestrator: typeof ragReadingOrchestrator; flags: typeof getAstroRagFlags; };
type AstroV2ReadingResponse = { answer: string; followUpQuestion?: string | null; followUpAnswer?: string | null; sections?: Record<string, string>; meta?: Record<string, unknown>; } | { error: string; code?: string; meta?: Record<string, unknown>; };
function getRequestContext(body: AstroV2ReadingRequestBody) { const metadata = parseMetadata(body.metadata); const userId = readString(body.userId); const sessionId = readString(body.sessionId) ?? readString(metadata?.sessionId); return { metadata, userId: userId ?? sessionId ?? "astro-v2-page-anonymous", sessionId, chartVersionId: readString((body as Record<string, unknown>).chartVersionId), profileId: readString((body as Record<string, unknown>).profileId) ?? readString(metadata?.profileId) }; }
function shouldUseRagReadingRoute(flags: ReturnType<typeof getAstroRagFlags>, question: string): boolean { if (!flags.ragEnabled) return false; if (!question.trim()) return false; return true; }
function shouldUseDomainAwareCompanionFallback(): boolean {
  return process.env.ASTRO_DOMAIN_AWARE_COMPANION_ENABLED === "true";
}
function parseConsultationChartEvidence(value: unknown) {
  if (!isRecord(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.supportiveFactors) || !Array.isArray(candidate.challengingFactors) || !Array.isArray(candidate.neutralFacts)) return undefined;
  return {
    domain: typeof candidate.domain === "string" ? candidate.domain : "general",
    supportiveFactors: candidate.supportiveFactors,
    challengingFactors: candidate.challengingFactors,
    neutralFacts: candidate.neutralFacts,
    birthTimeSensitivity: candidate.birthTimeSensitivity === "low" || candidate.birthTimeSensitivity === "medium" || candidate.birthTimeSensitivity === "high" ? candidate.birthTimeSensitivity : "low",
  } as ChartEvidence;
}
type OneShotFlags = { oneShot?: boolean; disableFollowUps?: boolean; disableMemory?: boolean };
function parseOneShotFlags(body: AstroV2ReadingRequestBody): OneShotFlags {
  const meta = isRecord(body.metadata) ? body.metadata : {};
  const root = body as Record<string, unknown>;
  return {
    oneShot: Boolean(meta.oneShot ?? root.oneShot),
    disableFollowUps: Boolean(meta.disableFollowUps ?? root.disableFollowUps),
    disableMemory: Boolean(meta.disableMemory ?? root.disableMemory),
  };
}
function normalizeRagRouteResponse(result: RagReadingOrchestratorResult, existingMeta: Record<string, unknown> | undefined, flags?: OneShotFlags): AstroV2ReadingResponse {
  const answer = typeof result.answer === "string" ? result.answer.trim() : "";
  const safeMeta: Record<string, unknown> = { ...(normalizeMeta(existingMeta) ?? {}), ...(normalizeMeta(result.meta) ?? {}), rag: { status: result.status, exactFactAnswered: result.meta.exactFactAnswered, safetyBlocked: result.meta.safetyBlocked, followupAsked: flags?.disableFollowUps ? false : result.meta.followupAsked, fallbackUsed: result.meta.fallbackUsed, }, };
  if (flags?.disableFollowUps || flags?.oneShot) {
    const sections = normalizeSections(result.sections);
    const filteredSections = sections ? Object.fromEntries(Object.entries(sections).filter(([k]) => k !== 'suggested_follow_up')) : undefined;
    return { answer, followUpQuestion: null, followUpAnswer: null, sections: filteredSections, meta: safeMeta };
  }
  return { answer, followUpQuestion: result.followUpQuestion, followUpAnswer: result.followUpAnswer, sections: normalizeSections(result.sections), meta: safeMeta };
}
function shouldFallbackToOldV2FromRagResult(result: RagReadingOrchestratorResult | undefined): boolean { if (!result) return true; if (typeof result.answer !== "string" || !result.answer.trim()) return true; if (result.meta?.engine === "fallback" && result.status === "fallback") return true; return false; }

const KNOWN_GENERIC_FALLBACK_PHRASES = [
  "This is not about forcing certainty",
  "Pick one area first",
  "Please clarify career, relationship, money",
  "I cannot answer that safely right now",
  "Some required chart facts are still missing",
  "Missing facts:",
  "The full generated answer is temporarily unavailable",
  "The generated answer did not pass grounding checks",
  "No grounded timing source exists here",
  "I can answer this as an exact chart fact once",
];

function isGenericFallbackAnswer(answer: string): boolean {
  const a = answer.trim();
  return KNOWN_GENERIC_FALLBACK_PHRASES.some(phrase => a.startsWith(phrase) || a.includes(phrase));
}

const COMPANION_MODE_PATTERNS = [
  /\bwhy (do|does|am|is|are|did|can|can't|cannot|should|would)\b/i,
  /\bhow (do|does|can|should|would|to)\b/i,
  /\bwhat (does|should|can|is|are|if)\b/i,
  /\b(feel|feeling|felt)\b/i,
  /\b(scared|afraid|worried|anxious|nervous|sad|angry|frustrated|confused|lost|stuck|overwhelmed|hopeless|helpless)\b/i,
  /\b(should i|can i|will i|am i|is it|does it)\b/i,
  /\b(relationship|partner|family|career|job|money|health|future|life|decision|choice)\b/i,
  /\b(help|advice|guidance|insight|understand|explain|tell me)\b/i,
];
const EXACT_FACT_PATTERNS = [
  /\b(lagna|ascendant|rashi|nakshatra|dasha|antardasha|house|planet|degree|transit|mahadasha)\b/i,
  /\b(what is my (lagna|ascendant|moon sign|sun sign|rashi|nakshatra))\b/i,
  /\b(which (house|planet|sign))\b/i,
  /\b(current (dasha|antardasha|mahadasha|period))\b/i,
];
function inferQuestionMode(question: string): "companion" | "exact_fact" {
  const q = question.trim();
  for (const p of EXACT_FACT_PATTERNS) { if (p.test(q)) return "exact_fact"; }
  for (const p of COMPANION_MODE_PATTERNS) { if (p.test(q)) return "companion"; }
  return "companion";
}

export async function handleAstroV2ReadingRequest(request: Request, deps: Partial<AstroV2ReadingDependencies> = {}): Promise<Response> {
  let body: AstroV2ReadingRequestBody;
  try { body = (await request.json()) as AstroV2ReadingRequestBody; } catch { return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 }); }
  const question = readString(body.question) ?? readString(body.message);
  if (!question) return NextResponse.json({ error: "Question is required." }, { status: 400 });
  const oneShotFlags = parseOneShotFlags(body);
  const context = getRequestContext(body);
  const birthDetails = parseBirthDetails(body.birthDetails);
  const metadata = context.metadata;
  const consultationFlags = resolveConsultationFeatureFlags(process.env as never);
  const consultationChartEvidence = parseConsultationChartEvidence(body.chart);
  const groundedChartContext = parseChartContext(body.chartContext);
  const consultationResult = runConsultationProductionWrapper({
    userQuestion: question,
    message: readString(body.message),
    sessionId: context.sessionId,
    requestMode: readString(body.mode),
    chartEvidence: consultationChartEvidence,
    featureFlags: consultationFlags,
    chartContext: groundedChartContext,
  } as ConsultationProductionWrapperInput & { chartContext?: string });
  if (!consultationResult.shouldUseFallback && consultationResult.answer && !isGenericFallbackAnswer(consultationResult.answer)) {
    const responseMeta: Record<string, unknown> = {
      source: "astro-v2-page",
      directV2Route: true,
      consultationEngine: true,
      ...metadata,
    };
    return NextResponse.json({
      answer: consultationResult.answer,
      meta: responseMeta,
    });
  }
  if (consultationResult.shouldUseFallback || !consultationResult.answer || isGenericFallbackAnswer(consultationResult.answer)) {
    const inferredMode = inferQuestionMode(question);
    if (inferredMode === "companion" && shouldUseDomainAwareCompanionFallback()) {
      const domainResult = buildDomainAwareCompanionAnswer({ question, mode: "companion" });
      if (domainResult?.answer && domainResult.answer.trim().length > 100) {
        return NextResponse.json({
          answer: domainResult.answer,
          meta: {
            source: "astro-v2-page",
            directV2Route: true,
            engine: "domain_aware_companion",
            domain: domainResult.domain,
            ...metadata,
          },
        });
      }
    }
  }
  const trace = createAstroE2ETrace();
  const exposeTrace = shouldExposeAstroE2ETrace({
    isProduction: process.env.NODE_ENV === "production",
    envEnabled: process.env.ASTRO_E2E_TRACE_ENABLED === "true",
    metadataDebugTrace: metadata?.debugTrace,
    headerDebugTrace: request.headers.get("x-tarayai-debug-trace"),
  });
  const flags = (deps.flags ?? getAstroRagFlags)(process.env);
  const routeDecision = routeAstroRagRequest({
    question,
    userId: context.userId,
    flags,
    routingEnabled: Boolean(flags.routingEnabled),
  });
  const ragBranchEnabled = routeDecision.kind === "rag" && shouldUseRagReadingRoute(flags, question);
  const deterministicChartFacts = isRecord(body.deterministicChartFacts) ? body.deterministicChartFacts as Record<string, unknown> : undefined;
  const chartContextText = groundedChartContext ?? (typeof body.chartContext === "string" ? body.chartContext : undefined);
  const groundedInstruction = (oneShotFlags.oneShot || chartContextText)
    ? "Use the supplied deterministic chart facts as the only source for exact natal facts. Do not invent chart facts. If a requested chart fact is missing, say it is unavailable. Give interpretation using chart basis, and avoid unsupported timing certainty."
    : undefined;
  const ragInput = { question, userId: context.userId, profileId: context.profileId ?? undefined, chartVersionId: context.chartVersionId ?? undefined, env: process.env, explicitUserDates: Array.isArray((body as Record<string, unknown>).explicitUserDates) ? ((body as Record<string, unknown>).explicitUserDates as NonNullable<RagReadingOrchestratorInput["explicitUserDates"]>) : undefined, memorySummary: (oneShotFlags.disableMemory || oneShotFlags.oneShot) ? undefined : readString(metadata?.memorySummary), chartContext: chartContextText, deterministicChartFacts, groundingInstruction: groundedInstruction } as Partial<RagReadingOrchestratorInput> & { chartContext?: string; deterministicChartFacts?: Record<string, unknown>; groundingInstruction?: string };
  try {
    if (ragBranchEnabled) {
      try { const ragResult = await (deps.ragOrchestrator ?? ragReadingOrchestrator)(ragInput); if (!shouldFallbackToOldV2FromRagResult(ragResult)) return NextResponse.json(normalizeRagRouteResponse(ragResult, { source: "astro-v2-page", directV2Route: true, sessionId: context.sessionId, ...metadata }, oneShotFlags)); console.error("Astro V2 reading route falling back to old path after rag result"); } catch (error) { console.error("Astro V2 reading route rag branch failed, falling back to old path", error); }
    }
    const result = await (deps.oldRoute ?? generateReadingV2)({ userId: context.userId, question, mode: readMode(body.mode), birthDetails: birthDetails as | { dateOfBirth?: string; timeOfBirth?: string; placeOfBirth?: string; latitude?: number; longitude?: number; timezone?: string; } | undefined, chart: isRecord(body.chart) ? body.chart : undefined, context: isRecord(body.context) ? body.context : undefined, dasha: isRecord(body.dasha) ? body.dasha : undefined, transits: isRecord(body.transits) ? body.transits : undefined, metadata: { source: "astro-v2-page", directV2Route: true, sessionId: context.sessionId, ...metadata, requireChartGrounding: Boolean(chartContextText) }, }, { trace, exposeTrace });
    const responseMeta: Record<string, unknown> = { ...result.meta, source: "astro-v2-page", directV2Route: true };
    if (exposeTrace) responseMeta.e2eTrace = sanitizeTraceForResponse(trace);
    trace.response.debugTraceExposed = exposeTrace;
    if (oneShotFlags.disableFollowUps || oneShotFlags.oneShot) {
      const sections = normalizeSections((result as { sections?: unknown }).sections);
      const filteredSections = sections ? Object.fromEntries(Object.entries(sections).filter(([k]) => k !== 'suggested_follow_up')) : undefined;
      const rawOneShotAnswer = typeof result.answer === "string" ? result.answer.trim() : "";
      // Never prefix raw chartContextText — use only safe public basis from metadata
      const publicChartBasis = typeof (metadata as Record<string, unknown>)?.publicChartBasis === "string" ? (metadata as Record<string, unknown>).publicChartBasis as string : undefined;
      function prefixSafe(ans: string): string {
        const clean = ans.replace(/Retrieval cue:[\s\S]*?(?=\n\n|\n[A-Z]|$)/gi, "").trim();
        if (clean.toLowerCase().startsWith("aadesh:")) return clean;
        if (publicChartBasis) return `aadesh: ${publicChartBasis}\n\n${clean}`;
        // Only add prefix if chart context was active (preserve original conditional behavior)
        if (chartContextText) return `aadesh: ${clean}`;
        return clean;
      }
      const groundedOneShotAnswer = prefixSafe(rawOneShotAnswer);
      return NextResponse.json({ answer: groundedOneShotAnswer, followUpQuestion: null, followUpAnswer: null, sections: filteredSections, meta: responseMeta });
    }
    const rawAnswer = typeof result.answer === "string" ? result.answer.trim() : "";
    const publicChartBasisFull = typeof (metadata as Record<string, unknown>)?.publicChartBasis === "string" ? (metadata as Record<string, unknown>).publicChartBasis as string : undefined;
    const finalAnswer = (chartContextText || publicChartBasisFull) && !rawAnswer.toLowerCase().startsWith("aadesh:")
      ? publicChartBasisFull ? `aadesh: ${publicChartBasisFull}\n\n${rawAnswer}` : `aadesh: ${rawAnswer}`
      : rawAnswer;
    return NextResponse.json({ answer: finalAnswer, followUpQuestion: result.meta?.followUpQuestion, followUpAnswer: result.meta?.followUpAnswer, sections: normalizeSections((result as { sections?: unknown }).sections), meta: responseMeta });
  } catch (error) { console.error("Astro V2 reading route failed", error); return NextResponse.json({ error: "Unable to generate a reading right now. Please try again." }, { status: 500 }); }
}
