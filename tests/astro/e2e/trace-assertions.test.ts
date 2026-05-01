/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { assertAstroE2ETrace } from "../../../lib/astro/e2e/trace-assertions";
import { createAstroE2ETrace } from "../../../lib/astro/e2e/trace";

function baseTrace() {
  const trace = createAstroE2ETrace();
  trace.questionFrame.attempted = true;
  trace.structuredIntent.attempted = true;
  trace.safety.ran = true;
  trace.finalComposer.ran = true;
  trace.finalValidator.ran = true;
  trace.finalValidator.passed = true;
  trace.response.answerNonEmpty = true;
  trace.response.userSafe = true;
  return trace;
}

describe("astro e2e trace assertions", () => {
  it("passes exact fact trace without providers", () => {
    const trace = baseTrace();
    trace.exactFacts.answered = true;
    trace.finalValidator.passed = true;
    const result = assertAstroE2ETrace(trace, { expectExactFact: true });
    expect(result.passed).toBe(true);
  });

  it("fails exact fact trace when groq is called", () => {
    const trace = baseTrace();
    trace.exactFacts.answered = true;
    trace.providers.groq.called = true;
    const result = assertAstroE2ETrace(trace, { expectExactFact: true });
    expect(result.failures).toContain("exact_fact_called_groq");
  });

  it("passes guidance trace when groq is expected", () => {
    const trace = baseTrace();
    trace.providers.groq.called = true;
    const result = assertAstroE2ETrace(trace, { expectGroq: true });
    expect(result.passed).toBe(true);
  });

  it("fails when fallback is unexpected", () => {
    const trace = baseTrace();
    trace.fallback.used = true;
    const result = assertAstroE2ETrace(trace);
    expect(result.failures[0]).toContain("unexpected_fallback");
  });

  it("allows fallback when enabled", () => {
    const trace = baseTrace();
    trace.fallback.used = true;
    const result = assertAstroE2ETrace(trace, { allowFallback: true });
    expect(result.passed).toBe(true);
  });

  it("fails when supabase chart is missing", () => {
    const trace = baseTrace();
    const result = assertAstroE2ETrace(trace, { expectSupabase: true });
    expect(result.failures).toContain("supabase_chart_not_loaded");
  });

  it("fails when oracle is required but not successful", () => {
    const trace = baseTrace();
    const result = assertAstroE2ETrace(trace, { expectOracle: true });
    expect(result.failures).toContain("oracle_not_successful");
  });

  it("fails when final validator fails", () => {
    const trace = baseTrace();
    trace.finalValidator.passed = false;
    const result = assertAstroE2ETrace(trace);
    expect(result.failures).toContain("final_validator_failed");
  });
});
