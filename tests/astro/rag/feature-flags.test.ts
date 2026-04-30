/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { getAstroRagFlags } from "../../../lib/astro/rag/feature-flags";
import { ragReadingOrchestrator } from "../../../lib/astro/rag/rag-reading-orchestrator";

describe("getAstroRagFlags", () => {
  it("uses safe defaults", () => {
    const flags = getAstroRagFlags({});

    expect(flags.ragEnabled).toBe(false);
    expect(flags.reasoningGraphEnabled).toBe(false);
    expect(flags.listeningAnalyzerEnabled).toBe(false);
    expect(flags.localAnalyzerEnabled).toBe(false);
    expect(flags.localCriticEnabled).toBe(false);
    expect(flags.llmAnswerEngineEnabled).toBe(false);
    expect(flags.timingEngineEnabled).toBe(false);
    expect(flags.exactFactsDeterministic).toBe(true);
    expect(flags.validateLlmOutput).toBe(true);
    expect(flags.companionMemoryEnabled).toBe(false);
    expect(flags.companionPipelineEnabled).toBe(false);
    expect(flags.companionMemoryStoreEnabled).toBe(false);
    expect(flags.companionMemoryRetrieveEnabled).toBe(false);
    expect(flags.companionMemoryMaxChars).toBe(1200);
  });

  it("enables selected safe values explicitly", () => {
    const flags = getAstroRagFlags({
      ASTRO_RAG_ENABLED: "true",
      ASTRO_REASONING_GRAPH_ENABLED: "true",
      ASTRO_LISTENING_ANALYZER_ENABLED: "true",
      ASTRO_LOCAL_ANALYZER_ENABLED: "true",
      ASTRO_LOCAL_CRITIC_ENABLED: "true",
      ASTRO_LLM_ANSWER_ENGINE_ENABLED: "true",
      ASTRO_TIMING_ENGINE_ENABLED: "true",
      ASTRO_COMPANION_MEMORY_ENABLED: "true",
      ASTRO_COMPANION_PIPELINE_ENABLED: "true",
      ASTRO_COMPANION_MEMORY_STORE_ENABLED: "true",
      ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED: "true",
      ASTRO_COMPANION_MEMORY_MAX_CHARS: "2400",
    });

    expect(flags.ragEnabled).toBe(true);
    expect(flags.reasoningGraphEnabled).toBe(true);
    expect(flags.listeningAnalyzerEnabled).toBe(true);
    expect(flags.localAnalyzerEnabled).toBe(true);
    expect(flags.localCriticEnabled).toBe(true);
    expect(flags.llmAnswerEngineEnabled).toBe(true);
    expect(flags.timingEngineEnabled).toBe(true);
    expect(flags.companionMemoryEnabled).toBe(true);
    expect(flags.companionPipelineEnabled).toBe(true);
    expect(flags.companionMemoryStoreEnabled).toBe(true);
    expect(flags.companionMemoryRetrieveEnabled).toBe(true);
    expect(flags.companionMemoryMaxChars).toBe(2400);
  });

  it("overrides default-true values with false", () => {
    const flags = getAstroRagFlags({
      ASTRO_EXACT_FACTS_DETERMINISTIC: "false",
      ASTRO_VALIDATE_LLM_OUTPUT: "false",
      ASTRO_STORE_VALIDATION_RESULTS: "false",
      ASTRO_ASK_FOLLOWUP_WHEN_INSUFFICIENT: "false",
      ASTRO_RAG_FALLBACK_DETERMINISTIC: "false",
    });

    expect(flags.exactFactsDeterministic).toBe(false);
    expect(flags.validateLlmOutput).toBe(false);
    expect(flags.storeValidationResults).toBe(false);
    expect(flags.askFollowupWhenInsufficient).toBe(false);
    expect(flags.ragFallbackDeterministic).toBe(false);
  });

  it("parses numeric env values", () => {
    const flags = getAstroRagFlags({
      ASTRO_LOCAL_ANALYZER_TIMEOUT_MS: "7000",
      ASTRO_LOCAL_ANALYZER_MAX_INPUT_CHARS: "5000",
      ASTRO_LOCAL_ANALYZER_CONCURRENCY: "2",
      ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "6000",
      ASTRO_LLM_MAX_TOKENS: "1200",
      ASTRO_LLM_TEMPERATURE: "0.1",
    });

    expect(flags.localAnalyzerTimeoutMs).toBe(7000);
    expect(flags.localAnalyzerMaxInputChars).toBe(5000);
    expect(flags.localAnalyzerConcurrency).toBe(2);
    expect(flags.localCriticTimeoutMs).toBe(6000);
    expect(flags.llmMaxTokens).toBe(1200);
    expect(flags.llmTemperature).toBe(0.1);
  });

  it("falls back safely for invalid numeric env values", () => {
    const flags = getAstroRagFlags({
      ASTRO_LOCAL_ANALYZER_TIMEOUT_MS: "bad",
      ASTRO_LOCAL_ANALYZER_MAX_INPUT_CHARS: "-1",
      ASTRO_LOCAL_ANALYZER_CONCURRENCY: "0",
      ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "NaN",
      ASTRO_LLM_MAX_TOKENS: "none",
      ASTRO_LLM_TEMPERATURE: "bad",
      ASTRO_COMPANION_MEMORY_MAX_CHARS: "bad",
    });

    expect(flags.localAnalyzerTimeoutMs).toBe(15000);
    expect(flags.localAnalyzerMaxInputChars).toBe(12000);
    expect(flags.localAnalyzerConcurrency).toBe(1);
    expect(flags.localCriticTimeoutMs).toBe(15000);
    expect(flags.llmMaxTokens).toBe(900);
    expect(flags.llmTemperature).toBe(0.2);
    expect(flags.companionMemoryMaxChars).toBe(1200);
  });

  it("clamps companion memory max chars safely", () => {
    expect(getAstroRagFlags({ ASTRO_COMPANION_MEMORY_MAX_CHARS: "199" }).companionMemoryMaxChars).toBe(1200);
    expect(getAstroRagFlags({ ASTRO_COMPANION_MEMORY_MAX_CHARS: "3001" }).companionMemoryMaxChars).toBe(1200);
    expect(getAstroRagFlags({ ASTRO_COMPANION_MEMORY_MAX_CHARS: "3000" }).companionMemoryMaxChars).toBe(3000);
    expect(getAstroRagFlags({ ASTRO_COMPANION_MEMORY_MAX_CHARS: "200" }).companionMemoryMaxChars).toBe(200);
  });

  it("uses model and base URL defaults", () => {
    const flags = getAstroRagFlags({});

    expect(flags.localAnalyzerProvider).toBe("ollama");
    expect(flags.localAnalyzerModel).toBe("qwen2.5:3b");
    expect(flags.localAnalyzerBaseUrl).toBe("http://127.0.0.1:8787");
    expect(flags.llmProvider).toBe("groq");
    expect(flags.llmAnswerModel).toBe("openai/gpt-oss-120b");
  });

  it("overrides model and base URL", () => {
    const flags = getAstroRagFlags({
      ASTRO_LOCAL_ANALYZER_MODEL: "qwen-test",
      ASTRO_LOCAL_ANALYZER_BASE_URL: "http://localhost:9999",
      ASTRO_LLM_ANSWER_MODEL: "test-model",
    });

    expect(flags.localAnalyzerModel).toBe("qwen-test");
    expect(flags.localAnalyzerBaseUrl).toBe("http://localhost:9999");
    expect(flags.llmAnswerModel).toBe("test-model");
  });

  it("validates timing source", () => {
    expect(getAstroRagFlags({ ASTRO_TIMING_SOURCE: "stored" }).timingSource).toBe("stored");
    expect(getAstroRagFlags({ ASTRO_TIMING_SOURCE: "python_oracle" }).timingSource).toBe("python_oracle");
    expect(getAstroRagFlags({ ASTRO_TIMING_SOURCE: "invalid" }).timingSource).toBe("report_only");
  });
});

describe("ragReadingOrchestrator", () => {
  it("returns not_enabled with old_v2 metadata when disabled", async () => {
    const result = await ragReadingOrchestrator({ question: "What is my Lagna?" }, {});

    expect(result.status).toBe("not_enabled");
    expect(result.meta.engine).toBe("old_v2");
    expect(result.meta.groqUsed).toBe(false);
    expect(result.meta.ollamaAnalyzerUsed).toBe(false);
    expect(result.meta.fallbackUsed).toBe(false);
    expect(result.answer).toBe("");
  });
});

describe("skeleton imports", () => {
  it("loads all new modules without throwing", async () => {
    await expect(Promise.all([
      import("../../../lib/astro/rag/safety-gate"),
      import("../../../lib/astro/rag/exact-fact-router"),
      import("../../../lib/astro/rag/chart-fact-extractor"),
      import("../../../lib/astro/rag/chart-fact-repository"),
      import("../../../lib/astro/rag/local-analyzer"),
      import("../../../lib/astro/rag/required-data-planner"),
      import("../../../lib/astro/rag/retrieval-service"),
      import("../../../lib/astro/rag/reasoning-rule-selector"),
      import("../../../lib/astro/rag/reasoning-path-builder"),
      import("../../../lib/astro/rag/timing-engine"),
      import("../../../lib/astro/rag/sufficiency-checker"),
      import("../../../lib/astro/rag/answer-contract-builder"),
      import("../../../lib/astro/rag/groq-answer-writer"),
      import("../../../lib/astro/rag/answer-validator"),
      import("../../../lib/astro/rag/local-critic"),
      import("../../../lib/astro/rag/retry-controller"),
      import("../../../lib/astro/rag/rag-reading-orchestrator"),
      import("../../../lib/astro/rag/companion-memory"),
      import("../../../lib/astro/rag/types"),
      import("../../../lib/astro/rag/feature-flags"),
    ])).resolves.toBeDefined();
  });
});
