/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type AstroRagFlags = {
  ragEnabled: boolean;
  questionFrameParserEnabled?: boolean;
  structuredIntentRoutingEnabled?: boolean;
  readingPlanEnabled?: boolean;
  reasoningGraphEnabled: boolean;
  listeningAnalyzerEnabled?: boolean;
  askFollowupWhenInsufficient: boolean;
  ragFallbackDeterministic: boolean;
  exactFactsDeterministic: boolean;
  localAnalyzerEnabled: boolean;
  localAnalyzerProvider: "ollama";
  localAnalyzerModel: string;
  localAnalyzerBaseUrl: string;
  localAnalyzerTimeoutMs: number;
  localAnalyzerMaxInputChars: number;
  localAnalyzerConcurrency: number;
  localCriticEnabled: boolean;
  localOllamaCriticEnabled?: boolean;
  localCriticRequired: boolean;
  localCriticTimeoutMs: number;
  llmAnswerEngineEnabled: boolean;
  llmProvider: "groq";
  llmAnswerModel: string;
  llmMaxTokens: number;
  llmTemperature: number;
  llmRetryOnValidationFail: boolean;
  gradedSafetyActionsEnabled: boolean;
  timingEngineEnabled: boolean;
  timingSource: "report_only" | "stored" | "python_oracle";
  oracleVmTimingEnabled: boolean;
  validateLlmOutput: boolean;
  storeValidationResults: boolean;
  companionPipelineEnabled?: boolean;
  companionCompassionateSynthesisEnabled?: boolean;
  companionMemoryEnabled?: boolean;
  companionMemoryWriteEnabled?: boolean;
  companionMemoryRetrieveEnabled?: boolean;
  companionMemoryStoreEnabled?: boolean;
  companionMemoryMaxChars?: number;
  companionMemoryMaxItems?: number;
};

function readBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
}

function readInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function readFloat(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function readMemoryMaxChars(value: string | undefined, defaultValue: number): number {
  const parsed = readInt(value, defaultValue);
  if (parsed < 200 || parsed > 3000) return defaultValue;
  return parsed;
}

function readMemoryMaxItems(value: string | undefined, defaultValue: number): number {
  const parsed = readInt(value, defaultValue);
  if (parsed < 1) return defaultValue;
  return Math.min(parsed, 12);
}

export function getAstroRagFlags(env: Record<string, string | undefined> = process.env): AstroRagFlags {
  return {
    ragEnabled: readBool(env.ASTRO_RAG_ENABLED, false),
    questionFrameParserEnabled: readBool(env.ASTRO_QUESTION_FRAME_PARSER_ENABLED, false),
    structuredIntentRoutingEnabled: readBool(env.ASTRO_STRUCTURED_ROUTING_ENABLED, false),
    readingPlanEnabled: readBool(env.ASTRO_READING_PLAN_ENABLED, false),
    reasoningGraphEnabled: readBool(env.ASTRO_REASONING_GRAPH_ENABLED, false),
    listeningAnalyzerEnabled: readBool(env.ASTRO_LISTENING_ANALYZER_ENABLED, false),
    askFollowupWhenInsufficient: readBool(env.ASTRO_ASK_FOLLOWUP_WHEN_INSUFFICIENT, true),
    ragFallbackDeterministic: readBool(env.ASTRO_RAG_FALLBACK_DETERMINISTIC, true),
    exactFactsDeterministic: readBool(env.ASTRO_EXACT_FACTS_DETERMINISTIC, true),
    localAnalyzerEnabled: readBool(env.ASTRO_LOCAL_ANALYZER_ENABLED, false),
    localAnalyzerProvider: "ollama",
    localAnalyzerModel: env.ASTRO_LOCAL_ANALYZER_MODEL || "qwen2.5:3b",
    localAnalyzerBaseUrl: env.ASTRO_LOCAL_ANALYZER_BASE_URL || "http://127.0.0.1:8787",
    localAnalyzerTimeoutMs: readInt(env.ASTRO_LOCAL_ANALYZER_TIMEOUT_MS, 15000),
    localAnalyzerMaxInputChars: readInt(env.ASTRO_LOCAL_ANALYZER_MAX_INPUT_CHARS, 12000),
    localAnalyzerConcurrency: readInt(env.ASTRO_LOCAL_ANALYZER_CONCURRENCY, 1),
    localCriticEnabled: readBool(env.ASTRO_LOCAL_CRITIC_ENABLED, false),
    localOllamaCriticEnabled: readBool(env.ASTRO_OLLAMA_CRITIC_ENABLED, false),
    localCriticRequired: readBool(env.ASTRO_LOCAL_CRITIC_REQUIRED, false),
    localCriticTimeoutMs: readInt(env.ASTRO_LOCAL_CRITIC_TIMEOUT_MS, 15000),
    llmAnswerEngineEnabled: readBool(env.ASTRO_LLM_ANSWER_ENGINE_ENABLED, false),
    llmProvider: "groq",
    llmAnswerModel: env.ASTRO_LLM_ANSWER_MODEL || "openai/gpt-oss-120b",
    llmMaxTokens: readInt(env.ASTRO_LLM_MAX_TOKENS, 900),
    llmTemperature: readFloat(env.ASTRO_LLM_TEMPERATURE, 0.2),
    llmRetryOnValidationFail: readBool(env.ASTRO_LLM_RETRY_ON_VALIDATION_FAIL, true),
    gradedSafetyActionsEnabled: readBool(env.ASTRO_GRADED_SAFETY_ACTIONS_ENABLED, false),
    timingEngineEnabled: readBool(env.ASTRO_TIMING_ENGINE_ENABLED, false),
    timingSource:
      env.ASTRO_TIMING_SOURCE === "stored" || env.ASTRO_TIMING_SOURCE === "python_oracle"
        ? env.ASTRO_TIMING_SOURCE
        : "report_only",
    oracleVmTimingEnabled: readBool(env.ASTRO_ORACLE_VM_TIMING_ENABLED, false),
    validateLlmOutput: readBool(env.ASTRO_VALIDATE_LLM_OUTPUT, true),
    storeValidationResults: readBool(env.ASTRO_STORE_VALIDATION_RESULTS, true),
    companionPipelineEnabled: readBool(env.ASTRO_COMPANION_PIPELINE_ENABLED, false),
    companionCompassionateSynthesisEnabled: readBool(env.ASTRO_COMPASSIONATE_SYNTHESIS_ENABLED, false),
    companionMemoryEnabled: readBool(env.ASTRO_COMPANION_MEMORY_ENABLED, false),
    companionMemoryWriteEnabled: readBool(env.ASTRO_COMPANION_MEMORY_WRITE_ENABLED, false),
    companionMemoryRetrieveEnabled: readBool(env.ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED, false),
    companionMemoryStoreEnabled: readBool(env.ASTRO_COMPANION_MEMORY_STORE_ENABLED, false),
    companionMemoryMaxChars: readMemoryMaxChars(env.ASTRO_COMPANION_MEMORY_MAX_CHARS, 1200),
    companionMemoryMaxItems: readMemoryMaxItems(env.ASTRO_COMPANION_MEMORY_MAX_ITEMS, 8),
  };
}
