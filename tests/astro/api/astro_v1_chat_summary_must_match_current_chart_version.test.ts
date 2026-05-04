/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    constructor() {}
    limit() { return Promise.resolve({ success: true, remaining: 10 }); }
    static fixedWindow() { return {}; }
  },
}));
vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: () => ({}) },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock("@/lib/security/e2e-rate-limit", () => ({
  isE2ERateLimitDisabled: () => true,
  logE2ERateLimitDisabled: () => {},
}));

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/astro/v1/chat/route";

const ORIGINAL_ENV = { ...process.env };

function makeSupabaseUser(userId: string) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
  };
}

function makeServiceWithProfile(
  profile: Record<string, unknown> | null,
  summary: Record<string, unknown> | null,
) {
  const makeQuery = (data: unknown) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  });

  return {
    from: vi.fn((table: string) => {
      if (table === "birth_profiles") return makeQuery(profile);
      if (table === "prediction_ready_summaries") return makeQuery(summary);
      return makeQuery(null);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.ASTRO_V1_API_ENABLED = "true";
  process.env.ASTRO_V1_CHAT_ENABLED = "true";
  process.env.ASTRO_CONVERSATION_ORCHESTRATOR_ENABLED = "false";
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("astro_v1_chat_summary_must_match_current_chart_version", () => {
  it("returns summary_not_ready when no summary exists for current chart version", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseUser("u1") as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceWithProfile(
      { id: "123e4567-e89b-41d4-a716-426614174000", user_id: "u1", status: "active", current_chart_version_id: "cv-leo" },
      null,
    ) as never);

    const req = new Request("http://localhost/api/astro/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: "123e4567-e89b-41d4-a716-426614174000", question: "What is my Lagna?", topic: "general" }),
    });
    const response = await POST(req as never);
    const data = await response.json() as Record<string, unknown>;
    expect(data.error).toBe("summary_not_ready");
  });

  it("returns chart_not_ready when current_chart_version_id is null", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseUser("u1") as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceWithProfile(
      { id: "123e4567-e89b-41d4-a716-426614174000", user_id: "u1", status: "active", current_chart_version_id: null },
      null,
    ) as never);

    const req = new Request("http://localhost/api/astro/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: "123e4567-e89b-41d4-a716-426614174000", question: "What is my Lagna?", topic: "general" }),
    });
    const response = await POST(req as never);
    const data = await response.json() as Record<string, unknown>;
    expect(data.error).toBe("chart_not_ready");
  });

  it("returns profile_not_found when profile does not belong to user", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseUser("u1") as never);
    vi.mocked(createServiceClient).mockReturnValue(makeServiceWithProfile(
      null,
      null,
    ) as never);

    const req = new Request("http://localhost/api/astro/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: "123e4567-e89b-41d4-a716-426614174001", question: "What is my Lagna?", topic: "general" }),
    });
    const response = await POST(req as never);
    const data = await response.json() as Record<string, unknown>;
    expect(data.error).toBe("profile_not_found");
  });
});
