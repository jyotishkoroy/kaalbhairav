/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { assertNoSecretLeaks, sanitizeEvent, sanitizeUrlPath } from "@/lib/astro/benchmark/e2e-trace";

describe("e2e trace sanitization", () => {
  it("redacts OAuth codes and tokens from urls", () => {
    expect(sanitizeUrlPath("https://x.test/callback?code=abc123&state=xyz")).toBe("/callback?[REDACTED_QUERY]");
  });
  it("records request and response shapes", () => {
    const event = sanitizeEvent({ method: "POST", url: "https://x.test/api/astro/ask", requestBody: { question: "Q", requestId: "r" }, responseBody: { answer: "A" }, latencyMs: 12 });
    expect(event.requestBodyShape).toEqual(expect.arrayContaining(["question", "requestId"]));
    expect(event.responseBodyShape).toEqual(["answer"]);
  });
  it("hashes answer text instead of storing raw secret material", () => {
    const event = sanitizeEvent({ method: "POST", url: "https://x.test/api/astro/ask", requestBody: { question: "What is my Lagna?" }, responseBody: { answer: "aadesh: Leo" } });
    expect(event.answerHash).toBeDefined();
  });
  it("rejects secret leaks in serialized output", () => {
    expect(() => assertNoSecretLeaks("cookie: abc")).toThrow();
  });
  it("does not leak supabase key names", () => {
    expect(sanitizeUrlPath("https://x.test/?SUPABASE_SERVICE_ROLE_KEY=abc")).not.toContain("abc");
  });
});
