export type IntegrationCheckStatus = "pass" | "warn" | "fail";

export type IntegrationCheck = {
  id: string;
  label: string;
  status: IntegrationCheckStatus;
  message: string;
};

function hasEnv(name: string): boolean {
  return typeof process.env[name] === "string" && process.env[name]!.trim().length > 0;
}

function optionalEnv(name: string): boolean {
  return hasEnv(name);
}

export function getAstroIntegrationChecks(): IntegrationCheck[] {
  const checks: IntegrationCheck[] = [
    {
      id: "supabase-url",
      label: "Supabase URL",
      status: hasEnv("NEXT_PUBLIC_SUPABASE_URL") || hasEnv("SUPABASE_URL") ? "pass" : "warn",
      message:
        "Supabase URL should be configured for authenticated chat/profile flows.",
    },
    {
      id: "supabase-anon-key",
      label: "Supabase anon key",
      status: hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "pass" : "warn",
      message:
        "Supabase anon key should be configured for browser/client auth flows.",
    },
    {
      id: "supabase-service-role",
      label: "Supabase service role",
      status: hasEnv("SUPABASE_SERVICE_ROLE_KEY") ? "pass" : "warn",
      message:
        "Supabase service role key is required by server-side service client operations.",
    },
    {
      id: "upstash-url",
      label: "Upstash Redis URL",
      status: hasEnv("UPSTASH_REDIS_REST_URL") ? "pass" : "warn",
      message:
        "Upstash Redis URL is required for rate limiting in the chat route.",
    },
    {
      id: "upstash-token",
      label: "Upstash Redis token",
      status: hasEnv("UPSTASH_REDIS_REST_TOKEN") ? "pass" : "warn",
      message:
        "Upstash Redis token is required for rate limiting in the chat route.",
    },
    {
      id: "groq-api-key",
      label: "Groq API key",
      status: optionalEnv("GROQ_API_KEY") ? "pass" : "warn",
      message:
        "Groq API key is used by the legacy streaming path when the conversation orchestrator is disabled.",
    },
    {
      id: "astro-engine-url",
      label: "Astro engine / Oracle VM URL",
      status:
        hasEnv("ASTRO_ENGINE_SERVICE_URL") ||
        hasEnv("ASTRO_ENGINE_URL") ||
        hasEnv("ASTRO_PYTHON_ENGINE_URL") ||
        hasEnv("PYTHON_ENGINE_URL")
          ? "pass"
          : "warn",
      message:
        "Remote Oracle VM / Python engine URL should be configured if calculation route depends on remote engine. Supported names include ASTRO_ENGINE_SERVICE_URL, ASTRO_ENGINE_URL, ASTRO_PYTHON_ENGINE_URL, and PYTHON_ENGINE_URL.",
    },
    {
      id: "astro-engine-service-api-key",
      label: "Astro engine service API key",
      status: optionalEnv("ASTRO_ENGINE_SERVICE_API_KEY") ? "pass" : "warn",
      message:
        "Remote astro engine service API key should be set when the remote engine service requires authentication.",
    },
    {
      id: "vercel-url",
      label: "Vercel deployment URL",
      status: optionalEnv("VERCEL_URL") || optionalEnv("NEXT_PUBLIC_SITE_URL") ? "pass" : "warn",
      message:
        "Vercel/NEXT_PUBLIC_SITE_URL is recommended for metadata, previews, and deployment checks.",
    },
  ];

  return checks;
}

export function summarizeIntegrationChecks(checks = getAstroIntegrationChecks()): {
  pass: number;
  warn: number;
  fail: number;
} {
  return checks.reduce(
    (summary, check) => {
      summary[check.status] += 1;
      return summary;
    },
    {
      pass: 0,
      warn: 0,
      fail: 0,
    },
  );
}
