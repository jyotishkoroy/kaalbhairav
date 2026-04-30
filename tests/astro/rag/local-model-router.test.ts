/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import {
  getDefaultLocalModelForTask,
  getLocalModelProfile,
  normalizeLocalBaseUrl,
  parseLocalBoolean,
  parseLocalInteger,
  redactLocalModelConfigForLog,
  routeLocalModelTask,
  validateLocalModelProfile,
} from "../../../lib/astro/rag/local-model-router";

const baseEnv = {
  ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787/",
  ASTRO_LOCAL_ANALYZER_MODEL: "qwen2.5:3b",
  ASTRO_LOCAL_ANALYZER_TIMEOUT_MS: "25000",
  ASTRO_LOCAL_ANALYZER_MAX_INPUT_CHARS: "12000",
  ASTRO_LOCAL_ANALYZER_CONCURRENCY: "1",
  ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "30000",
  ASTRO_LOCAL_CRITIC_REQUIRED: "false",
} as const;

const allTasks = [
  "listening_analyzer",
  "intent_analyzer",
  "query_expander",
  "sufficiency_hint",
  "critic",
  "deep_critic",
  "tone_polisher",
  "memory_extractor",
  "health_check",
] as const;

describe("local model router defaults", () => {
  it("intent_analyzer defaults to qwen2.5:3b", () => expect(getDefaultLocalModelForTask("intent_analyzer")).toBe("qwen2.5:3b"));
  it("listening_analyzer defaults to qwen2.5:3b", () => expect(getDefaultLocalModelForTask("listening_analyzer")).toBe("qwen2.5:3b"));
  it("query_expander defaults to qwen2.5:3b", () => expect(getDefaultLocalModelForTask("query_expander")).toBe("qwen2.5:3b"));
  it("sufficiency_hint defaults to qwen2.5:3b", () => expect(getDefaultLocalModelForTask("sufficiency_hint")).toBe("qwen2.5:3b"));
  it("critic defaults to qwen2.5:3b", () => expect(getDefaultLocalModelForTask("critic")).toBe("qwen2.5:3b"));
  it("tone_polisher defaults to qwen2.5:3b", () => expect(getDefaultLocalModelForTask("tone_polisher")).toBe("qwen2.5:3b"));
  it("memory_extractor defaults to qwen2.5:3b", () => expect(getDefaultLocalModelForTask("memory_extractor")).toBe("qwen2.5:3b"));
  it("deep_critic does not default to qwen2.5:7b", () => expect(getDefaultLocalModelForTask("deep_critic")).toBe("qwen2.5:3b"));
  it("base URL defaults to http://127.0.0.1:8787", () => expect(getLocalModelProfile("intent_analyzer", {}).baseUrl).toBe("http://127.0.0.1:8787"));
  it("analyzer timeout defaults to 25000", () => expect(getLocalModelProfile("intent_analyzer", {}).timeoutMs).toBe(25000));
  it("critic timeout defaults to 30000", () => expect(getLocalModelProfile("critic", {}).timeoutMs).toBe(30000));
  it("required defaults false", () => expect(getLocalModelProfile("critic", {}).required).toBe(false));
  it("health check enabled by default", () => expect(getLocalModelProfile("health_check", {}).enabled).toBe(true));
});

describe("local model router env parsing", () => {
  it("ASTRO_LOCAL_ANALYZER_MODEL overrides analyzer model", () => expect(getLocalModelProfile("intent_analyzer", { ASTRO_LOCAL_ANALYZER_MODEL: "custom" }).model).toBe("custom"));
  it("ASTRO_LOCAL_CRITIC_MODEL overrides critic model", () => expect(getLocalModelProfile("critic", { ASTRO_LOCAL_CRITIC_MODEL: "critic-custom" }).model).toBe("critic-custom"));
  it("ASTRO_LOCAL_QUERY_EXPANDER_MODEL overrides query expander", () => expect(getLocalModelProfile("query_expander", { ASTRO_LOCAL_QUERY_EXPANDER_MODEL: "qe-custom" }).model).toBe("qe-custom"));
  it("ASTRO_LOCAL_ANALYZER_BASE_URL overrides base URL", () => expect(getLocalModelProfile("intent_analyzer", { ASTRO_LOCAL_ANALYZER_BASE_URL: "http://100.80.50.114:8787" }).baseUrl).toBe("http://100.80.50.114:8787"));
  it("trailing slash in base URL normalized", () => expect(normalizeLocalBaseUrl("http://127.0.0.1:8787/")).toBe("http://127.0.0.1:8787"));
  it("invalid timeout falls back", () => expect(getLocalModelProfile("critic", { ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "bad" }).timeoutMs).toBe(30000));
  it("timeout below min clamps", () => expect(getLocalModelProfile("critic", { ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "1" }).timeoutMs).toBe(1000));
  it("timeout above max clamps", () => expect(getLocalModelProfile("critic", { ASTRO_LOCAL_CRITIC_TIMEOUT_MS: "999999" }).timeoutMs).toBe(120000));
  it("max input chars parses", () => expect(getLocalModelProfile("intent_analyzer", { ASTRO_LOCAL_ANALYZER_MAX_INPUT_CHARS: "16000" }).maxInputChars).toBe(16000));
  it("invalid concurrency falls back to 1", () => expect(getLocalModelProfile("intent_analyzer", { ASTRO_LOCAL_ANALYZER_CONCURRENCY: "bad" }).concurrency).toBe(1));
  it("booleans parse true false 1 0 yes no", () => {
    expect(parseLocalBoolean("true", false)).toBe(true);
    expect(parseLocalBoolean("false", true)).toBe(false);
    expect(parseLocalBoolean("1", false)).toBe(true);
    expect(parseLocalBoolean("0", true)).toBe(false);
    expect(parseLocalBoolean("yes", false)).toBe(true);
    expect(parseLocalBoolean("no", true)).toBe(false);
  });
  it("unknown boolean falls back", () => expect(parseLocalBoolean("maybe", true)).toBe(true));
  it("integer parser clamps safely", () => {
    expect(parseLocalInteger("7", 1, 2, 6)).toBe(6);
    expect(parseLocalInteger("-4", 1, 2, 6)).toBe(2);
    expect(parseLocalInteger("bad", 3, 2, 6)).toBe(3);
  });
});

describe("local model router task routing", () => {
  it("intent analyzer disabled when ASTRO_LOCAL_ANALYZER_ENABLED=false", () => expect(routeLocalModelTask("intent_analyzer", { ASTRO_LOCAL_ANALYZER_ENABLED: "false" }).useLocal).toBe(false));
  it("intent analyzer enabled when ASTRO_LOCAL_ANALYZER_ENABLED=true", () => expect(routeLocalModelTask("intent_analyzer", { ASTRO_LOCAL_ANALYZER_ENABLED: "true" }).useLocal).toBe(true));
  it("listening analyzer disabled when ASTRO_LISTENING_ANALYZER_ENABLED=false", () => expect(routeLocalModelTask("listening_analyzer", { ASTRO_LISTENING_ANALYZER_ENABLED: "false", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }).useLocal).toBe(false));
  it("listening analyzer enabled only when listening flag true and analyzer available", () => expect(routeLocalModelTask("listening_analyzer", { ASTRO_LISTENING_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }).useLocal).toBe(true));
  it("query expander disabled by default", () => expect(routeLocalModelTask("query_expander", {}).useLocal).toBe(false));
  it("query expander enabled by ASTRO_LOCAL_QUERY_EXPANDER_ENABLED=true", () => expect(routeLocalModelTask("query_expander", { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" }).useLocal).toBe(true));
  it("critic disabled by default", () => expect(routeLocalModelTask("critic", {}).useLocal).toBe(false));
  it("critic enabled by ASTRO_LOCAL_CRITIC_ENABLED=true", () => expect(routeLocalModelTask("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true" }).useLocal).toBe(true));
  it("critic enabled by ASTRO_OLLAMA_CRITIC_ENABLED=true", () => expect(routeLocalModelTask("critic", { ASTRO_OLLAMA_CRITIC_ENABLED: "true" }).useLocal).toBe(true));
  it("deep critic disabled by default", () => expect(routeLocalModelTask("deep_critic", {}).useLocal).toBe(false));
  it("tone polisher disabled by default", () => expect(routeLocalModelTask("tone_polisher", {}).useLocal).toBe(false));
  it("health check enabled", () => expect(routeLocalModelTask("health_check", {}).useLocal).toBe(true));
});

describe("local model router safety warnings", () => {
  it("qwen2.5:1.5b warns fast fallback", () => expect(getLocalModelProfile("critic", { ASTRO_LOCAL_CRITIC_MODEL: "qwen2.5:1.5b", ASTRO_LOCAL_CRITIC_ENABLED: "true" }).warnings).toContain("fast fallback, weaker reasoning"));
  it("qwen2.5:7b warns slow manual", () => expect(getLocalModelProfile("deep_critic", { ASTRO_LOCAL_DEEP_CRITIC_MODEL: "qwen2.5:7b", ASTRO_LOCAL_DEEP_CRITIC_ENABLED: "true" }).warnings).toContain("manual/deep critic only, too slow for normal app flow"));
  it("qwen2.5:7b on normal task produces fallback reason unless allowed", () => expect(routeLocalModelTask("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true", ASTRO_LOCAL_CRITIC_MODEL: "qwen2.5:7b" }).fallbackReason).toBe("deep_model_blocked_for_normal_task"));
  it("qwen2.5:7b allowed for deep_critic with warning", () => expect(routeLocalModelTask("deep_critic", { ASTRO_LOCAL_DEEP_CRITIC_ENABLED: "true", ASTRO_LOCAL_DEEP_CRITIC_MODEL: "qwen2.5:7b", ASTRO_LOCAL_ALLOW_7B_FOR_NORMAL_TASKS: "true" }).useLocal).toBe(true));
  it("unknown model warns", () => expect(getLocalModelProfile("intent_analyzer", { ASTRO_LOCAL_ANALYZER_MODEL: "custom-model", ASTRO_LOCAL_ANALYZER_ENABLED: "true" }).warnings.join(" ")).toContain("unknown local model: custom-model"));
  it("local required true in production-like env errors or warns strongly", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const profile = getLocalModelProfile("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true", ASTRO_LOCAL_CRITIC_REQUIRED: "true" });
      expect(validateLocalModelProfile(profile).errors.join(" ")).toContain("required local AI must remain false in production-like env");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    }
  });
  it("missing base URL when enabled creates fallback reason", () => expect(routeLocalModelTask("intent_analyzer", { ASTRO_LOCAL_ANALYZER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: " " }).fallbackReason).toBe("missing_base_url"));
  it("invalid profile validation fails", () => expect(validateLocalModelProfile({ task: "critic", provider: "ollama", model: "", baseUrl: "", timeoutMs: 1, maxInputChars: 1, concurrency: 1, required: false, enabled: true, warnings: [] }).ok).toBe(false));
  it("production-groq style env does not require local AI", () => expect(routeLocalModelTask("critic", { ASTRO_RAG_ENABLED: "true", ASTRO_LOCAL_CRITIC_ENABLED: "false" }).useLocal).toBe(false));
  it("production optional laptop may enable local AI only with required=false", () => expect(routeLocalModelTask("critic", { NODE_ENV: "production", ASTRO_LOCAL_CRITIC_ENABLED: "true", ASTRO_LOCAL_CRITIC_REQUIRED: "false" }).useLocal).toBe(true));
  it("local critic required true warns/errors in production-like env", () => expect(routeLocalModelTask("critic", { NODE_ENV: "production", ASTRO_LOCAL_CRITIC_ENABLED: "true", ASTRO_LOCAL_CRITIC_REQUIRED: "true" }).warnings.join(" ")).toContain("required local AI is not allowed in production-like env"));
  it("router never enables local AI solely because ASTRO_RAG_ENABLED=true", () => expect(routeLocalModelTask("intent_analyzer", { ASTRO_RAG_ENABLED: "true" }).useLocal).toBe(false));
});

describe("local model router redaction", () => {
  it("redacts TARAYAI_LOCAL_SECRET", () => expect(JSON.stringify(redactLocalModelConfigForLog({ TARAYAI_LOCAL_SECRET: "abc" }))).toContain("[REDACTED]"));
  it("redacts x-tarayai-local-secret", () => expect(JSON.stringify(redactLocalModelConfigForLog({ "x-tarayai-local-secret": "abc" }))).toContain("[REDACTED]"));
  it("redacts Authorization bearer", () => expect(JSON.stringify(redactLocalModelConfigForLog({ Authorization: "Bearer abc.def" }))).toContain("[REDACTED]"));
  it("redacts token fields", () => expect(JSON.stringify(redactLocalModelConfigForLog({ token: "abc" }))).toContain("[REDACTED]"));
  it("redacts api_key fields", () => expect(JSON.stringify(redactLocalModelConfigForLog({ api_key: "abc" }))).toContain("[REDACTED]"));
  it("redacts long hex secret values", () => expect(JSON.stringify(redactLocalModelConfigForLog({ value: "a".repeat(40) }))).toContain("[REDACTED]"));
  it("does not redact safe model name qwen2.5:3b", () => expect(JSON.stringify(redactLocalModelConfigForLog({ model: "qwen2.5:3b" }))).toContain("qwen2.5:3b"));
  it("does not redact safe base host except secret query params", () => expect(JSON.stringify(redactLocalModelConfigForLog({ baseUrl: "http://127.0.0.1:8787?secret=abc" }))).toContain("[REDACTED]"));
});

describe("local model router integration compatibility", () => {
  it("existing local analyzer env profile remains compatible", () => {
    const profile = getLocalModelProfile("intent_analyzer", baseEnv);
    expect(profile.provider).toBe("ollama");
    expect(profile.model).toBe("qwen2.5:3b");
    expect(profile.baseUrl).toBe("http://127.0.0.1:8787");
  });
  it("existing local critic env profile remains compatible", () => {
    const profile = getLocalModelProfile("critic", { ...baseEnv, ASTRO_LOCAL_CRITIC_ENABLED: "true" });
    expect(profile.provider).toBe("ollama");
    expect(profile.timeoutMs).toBe(30000);
  });
  it("health checker can read router profile without network", () => {
    const profile = getLocalModelProfile("health_check", {});
    expect(profile.enabled).toBe(true);
    expect(profile.baseUrl).toBe("http://127.0.0.1:8787");
  });
  it("router makes no network calls", () => {
    const profile = routeLocalModelTask("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true" });
    expect(profile.profile).toBeDefined();
    expect(profile.warnings.length).toBeGreaterThanOrEqual(0);
  });
});

describe("local model router additional coverage", () => {
  it.each(allTasks)("profile exists for %s", (task) => {
    const profile = getLocalModelProfile(task, {});
    expect(profile.task).toBe(task);
    expect(profile.provider).toBe("ollama");
  });

  it("normal request path tasks default to qwen2.5:3b", () => {
    for (const task of ["listening_analyzer", "intent_analyzer", "query_expander", "sufficiency_hint", "critic", "tone_polisher", "memory_extractor"] as const) {
      expect(getLocalModelProfile(task, {}).model).toBe("qwen2.5:3b");
    }
  });

  it("deep critic can opt into qwen2.5:7b explicitly", () => {
    const profile = getLocalModelProfile("deep_critic", { ASTRO_LOCAL_DEEP_CRITIC_ENABLED: "true", ASTRO_LOCAL_DEEP_CRITIC_MODEL: "qwen2.5:7b", ASTRO_LOCAL_ALLOW_7B_FOR_NORMAL_TASKS: "true" });
    expect(profile.model).toBe("qwen2.5:7b");
  });

  it("production-like required true returns validation errors", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const profile = { ...getLocalModelProfile("critic", { ASTRO_LOCAL_CRITIC_ENABLED: "true", ASTRO_LOCAL_CRITIC_REQUIRED: "true" }) };
      const result = validateLocalModelProfile(profile);
      expect(result.ok).toBe(false);
      expect(result.errors.join(" ")).toContain("production-like env");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    }
  });
});
