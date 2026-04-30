/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { NextResponse } from "next/server";
import {
  ragReadingOrchestrator,
  type RagReadingOrchestratorInput,
  type RagReadingOrchestratorResult,
} from "@/lib/astro/rag/rag-reading-orchestrator";
import { getAstroRagFlags } from "@/lib/astro/rag/feature-flags";
import { generateReadingV2 } from "@/lib/astro/reading/reading-orchestrator-v2";
import type { ReadingMode } from "@/lib/astro/reading/reading-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readMode(value: unknown): ReadingMode {
  const allowed: ReadingMode[] = [
    "short_comfort",
    "practical_guidance",
    "timing_prediction",
    "remedy_focused",
    "deep_astrology",
    "human_conversation",
  ];

  return typeof value === "string" && allowed.includes(value as ReadingMode)
    ? (value as ReadingMode)
    : "practical_guidance";
}

function removeUndefinedFields<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;
}

function parseBirthDetails(value: unknown) {
  if (!isRecord(value)) return undefined;

  const latitude = readNumber(value.latitude);
  const longitude = readNumber(value.longitude);

  return removeUndefinedFields({
    dateOfBirth: readString(value.dateOfBirth),
    timeOfBirth: readString(value.timeOfBirth),
    placeOfBirth: readString(value.placeOfBirth),
    latitude,
    longitude,
    timezone: readString(value.timezone),
  });
}

function parseMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  return removeUndefinedFields({
    ...value,
  });
}

type AstroV2ReadingDependencies = {
  oldRoute: typeof generateReadingV2;
  ragOrchestrator: typeof ragReadingOrchestrator;
  flags: typeof getAstroRagFlags;
};

type AstroV2ReadingResponse =
  | {
      answer: string;
      followUpQuestion?: string | null;
      followUpAnswer?: string | null;
      meta?: Record<string, unknown>;
    }
  | {
      error: string;
      code?: string;
      meta?: Record<string, unknown>;
    };

function getRequestContext(body: AstroV2ReadingRequestBody) {
  const metadata = parseMetadata(body.metadata);
  const userId = readString(body.userId);
  const sessionId = readString(body.sessionId) ?? readString(metadata?.sessionId);

  return {
    metadata,
    userId: userId ?? sessionId ?? "astro-v2-page-anonymous",
    sessionId,
    chartVersionId: readString((body as Record<string, unknown>).chartVersionId),
    profileId: readString((body as Record<string, unknown>).profileId) ?? readString(metadata?.profileId),
  };
}

function shouldUseRagReadingRoute(flags: ReturnType<typeof getAstroRagFlags>, question: string): boolean {
  if (!flags.ragEnabled) return false;
  if (!question.trim()) return false;
  return true;
}

function normalizeRagRouteResponse(
  result: RagReadingOrchestratorResult,
  existingMeta: Record<string, unknown> | undefined,
): AstroV2ReadingResponse {
  const answer = typeof result.answer === "string" ? result.answer.trim() : "";
  const safeMeta: Record<string, unknown> = {
    ...(existingMeta ?? {}),
    engine: result.meta.engine,
    ragEnabled: result.meta.ragEnabled,
    exactFactAnswered: result.meta.exactFactAnswered,
    safetyGatePassed: result.meta.safetyGatePassed,
    safetyBlocked: result.meta.safetyBlocked,
    ollamaAnalyzerUsed: result.meta.ollamaAnalyzerUsed,
    deterministicAnalyzerUsed: result.meta.deterministicAnalyzerUsed,
    supabaseRetrievalUsed: result.meta.supabaseRetrievalUsed,
    reasoningGraphUsed: result.meta.reasoningGraphUsed,
    timingEngineUsed: result.meta.timingEngineUsed,
    sufficiencyStatus: result.meta.sufficiencyStatus,
    answerContractBuilt: result.meta.answerContractBuilt,
    groqUsed: result.meta.groqUsed,
    groqRetryUsed: result.meta.groqRetryUsed,
    ollamaCriticUsed: result.meta.ollamaCriticUsed,
    validationPassed: result.meta.validationPassed,
    fallbackUsed: result.meta.fallbackUsed,
    followupAsked: result.meta.followupAsked,
    timingsAvailable: result.meta.timingsAvailable,
    rag: {
      status: result.status,
      exactFactAnswered: result.meta.exactFactAnswered,
      safetyBlocked: result.meta.safetyBlocked,
      followupAsked: result.meta.followupAsked,
      fallbackUsed: result.meta.fallbackUsed,
    },
  };

  return {
    answer,
    followUpQuestion: result.followUpQuestion,
    followUpAnswer: result.followUpAnswer,
    meta: safeMeta,
  };
}

function shouldFallbackToOldV2FromRagResult(result: RagReadingOrchestratorResult | undefined): boolean {
  if (!result) return true;
  if (typeof result.answer !== "string" || !result.answer.trim()) return true;
  if (result.meta?.engine === "fallback" && result.status === "fallback") return true;
  return false;
}

async function handleAstroV2ReadingRequest(
  request: Request,
  deps: Partial<AstroV2ReadingDependencies> = {},
): Promise<Response> {
  let body: AstroV2ReadingRequestBody;

  try {
    body = (await request.json()) as AstroV2ReadingRequestBody;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON request body.",
      },
      {
        status: 400,
      },
    );
  }

  const question = readString(body.question) ?? readString(body.message);

  if (!question) {
    return NextResponse.json(
      {
        error: "Question is required.",
      },
      {
        status: 400,
      },
    );
  }

  const context = getRequestContext(body);
  const birthDetails = parseBirthDetails(body.birthDetails);
  const metadata = context.metadata;
  const flags = (deps.flags ?? getAstroRagFlags)(process.env);
  const ragBranchEnabled = shouldUseRagReadingRoute(flags, question);
  const ragInput: Partial<RagReadingOrchestratorInput> = {
    question,
    userId: context.userId,
    profileId: context.profileId ?? undefined,
    chartVersionId: context.chartVersionId ?? undefined,
    env: process.env,
    explicitUserDates: Array.isArray((body as Record<string, unknown>).explicitUserDates)
      ? ((body as Record<string, unknown>).explicitUserDates as NonNullable<
          RagReadingOrchestratorInput["explicitUserDates"]
        >)
      : undefined,
    memorySummary: readString(metadata?.memorySummary),
  };

  try {
    if (ragBranchEnabled) {
      try {
        const ragResult = await (deps.ragOrchestrator ?? ragReadingOrchestrator)(ragInput);

        if (!shouldFallbackToOldV2FromRagResult(ragResult)) {
          return NextResponse.json(
            normalizeRagRouteResponse(ragResult, {
              source: "astro-v2-page",
              directV2Route: true,
              sessionId: context.sessionId,
              ...metadata,
            }),
          );
        }

        console.error("Astro V2 reading route falling back to old path after rag result");
      } catch (error) {
        console.error("Astro V2 reading route rag branch failed, falling back to old path", error);
      }
    }

    const result = await (deps.oldRoute ?? generateReadingV2)({
      userId: context.userId,
      question,
      mode: readMode(body.mode),
      birthDetails: birthDetails as
        | {
            dateOfBirth?: string;
            timeOfBirth?: string;
            placeOfBirth?: string;
            latitude?: number;
            longitude?: number;
            timezone?: string;
          }
        | undefined,
      chart: isRecord(body.chart) ? body.chart : undefined,
      context: isRecord(body.context) ? body.context : undefined,
      dasha: isRecord(body.dasha) ? body.dasha : undefined,
      transits: isRecord(body.transits) ? body.transits : undefined,
      metadata: {
        source: "astro-v2-page",
        directV2Route: true,
        sessionId: context.sessionId,
        ...metadata,
      },
    });

    return NextResponse.json({
      answer: result.answer,
      followUpQuestion: result.meta?.followUpQuestion,
      followUpAnswer: result.meta?.followUpAnswer,
      meta: {
        ...result.meta,
        source: "astro-v2-page",
        directV2Route: true,
      },
    });
  } catch (error) {
    console.error("Astro V2 reading route failed", error);

    return NextResponse.json(
      {
        error: "Unable to generate a reading right now. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  return handleAstroV2ReadingRequest(request);
}

export { handleAstroV2ReadingRequest };
