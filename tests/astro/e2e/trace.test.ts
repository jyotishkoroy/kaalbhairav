/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createAstroE2ETrace, sanitizeTraceForResponse, shouldExposeAstroE2ETrace } from "../../../lib/astro/e2e/trace";

describe("astro e2e trace", () => {
  it("creates safe defaults", () => {
    const trace = createAstroE2ETrace();
    expect(trace.requestReceived).toBe(true);
    expect(trace.questionFrame.attempted).toBe(false);
    expect(trace.response.debugTraceExposed).toBe(false);
  });

  it("controls exposure by env and request flags", () => {
    expect(shouldExposeAstroE2ETrace({ isProduction: false, envEnabled: false, metadataDebugTrace: true })).toBe(true);
    expect(shouldExposeAstroE2ETrace({ isProduction: true, envEnabled: false, metadataDebugTrace: true })).toBe(false);
    expect(shouldExposeAstroE2ETrace({ isProduction: true, envEnabled: true, metadataDebugTrace: true })).toBe(true);
    expect(shouldExposeAstroE2ETrace({ isProduction: true, envEnabled: true })).toBe(false);
  });

  it("sanitizes trace payload", () => {
    const trace = createAstroE2ETrace();
    trace.questionFrame.coreQuestion = "What is my Lagna? ".repeat(20);
    trace.finalValidator.failures = Array.from({ length: 40 }, (_, index) => `f${index}`);
    trace.finalValidator.warnings = Array.from({ length: 40 }, (_, index) => `w${index}`);
    const sanitized = sanitizeTraceForResponse(trace);
    expect(String(sanitized.questionFrame.coreQuestion ?? "").length).toBeLessThanOrEqual(160);
    expect(sanitized.finalValidator.failures).toHaveLength(20);
    expect(sanitized.finalValidator.warnings).toHaveLength(20);
  });
});
