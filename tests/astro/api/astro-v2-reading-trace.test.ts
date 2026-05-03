/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const readMock = vi.hoisted(() => vi.fn(async (_input: unknown, options?: { exposeTrace?: boolean }) => ({
  answer: "Answer",
  meta: { version: "v2", directV2Route: true, e2eTrace: options?.exposeTrace ? { response: { debugTraceExposed: true } } : undefined },
})));

vi.mock("@/lib/astro/reading/reading-orchestrator-v2", () => ({
  generateReadingV2: readMock,
}));

import { POST } from "@/app/api/astro/v2/reading/route";

function req(body: unknown, debug = false) {
  return new Request("https://www.tarayai.com/api/astro/v2/reading", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(debug ? { "x-tarayai-debug-trace": "true" } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("/api/astro/v2/reading trace exposure", () => {
  const originalEnv = { ...process.env };

  function setEnv(name: string, value: string | undefined) {
    if (value === undefined) {
      delete process.env[name];
      return;
    }
    process.env[name] = value;
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ASTRO_E2E_TRACE_ENABLED;
    readMock.mockClear();
  });

  it("keeps trace hidden by default", async () => {
    const response = await POST(req({ question: "What is my Lagna?" }));
    const payload = await response.json();
    expect(payload.meta.e2eTrace).toBeUndefined();
  });

  it("requires env flag in production", async () => {
    setEnv("NODE_ENV", "production");
    setEnv("ASTRO_E2E_TRACE_ENABLED", "false");
    const response = await POST(req({ question: "What is my Lagna?", metadata: { debugTrace: true } }, true));
    const payload = await response.json();
    expect(payload.meta.e2eTrace).toBeUndefined();
  });

  it("exposes trace when enabled in production", async () => {
    setEnv("NODE_ENV", "production");
    setEnv("ASTRO_E2E_TRACE_ENABLED", "true");
    const response = await POST(req({ question: "What is my Lagna?", metadata: { debugTrace: true } }, true));
    const payload = await response.json();
    expect(payload.meta.e2eTrace).toBeTruthy();
    expect(JSON.stringify(payload.meta.e2eTrace)).not.toMatch(/secret|key|token|prompt|completion|supabase row/i);
  });
});
