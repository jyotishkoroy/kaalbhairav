/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ReadingCriticClient, ReadingCriticInput, ReadingCriticResult } from "./reading-critic-types";
import { buildFallbackReadingCriticResult, buildSkippedReadingCriticResult, normalizeReadingCriticResult, shouldUseReadingCritic, applyDeterministicCriticChecks } from "./critic-policy";
import { buildReadingCriticPrompt } from "./critic-prompts";
import { routeLocalModelTask } from "../rag/local-model-router";

function readNumber(env: Record<string, string | undefined> | undefined, key: string, fallback: number): number {
  const value = Number(env?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readCandidate(value: unknown): unknown {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return record.answer ?? record.content ?? record.text ?? record.result ?? value;
  }
  return value;
}

export async function critiqueReadingSafely(input: ReadingCriticInput & { client?: ReadingCriticClient }): Promise<ReadingCriticResult> {
  const skipped = buildSkippedReadingCriticResult("reading_critic_skipped");
  const fallback = buildFallbackReadingCriticResult("reading_critic_fallback");
  const policy = shouldUseReadingCritic(input);
  if (!policy.allowed) return { ...skipped, rewriteInstructions: policy.warnings };

  const routed = routeLocalModelTask("critic", input.env ?? process.env);
  if (!routed.useLocal) return { ...skipped, rewriteInstructions: policy.warnings };
  if (!input.client) return { ...fallback, rewriteInstructions: policy.warnings };

  const prompt = buildReadingCriticPrompt(input);
  const timeoutMs = readNumber(input.env, "ASTRO_LOCAL_CRITIC_TIMEOUT_MS", routed.profile.timeoutMs);

  try {
    const raw = await input.client.critique({ prompt, profile: routed.profile, timeoutMs });
    const normalized = normalizeReadingCriticResult(readCandidate(raw), fallback);
    return applyDeterministicCriticChecks({ plan: input.plan, answer: input.answer, critic: normalized });
  } catch {
    return applyDeterministicCriticChecks({ plan: input.plan, answer: input.answer, critic: fallback });
  }
}
