import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAstroIntegrationChecks,
  summarizeIntegrationChecks,
} from "@/lib/astro/config/integration-checks";

const ORIGINAL_ENV = process.env;

describe("Astro integration readiness checks", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.GROQ_API_KEY;
    delete process.env.ASTRO_ENGINE_URL;
    delete process.env.ASTRO_PYTHON_ENGINE_URL;
    delete process.env.PYTHON_ENGINE_URL;
    delete process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns readiness checks without exposing secrets", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret-service-role";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret-upstash-token";
    process.env.GROQ_API_KEY = "secret-groq";

    const checks = getAstroIntegrationChecks();
    const serialized = JSON.stringify(checks);

    expect(checks.length).toBeGreaterThan(0);
    expect(serialized).not.toContain("secret-service-role");
    expect(serialized).not.toContain("secret-upstash-token");
    expect(serialized).not.toContain("secret-groq");
  });

  it("warns rather than throws when optional env is missing", () => {
    const checks = getAstroIntegrationChecks();

    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every((check) => ["pass", "warn", "fail"].includes(check.status))).toBe(true);
    expect(checks.some((check) => check.status === "warn")).toBe(true);
  });

  it("passes configured core integrations", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.GROQ_API_KEY = "groq";
    process.env.ASTRO_ENGINE_URL = "https://oracle-vm.example";
    process.env.VERCEL_URL = "preview.vercel.app";

    const checks = getAstroIntegrationChecks();
    const summary = summarizeIntegrationChecks(checks);

    expect(summary.fail).toBe(0);
    expect(summary.pass).toBeGreaterThan(0);
  });
});
