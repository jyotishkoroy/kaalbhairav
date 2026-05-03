/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/astro/ask/answer-canonical-astro-question", () => ({
  answerCanonicalAstroQuestion: vi.fn(),
}));

vi.mock("@/lib/security/request-guards", () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
  checkRateLimit: vi.fn(() => ({ ok: true })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/astro/ask/route";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { answerCanonicalAstroQuestion } from "@/lib/astro/ask/answer-canonical-astro-question";
import { checkRateLimit } from "@/lib/security/request-guards";

function makeRequest(body: unknown) {
  return new NextRequest("https://www.tarayai.com/api/astro/ask", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.tarayai.com" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: "generic answer" });
  process.env.ASTRO_E2E_RATE_LIMIT_DISABLED = "false";
  process.env.ASTRO_E2E_DEBUG_RATE_LIMIT = "false";
});

afterEach(() => {
  delete process.env.ASTRO_E2E_RATE_LIMIT_DISABLED;
  delete process.env.ASTRO_E2E_DEBUG_RATE_LIMIT;
});

describe("POST /api/astro/ask rate-limit toggle", () => {
  it("checks rate limits by default", async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) } } as never);
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "birth_profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "p1" } }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "c1", chart_json: { ascendant: { sign: "Leo" } } } }),
        }
      }),
    } as never);

    await POST(makeRequest({ question: "What is my Lagna?" }));

    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledTimes(2);
  });

  it("skips rate limits when the E2E toggle is enabled", async () => {
    process.env.ASTRO_E2E_RATE_LIMIT_DISABLED = "true";
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) } } as never);
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "birth_profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "p1" } }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "c1", chart_json: { ascendant: { sign: "Leo" } } } }),
        }
      }),
    } as never);

    await POST(makeRequest({ question: "What is my Lagna?" }));

    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
  });

  it("still requires auth when the E2E toggle is enabled", async () => {
    process.env.ASTRO_E2E_RATE_LIMIT_DISABLED = "true";
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } as never);

    const response = await POST(makeRequest({ question: "What is my Lagna?" }));

    expect(response.status).toBe(401);
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
  });
});
