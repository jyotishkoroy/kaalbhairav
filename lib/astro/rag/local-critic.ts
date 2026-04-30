// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerContract } from "./answer-contract-types";
import type { AstroRagFlags } from "./feature-flags";
import { getAstroRagFlags } from "./feature-flags";
import type { RetrievalContext } from "./retrieval-types";
import type { ReasoningPath } from "./reasoning-path-builder";
import type { TimingContext } from "./timing-engine";
import type { AnswerValidationResult } from "./validation-types";
import type { LocalCriticResult } from "./critic-schema";
import { normalizeLocalCriticResult } from "./critic-schema";

export type FetchLike = (
  input: string | URL,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

export type LocalCriticClientInput = {
  question: string;
  answer: string;
  contract: AnswerContract;
  context?: RetrievalContext;
  reasoningPath?: ReasoningPath;
  timing?: TimingContext;
  validation?: AnswerValidationResult;
  env?: Record<string, string | undefined>;
  flags?: AstroRagFlags;
  fetchImpl?: FetchLike;
};

export type LocalCriticClientResult = {
  used: boolean;
  ok: boolean;
  critic: LocalCriticResult | null;
  fallbackRecommended: boolean;
  retryRecommended: boolean;
  error?: string;
  status?: number;
  metadata: {
    baseUrl: string | null;
    timeoutMs: number;
    required: boolean;
    enabled: boolean;
    requestAttempted: boolean;
    deterministicValidationOk: boolean | null;
    deterministicFallbackReason?: string;
  };
};

function hasGlobalFetch(): boolean {
  return typeof globalThis.fetch === "function";
}

function hasEnoughInput(input?: Partial<LocalCriticClientInput>): input is Partial<LocalCriticClientInput> & Required<Pick<LocalCriticClientInput, "question" | "answer" | "contract">> {
  return Boolean(input?.question && input.answer && input.contract);
}

function readPositiveInt(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getBaseUrl(input: LocalCriticClientInput): string {
  return input.flags?.localAnalyzerBaseUrl || input.env?.ASTRO_LOCAL_ANALYZER_BASE_URL || "http://127.0.0.1:8787";
}

function getSecret(env?: Record<string, string | undefined>): string {
  return env?.TARAYAI_LOCAL_SECRET || env?.ASTRO_LOCAL_CRITIC_SECRET || env?.ASTRO_LOCAL_ANALYZER_SECRET || "";
}

function getTimeoutMs(input: LocalCriticClientInput): number {
  return readPositiveInt(input.env?.ASTRO_LOCAL_CRITIC_TIMEOUT_MS) ?? input.flags?.localCriticTimeoutMs ?? 25000;
}

function compactString(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function hasCriticKeys(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return (
    "answersQuestion" in raw &&
    "tooGeneric" in raw &&
    "missingAnchors" in raw &&
    "missingSections" in raw &&
    "unsafeClaims" in raw &&
    "wrongFacts" in raw &&
    "companionToneScore" in raw &&
    "shouldRetry" in raw &&
    "correctionInstruction" in raw
  );
}

function compactContract(contract: AnswerContract): Record<string, unknown> {
  return {
    domain: contract.domain,
    answerMode: contract.answerMode,
    question: contract.question,
    requiredSections: contract.requiredSections.slice(0, 12),
    optionalSections: contract.optionalSections.slice(0, 12),
    anchors: contract.anchors.slice(0, 12).map((anchor) => ({
      key: anchor.key,
      label: anchor.label,
      required: anchor.required,
      source: anchor.source,
    })),
    forbiddenClaims: contract.forbiddenClaims.slice(0, 20).map((claim) => ({
      key: claim.key,
      severity: claim.severity,
    })),
    timingAllowed: contract.timingAllowed,
    timingRequired: contract.timingRequired,
    remedyAllowed: contract.remedyAllowed,
    exactFactsOnly: contract.exactFactsOnly,
    canUseGroq: contract.canUseGroq,
    canUseOllamaCritic: contract.canUseOllamaCritic,
    accuracyClass: contract.accuracyClass,
  };
}

function compactFacts(input: LocalCriticClientInput): Record<string, unknown> {
  return {
    chartAnchors: input.contract.anchors.slice(0, 30).map((anchor) => ({
      key: anchor.key,
      label: anchor.label,
      source: anchor.source,
      factKeys: anchor.factKeys.slice(0, 6),
      ruleKeys: anchor.ruleKeys.slice(0, 6),
    })),
    reasoningSteps: input.reasoningPath?.steps?.slice(0, 8) ?? [],
    timingWindows: input.timing?.windows?.slice(0, 8) ?? [],
    validation: input.validation
      ? {
          ok: input.validation.ok,
          retryRecommended: input.validation.retryRecommended,
          fallbackRecommended: input.validation.fallbackRecommended,
          missingAnchors: input.validation.missingAnchors.slice(0, 20),
          missingSections: input.validation.missingSections.slice(0, 20),
          wrongFacts: input.validation.wrongFacts.slice(0, 20),
          unsafeClaims: input.validation.unsafeClaims.slice(0, 20),
          correctionInstruction: compactString(input.validation.correctionInstruction, 1200),
        }
      : null,
    context: input.context
      ? {
          retrievalTags: input.context.metadata?.retrievalTags?.slice(0, 20) ?? [],
          summary: compactString(input.context.memorySummary ?? "", 1200),
        }
      : null,
  };
}

export function buildLocalCriticPayload(input: LocalCriticClientInput): Record<string, unknown> {
  return {
    question: compactString(input.question, 6000),
    answer: compactString(input.answer, 6000),
    contract: compactContract(input.contract),
    facts: compactFacts(input),
  };
}

function shouldSkipCritic(input: LocalCriticClientInput, flags: AstroRagFlags, deterministicValidationOk: boolean | null): { skip: boolean; reason?: string } {
  if (!flags.localCriticEnabled) return { skip: true, reason: "critic_disabled" };
  if (!getSecret(input.env)) return { skip: true, reason: "missing_secret" };
  if (!hasGlobalFetch() && !input.fetchImpl) return { skip: true, reason: "missing_fetch" };
  if (input.contract.answerMode === "safety" || input.contract.answerMode === "exact_fact") {
    if (!flags.localCriticRequired) return { skip: true, reason: "gated_answer_mode" };
  }
  if (deterministicValidationOk === false && !flags.localCriticRequired) return { skip: true, reason: "deterministic_fallback" };
  return { skip: false };
}

async function readResponseBody(response: { json: () => Promise<unknown>; text?: () => Promise<string> }): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    if (typeof response.text === "function") {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    throw new Error("invalid_critic_json");
  }
}

function buildMetadata(input: LocalCriticClientInput, flags: AstroRagFlags, requestAttempted: boolean, deterministicValidationOk: boolean | null, reason?: string) {
  return {
    baseUrl: getBaseUrl(input),
    timeoutMs: getTimeoutMs(input),
    required: flags.localCriticRequired,
    enabled: flags.localCriticEnabled,
    requestAttempted,
    deterministicValidationOk,
    deterministicFallbackReason: reason,
  };
}

function mergeCorrectionInstruction(existing: string, criticInstruction: string): string {
  const left = existing.trim();
  const right = criticInstruction.trim();
  if (!left) return right;
  if (!right) return left;
  return `${left}\n${right}`.slice(0, 1200);
}

function buildAdvisoryWarnings(critic: LocalCriticResult | null, required: boolean, failed: boolean): string[] {
  const warnings: string[] = [];
  if (required && failed) warnings.push("critic_required_failed");
  if (!critic) return warnings;
  if (critic.missingAnchors.length) warnings.push(`missing_anchors:${critic.missingAnchors.join(",")}`);
  if (critic.missingSections.length) warnings.push(`missing_sections:${critic.missingSections.join(",")}`);
  if (critic.tooGeneric) warnings.push("too_generic");
  if (critic.companionToneScore < 0.55) warnings.push("low_companion_tone");
  return warnings;
}

export async function critiqueAnswerWithLocalOllama(input?: Partial<LocalCriticClientInput>): Promise<LocalCriticClientResult> {
  if (!hasEnoughInput(input)) {
    const flags = getAstroRagFlags(input?.env ?? process.env);
    return {
      used: false,
      ok: false,
      critic: null,
      fallbackRecommended: flags.localCriticRequired,
      retryRecommended: false,
      error: "missing_input",
      metadata: {
        baseUrl: null,
        timeoutMs: flags.localCriticTimeoutMs,
        required: flags.localCriticRequired,
        enabled: flags.localCriticEnabled,
        requestAttempted: false,
        deterministicValidationOk: null,
      },
    };
  }

  const flags = input.flags ?? getAstroRagFlags(input.env ?? process.env);
  const deterministicValidationOk = input.validation ? input.validation.ok : null;
  const gating = shouldSkipCritic(input, flags, deterministicValidationOk);
  const metadata = buildMetadata(input, flags, false, deterministicValidationOk, gating.reason);
  if (gating.skip) {
    return {
      used: false,
      ok: false,
      critic: null,
      fallbackRecommended: flags.localCriticRequired && gating.reason !== "critic_disabled" ? true : false,
      retryRecommended: false,
      error: gating.reason,
      metadata,
    };
  }

  const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const baseUrl = getBaseUrl(input).replace(/\/$/, "");
  const timeoutMs = getTimeoutMs(input);
  const secret = getSecret(input.env);
  const payload = buildLocalCriticPayload(input);
  const controller = typeof globalThis.AbortController === "function" ? new globalThis.AbortController() : undefined;
  const timeout = controller ? globalThis.setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    const response = await fetchImpl(`${baseUrl}/critic`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-tarayai-local-secret": secret,
      },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });

    if (!response.ok) {
      return {
        used: true,
        ok: false,
        critic: null,
        fallbackRecommended: flags.localCriticRequired,
        retryRecommended: false,
        status: response.status,
        error: `status_${response.status}`,
        metadata: {
          ...metadata,
          baseUrl,
          timeoutMs,
          requestAttempted: true,
        },
      };
    }

    const parsed = await readResponseBody(response);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "fallbackRecommended" in parsed && "error" in parsed && !("answersQuestion" in parsed)) {
      return {
        used: true,
        ok: false,
        critic: null,
        fallbackRecommended: true,
        retryRecommended: false,
        error: typeof (parsed as { error?: unknown }).error === "string" ? (parsed as { error: string }).error : "critic_error",
        metadata: {
          ...metadata,
          baseUrl,
          timeoutMs,
          requestAttempted: true,
        },
      };
    }

    const critic = hasCriticKeys(parsed) ? normalizeLocalCriticResult(parsed) : null;
    if (!critic) {
      return {
        used: true,
        ok: false,
        critic: null,
        fallbackRecommended: flags.localCriticRequired,
        retryRecommended: false,
        error: "invalid_critic_json",
        metadata: {
          ...metadata,
          baseUrl,
          timeoutMs,
          requestAttempted: true,
        },
      };
    }

    return {
      used: true,
      ok: true,
      critic,
      fallbackRecommended: false,
      retryRecommended: false,
      metadata: {
        ...metadata,
        baseUrl,
        timeoutMs,
        requestAttempted: true,
      },
    };
  } catch (error) {
    const timeoutHit = error instanceof Error && error.name === "AbortError";
    return {
      used: true,
      ok: false,
      critic: null,
      fallbackRecommended: flags.localCriticRequired,
      retryRecommended: false,
      error: timeoutHit ? "critic_timeout" : error instanceof Error ? error.message : "critic_fetch_failed",
      metadata: {
        ...metadata,
        baseUrl,
        timeoutMs,
        requestAttempted: true,
      },
    };
  } finally {
    if (timeout) globalThis.clearTimeout(timeout);
  }
}

export function mergeCriticWithValidation(input: {
  validation: AnswerValidationResult;
  criticResult: LocalCriticClientResult;
}): {
  retryRecommended: boolean;
  fallbackRecommended: boolean;
  correctionInstruction: string;
  advisoryWarnings: string[];
} {
  const validation = input.validation;
  const criticResult = input.criticResult;
  const critic = criticResult.critic;
  const fallbackRecommended = validation.fallbackRecommended || criticResult.fallbackRecommended || false;
  let retryRecommended = validation.retryRecommended;
  const correctionInstruction = validation.correctionInstruction;
  const advisoryWarnings = buildAdvisoryWarnings(critic, criticResult.metadata.required, !criticResult.ok);

  if (!criticResult.ok || !critic) {
    return {
      retryRecommended,
      fallbackRecommended,
      correctionInstruction,
      advisoryWarnings,
    };
  }

  if (critic.unsafeClaims.length || critic.wrongFacts.length) {
    return {
      retryRecommended,
      fallbackRecommended: true,
      correctionInstruction: mergeCorrectionInstruction(correctionInstruction, critic.correctionInstruction),
      advisoryWarnings,
    };
  }

  if ((critic.shouldRetry || critic.tooGeneric || critic.companionToneScore < 0.55) && !fallbackRecommended) {
    retryRecommended = true;
  }

  return {
    retryRecommended,
    fallbackRecommended,
    correctionInstruction: mergeCorrectionInstruction(correctionInstruction, critic.correctionInstruction),
    advisoryWarnings,
  };
}
