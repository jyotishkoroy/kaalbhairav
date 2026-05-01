/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/astro/reading/reading-orchestrator-v2", () => ({
  generateReadingV2: vi.fn(async (input: { question?: string; mode?: string }) => ({
    answer: `Reading for: ${input.question}`,
    meta: {
      version: "v2",
      topic: "career",
      mode: input.mode,
      safetyLayer: "enabled_phase_8",
      llmProvider: "groq",
      llmRefinerEnabled: true,
      llmRefinerUsed: true,
      llmRefinerFallback: false,
      llmModel: "openai/gpt-oss-120b",
    },
  })),
}));

import { POST } from "@/app/api/astro/v2/reading/route";
import { generateReadingV2 } from "@/lib/astro/reading/reading-orchestrator-v2";

const expectDefaultTraceOptions = () =>
  expect.objectContaining({
    exposeTrace: false,
    trace: expect.objectContaining({
      requestReceived: true,
      route: "/api/astro/v2/reading",
      directV2Route: true,
      questionFrame: expect.objectContaining({
        attempted: false,
        used: false,
      }),
      structuredIntent: expect.objectContaining({
        attempted: false,
        used: false,
      }),
      supabase: expect.objectContaining({
        attempted: false,
        chartProfileLookupAttempted: false,
        chartProfileLoaded: false,
        chartProfileSource: "none",
      }),
      oracle: expect.objectContaining({
        attempted: false,
        called: false,
        required: false,
        succeeded: false,
      }),
      exactFacts: expect.objectContaining({
        attempted: false,
        answered: false,
        source: "none",
        llmUsed: false,
      }),
      providers: expect.objectContaining({
        groq: expect.objectContaining({
          attempted: false,
          called: false,
          allowed: false,
        }),
        ollama: expect.objectContaining({
          enabled: false,
          attempted: false,
          called: false,
        }),
      }),
      fallback: expect.objectContaining({
        used: false,
      }),
      safety: expect.objectContaining({
        attempted: false,
        ran: false,
      }),
      finalComposer: expect.objectContaining({
        attempted: false,
        ran: false,
      }),
      finalValidator: expect.objectContaining({
        attempted: false,
        ran: false,
        passed: false,
        failures: [],
        warnings: [],
      }),
      response: expect.objectContaining({
        answerNonEmpty: false,
        userSafe: false,
        debugTraceExposed: false,
      }),
    }),
  });

const expectEnabledTraceOptions = () =>
  expect.objectContaining({
    exposeTrace: true,
    trace: expect.objectContaining({
      requestReceived: true,
      route: "/api/astro/v2/reading",
      directV2Route: true,
    }),
  });

function createRequest(body: unknown): Request {
  return new Request("https://www.tarayai.com/api/astro/v2/reading", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function setEnvVar(key: string, value?: string): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

describe("/api/astro/v2/reading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a direct reading answer as JSON", async () => {
    const response = await POST(
      createRequest({
        question: "I am working hard and not getting promotion.",
        mode: "practical_guidance",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const payload = await response.json();

    expect(payload.answer).toBe(
      "Reading for: I am working hard and not getting promotion.",
    );
    expect(payload.meta.version).toBe("v2");
    expect(payload.meta.directV2Route).toBe(true);
    expect(generateReadingV2).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "I am working hard and not getting promotion.",
        mode: "practical_guidance",
      }),
      expectDefaultTraceOptions(),
    );
  });

  it("accepts message as a fallback question field", async () => {
    const response = await POST(
      createRequest({
        message: "Give me a remedy on my bad sleep cycle.",
        mode: "remedy_focused",
      }),
    );

    expect(response.status).toBe(200);

    const payload = await response.json();

    expect(payload.answer).toBe("Reading for: Give me a remedy on my bad sleep cycle.");
  });

  it("rejects empty question", async () => {
    const response = await POST(
      createRequest({
        question: "   ",
      }),
    );

    expect(response.status).toBe(400);

    const payload = await response.json();

    expect(payload.error).toBe("Question is required.");
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(
      new Request("https://www.tarayai.com/api/astro/v2/reading", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);

    const payload = await response.json();

    expect(payload.error).toBe("Invalid JSON request body.");
  });

  it("passes manual birth details safely", async () => {
    await POST(
      createRequest({
        question: "When will my career improve?",
        mode: "deep_astrology",
        birthDetails: {
          dateOfBirth: "1995-01-01",
          timeOfBirth: "10:30",
          placeOfBirth: "Kolkata, India",
          latitude: "22.5726",
          longitude: "88.3639",
          timezone: "Asia/Kolkata",
        },
      }),
    );

    expect(generateReadingV2).toHaveBeenCalledWith(
      expect.objectContaining({
        birthDetails: expect.objectContaining({
          dateOfBirth: "1995-01-01",
          timeOfBirth: "10:30",
          placeOfBirth: "Kolkata, India",
          latitude: 22.5726,
          longitude: 88.3639,
          timezone: "Asia/Kolkata",
        }),
      }),
      expectDefaultTraceOptions(),
    );
  });

  it("passes remedy mode to router", async () => {
    await POST(
      createRequest({
        question: "Give me a remedy on my bad sleep cycle.",
        mode: "remedy_focused",
      }),
    );

    expect(generateReadingV2).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "remedy_focused",
      }),
      expectDefaultTraceOptions(),
    );
  });

  it("uses sessionId metadata as the anonymous user id when userId is missing", async () => {
    await POST(
      createRequest({
        question: "how will be my tomorrow?",
        mode: "timing_prediction",
        metadata: {
          sessionId: "astro-v2-session-123",
        },
      }),
    );

    expect(generateReadingV2).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "astro-v2-session-123",
        metadata: expect.objectContaining({
          sessionId: "astro-v2-session-123",
          source: "astro-v2-page",
          directV2Route: true,
        }),
      }),
      expectDefaultTraceOptions(),
    );
  });

  it("does not expose trace for a normal request", async () => {
    await POST(
      createRequest({
        question: "What is my Lagna?",
        mode: "exact_fact",
      }),
    );

    expect(generateReadingV2).toHaveBeenCalledWith(expect.any(Object), expectDefaultTraceOptions());
  });

  it("does not expose trace when requested but env is disabled", async () => {
    const previous = process.env.ASTRO_E2E_TRACE_ENABLED;
    const previousNodeEnv = process.env.NODE_ENV;
    setEnvVar("NODE_ENV", "production");
    setEnvVar("ASTRO_E2E_TRACE_ENABLED", "false");

    try {
      await POST(
        createRequest({
          question: "What is my Lagna?",
          mode: "exact_fact",
          metadata: {
            debugTrace: true,
          },
        }),
      );
    } finally {
      setEnvVar("NODE_ENV", previousNodeEnv);
      setEnvVar("ASTRO_E2E_TRACE_ENABLED", previous);
    }

    expect(generateReadingV2).toHaveBeenCalledWith(expect.any(Object), expectDefaultTraceOptions());
  });

  it("exposes trace when requested and env is enabled", async () => {
    const previous = process.env.ASTRO_E2E_TRACE_ENABLED;
    const previousNodeEnv = process.env.NODE_ENV;
    setEnvVar("NODE_ENV", "production");
    setEnvVar("ASTRO_E2E_TRACE_ENABLED", "true");

    try {
      await POST(
        createRequest({
          question: "What is my Lagna?",
          mode: "exact_fact",
          metadata: {
            debugTrace: true,
          },
        }),
      );
    } finally {
      setEnvVar("NODE_ENV", previousNodeEnv);
      setEnvVar("ASTRO_E2E_TRACE_ENABLED", previous);
    }

    expect(generateReadingV2).toHaveBeenCalledWith(expect.any(Object), expectEnabledTraceOptions());
  });
});
