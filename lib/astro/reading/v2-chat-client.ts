import type { ReadingMode } from "@/lib/astro/reading/reading-types";

export type AstroV2BirthDetailsForm = {
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: string;
  longitude: string;
  timezone: string;
};

export type AstroV2ChatRequestInput = {
  question: string;
  mode: ReadingMode;
  birthDetails?: Partial<AstroV2BirthDetailsForm>;
};

export type AstroV2ChatDisplayResponse = {
  answer: string;
  meta: Record<string, unknown>;
  raw: unknown;
};

export type AstroV2ChatRequestBody = Record<string, unknown>;

export const emptyBirthDetails: AstroV2BirthDetailsForm = {
  dateOfBirth: "",
  timeOfBirth: "",
  placeOfBirth: "",
  latitude: "",
  longitude: "",
  timezone: "",
};

function cleanString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toNumberOrUndefined(value: string | undefined): number | undefined {
  const cleaned = cleanString(value);
  if (!cleaned) return undefined;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeAstroV2Question(question: string): string {
  return question.trim();
}

export function buildAstroV2ChatRequest(
  input: AstroV2ChatRequestInput,
): AstroV2ChatRequestBody {
  const question = normalizeAstroV2Question(input.question);
  const birth = input.birthDetails ?? {};

  const birthDetails = {
    dateOfBirth: cleanString(birth.dateOfBirth),
    timeOfBirth: cleanString(birth.timeOfBirth),
    placeOfBirth: cleanString(birth.placeOfBirth),
    latitude: toNumberOrUndefined(birth.latitude),
    longitude: toNumberOrUndefined(birth.longitude),
    timezone: cleanString(birth.timezone),
  };

  const cleanedBirthDetails = Object.fromEntries(
    Object.entries(birthDetails).filter(([, value]) => value !== undefined),
  );

  return {
    message: question,
    question,
    mode: input.mode,
    birthDetails: cleanedBirthDetails,
    metadata: {
      source: "astro-v2-page",
      requestedMode: input.mode,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function extractAstroV2ChatResponse(
  payload: unknown,
): AstroV2ChatDisplayResponse {
  if (!isRecord(payload)) {
    return {
      answer: "",
      meta: {},
      raw: payload,
    };
  }

  const answer =
    typeof payload.answer === "string"
      ? payload.answer
      : typeof payload.content === "string"
        ? payload.content
        : typeof payload.message === "string"
          ? payload.message
          : "";

  const meta = isRecord(payload.meta)
    ? payload.meta
    : isRecord(payload.metadata)
      ? payload.metadata
      : {};

  return {
    answer,
    meta,
    raw: payload,
  };
}

export function shouldSubmitAstroV2Question(question: string): boolean {
  return normalizeAstroV2Question(question).length > 0;
}
