/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import crypto from "node:crypto";

export type SanitizedNetworkEvent = {
  method: string;
  urlPath: string;
  status?: number;
  requestBodyShape?: string[];
  requestQuestionHash?: string;
  responseBodyShape?: string[];
  answerHash?: string;
  latencyMs?: number;
};

export type E2ETraceRow = {
  timestamp: string;
  runId: string;
  questionId: string;
  question: string;
  expectedAnswerHash: string;
  expectedAnswerExcerpt: string;
  pageUrl: string;
  network: SanitizedNetworkEvent[];
  actualAnswer: string;
  match: {
    exact: boolean;
    normalizedExact: boolean;
    semanticScore: number;
    keywordScore: number;
    matched: boolean;
    reasons: string[];
  };
  safety: {
    blocked: boolean;
    reason: string | null;
  };
  providers: {
    groqObserved: "unknown" | "yes" | "no";
    ollamaObserved: "unknown" | "yes" | "no";
    supabaseObserved: "production-via-app" | "unknown";
  };
  notes: string[];
};

const REDACT_PATTERNS = [
  [/([?&](?:code|token|access_token|refresh_token|id_token|state)=)[^&#]+/gi, "$1[REDACTED_SECRET]"],
  [/\b(bearer|authorization):\s*[^\s]+/gi, "$1: [REDACTED_SECRET]"],
  [/\b(cookie|set-cookie):\s*[^\n]+/gi, "$1: [REDACTED_COOKIE]"],
  [/\bSUPABASE_[A-Z_]+\b/g, "[REDACTED_SECRET]"],
  [/\bsk-[a-z0-9]{8,}\b/gi, "[REDACTED_SECRET]"],
];

export function redactText(value: string): string {
  let out = value;
  for (const [pattern, replacement] of REDACT_PATTERNS) out = out.replace(pattern, replacement as string);
  return out;
}

export function hashText(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function excerptText(value: string, length = 80): string {
  return redactText(value).replace(/\s+/g, " ").trim().slice(0, length);
}

export function sanitizeUrlPath(url: string): string {
  try {
    const parsed = new URL(url);
    return redactText(parsed.pathname + (parsed.search ? "?[REDACTED_QUERY]" : ""));
  } catch {
    return redactText(url);
  }
}

export function sanitizeEvent(input: {
  method: string;
  url: string;
  status?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  latencyMs?: number;
}): SanitizedNetworkEvent {
  const requestShape = input.requestBody && typeof input.requestBody === "object" && !Array.isArray(input.requestBody) ? Object.keys(input.requestBody as Record<string, unknown>) : undefined;
  const responseShape = input.responseBody && typeof input.responseBody === "object" && !Array.isArray(input.responseBody) ? Object.keys(input.responseBody as Record<string, unknown>) : undefined;
  return {
    method: input.method,
    urlPath: sanitizeUrlPath(input.url),
    status: input.status,
    requestBodyShape: requestShape,
    requestQuestionHash: requestShape?.includes("question") && typeof (input.requestBody as Record<string, unknown>)?.question === "string" ? hashText(String((input.requestBody as Record<string, unknown>).question)) : undefined,
    responseBodyShape: responseShape,
    answerHash: responseShape?.includes("answer") && typeof (input.responseBody as Record<string, unknown>)?.answer === "string" ? hashText(String((input.responseBody as Record<string, unknown>).answer)) : undefined,
    latencyMs: input.latencyMs,
  };
}

export function assertNoSecretLeaks(text: string): void {
  if (/(cookie|authorization|refresh_token|access_token|id_token|SUPABASE_SERVICE_ROLE_KEY|sk-[a-z0-9]+)/i.test(text)) {
    throw new Error("secret leak detected");
  }
}
