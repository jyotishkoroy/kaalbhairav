/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { buildListeningAnalyzerPrompt } from "./listening-prompts";
import { buildDeterministicListeningFallback } from "./listening-fallback";
import { normalizeListeningAnalysis, shouldUseListeningAnalyzer } from "./listening-policy";
import type { ListeningAnalysis, ListeningAnalyzerClient, ListeningAnalyzerInput } from "./listening-types";
import { routeLocalModelTask } from "../rag/local-model-router";

function clampQuestion(question: string, maxChars: number): string {
  return question.length > maxChars ? question.slice(0, maxChars) : question;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function analyzeListeningSafely(input: ListeningAnalyzerInput & { client?: ListeningAnalyzerClient }): Promise<ListeningAnalysis> {
  const fallback = buildDeterministicListeningFallback(input);
  const env = input.env ?? process.env;
  if (env.ASTRO_LISTENING_ANALYZER_ENABLED !== "true") return fallback;
  const policy = shouldUseListeningAnalyzer(input);
  if (!policy.allowed) return fallback;
  const profile = routeLocalModelTask("listening_analyzer", env).profile;
  if (profile.model !== "qwen2.5:3b" && profile.model === "qwen2.5:7b") return fallback;
  if (!input.client) return fallback;
  const prompt = buildListeningAnalyzerPrompt({
    question: clampQuestion(input.question, profile.maxInputChars),
    userContext: input.userContext,
    topicHint: input.topicHint,
  });
  try {
    const raw = await withTimeout(
      input.client.analyze({
        question: clampQuestion(input.question, profile.maxInputChars),
        prompt,
        profile,
      }),
      input.timeoutMs ?? profile.timeoutMs,
    );
    const normalized = normalizeListeningAnalysis(raw, fallback);
    if (normalized.safetyRisks.length > 0) return fallback;
    return normalized;
  } catch {
    return fallback;
  }
}
