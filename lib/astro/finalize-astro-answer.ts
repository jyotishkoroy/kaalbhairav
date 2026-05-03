/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { PublicChartFacts } from "./public-chart-facts.ts";
import { formatPublicChartBasis, sanitizeVisibleAstroAnswer } from "./public-chart-facts.ts";

export type FinalizeAstroAnswerResult = {
  answer: string;
  ok: boolean;
  rewrote: boolean;
  violations: string[];
};

const SAFE_FALLBACK = "aadesh: I am unable to provide an accurate answer right now. Please try asking again.";

function repairWrongLagna(answer: string, facts: PublicChartFacts): { answer: string; violations: string[] } {
  const violations: string[] = [];
  let out = answer;

  if (/virgo lagna/i.test(out) && facts.lagnaSign === "Leo") {
    violations.push("wrong_lagna");
    out = out.replace(/\bVirgo Lagna\b/gi, "Leo Lagna");
    out = out.replace(/Chart basis:[^.]+/i, formatPublicChartBasis(facts));
  }
  if (/gemini moon in the 10th/i.test(out) && facts.moonSign === "Gemini" && facts.moonHouse === 11) {
    violations.push("wrong_moon_house");
    out = out.replace(/\bGemini Moon in the 10th house\b/gi, "Gemini Moon in the 11th house");
  }
  if (/taurus sun in the 9th/i.test(out) && facts.sunSign === "Taurus" && facts.sunHouse === 10) {
    violations.push("wrong_sun_house");
    out = out.replace(/\bTaurus Sun in the 9th house\b/gi, "Taurus Sun in the 10th house");
  }
  if (/saturn mahadasha/i.test(out) && facts.mahadasha === "Jupiter") {
    violations.push("wrong_mahadasha");
    out = out.replace(/\bSaturn Mahadasha\b/gi, "Jupiter Mahadasha");
  }
  return { answer: out, violations };
}

function detectLeaks(answer: string): string[] {
  const violations: string[] = [];
  if (/profile_id\s*[:=]/i.test(answer)) violations.push("leak_profile_id");
  if (/chart_version_id\s*[:=]/i.test(answer)) violations.push("leak_chart_version_id");
  if (/user_id\s*[:=]/i.test(answer)) violations.push("leak_user_id");
  if (/\bfact:\s/i.test(answer)) violations.push("leak_fact_prefix");
  if (/\bchart_fact:\s/i.test(answer)) violations.push("leak_chart_fact_prefix");
  if (/\bprovider\s*[:=]/i.test(answer)) violations.push("leak_provider");
  if (/\bmodel\s*[:=]/i.test(answer)) violations.push("leak_model");
  if (/\bserver\s*[:=]/i.test(answer)) violations.push("leak_server");
  if (/\bmetadata\s*[:=]/i.test(answer)) violations.push("leak_metadata");
  if (/\bdebugTrace\b/i.test(answer)) violations.push("leak_debug_trace");
  if (/Retrieval cue:/i.test(answer)) violations.push("leak_retrieval_cue");
  if (/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i.test(answer)) violations.push("leak_uuid");
  return violations;
}

/**
 * Finalize an astro answer: repair wrong chart facts, strip metadata leaks,
 * ensure aadesh: prefix, and return ok=true only when the answer is clean.
 */
export function finalizeAstroAnswer(input: {
  answer: string;
  facts: PublicChartFacts;
}): FinalizeAstroAnswerResult {
  const original = input.answer ?? "";
  const allViolations: string[] = [];

  // Step 1: detect leaks before repair (original text)
  const leakViolations = detectLeaks(original);
  allViolations.push(...leakViolations);

  // Step 2: repair wrong chart facts
  const { answer: repaired, violations: factViolations } = repairWrongLagna(original, input.facts);
  allViolations.push(...factViolations);

  // Step 3: sanitize (strip leaks, ensure prefix)
  const sanitized = sanitizeVisibleAstroAnswer(repaired);

  // Step 4: verify the sanitized answer no longer has leaks or wrong facts
  const residualLeaks = detectLeaks(sanitized);
  const hasWrongLagna = /virgo lagna/i.test(sanitized) && input.facts.lagnaSign === "Leo";
  const hasWrongMahadasha = /saturn mahadasha/i.test(sanitized) && input.facts.mahadasha === "Jupiter";

  if (residualLeaks.length > 0 || hasWrongLagna || hasWrongMahadasha) {
    // Repair failed — return safe fallback
    return {
      answer: SAFE_FALLBACK,
      ok: false,
      rewrote: true,
      violations: [...allViolations, ...residualLeaks, ...(hasWrongLagna ? ["unrepaired_wrong_lagna"] : []), ...(hasWrongMahadasha ? ["unrepaired_wrong_mahadasha"] : [])],
    };
  }

  const rewrote = sanitized !== original;
  const ok = allViolations.length === 0;

  return {
    answer: sanitized,
    ok,
    rewrote,
    violations: allViolations,
  };
}
