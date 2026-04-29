/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

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
  sessionId?: string;
};

export type AstroV2ChatDisplayResponse = {
  answer: string;
  meta: Record<string, unknown>;
  followUpQuestion?: string;
  followUpAnswer?: string;
  raw: unknown;
};

export type AstroV2StreamEvent =
  | {
      type: "meta";
      remaining?: number;
      session_id?: string;
      [key: string]: unknown;
    }
  | {
      type: "clarifying_question";
      question: string;
      [key: string]: unknown;
    }
  | {
      type: "answer" | "message" | "content" | "delta" | "token";
      answer?: string;
      message?: string;
      content?: string;
      delta?: string;
      token?: string;
      text?: string;
      [key: string]: unknown;
    }
  | {
      type: "error";
      error?: string;
      message?: string;
      [key: string]: unknown;
    }
  | {
      type: "done";
      session_id?: string;
      [key: string]: unknown;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

export type AstroV2StreamParseResult = {
  answer: string;
  meta: Record<string, unknown>;
  events: AstroV2StreamEvent[];
  error?: string;
  done: boolean;
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
      sessionId: input.sessionId,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseAstroV2SseEventLine(line: string): AstroV2StreamEvent | null {
  const trimmed = line.trim();

  if (!trimmed.startsWith("data:")) return null;

  const data = trimmed.slice("data:".length).trim();

  if (!data || data === "[DONE]") {
    return {
      type: "done",
    };
  }

  try {
    const parsed = JSON.parse(data) as unknown;

    if (isRecord(parsed) && typeof parsed.type === "string") {
      return parsed as AstroV2StreamEvent;
    }

    return {
      type: "message",
      content: typeof parsed === "string" ? parsed : JSON.stringify(parsed),
    };
  } catch {
    return {
      type: "message",
      content: data,
    };
  }
}

export function getTextFromAstroV2StreamEvent(
  event: AstroV2StreamEvent,
): string {
  if (event.type === "clarifying_question") {
    return typeof event.question === "string" ? event.question : "";
  }

  for (const key of ["answer", "message", "content", "delta", "token", "text"]) {
    const value = event[key];

    if (typeof value === "string") return value;
  }

  return "";
}

export function parseAstroV2SseText(text: string): AstroV2StreamParseResult {
  const result: AstroV2StreamParseResult = {
    answer: "",
    meta: {},
    events: [],
    done: false,
  };

  const events = text
    .split(/\r?\n/)
    .map(parseAstroV2SseEventLine)
    .filter((event): event is AstroV2StreamEvent => event !== null);

  for (const event of events) {
    result.events.push(event);

    if (event.type === "meta") {
      result.meta = {
        ...result.meta,
        ...event,
      };
      delete result.meta.type;
      continue;
    }

    if (event.type === "done") {
      result.done = true;
      continue;
    }

    if (event.type === "error") {
      result.error =
        typeof event.error === "string"
          ? event.error
          : typeof event.message === "string"
            ? event.message
            : "The server returned an error.";
      continue;
    }

    const textPart = getTextFromAstroV2StreamEvent(event);

    if (textPart) {
      result.answer = result.answer ? `${result.answer}${textPart}` : textPart;
    }
  }

  return result;
}

export function extractAstroV2ChatResponse(
  payload: unknown,
): AstroV2ChatDisplayResponse {
  if (typeof payload === "string" && payload.includes("data:")) {
    const parsed = parseAstroV2SseText(payload);

    return {
      answer: parsed.answer,
      meta: parsed.meta,
      raw: parsed,
    };
  }

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
    followUpQuestion:
      typeof payload.followUpQuestion === 'string'
        ? payload.followUpQuestion
        : typeof meta.followUpQuestion === 'string'
          ? meta.followUpQuestion
          : undefined,
    followUpAnswer:
      typeof payload.followUpAnswer === 'string'
        ? payload.followUpAnswer
        : typeof meta.followUpAnswer === 'string'
          ? meta.followUpAnswer
          : undefined,
    raw: payload,
  };
}

export function shouldSubmitAstroV2Question(question: string): boolean {
  return normalizeAstroV2Question(question).length > 0;
}
