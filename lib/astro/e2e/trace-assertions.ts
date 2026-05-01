/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { AstroE2ETrace } from "./trace";

export type AstroE2ETraceAssertionResult = {
  passed: boolean;
  failures: string[];
  warnings: string[];
};

export function assertAstroE2ETrace(trace: AstroE2ETrace, options?: {
  expectSupabase?: boolean;
  expectOracle?: boolean;
  expectExactFact?: boolean;
  expectGroq?: boolean;
  expectOllama?: "enabled" | "disabled" | "optional";
  allowFallback?: boolean;
}): AstroE2ETraceAssertionResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  if (!trace.requestReceived) failures.push("request_not_received");
  if (!trace.directV2Route) failures.push("direct_v2_route_missing");
  if (!trace.questionFrame.attempted) failures.push("question_frame_not_attempted");
  if (!trace.structuredIntent.attempted) failures.push("structured_intent_not_attempted");
  if (!trace.safety.ran) failures.push("safety_not_run");
  if (!trace.finalComposer.ran) failures.push("final_composer_not_run");
  if (!trace.finalValidator.ran) failures.push("final_validator_not_run");
  if (!trace.finalValidator.passed) failures.push("final_validator_failed");
  if (!trace.response.answerNonEmpty) failures.push("empty_answer");
  if (!trace.response.userSafe) failures.push("unsafe_final_answer");
  if (options?.expectSupabase && !trace.supabase.chartProfileLoaded) failures.push("supabase_chart_not_loaded");
  if (options?.expectOracle && !(trace.oracle.called && trace.oracle.succeeded)) failures.push("oracle_not_successful");
  if (options?.expectExactFact) {
    if (!trace.exactFacts.answered) failures.push("exact_fact_not_answered");
    if (trace.exactFacts.llmUsed) failures.push("exact_fact_used_llm");
    if (trace.providers.groq.called) failures.push("exact_fact_called_groq");
    if (trace.providers.ollama.called) failures.push("exact_fact_called_ollama");
  }
  if (options?.expectGroq && !trace.providers.groq.called) failures.push("groq_not_called_for_guidance");
  if (options?.expectOllama === "enabled") {
    if (!trace.providers.ollama.enabled) failures.push("ollama_not_enabled");
    if (!trace.providers.ollama.attempted) failures.push("ollama_not_attempted");
  }
  if (!options?.allowFallback && trace.fallback.used) failures.push(`unexpected_fallback:${trace.fallback.reason ?? "unknown"}`);
  if (trace.response.debugTraceExposed && (!trace.route || trace.route !== "/api/astro/v2/reading")) warnings.push("trace_route_missing");
  return { passed: failures.length === 0, failures, warnings };
}
