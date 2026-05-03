/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { AstroChartContext } from "@/lib/astro/chart-context";

export type ExactChartFactAnswer =
  | { matched: true; answer: string }
  | { matched: false };

function normalizeQuestion(question: string): string {
  return question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function buildUnavailableAnswer(): ExactChartFactAnswer {
  return { matched: true, answer: "aadesh: I could not find that exact chart fact in your saved chart context. Please recalculate your chart from birth details, then try again." };
}

export function answerExactChartFactQuestion(input: {
  question: string;
  chartContext: AstroChartContext;
}): ExactChartFactAnswer {
  const q = normalizeQuestion(input.question);
  const facts = input.chartContext.publicFacts;
  const basis = input.chartContext.basisLine;

  if (/\b(system prompt|database rows|provider|model|server)\b/.test(q)) return { matched: false };

  const wantsLagna = /\b(lagna|ascendant|rising sign)\b/.test(q);
  const wantsMoon = /\bmoon sign\b/.test(q);
  const wantsSun = /\bsun sign\b/.test(q);
  const wantsMoonHouse = /\bmoon house\b/.test(q) || /\bwhich house\b/.test(q) && /\bmoon\b/.test(q);
  const wantsSunHouse = /\bsun house\b/.test(q) || /\bwhich house\b/.test(q) && /\bsun\b/.test(q);
  const wantsDasha = /\b(dasha|mahadasha|antardasha|vimshottari)\b/.test(q);

  if (wantsLagna && typeof facts.lagnaSign === "string") {
    return { matched: true, answer: `aadesh: Your Lagna is ${facts.lagnaSign}. ${basis}` };
  }
  if (wantsMoon && typeof facts.moonSign === "string") {
    const suffix = typeof facts.moonHouse === "number" ? ` Moon house: ${facts.moonHouse}.` : "";
    return { matched: true, answer: `aadesh: Your Moon sign is ${facts.moonSign}.${suffix} ${basis}`.replace(/\s+/g, " ") };
  }
  if (wantsSun && typeof facts.sunSign === "string") {
    const suffix = typeof facts.sunHouse === "number" ? ` Sun house: ${facts.sunHouse}.` : "";
    return { matched: true, answer: `aadesh: Your Sun sign is ${facts.sunSign}.${suffix} ${basis}`.replace(/\s+/g, " ") };
  }
  if (wantsMoonHouse && typeof facts.moonHouse === "number") {
    return { matched: true, answer: `aadesh: Your Moon is in house ${facts.moonHouse}. ${basis}` };
  }
  if (wantsSunHouse && typeof facts.sunHouse === "number") {
    return { matched: true, answer: `aadesh: Your Sun is in house ${facts.sunHouse}. ${basis}` };
  }
  if (wantsDasha && typeof facts.currentDasha === "string") {
    return { matched: true, answer: `aadesh: ${facts.currentDasha}. ${basis}` };
  }

  if (wantsLagna || wantsMoon || wantsSun || wantsMoonHouse || wantsSunHouse || wantsDasha) {
    return buildUnavailableAnswer();
  }

  return { matched: false };
}
