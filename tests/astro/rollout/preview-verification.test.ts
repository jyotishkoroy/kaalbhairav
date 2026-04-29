import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  formatPreviewVerificationReport,
  verifyAstroPreviewDeployment,
} from "@/lib/astro/config/preview-verification";

const ORIGINAL_ENV = process.env;

describe("Astro preview deployment verification", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.ASTRO_READING_V2_ENABLED;
    delete process.env.ASTRO_MEMORY_ENABLED;
    delete process.env.ASTRO_REMEDIES_ENABLED;
    delete process.env.ASTRO_MONTHLY_ENABLED;
    delete process.env.NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED;
    delete process.env.NEXT_PUBLIC_ASTRO_VOICE_ENABLED;
    delete process.env.ASTRO_LLM_PROVIDER;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.GROQ_API_KEY;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns a structured preview verification result", () => {
    const result = verifyAstroPreviewDeployment();

    expect(["pass", "warn", "fail"]).toContain(result.status);
    expect(result.summary).toBeTruthy();
    expect(result.integrationChecks.length).toBeGreaterThan(0);
    expect(result.rolloutFlags.server.readingV2Enabled).toBe(false);
    expect(result.rolloutFlags.llm.provider).toBe("disabled");
  });

  it("reports warnings when experimental flags are enabled", () => {
    process.env.ASTRO_READING_V2_ENABLED = "true";
    process.env.NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED = "true";
    process.env.ASTRO_LLM_PROVIDER = "ollama";

    const result = verifyAstroPreviewDeployment();

    expect(result.status).toBe("warn");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "ASTRO_READING_V2_ENABLED is enabled",
        "NEXT_PUBLIC_ASTRO_READING_V2_UI_ENABLED is enabled",
        "ASTRO_LLM_PROVIDER is not disabled",
      ]),
    );
  });

  it("does not expose secret values in formatted report", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret-service-role";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret-upstash-token";
    process.env.GROQ_API_KEY = "secret-groq";

    const report = formatPreviewVerificationReport();

    expect(report).toContain("Astro V2 Preview Verification");
    expect(report).not.toContain("secret-service-role");
    expect(report).not.toContain("secret-upstash-token");
    expect(report).not.toContain("secret-groq");
  });

  it("formats rollout flags and integration checks", () => {
    const report = formatPreviewVerificationReport();

    expect(report).toContain("## Rollout flags");
    expect(report).toContain("## Integration checks");
    expect(report).toContain("ASTRO_READING_V2_ENABLED");
    expect(report).toContain("ASTRO_LLM_PROVIDER");
  });
});
