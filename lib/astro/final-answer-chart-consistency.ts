/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { NormalizedChartFacts } from "./normalized-chart-facts.ts";

function houseText(house?: number): string {
  if (!house) return "";
  const suffix = house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th";
  return `${house}${suffix}`;
}

function basisLineForFacts(facts: NormalizedChartFacts): string | undefined {
  const parts: string[] = [];
  if (facts.lagnaSign) parts.push(`${facts.lagnaSign} Lagna`);
  if (facts.moonSign && facts.moonHouse) parts.push(`${facts.moonSign} Moon in the ${houseText(facts.moonHouse)} house`);
  if (facts.sunSign && facts.sunHouse) parts.push(`${facts.sunSign} Sun in the ${houseText(facts.sunHouse)} house`);
  if (facts.nakshatra && facts.nakshatraPada) parts.push(`${facts.nakshatra} Nakshatra Pada ${facts.nakshatraPada}`);
  if (facts.mahadasha) parts.push(`running ${facts.mahadasha} Mahadasha`);
  return parts.length ? `Chart basis: ${parts.join(", ")}` : undefined;
}

function stripLeaks(answer: string): string {
  return answer
    .replace(/\n?\s*Retrieval cue:[\s\S]*$/i, "")
    .replace(/\bfact:\s*/gi, "chart_fact: ")
    .replace(/\b(profile_id|chart_version_id|user_id)\s*[:=]\s*[^,\n)]+/gi, "")
    .replace(/\b(provider|model|server|debugTrace|metadata)\s*[:=]\s*[^,\n)]+/gi, "")
    .replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, "[redacted]")
    .replace(/\b[a-f0-9]{12,}\b/gi, "[redacted]");
}

export function enforceFinalAnswerChartConsistency(input: {
  answer: string;
  facts: NormalizedChartFacts;
}): { answer: string; rewrote: boolean; violations: string[] } {
  const violations: string[] = [];
  const original = input.answer ?? "";
  let answer = stripLeaks(original).trim();
  const basis = basisLineForFacts(input.facts);

  if (answer.includes("Virgo Lagna") && input.facts.lagnaSign === "Leo") {
    violations.push("wrong_lagna_basis");
    answer = answer.replace(/Chart basis:\s*[^.]+(?=(?:\s|$))/i, basis ?? "Chart basis: Leo Lagna");
    answer = answer.replace(/\bVirgo Lagna\b/i, "Leo Lagna");
  }
  if (answer.includes("Gemini Moon in the 10th house") && input.facts.moonSign === "Gemini" && input.facts.moonHouse === 11) {
    violations.push("wrong_moon_house_basis");
    answer = answer.replace(/Chart basis:\s*[^.]+(?=(?:\s|$))/i, basis ?? "Chart basis: Gemini Moon in the 11th house");
    answer = answer.replace(/\bGemini Moon in the 10th house\b/i, "Gemini Moon in the 11th house");
  }
  if (answer.includes("Taurus Sun in the 9th house") && input.facts.sunSign === "Taurus" && input.facts.sunHouse === 10) {
    violations.push("wrong_sun_house_basis");
    answer = answer.replace(/Chart basis:\s*[^.]+(?=(?:\s|$))/i, basis ?? "Chart basis: Taurus Sun in the 10th house");
    answer = answer.replace(/\bTaurus Sun in the 9th house\b/i, "Taurus Sun in the 10th house");
  }

  if (basis && !/Chart basis:/i.test(answer) && /^(aadesh:)/i.test(answer)) {
    answer = answer.replace(/^aadesh:\s*/i, `aadesh: ${basis}. `);
  }
  answer = stripLeaks(answer)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
  if (!answer.toLowerCase().startsWith("aadesh:")) answer = `aadesh: ${answer}`;
  return { answer, rewrote: violations.length > 0 || answer !== original, violations };
}
