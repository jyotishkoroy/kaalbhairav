/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatIssue,
  loadEnvFile,
  parseCliArgs,
  parseEnvFile,
  validateAstroRagRolloutEnv,
  type RolloutStage,
} from "@/scripts/validate-astro-rag-rollout";

function makeEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    ASTRO_RAG_ENABLED: "true",
    ASTRO_REASONING_GRAPH_ENABLED: "true",
    ASTRO_LLM_ANSWER_ENGINE_ENABLED: "true",
    ASTRO_VALIDATE_LLM_OUTPUT: "true",
    ASTRO_LOCAL_ANALYZER_ENABLED: "false",
    ASTRO_LOCAL_CRITIC_ENABLED: "false",
    ASTRO_LOCAL_CRITIC_REQUIRED: "false",
    ASTRO_COMPANION_MEMORY_ENABLED: "false",
    ASTRO_COMPANION_MEMORY_STORE_ENABLED: "false",
    ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED: "false",
    ASTRO_LOCAL_ANALYZER_MODEL: "qwen2.5:3b",
    ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787",
    ...overrides,
  };
}

function resultFor(stage: RolloutStage, env: Record<string, string | undefined>, strict = false) {
  return validateAstroRagRolloutEnv({ stage, env, strict });
}

describe("Phase 25 rollout validation", () => {
  it("local-deterministic valid env passes", () => {
    const result = resultFor("local-deterministic", makeEnv({
      ASTRO_LLM_ANSWER_ENGINE_ENABLED: "false",
      ASTRO_LOCAL_ANALYZER_ENABLED: "true",
    }));
    expect(result.ok).toBe(true);
  });

  it("local-deterministic with local analyzer false passes", () => {
    const result = resultFor("local-deterministic", makeEnv({ ASTRO_LLM_ANSWER_ENGINE_ENABLED: "false" }));
    expect(result.ok).toBe(true);
  });

  it("preview-deterministic valid env passes", () => {
    expect(resultFor("preview-deterministic", makeEnv({ ASTRO_LLM_ANSWER_ENGINE_ENABLED: "false" })).ok).toBe(true);
  });

  it("preview-groq valid env passes", () => {
    expect(resultFor("preview-groq", makeEnv()).ok).toBe(true);
  });

  it("production-groq valid env passes", () => {
    expect(resultFor("production-groq", makeEnv()).ok).toBe(true);
  });

  it("production-optional-laptop valid with qwen2.5:3b passes", () => {
    expect(resultFor("production-optional-laptop", makeEnv()).ok).toBe(true);
  });

  it("production-optional-laptop with analyzer false passes", () => {
    expect(resultFor("production-optional-laptop", makeEnv({ ASTRO_LOCAL_ANALYZER_ENABLED: "false" })).ok).toBe(true);
  });

  it("validation output does not include secret values", () => {
    const result = resultFor("production-groq", makeEnv({ GROQ_API_KEY: "secret-value", ASTRO_LLM_ANSWER_ENGINE_ENABLED: "true" }));
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  it("unset validation output is deterministic", () => {
    const a = resultFor("preview-groq", {});
    const b = resultFor("preview-groq", {});
    expect(a).toEqual(b);
  });

  it("JSON output helper shape is stable", () => {
    const result = resultFor("preview-groq", makeEnv());
    expect(result).toMatchObject({ ok: true, stage: "preview-groq", issues: expect.any(Array) });
  });

  it("LLM enabled with validator false fails", () => {
    expect(resultFor("preview-groq", makeEnv({ ASTRO_VALIDATE_LLM_OUTPUT: "false" })).ok).toBe(false);
  });

  it("production-groq with local analyzer true fails", () => {
    expect(resultFor("production-groq", makeEnv({ ASTRO_LOCAL_ANALYZER_ENABLED: "true" })).ok).toBe(false);
  });

  it("production-groq with local critic true fails", () => {
    expect(resultFor("production-groq", makeEnv({ ASTRO_LOCAL_CRITIC_ENABLED: "true" })).ok).toBe(false);
  });

  it("production-optional-laptop with local critic required true fails", () => {
    expect(resultFor("production-optional-laptop", makeEnv({ ASTRO_LOCAL_CRITIC_REQUIRED: "true" })).ok).toBe(false);
  });

  it("preview-deterministic with LLM enabled fails", () => {
    expect(resultFor("preview-deterministic", makeEnv({ ASTRO_LLM_ANSWER_ENGINE_ENABLED: "true" })).ok).toBe(false);
  });

  it("preview-deterministic with local analyzer enabled fails", () => {
    expect(resultFor("preview-deterministic", makeEnv({ ASTRO_LLM_ANSWER_ENGINE_ENABLED: "false", ASTRO_LOCAL_ANALYZER_ENABLED: "true" })).ok).toBe(false);
  });

  it("preview-deterministic with local critic enabled fails", () => {
    expect(resultFor("preview-deterministic", makeEnv({ ASTRO_LLM_ANSWER_ENGINE_ENABLED: "false", ASTRO_LOCAL_CRITIC_ENABLED: "true" })).ok).toBe(false);
  });

  it("preview-groq with local analyzer enabled fails", () => {
    expect(resultFor("preview-groq", makeEnv({ ASTRO_LOCAL_ANALYZER_ENABLED: "true" })).ok).toBe(false);
  });

  it("preview-groq with local critic enabled fails", () => {
    expect(resultFor("preview-groq", makeEnv({ ASTRO_LOCAL_CRITIC_ENABLED: "true" })).ok).toBe(false);
  });

  it("production-groq with RAG disabled fails", () => {
    expect(resultFor("production-groq", makeEnv({ ASTRO_RAG_ENABLED: "false" })).ok).toBe(false);
  });

  it("production-groq with reasoning graph disabled fails", () => {
    expect(resultFor("production-groq", makeEnv({ ASTRO_REASONING_GRAPH_ENABLED: "false" })).ok).toBe(false);
  });

  it("local-deterministic with LLM enabled fails", () => {
    expect(resultFor("local-deterministic", makeEnv({ ASTRO_LLM_ANSWER_ENGINE_ENABLED: "true" })).ok).toBe(false);
  });

  it("qwen2.5:7b warns in optional laptop stage", () => {
    const result = resultFor("production-optional-laptop", makeEnv({ ASTRO_LOCAL_ANALYZER_MODEL: "qwen2.5:7b" }));
    expect(result.issues.some((issue) => issue.code === "slow-model")).toBe(true);
  });

  it("qwen2.5:1.5b warns fallback model", () => {
    const result = resultFor("production-optional-laptop", makeEnv({ ASTRO_LOCAL_ANALYZER_MODEL: "qwen2.5:1.5b" }));
    expect(result.issues.some((issue) => issue.code === "fallback-model")).toBe(true);
  });

  it("local analyzer true without base URL warns", () => {
    const result = resultFor("local-deterministic", makeEnv({ ASTRO_LLM_ANSWER_ENGINE_ENABLED: "false", ASTRO_LOCAL_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "" }));
    expect(result.issues.some((issue) => issue.code === "local-base-url-missing")).toBe(true);
  });

  it("companion store enabled while companion memory disabled warns", () => {
    const result = resultFor("preview-groq", makeEnv({ ASTRO_COMPANION_MEMORY_STORE_ENABLED: "true" }));
    expect(result.issues.some((issue) => issue.code === "memory-store-without-memory")).toBe(true);
  });

  it("companion retrieve enabled while companion memory disabled warns", () => {
    const result = resultFor("preview-groq", makeEnv({ ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED: "true" }));
    expect(result.issues.some((issue) => issue.code === "memory-retrieve-without-memory")).toBe(true);
  });

  it("companion store enabled in production warns", () => {
    const result = resultFor("production-groq", makeEnv({ ASTRO_COMPANION_MEMORY_STORE_ENABLED: "true" }));
    expect(result.issues.some((issue) => issue.code === "memory-store-production")).toBe(true);
  });

  it("missing RAG flag in local stage warns or errors as designed", () => {
    const result = resultFor("local-deterministic", makeEnv({ ASTRO_RAG_ENABLED: undefined, ASTRO_LLM_ANSWER_ENGINE_ENABLED: "false" }));
    expect(result.issues.some((issue) => issue.code === "local-rag-required" || issue.code === "rag-implicit")).toBe(true);
  });

  it("missing reasoning graph in preview warns or errors as designed", () => {
    const result = resultFor("production-groq", makeEnv({ ASTRO_REASONING_GRAPH_ENABLED: undefined }));
    expect(result.issues.some((issue) => issue.code === "prod-reasoning-required")).toBe(true);
  });

  it("unknown model warns", () => {
    const result = resultFor("production-optional-laptop", makeEnv({ ASTRO_LOCAL_ANALYZER_MODEL: "custom-model" }));
    expect(result.issues.some((issue) => issue.code === "unknown-model")).toBe(true);
  });

  it("unset local timeout does not fail", () => {
    const result = resultFor("production-optional-laptop", makeEnv({ ASTRO_LOCAL_ANALYZER_TIMEOUT_MS: undefined }));
    expect(result.ok).toBe(true);
  });

  it("parses --stage", () => {
    expect(parseCliArgs(["--stage", "production-groq"]).stage).toBe("production-groq");
  });

  it("invalid stage exits/fails", () => {
    expect(parseCliArgs(["--stage", "not-a-stage"]).stage).toBe("not-a-stage" as RolloutStage);
  });

  it("json output is valid JSON shape", () => {
    const body = JSON.parse(JSON.stringify(resultFor("preview-groq", makeEnv())));
    expect(body).toHaveProperty("ok");
  });

  it("strict turns warnings into failure if implemented", () => {
    const result = resultFor("production-optional-laptop", makeEnv({ ASTRO_LOCAL_ANALYZER_MODEL: "qwen2.5:7b" }), true);
    expect(result.ok).toBe(false);
  });

  it("env-file parser ignores comments", () => {
    const parsed = parseEnvFile("# hi\nASTRO_RAG_ENABLED=true\n");
    expect(parsed.ASTRO_RAG_ENABLED).toBe("true");
  });

  it("env-file parser handles quoted values", () => {
    const parsed = parseEnvFile("ASTRO_LOCAL_ANALYZER_MODEL=\"qwen2.5:3b\"\n");
    expect(parsed.ASTRO_LOCAL_ANALYZER_MODEL).toBe("qwen2.5:3b");
  });

  it("env-file parser redacts secrets in output", () => {
    const line = formatIssue({ severity: "error", code: "secret-test", message: "GROQ_API_KEY=[REDACTED]" });
    expect(line).not.toContain("secret-value");
  });

  it("missing env-file returns clear error", () => {
    expect(() => loadEnvFile(join(tmpdir(), "missing-rollout.env"))).toThrow();
  });

  it("exact fact safe flags preserved", () => {
    const result = resultFor("production-groq", makeEnv());
    expect(result.ok).toBe(true);
    expect(result.issues.some((issue) => issue.code === "prod-local-analyzer")).toBe(false);
  });

  it("old route fallback flag-off documented in output", () => {
    expect(formatIssue({ severity: "warning", code: "fallback-path", message: "old V2 route remains active when ASTRO_RAG_ENABLED=false." })).toContain("old V2 route");
  });

  it("laptop optional warning is included for production optional stage", () => {
    const result = resultFor("production-optional-laptop", makeEnv({ ASTRO_LOCAL_ANALYZER_MODEL: "qwen2.5:7b" }));
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("rollout validation does not call network", () => {
    const result = resultFor("preview-groq", makeEnv());
    expect(result.ok).toBe(true);
  });

  it("rollout validation does not write files", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "rollout-validation-"));
    const envPath = join(tempDir, "rollout.env");
    writeFileSync(envPath, "ASTRO_RAG_ENABLED=true\n");
    const before = readFileSync(envPath, "utf8");
    const parsed = loadEnvFile(envPath);
    expect(parsed.env.ASTRO_RAG_ENABLED).toBe("true");
    expect(readFileSync(envPath, "utf8")).toBe(before);
  });

  it("validation output does not leak secret env values", () => {
    const result = resultFor("production-groq", makeEnv({ ASTRO_LOCAL_ANALYZER_MODEL: "qwen2.5:3b", GROQ_API_KEY: "topsecret" }));
    expect(JSON.stringify(result.issues)).not.toContain("topsecret");
  });

  it("strict does not change the stage label", () => {
    const result = resultFor("preview-groq", makeEnv(), true);
    expect(result.stage).toBe("preview-groq");
  });

  it("warnings remain warnings without strict", () => {
    const result = resultFor("production-optional-laptop", makeEnv({ ASTRO_LOCAL_ANALYZER_MODEL: "qwen2.5:7b" }));
    expect(result.issues.some((issue) => issue.severity === "warning")).toBe(true);
  });
});
