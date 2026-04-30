/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAstroRagFlags } from "@/lib/astro/rag/feature-flags";

export type RolloutStage =
  | "local-deterministic"
  | "preview-deterministic"
  | "preview-groq"
  | "production-groq"
  | "production-optional-laptop";

export type RolloutValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  suggestedEnv?: string;
  suggestedCommand?: string;
};

type ParsedEnvFile = {
  env: Record<string, string>;
  path: string;
};

const STAGE_RULES: Record<RolloutStage, { production: boolean }> = {
  "local-deterministic": { production: false },
  "preview-deterministic": { production: false },
  "preview-groq": { production: false },
  "production-groq": { production: true },
  "production-optional-laptop": { production: true },
};

function readBool(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function loadEnvFile(envFilePath: string): ParsedEnvFile {
  const absolutePath = resolve(envFilePath);
  const contents = readFileSync(absolutePath, "utf8");
  return { env: parseEnvFile(contents), path: absolutePath };
}

function issue(severity: "error" | "warning", code: string, message: string): RolloutValidationIssue {
  return { severity, code, message };
}

function issueWithFix(severity: "error" | "warning", code: string, message: string, suggestedEnv?: string, suggestedCommand?: string): RolloutValidationIssue {
  return { severity, code, message, suggestedEnv, suggestedCommand };
}

function suggestCommand(stage: RolloutStage): string {
  switch (stage) {
    case "production-groq":
      return "ASTRO_RAG_ENABLED=true ASTRO_REASONING_GRAPH_ENABLED=true ASTRO_LLM_ANSWER_ENGINE_ENABLED=true ASTRO_VALIDATE_LLM_OUTPUT=true npm run validate:astro-rag-rollout -- --stage production-groq --json";
    case "local-deterministic":
      return "ASTRO_RAG_ENABLED=true ASTRO_REASONING_GRAPH_ENABLED=true ASTRO_LLM_ANSWER_ENGINE_ENABLED=false npm run validate:astro-rag-rollout -- --stage local-deterministic --json";
    case "preview-deterministic":
      return "ASTRO_RAG_ENABLED=true ASTRO_REASONING_GRAPH_ENABLED=true ASTRO_LLM_ANSWER_ENGINE_ENABLED=false npm run validate:astro-rag-rollout -- --stage preview-deterministic --json";
    case "preview-groq":
      return "ASTRO_RAG_ENABLED=true ASTRO_REASONING_GRAPH_ENABLED=false ASTRO_LLM_ANSWER_ENGINE_ENABLED=true ASTRO_VALIDATE_LLM_OUTPUT=true npm run validate:astro-rag-rollout -- --stage preview-groq --json";
    case "production-optional-laptop":
      return "ASTRO_RAG_ENABLED=true ASTRO_REASONING_GRAPH_ENABLED=true ASTRO_LLM_ANSWER_ENGINE_ENABLED=true ASTRO_VALIDATE_LLM_OUTPUT=true npm run validate:astro-rag-rollout -- --stage production-optional-laptop --json";
  }
}

function addIfDefined(issues: RolloutValidationIssue[], condition: boolean, next: RolloutValidationIssue) {
  if (condition) issues.push(next);
}

function isProductionStage(stage: RolloutStage): boolean {
  return STAGE_RULES[stage].production;
}

export function validateAstroRagRolloutEnv(input: {
  stage: RolloutStage;
  env: Record<string, string | undefined>;
  strict?: boolean;
}): {
  ok: boolean;
  stage: RolloutStage;
  issues: RolloutValidationIssue[];
} {
  const flags = getAstroRagFlags(input.env);
  const issues: RolloutValidationIssue[] = [];
  const stage = input.stage;
  const production = isProductionStage(stage);
  const strict = input.strict ?? false;
  const ragEnabled = readBool(input.env.ASTRO_RAG_ENABLED);
  const llmEnabled = readBool(input.env.ASTRO_LLM_ANSWER_ENGINE_ENABLED);
  const validateOutput = readBool(input.env.ASTRO_VALIDATE_LLM_OUTPUT);
  const localAnalyzerEnabled = readBool(input.env.ASTRO_LOCAL_ANALYZER_ENABLED);
  const localCriticEnabled = readBool(input.env.ASTRO_LOCAL_CRITIC_ENABLED);
  const localCriticRequired = readBool(input.env.ASTRO_LOCAL_CRITIC_REQUIRED);
  const companionMemoryEnabled = readBool(input.env.ASTRO_COMPANION_MEMORY_ENABLED);
  const companionStoreEnabled = readBool(input.env.ASTRO_COMPANION_MEMORY_STORE_ENABLED);
  const companionRetrieveEnabled = readBool(input.env.ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED);
  const model = input.env.ASTRO_LOCAL_ANALYZER_MODEL || flags.localAnalyzerModel;

  if (ragEnabled === false) {
    issues.push(issue("error", "rag-disabled", "ASTRO_RAG_ENABLED must be true for staged rollout validation."));
  } else if (ragEnabled === undefined && stage !== "local-deterministic") {
    issues.push(issue("warning", "rag-implicit", "ASTRO_RAG_ENABLED is unset; rollout stages should set it explicitly."));
  }

  if (llmEnabled === true && validateOutput === false) {
    issues.push(issue("error", "validator-disabled", "ASTRO_VALIDATE_LLM_OUTPUT must not be false when the LLM writer is enabled."));
  }

  if (localCriticRequired === true && production) {
    issues.push(issue("error", "critic-required-production", "ASTRO_LOCAL_CRITIC_REQUIRED must remain false in production stages."));
  }

  if (companionMemoryEnabled === false) {
    addIfDefined(
      issues,
      companionStoreEnabled === true,
      issue("warning", "memory-store-without-memory", "ASTRO_COMPANION_MEMORY_STORE_ENABLED is set while companion memory is disabled."),
    );
    addIfDefined(
      issues,
      companionRetrieveEnabled === true,
      issue("warning", "memory-retrieve-without-memory", "ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED is set while companion memory is disabled."),
    );
  }

  if (production && companionStoreEnabled === true) {
    issues.push(issue("warning", "memory-store-production", "ASTRO_COMPANION_MEMORY_STORE_ENABLED should stay off in production rollout until explicitly approved."));
  }

  if (stage === "local-deterministic") {
    if (input.env.ASTRO_RAG_ENABLED !== "true") issues.push(issueWithFix("error", "local-rag-required", "local-deterministic requires ASTRO_RAG_ENABLED=true.", "ASTRO_RAG_ENABLED=true", suggestCommand(stage)));
    if (input.env.ASTRO_LLM_ANSWER_ENGINE_ENABLED === "true") issues.push(issueWithFix("error", "local-llm-enabled", "local-deterministic must not enable the Groq writer.", "ASTRO_LLM_ANSWER_ENGINE_ENABLED=false", suggestCommand(stage)));
    if (localAnalyzerEnabled === true && !input.env.ASTRO_LOCAL_ANALYZER_BASE_URL) {
      issues.push(issue("warning", "local-base-url-missing", "Local analyzer is enabled but ASTRO_LOCAL_ANALYZER_BASE_URL is missing."));
    }
  }

  if (stage === "preview-deterministic") {
    if (input.env.ASTRO_RAG_ENABLED !== "true") issues.push(issueWithFix("error", "preview-rag-required", "preview-deterministic requires ASTRO_RAG_ENABLED=true.", "ASTRO_RAG_ENABLED=true", suggestCommand(stage)));
    if (input.env.ASTRO_LLM_ANSWER_ENGINE_ENABLED === "true") issues.push(issueWithFix("error", "preview-llm-enabled", "preview-deterministic must keep the Groq writer disabled.", "ASTRO_LLM_ANSWER_ENGINE_ENABLED=false", suggestCommand(stage)));
    if (localAnalyzerEnabled === true) issues.push(issue("error", "preview-local-analyzer", "preview-deterministic must keep the local analyzer disabled."));
    if (localCriticEnabled === true) issues.push(issue("error", "preview-local-critic", "preview-deterministic must keep the local critic disabled."));
  }

  if (stage === "preview-groq") {
    if (input.env.ASTRO_RAG_ENABLED !== "true") issues.push(issueWithFix("error", "preview-rag-required", "preview-groq requires ASTRO_RAG_ENABLED=true.", "ASTRO_RAG_ENABLED=true", suggestCommand(stage)));
    if (input.env.ASTRO_LLM_ANSWER_ENGINE_ENABLED !== "true") issues.push(issueWithFix("error", "preview-llm-required", "preview-groq requires ASTRO_LLM_ANSWER_ENGINE_ENABLED=true.", "ASTRO_LLM_ANSWER_ENGINE_ENABLED=true", suggestCommand(stage)));
    if (validateOutput === false) issues.push(issueWithFix("error", "preview-validator-disabled", "preview-groq requires ASTRO_VALIDATE_LLM_OUTPUT to stay enabled.", "ASTRO_VALIDATE_LLM_OUTPUT=true", suggestCommand(stage)));
    if (localAnalyzerEnabled === true) issues.push(issue("error", "preview-local-analyzer", "preview-groq must keep the local analyzer disabled."));
    if (localCriticEnabled === true) issues.push(issue("error", "preview-local-critic", "preview-groq must keep the local critic disabled."));
  }

  if (stage === "production-groq") {
    if (input.env.ASTRO_RAG_ENABLED !== "true") issues.push(issueWithFix("error", "prod-rag-required", "production-groq requires ASTRO_RAG_ENABLED=true.", "ASTRO_RAG_ENABLED=true", "ASTRO_RAG_ENABLED=true ASTRO_REASONING_GRAPH_ENABLED=true ASTRO_LLM_ANSWER_ENGINE_ENABLED=true ASTRO_VALIDATE_LLM_OUTPUT=true npm run validate:astro-rag-rollout -- --stage production-groq --json"));
    if (input.env.ASTRO_REASONING_GRAPH_ENABLED !== "true") issues.push(issueWithFix("error", "prod-reasoning-required", "production-groq requires ASTRO_REASONING_GRAPH_ENABLED=true.", "ASTRO_REASONING_GRAPH_ENABLED=true", "ASTRO_RAG_ENABLED=true ASTRO_REASONING_GRAPH_ENABLED=true ASTRO_LLM_ANSWER_ENGINE_ENABLED=true ASTRO_VALIDATE_LLM_OUTPUT=true npm run validate:astro-rag-rollout -- --stage production-groq --json"));
    if (input.env.ASTRO_LLM_ANSWER_ENGINE_ENABLED !== "true") issues.push(issueWithFix("error", "prod-llm-required", "production-groq requires ASTRO_LLM_ANSWER_ENGINE_ENABLED=true.", "ASTRO_LLM_ANSWER_ENGINE_ENABLED=true", "ASTRO_RAG_ENABLED=true ASTRO_REASONING_GRAPH_ENABLED=true ASTRO_LLM_ANSWER_ENGINE_ENABLED=true ASTRO_VALIDATE_LLM_OUTPUT=true npm run validate:astro-rag-rollout -- --stage production-groq --json"));
    if (validateOutput === false) issues.push(issueWithFix("error", "prod-validator-disabled", "production-groq cannot disable ASTRO_VALIDATE_LLM_OUTPUT.", "ASTRO_VALIDATE_LLM_OUTPUT=true", "ASTRO_RAG_ENABLED=true ASTRO_REASONING_GRAPH_ENABLED=true ASTRO_LLM_ANSWER_ENGINE_ENABLED=true ASTRO_VALIDATE_LLM_OUTPUT=true npm run validate:astro-rag-rollout -- --stage production-groq --json"));
    if (localAnalyzerEnabled === true) issues.push(issue("error", "prod-local-analyzer", "production-groq must keep the local analyzer disabled."));
    if (localCriticEnabled === true) issues.push(issue("error", "prod-local-critic", "production-groq must keep the local critic disabled."));
  }

  if (stage === "production-optional-laptop") {
    if (input.env.ASTRO_RAG_ENABLED !== "true") issues.push(issue("error", "prod-rag-required", "production-optional-laptop requires ASTRO_RAG_ENABLED=true."));
    if (input.env.ASTRO_LLM_ANSWER_ENGINE_ENABLED !== "true") issues.push(issue("error", "prod-llm-required", "production-optional-laptop requires ASTRO_LLM_ANSWER_ENGINE_ENABLED=true."));
    if (localCriticRequired === true) issues.push(issue("error", "critic-required-production", "production-optional-laptop must not require the laptop critic."));
    if (localAnalyzerEnabled === true || localCriticEnabled === true) {
      if (!input.env.ASTRO_LOCAL_ANALYZER_BASE_URL) issues.push(issue("warning", "local-base-url-missing", "Local analyzer or critic is enabled but ASTRO_LOCAL_ANALYZER_BASE_URL is missing."));
    }
    if (model === "qwen2.5:7b") issues.push(issue("warning", "slow-model", "qwen2.5:7b is an optional deep/manual critic model, not the default."));
    if (model === "qwen2.5:1.5b") issues.push(issue("warning", "fallback-model", "qwen2.5:1.5b is only a fast fallback model."));
    if (model && model !== "qwen2.5:3b" && model !== "qwen2.5:1.5b" && model !== "qwen2.5:7b") {
      issues.push(issue("warning", "unknown-model", `Unexpected local analyzer model ${model}.`));
    }
  }

  if (stage === "local-deterministic" && localAnalyzerEnabled === false) {
    issues.push(issue("warning", "local-analyzer-off", "Local deterministic rollout can still run with the local analyzer disabled."));
  }

  if (strict) {
    for (const warning of issues.filter((entry) => entry.severity === "warning")) {
      warning.severity = "error";
    }
  }

  const ok = issues.every((entry) => entry.severity !== "error");
  return { ok, stage, issues };
}

function redact(value: string): string {
  return value
    .replace(/(SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL|COOKIE|GROQ_API_KEY|SUPABASE_SERVICE_ROLE_KEY|UPSTASH_REDIS_REST_TOKEN|ASTRO_LOCAL_ANALYZER_SECRET|ASTRO_LOCAL_CRITIC_SECRET)=([^\s]+)/gi, "$1=[REDACTED]")
    .replace(/(x-tarayai-local-secret[:=]\s*)([^\s]+)/gi, "$1[REDACTED]");
}

export function formatIssue(issueValue: RolloutValidationIssue): string {
  const fix = issueValue.suggestedCommand ? ` Suggested: ${issueValue.suggestedCommand}` : issueValue.suggestedEnv ? ` Suggested env: ${issueValue.suggestedEnv}` : "";
  return `${issueValue.severity.toUpperCase()} ${issueValue.code}: ${issueValue.message}${fix}`;
}

export function parseCliArgs(argv: string[]) {
  const args = {
    stage: undefined as RolloutStage | undefined,
    envFile: undefined as string | undefined,
    json: false,
    strict: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === "--stage" && next) {
      args.stage = next as RolloutStage;
      i += 1;
    } else if (current === "--env-file" && next) {
      args.envFile = next;
      i += 1;
    } else if (current === "--json") {
      args.json = true;
    } else if (current === "--strict") {
      args.strict = true;
    }
  }
  return args;
}

export function loadEnvFromCli(envFilePath?: string) {
  if (!envFilePath) return process.env;
  const parsed = loadEnvFile(envFilePath);
  return { ...process.env, ...parsed.env };
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (!args.stage) {
    console.error("Missing required --stage <name>.");
    process.exitCode = 1;
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(STAGE_RULES, args.stage)) {
    console.error(`Invalid rollout stage: ${redact(String(args.stage))}`);
    process.exitCode = 1;
    return;
  }

  let env: Record<string, string | undefined>;
  try {
    env = loadEnvFromCli(args.envFile);
  } catch (error) {
    console.error(redact(`Unable to read env file: ${String((error as Error)?.message ?? error)}`));
    process.exitCode = 1;
    return;
  }

  const result = validateAstroRagRolloutEnv({
    stage: args.stage,
    env,
    strict: args.strict,
  });

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          stage: result.stage,
          issues: result.issues,
          suggestedEnv: result.issues.find((item) => item.suggestedEnv)?.suggestedEnv,
          suggestedCommand: result.issues.find((item) => item.suggestedCommand)?.suggestedCommand,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`stage=${result.stage} ok=${result.ok} issues=${result.issues.length}`);
    for (const item of result.issues) {
      console.log(redact(formatIssue(item)));
    }
  }

  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("validate-astro-rag-rollout.ts")) {
  void main();
}
