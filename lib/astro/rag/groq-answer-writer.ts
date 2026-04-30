// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerContract } from "./answer-contract-types";
import { buildGroqAnswerMessages } from "./groq-answer-prompt";
import type { AstroRagFlags } from "./feature-flags";
import { getAstroRagFlags } from "./feature-flags";
import type { RetrievalContext } from "./retrieval-types";
import type { ReasoningPath } from "./reasoning-path-builder";
import type { TimingContext } from "./timing-engine";

export type GroqAnswerJson = {
  answer: string;
  sections: Record<string, string>;
  usedAnchors: string[];
  limitations: string[];
  suggestedFollowUp: string | null;
  confidence: number;
};

export type GroqAnswerWriterInput = {
  question: string;
  contract: AnswerContract;
  context: RetrievalContext;
  reasoningPath: ReasoningPath;
  timing: TimingContext;
  correctionInstruction?: string;
  env?: Record<string, string | undefined>;
  flags?: AstroRagFlags;
  fetchImpl?: FetchLike;
};

export type GroqAnswerWriterResult = {
  used: boolean;
  ok: boolean;
  answer: string | null;
  json: GroqAnswerJson | null;
  rawText?: string;
  status?: number;
  error?: string;
  fallbackRecommended: boolean;
  metadata: {
    model: string;
    promptBytes: number;
    completionTokens?: number;
    promptTokens?: number;
    totalTokens?: number;
    contractAllowedGroq: boolean;
    llmFlagEnabled: boolean;
  };
};

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

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_TIMEOUT_MS = 25000;
const MAX_RAW_TEXT = 2000;

function hasGlobalFetch(): boolean {
  return typeof globalThis.fetch === "function";
}

function readTimeoutMs(env?: Record<string, string | undefined>): number {
  const value = Number(env?.ASTRO_LLM_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function trimText(value: unknown, max = MAX_RAW_TEXT): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? text.slice(0, max) : text;
}

function stripJsonFences(value: string): string {
  const trimmed = value.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fence ? fence[1].trim() : trimmed;
}

function clamp01(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = item.trim();
    if (!text) continue;
    const normalized = text.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(text);
  }
  return out;
}

function safeAnchorKeys(contract: AnswerContract): Set<string> {
  return new Set((contract.anchors ?? []).map((anchor) => anchor.key));
}

function containsObviousForbiddenText(answer: string, contract: AnswerContract): boolean {
  const lower = answer.toLowerCase();
  const forbidden = ["guaranteed", "definitely", "100%", "death date", "you will die", "stop your medication", "buy this stock", "lottery number", "expensive puja is mandatory", "insomnia disease"];
  const safetyAllowed = contract.answerMode === "safety";
  if (safetyAllowed) {
    return false;
  }
  return forbidden.some((phrase) => lower.includes(phrase));
}

export function validateGroqAnswerJson(value: unknown, contract: AnswerContract): { ok: true; value: GroqAnswerJson } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "invalid_json_object" };
  const raw = value as Record<string, unknown>;
  const answer = trimText(raw.answer, 5000);
  if (!answer) return { ok: false, error: "missing_answer" };
  if (containsObviousForbiddenText(answer, contract)) return { ok: false, error: "forbidden_claim_in_answer" };

  const sectionsRaw = raw.sections && typeof raw.sections === "object" && !Array.isArray(raw.sections) ? (raw.sections as Record<string, unknown>) : {};
  const sections: Record<string, string> = {};
  for (const key of ["direct_answer", "chart_basis", "reasoning", "timing", "what_to_do", "safe_remedies", "accuracy", "suggested_follow_up", "limitations", "safety_response"]) {
    sections[key] = trimText(sectionsRaw[key], 4000);
  }

  const usedAnchors = normalizeStringArray(raw.usedAnchors);
  const knownAnchors = safeAnchorKeys(contract);
  const unknownAnchors = usedAnchors.filter((anchor) => knownAnchors.size > 0 && !knownAnchors.has(anchor));
  if (unknownAnchors.length) return { ok: false, error: `unknown_used_anchors:${unknownAnchors.join(",")}` };

  const limitations = normalizeStringArray(raw.limitations);
  const suggestedFollowUp = raw.suggestedFollowUp == null ? null : trimText(raw.suggestedFollowUp, 1000) || null;
  const confidence = clamp01(raw.confidence);

  const json: GroqAnswerJson = {
    answer,
    sections,
    usedAnchors,
    limitations,
    suggestedFollowUp,
    confidence,
  };

  if (!contract.timingAllowed) {
    const timingText = (json.sections.timing ?? "").toLowerCase();
    if (timingText && !/omitted|unavailable|not available|cannot provide timing|restricted/.test(timingText)) return { ok: false, error: "timing_not_allowed" };
  }
  if (contract.requiredSections.includes("safe_remedies") && !contract.remedyAllowed) {
    const remedyText = (json.sections.safe_remedies ?? "").toLowerCase();
    if (remedyText && !/restricted|not available|cannot provide remedies/.test(remedyText)) return { ok: false, error: "remedy_not_allowed" };
  }
  if (containsObviousForbiddenText(json.sections.safety_response || answer, contract) && contract.answerMode !== "safety") return { ok: false, error: "forbidden_claim_in_answer" };
  return { ok: true, value: json };
}

export function formatGroqJsonAnswer(json: GroqAnswerJson, contract: AnswerContract): string {
  const labelMap: Record<string, string> = {
    direct_answer: "Direct answer",
    chart_basis: "Chart basis",
    reasoning: "Reasoning",
    timing: "Timing",
    what_to_do: "What to do",
    safe_remedies: "Safe remedies",
    accuracy: "Accuracy",
    suggested_follow_up: "Suggested follow-up",
    limitations: "Limitations",
    safety_response: "Safety response",
  };
  const lines: string[] = [];
  for (const section of contract.requiredSections ?? []) {
    const text = (json.sections[section] ?? "").trim();
    if (!text) continue;
    lines.push(`${labelMap[section] ?? section}: ${text}`);
  }
  if (!lines.length) return json.answer;
  if (json.suggestedFollowUp && !(contract.requiredSections ?? []).includes("suggested_follow_up")) {
    lines.push(`${labelMap.suggested_follow_up}: ${json.suggestedFollowUp}`);
  }
  return lines.join("\n\n");
}

export function buildDeterministicContractFallback(input?: Partial<GroqAnswerWriterInput>, reason?: string): GroqAnswerWriterResult {
  const contract = input?.contract;
  const used = Boolean(reason && /timeout|fetch|response|parse|status|invalid|groq/i.test(reason));
  const anchorLabels = contract?.anchors?.map((anchor) => anchor.label).filter(Boolean).slice(0, 8) ?? [];
  const limitations = contract?.limitations?.slice(0, 4) ?? [];
  const answerMode = contract?.answerMode;
  let answer = "I do not have enough grounded chart data to answer this safely yet.";
  if (answerMode === "safety") {
    answer = `I cannot answer that safely. ${limitations.join(" ")}`.trim();
  } else if (answerMode === "followup") {
    answer = contract?.writerInstructions?.find((item) => /follow-up/i.test(item)) ?? "Please share one more grounded detail so I can answer safely.";
  } else if (answerMode === "fallback") {
    answer = "I do not have enough grounded chart data to answer this safely yet.";
  } else if (anchorLabels.length) {
    answer = `I cannot generate the full answer right now. The available grounded anchors are: ${anchorLabels.join(", ")}${limitations.length ? `. ${limitations.join(" ")}` : "."}`;
  }
  const json: GroqAnswerJson = {
    answer,
    sections: {
      direct_answer: answer,
      chart_basis: anchorLabels.join(", "),
      reasoning: "",
      timing: "",
      what_to_do: "",
      safe_remedies: "",
      accuracy: "",
      suggested_follow_up: contract?.writerInstructions?.find((item) => /follow-up/i.test(item)) ?? "",
      limitations: limitations.join(" "),
      safety_response: answerMode === "safety" ? answer : "",
    },
    usedAnchors: contract?.anchors?.map((anchor) => anchor.key).slice(0, 8) ?? [],
    limitations,
    suggestedFollowUp: contract?.writerInstructions?.find((item) => /follow-up/i.test(item)) ?? null,
    confidence: 0,
  };
  return {
    used,
    ok: false,
    answer,
    json,
    rawText: undefined,
    fallbackRecommended: true,
    metadata: {
      model: input?.flags?.llmAnswerModel ?? DEFAULT_MODEL,
      promptBytes: 0,
      contractAllowedGroq: Boolean(contract?.canUseGroq),
      llmFlagEnabled: Boolean(input?.flags?.llmAnswerEngineEnabled),
    },
  };
}

function hasEnoughInputs(input?: Partial<GroqAnswerWriterInput>): input is Partial<GroqAnswerWriterInput> & Required<Pick<GroqAnswerWriterInput, "contract" | "context" | "reasoningPath" | "timing" | "question">> {
  return Boolean(input?.question && input.contract && input.context && input.reasoningPath && input.timing);
}

export async function writeGroqRagAnswer(input?: Partial<GroqAnswerWriterInput>): Promise<GroqAnswerWriterResult> {
  const flags = input?.flags ?? getAstroRagFlags(input?.env ?? process.env);
  const model = flags.llmAnswerModel ?? DEFAULT_MODEL;
  const baseResult = buildDeterministicContractFallback({ ...input, flags }, "not_attempted");
  baseResult.metadata.model = model;
  baseResult.metadata.promptBytes = 0;

  if (!hasEnoughInputs(input)) return baseResult;
  const contract = input.contract;
  if (!contract.canUseGroq || !flags.llmAnswerEngineEnabled || !input.env?.GROQ_API_KEY || contract.exactFactsOnly || ["safety", "exact_fact", "followup", "fallback"].includes(contract.answerMode)) {
    return buildDeterministicContractFallback({ ...input, flags }, "gated");
  }

  const fetchImpl: FetchLike | undefined = input.fetchImpl ?? (hasGlobalFetch() ? globalThis.fetch.bind(globalThis) : undefined);
  if (!fetchImpl) return buildDeterministicContractFallback({ ...input, flags }, "missing_fetch");

  const prompt = buildGroqAnswerMessages({
    question: input.question,
    contract,
    context: input.context,
    reasoningPath: input.reasoningPath,
    timing: input.timing,
    correctionInstruction: input.correctionInstruction,
  });
  const promptBytes = new TextEncoder().encode(`${prompt.system}\n\n${prompt.user}`).byteLength;
  const timeoutMs = readTimeoutMs(input.env);
  const controller = typeof globalThis.AbortController === "function" ? new globalThis.AbortController() : undefined;
  const timeout = controller ? globalThis.setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    const response = await fetchImpl(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.env.GROQ_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: flags.llmTemperature,
        max_tokens: flags.llmMaxTokens,
        response_format: { type: "json_object" },
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      return {
        ...buildDeterministicContractFallback({ ...input, flags }, `status_${response.status}`),
        used: true,
        status: response.status,
        metadata: {
          model,
          promptBytes,
          contractAllowedGroq: true,
          llmFlagEnabled: true,
        },
      };
    }

    const responseText = typeof response.text === "function" ? await response.text() : "";
    const rawText = trimText(responseText, MAX_RAW_TEXT);
    const parsed = responseText ? JSON.parse(responseText) as unknown : await response.json().catch(() => undefined);
    const content = typeof parsed === "object" && parsed && "choices" in parsed
      ? (parsed as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }).choices?.[0]?.message?.content
      : undefined;
    if (!content) {
      return {
        ...buildDeterministicContractFallback({ ...input, flags }, "missing_content"),
        used: true,
        rawText,
        status: response.status,
        metadata: {
          model,
          promptBytes,
          contractAllowedGroq: true,
          llmFlagEnabled: true,
        },
      };
    }

    const clean = stripJsonFences(content);
    let jsonValue: unknown;
    try {
      jsonValue = JSON.parse(clean);
    } catch {
      return {
        ...buildDeterministicContractFallback({ ...input, flags }, "invalid_json"),
        used: true,
        rawText: trimText(responseText || clean, MAX_RAW_TEXT),
        status: response.status,
        metadata: {
          model,
          promptBytes,
          contractAllowedGroq: true,
          llmFlagEnabled: true,
        },
      };
    }

    const validation = validateGroqAnswerJson(jsonValue, contract);
    if (!validation.ok) {
      return {
        ...buildDeterministicContractFallback({ ...input, flags }, validation.error),
        used: true,
        rawText: trimText(responseText || clean, MAX_RAW_TEXT),
        status: response.status,
        metadata: {
          model,
          promptBytes,
          contractAllowedGroq: true,
          llmFlagEnabled: true,
        },
      };
    }

    const usage = typeof parsed === "object" && parsed && "usage" in parsed ? (parsed as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }).usage : undefined;
    return {
      used: true,
      ok: true,
      answer: formatGroqJsonAnswer(validation.value, contract),
      json: validation.value,
      rawText: clean,
      status: response.status,
      fallbackRecommended: false,
      metadata: {
        model,
        promptBytes,
        completionTokens: usage?.completion_tokens,
        promptTokens: usage?.prompt_tokens,
        totalTokens: usage?.total_tokens,
        contractAllowedGroq: true,
        llmFlagEnabled: true,
      },
    };
  } catch (error) {
    const timeoutError = controller?.signal.aborted ? "groq_timeout" : error instanceof Error ? error.message : "groq_error";
    return {
      ...buildDeterministicContractFallback({ ...input, flags }, timeoutError),
      used: true,
      error: timeoutError,
      fallbackRecommended: true,
      metadata: {
        model,
        promptBytes,
        contractAllowedGroq: true,
        llmFlagEnabled: true,
      },
    };
  } finally {
    if (timeout) globalThis.clearTimeout(timeout);
  }
}
