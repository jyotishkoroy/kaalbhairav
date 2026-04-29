/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import {
  getAstroIntegrationChecks,
  summarizeIntegrationChecks,
  type IntegrationCheck,
} from "@/lib/astro/config/integration-checks";
import {
  getAstroRolloutFlagState,
  getAstroRolloutReadiness,
  type AstroRolloutFlagState,
} from "@/lib/astro/config/rollout-flags";

export type PreviewVerificationStatus = "pass" | "warn" | "fail";

export type PreviewVerificationResult = {
  status: PreviewVerificationStatus;
  summary: string;
  rolloutFlags: AstroRolloutFlagState;
  integrationChecks: IntegrationCheck[];
  warnings: string[];
  failures: string[];
};

function hasEnv(name: string): boolean {
  return typeof process.env[name] === "string" && process.env[name]!.trim().length > 0;
}

function isVercelPreviewEnvironment(): boolean {
  return (
    process.env.VERCEL_ENV === "preview" ||
    Boolean(process.env.VERCEL_URL) ||
    Boolean(process.env.NEXT_PUBLIC_VERCEL_URL)
  );
}

function getPreviewWarnings(input: {
  rolloutSafe: boolean;
  integrationWarnCount: number;
  integrationFailCount: number;
}): string[] {
  const warnings: string[] = [];

  if (!isVercelPreviewEnvironment()) {
    warnings.push("Not running in a detected Vercel preview environment.");
  }

  if (!hasEnv("NEXT_PUBLIC_SITE_URL") && !hasEnv("VERCEL_URL")) {
    warnings.push("NEXT_PUBLIC_SITE_URL or VERCEL_URL is recommended for preview verification.");
  }

  if (!input.rolloutSafe) {
    warnings.push("One or more experimental Astro flags are enabled.");
  }

  if (input.integrationWarnCount > 0) {
    warnings.push(`${input.integrationWarnCount} integration readiness checks are warnings.`);
  }

  if (input.integrationFailCount > 0) {
    warnings.push(`${input.integrationFailCount} integration readiness checks failed.`);
  }

  return warnings;
}

export function verifyAstroPreviewDeployment(): PreviewVerificationResult {
  const rollout = getAstroRolloutReadiness();
  const rolloutFlags = getAstroRolloutFlagState();
  const integrationChecks = getAstroIntegrationChecks();
  const integrationSummary = summarizeIntegrationChecks(integrationChecks);
  const failures = integrationChecks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.label}: ${check.message}`);
  const warnings = [
    ...rollout.reasons,
    ...getPreviewWarnings({
      rolloutSafe: rollout.safeForDefaultProduction,
      integrationWarnCount: integrationSummary.warn,
      integrationFailCount: integrationSummary.fail,
    }),
  ];

  const status: PreviewVerificationStatus =
    failures.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass";

  return {
    status,
    summary:
      status === "pass"
        ? "Preview deployment checks passed."
        : status === "warn"
          ? "Preview deployment checks passed with warnings."
          : "Preview deployment checks failed.",
    rolloutFlags,
    integrationChecks,
    warnings,
    failures,
  };
}

export function formatPreviewVerificationReport(
  result = verifyAstroPreviewDeployment(),
): string {
  const lines = [
    "# Astro V2 Preview Verification",
    "",
    `Status: ${result.status}`,
    `Summary: ${result.summary}`,
    "",
    "## Rollout flags",
    `ASTRO_READING_V2_ENABLED: ${result.rolloutFlags.server.readingV2Enabled}`,
    `ASTRO_MEMORY_ENABLED: ${result.rolloutFlags.server.memoryEnabled}`,
    `ASTRO_REMEDIES_ENABLED: ${result.rolloutFlags.server.remediesEnabled}`,
    `ASTRO_MONTHLY_ENABLED: ${result.rolloutFlags.server.monthlyEnabled}`,
    `NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED: ${result.rolloutFlags.client.readingV2UiEnabled}`,
    `NEXT_PUBLIC_ASTRO_VOICE_ENABLED: ${result.rolloutFlags.client.voiceEnabled}`,
    `ASTRO_LLM_PROVIDER: ${result.rolloutFlags.llm.provider}`,
    "",
    "## Integration checks",
    ...result.integrationChecks.map(
      (check) => `- ${check.status.toUpperCase()} ${check.label}: ${check.message}`,
    ),
  ];

  if (result.warnings.length > 0) {
    lines.push("", "## Warnings", ...result.warnings.map((warning) => `- ${warning}`));
  }

  if (result.failures.length > 0) {
    lines.push("", "## Failures", ...result.failures.map((failure) => `- ${failure}`));
  }

  return lines.join("\n");
}
