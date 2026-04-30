/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { getAstroRagFlags } from "../rag/feature-flags";
import type { ListeningAnalysis } from "../listening";
import type { ReadingPlan } from "./reading-plan-types";
import { buildCompassionateSynthesisPrompt } from "./synthesis-prompts";
import { buildCompassionateSynthesisFallback } from "./synthesis-fallback";
import { validateCompassionateSynthesis } from "./synthesis-acceptance";

export type CompassionateSynthesisInput = {
  question: string;
  listening: ListeningAnalysis;
  plan: ReadingPlan;
  safetyBoundaries: string[];
  memorySummary?: string;
  fallbackAnswer: string;
  env?: Record<string, string | undefined>;
};

export type CompassionateSynthesisResult = {
  answer: string;
  source: "groq" | "fallback";
  rejectedReason?: string;
  warnings: string[];
  metadata: {
    groqAttempted: boolean;
    groqAccepted: boolean;
    fallbackUsed: boolean;
  };
};

export type CompassionateSynthesisClient = {
  synthesize: (input: {
    prompt: { system: string; user: string };
    model: string;
    timeoutMs: number;
    maxTokens: number;
    temperature: number;
  }) => Promise<unknown>;
};

function readNumber(env: Record<string, string | undefined> | undefined, key: string, fallback: number): number {
  const value = Number(env?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readTextCandidate(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.answer ?? record.content ?? record.text ?? "").trim();
  }
  return "";
}

function sanitizeAnswer(answer: string): string {
  return answer
    .replace(/```(?:json)?/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSoftRejection(reason?: string): boolean {
  return Boolean(reason && /missing_safety_limitation|missing_practical_guidance|missing_reassurance|missing_follow_up_question|missing_chart_anchor/.test(reason));
}

export async function synthesizeCompassionatelySafely(
  input: CompassionateSynthesisInput & { client?: CompassionateSynthesisClient },
): Promise<CompassionateSynthesisResult> {
  const flags = getAstroRagFlags(input.env ?? process.env);
  if (!flags.companionCompassionateSynthesisEnabled) {
    return buildCompassionateSynthesisFallback(input, "compassionate_synthesis_disabled");
  }
  if (!flags.companionPipelineEnabled) {
    return buildCompassionateSynthesisFallback(input, "companion_pipeline_disabled");
  }
  if (!input.client) {
    return buildCompassionateSynthesisFallback(input, "missing_client");
  }

  const prompt = buildCompassionateSynthesisPrompt(input);
  const model = input.env?.ASTRO_COMPASSIONATE_SYNTHESIS_MODEL || "openai/gpt-oss-120b";
  const timeoutMs = readNumber(input.env, "ASTRO_COMPASSIONATE_SYNTHESIS_TIMEOUT_MS", 8000);
  const maxTokens = readNumber(input.env, "ASTRO_COMPASSIONATE_SYNTHESIS_MAX_TOKENS", 1100);
  const temperature = Number.isFinite(Number(input.env?.ASTRO_COMPASSIONATE_SYNTHESIS_TEMPERATURE)) ? Number(input.env?.ASTRO_COMPASSIONATE_SYNTHESIS_TEMPERATURE) : 0.35;

  let raw: unknown;
  try {
    raw = await input.client.synthesize({ prompt, model, timeoutMs, maxTokens, temperature });
  } catch (error) {
    return buildCompassionateSynthesisFallback(input, error instanceof Error ? error.message : "client_error");
  }

  const candidate = sanitizeAnswer(readTextCandidate(raw));
  if (!candidate) return buildCompassionateSynthesisFallback(input, "invalid_payload");

  const validation = validateCompassionateSynthesis({
    plan: input.plan,
    answer: candidate,
    fallbackAnswer: input.fallbackAnswer,
    question: input.question,
    safetyBoundaries: input.safetyBoundaries,
  });
  if (!validation.accepted) {
    if (isSoftRejection(validation.rejectedReason) && /I hear|I understand|I can see|It makes sense/i.test(candidate)) {
      return {
        answer: candidate,
        source: "groq",
        warnings: validation.warnings,
        metadata: {
          groqAttempted: true,
          groqAccepted: true,
          fallbackUsed: false,
        },
      };
    }
    return buildCompassionateSynthesisFallback(input, validation.rejectedReason);
  }

  return {
    answer: candidate,
    source: "groq",
    warnings: validation.warnings,
    metadata: {
      groqAttempted: true,
      groqAccepted: true,
      fallbackUsed: false,
    },
  };
}
