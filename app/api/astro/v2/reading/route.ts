import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
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

  const birthDetails = parseBirthDetails(body.birthDetails);
  const metadata = parseMetadata(body.metadata);
  const userId = readString(body.userId);

  try {
    const result = await generateReadingV2({
      userId: userId ?? "astro-v2-page",
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
        ...metadata,
      },
    });

    return NextResponse.json({
      answer: result.answer,
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
