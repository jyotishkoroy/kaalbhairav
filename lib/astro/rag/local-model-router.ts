/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type LocalAiTask =
  | "listening_analyzer"
  | "intent_analyzer"
  | "query_expander"
  | "sufficiency_hint"
  | "critic"
  | "deep_critic"
  | "tone_polisher"
  | "memory_extractor"
  | "health_check";

export type LocalModelProfile = {
  task: LocalAiTask;
  provider: "ollama";
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxInputChars: number;
  concurrency: number;
  required: boolean;
  enabled: boolean;
  warnings: string[];
};

export type LocalModelRoutingDecision = {
  task: LocalAiTask;
  useLocal: boolean;
  profile: LocalModelProfile;
  fallbackReason?: string;
  warnings: string[];
};

export type LocalModelRouterEnv = Record<string, string | undefined>;

const DEFAULT_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_MODEL = "qwen2.5:3b";
const FALLBACK_MODEL = "qwen2.5:1.5b";
const DEEP_MODEL = "qwen2.5:7b";

const REQUEST_PATH_TASKS = new Set<LocalAiTask>([
  "listening_analyzer",
  "intent_analyzer",
  "query_expander",
  "sufficiency_hint",
  "critic",
  "tone_polisher",
  "memory_extractor",
]);

const TASK_MODEL_ENV: Record<Exclude<LocalAiTask, "health_check">, string> = {
  listening_analyzer: "ASTRO_LOCAL_LISTENING_MODEL",
  intent_analyzer: "ASTRO_LOCAL_ANALYZER_MODEL",
  query_expander: "ASTRO_LOCAL_QUERY_EXPANDER_MODEL",
  sufficiency_hint: "ASTRO_LOCAL_ANALYZER_MODEL",
  critic: "ASTRO_LOCAL_CRITIC_MODEL",
  deep_critic: "ASTRO_LOCAL_DEEP_CRITIC_MODEL",
  tone_polisher: "ASTRO_LOCAL_TONE_POLISHER_MODEL",
  memory_extractor: "ASTRO_LOCAL_MEMORY_EXTRACTOR_MODEL",
};

const TASK_ENABLED_ENV: Partial<Record<LocalAiTask, string[]>> = {
  listening_analyzer: ["ASTRO_LISTENING_ANALYZER_ENABLED", "ASTRO_LOCAL_ANALYZER_ENABLED"],
  intent_analyzer: ["ASTRO_LOCAL_ANALYZER_ENABLED"],
  query_expander: ["ASTRO_LOCAL_QUERY_EXPANDER_ENABLED"],
  sufficiency_hint: ["ASTRO_LOCAL_ANALYZER_ENABLED"],
  critic: ["ASTRO_LOCAL_CRITIC_ENABLED", "ASTRO_OLLAMA_CRITIC_ENABLED"],
  deep_critic: ["ASTRO_LOCAL_DEEP_CRITIC_ENABLED"],
  tone_polisher: ["ASTRO_LOCAL_TONE_POLISHER_ENABLED"],
  memory_extractor: ["ASTRO_LOCAL_MEMORY_EXTRACTOR_ENABLED"],
  health_check: [],
};

const TASK_TIMEOUT_ENV: Record<Exclude<LocalAiTask, "health_check">, string> = {
  listening_analyzer: "ASTRO_LOCAL_ANALYZER_TIMEOUT_MS",
  intent_analyzer: "ASTRO_LOCAL_ANALYZER_TIMEOUT_MS",
  query_expander: "ASTRO_LOCAL_QUERY_EXPANDER_TIMEOUT_MS",
  sufficiency_hint: "ASTRO_LOCAL_ANALYZER_TIMEOUT_MS",
  critic: "ASTRO_LOCAL_CRITIC_TIMEOUT_MS",
  deep_critic: "ASTRO_LOCAL_DEEP_CRITIC_TIMEOUT_MS",
  tone_polisher: "ASTRO_LOCAL_TONE_POLISHER_TIMEOUT_MS",
  memory_extractor: "ASTRO_LOCAL_MEMORY_EXTRACTOR_TIMEOUT_MS",
};

const TASK_DEFAULT_TIMEOUT: Record<Exclude<LocalAiTask, "health_check">, number> = {
  listening_analyzer: 25000,
  intent_analyzer: 25000,
  query_expander: 25000,
  sufficiency_hint: 25000,
  critic: 30000,
  deep_critic: 45000,
  tone_polisher: 15000,
  memory_extractor: 15000,
};

function readFirstValue(env: LocalModelRouterEnv, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

export function parseLocalBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

export function parseLocalInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

export function normalizeLocalBaseUrl(value?: string | null): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "") || DEFAULT_BASE_URL;
}

export function getDefaultLocalModelForTask(task: LocalAiTask): string {
  if (task === "deep_critic") return DEFAULT_MODEL;
  return DEFAULT_MODEL;
}

function getTaskModel(task: Exclude<LocalAiTask, "health_check">, env: LocalModelRouterEnv): string {
  const explicit = env[TASK_MODEL_ENV[task]];
  if (explicit && explicit.trim()) return explicit.trim();
  return getDefaultLocalModelForTask(task);
}

function getTaskBaseUrl(task: LocalAiTask, env: LocalModelRouterEnv): string {
  if (task === "health_check") {
    return normalizeLocalBaseUrl(env.ASTRO_LOCAL_ANALYZER_BASE_URL);
  }
  return normalizeLocalBaseUrl(env.ASTRO_LOCAL_ANALYZER_BASE_URL);
}

function isProductionLike(env: LocalModelRouterEnv): boolean {
  return parseLocalBoolean(env.VERCEL_ENV === "production" ? "true" : undefined, false) || parseLocalBoolean(env.NODE_ENV === "production" ? "true" : undefined, false);
}

function getTaskEnabled(task: LocalAiTask, env: LocalModelRouterEnv): boolean {
  if (task === "health_check") return true;
  const keys = TASK_ENABLED_ENV[task] ?? [];
  if (task === "listening_analyzer") {
    const listening = parseLocalBoolean(env.ASTRO_LISTENING_ANALYZER_ENABLED, false);
    if (env.ASTRO_LISTENING_ANALYZER_ENABLED === "false") return false;
    return listening || parseLocalBoolean(env.ASTRO_LOCAL_ANALYZER_ENABLED, false);
  }
  return parseLocalBoolean(readFirstValue(env, keys), false);
}

function getMaxInputChars(task: LocalAiTask, env: LocalModelRouterEnv): number {
  if (task === "health_check") return 12000;
  return parseLocalInteger(env.ASTRO_LOCAL_ANALYZER_MAX_INPUT_CHARS, 12000, 1, 100000);
}

function getConcurrency(task: LocalAiTask, env: LocalModelRouterEnv): number {
  if (task === "health_check") return 1;
  return parseLocalInteger(env.ASTRO_LOCAL_ANALYZER_CONCURRENCY, 1, 1, 64);
}

function getTimeout(task: LocalAiTask, env: LocalModelRouterEnv): number {
  if (task === "health_check") return 10000;
  const key = TASK_TIMEOUT_ENV[task];
  const fallback = TASK_DEFAULT_TIMEOUT[task];
  return parseLocalInteger(env[key], fallback, 1000, 120000);
}

function modelWarnings(task: LocalAiTask, model: string, env: LocalModelRouterEnv): string[] {
  const warnings: string[] = [];
  if (model === FALLBACK_MODEL) warnings.push("fast fallback, weaker reasoning");
  if (model === DEEP_MODEL) {
    warnings.push("manual/deep critic only, too slow for normal app flow");
    if (REQUEST_PATH_TASKS.has(task) && !parseLocalBoolean(env.ASTRO_LOCAL_ALLOW_7B_FOR_NORMAL_TASKS, false)) {
      warnings.push("qwen2.5:7b is blocked for normal request-path tasks unless explicitly allowed");
    }
  }
  if (model !== DEFAULT_MODEL && model !== FALLBACK_MODEL && model !== DEEP_MODEL) warnings.push(`unknown local model: ${model}`);
  return warnings;
}

export function validateLocalModelProfile(profile: LocalModelProfile): { ok: boolean; warnings: string[]; errors: string[] } {
  const warnings = [...profile.warnings];
  const errors: string[] = [];
  if (!profile.baseUrl) errors.push("missing baseUrl");
  if (!profile.model) errors.push("missing model");
  if (!profile.provider) errors.push("missing provider");
  if (profile.required && isProductionLike(process.env)) errors.push("required local AI must remain false in production-like env");
  if (profile.model === DEEP_MODEL && REQUEST_PATH_TASKS.has(profile.task)) {
    errors.push("qwen2.5:7b is not allowed for normal request-path tasks by default");
  }
  return { ok: errors.length === 0, warnings, errors };
}

export function getLocalModelProfile(task: LocalAiTask, env: LocalModelRouterEnv = process.env): LocalModelProfile {
  const provider = "ollama" as const;
  const model = task === "health_check" ? getDefaultLocalModelForTask(task) : getTaskModel(task as Exclude<LocalAiTask, "health_check">, env);
  const baseUrl = getTaskBaseUrl(task, env);
  const timeoutMs = getTimeout(task, env);
  const maxInputChars = getMaxInputChars(task, env);
  const concurrency = getConcurrency(task, env);
  const required = task === "health_check" ? false : parseLocalBoolean(env.ASTRO_LOCAL_CRITIC_REQUIRED, false);
  const enabled = getTaskEnabled(task, env);
  const warnings = modelWarnings(task, model, env);
  return { task, provider, model, baseUrl, timeoutMs, maxInputChars, concurrency, required, enabled, warnings };
}

export function routeLocalModelTask(task: LocalAiTask, env: LocalModelRouterEnv = process.env): LocalModelRoutingDecision {
  const profile = getLocalModelProfile(task, env);
  const warnings = [...profile.warnings];
  let useLocal = profile.enabled;
  let fallbackReason: string | undefined;
  const explicitBaseUrl = env.ASTRO_LOCAL_ANALYZER_BASE_URL;

  if (!profile.enabled) {
    useLocal = false;
    fallbackReason = `${task}_disabled`;
  } else if (explicitBaseUrl !== undefined && explicitBaseUrl.trim() === "") {
    useLocal = false;
    fallbackReason = "missing_base_url";
  } else if (!profile.baseUrl && task !== "health_check") {
    useLocal = false;
    fallbackReason = "missing_base_url";
  } else if (profile.model === DEEP_MODEL && REQUEST_PATH_TASKS.has(task) && !parseLocalBoolean(env.ASTRO_LOCAL_ALLOW_7B_FOR_NORMAL_TASKS, false)) {
    useLocal = false;
    fallbackReason = "deep_model_blocked_for_normal_task";
  }

  if (profile.required && isProductionLike(env)) {
    warnings.push("required local AI is not allowed in production-like env");
  }

  return { task, useLocal, profile, fallbackReason, warnings };
}

export function redactLocalModelConfigForLog(input: unknown): unknown {
  const seen = new WeakSet<object>();
  const redactValue = (key: string, value: unknown): unknown => {
    const normalizedKey = key.toLowerCase();
    if (["authorization", "x-tarayai-local-secret", "tarayai_local_secret", "token", "api_key", "api-key", "secret", "bearer"].some((item) => normalizedKey.includes(item))) return "[REDACTED]";
    if (typeof value === "string") {
      if (/bearer\s+[a-z0-9._\-+/=]+/i.test(value)) return "[REDACTED]";
      if (/[a-f0-9]{32,}/i.test(value)) return "[REDACTED]";
      if (normalizedKey.includes("url") && value.includes("secret=")) return value.replace(/(secret|token|api_key)=([^&\s]+)/gi, "$1=[REDACTED]");
    }
    return value;
  };

  const walk = (value: unknown, key = ""): unknown => {
    if (value === null || typeof value !== "object") return redactValue(key, value);
    if (seen.has(value as object)) return "[REDACTED]";
    seen.add(value as object);
    if (Array.isArray(value)) return value.map((entry) => walk(entry, key));
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      out[childKey] = walk(childValue, childKey);
    }
    return out;
  };

  return walk(input);
}
