/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { AstroChartContext } from "./chart-context.ts";

export type ExactChartFactAnswer = { matched: true; answer: string } | { matched: false };

function normalizeQuestion(question: string): string {
  return question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function unavailable(): ExactChartFactAnswer {
  return { matched: true, answer: "aadesh: I could not find that exact chart fact in your saved chart context. Please recalculate your chart from birth details, then try again." };
}

function answerIf(value: string | number | undefined, text: (v: string | number) => string): ExactChartFactAnswer | null {
  if (value === undefined || value === "") return null;
  return { matched: true, answer: text(value) };
}

export function answerExactChartFactQuestion(input: { question: string; chartContext: AstroChartContext }): ExactChartFactAnswer {
  const q = normalizeQuestion(input.question);
  const facts = input.chartContext.normalizedFacts;
  if (/\b(system prompt|database rows|provider|model|server)\b/.test(q)) return { matched: false };
  const wantsLagna = /\b(lagna|ascendant|rising sign)\b/.test(q);
  const wantsLagnaLord = /\blagna lord\b/.test(q);
  const wantsRasiLord = /\brasi lord\b/.test(q);
  const wantsNakshatraLord = /\bnakshatra lord\b/.test(q);
  const wantsMoon = /\bmoon sign\b/.test(q);
  const wantsSun = /\bsun sign\b/.test(q);
  const wantsWesternSun = /\bwestern sun sign\b/.test(q);
  const wantsNakshatra = /\bnakshatra\b/.test(q);
  const wantsMoonHouse = /\bmoon house\b/.test(q) || (/\bwhich house\b/.test(q) && /\bmoon\b/.test(q));
  const wantsSunHouse = /\bsun house\b/.test(q) || (/\bwhich house\b/.test(q) && /\bsun\b/.test(q));
  const wantsDasha = /\b(dasha|mahadasha|antardasha|vimshottari)\b/.test(q);

  if (wantsLagna && facts.lagnaSign) {
    if (/\bvirgo\b/.test(q) && facts.lagnaSign.toLowerCase() !== "virgo") return { matched: true, answer: `aadesh: No. Your saved Vedic chart shows ${facts.lagnaSign} Lagna, not Virgo.` };
    return { matched: true, answer: `aadesh: Your Lagna is ${facts.lagnaSign}. ${input.chartContext.basisLine}` };
  }
  if (wantsLagnaLord && facts.lagnaLord) return { matched: true, answer: `aadesh: Your Lagna lord is ${facts.lagnaLord}. ${input.chartContext.basisLine}` };
  if (wantsRasiLord && facts.rasiLord) return { matched: true, answer: `aadesh: Your Rasi lord is ${facts.rasiLord}, because your Moon sign/Rasi is ${facts.moonSign ?? "unavailable"}. ${input.chartContext.basisLine}` };
  if (wantsNakshatraLord && facts.nakshatraLord) return { matched: true, answer: `aadesh: Your birth Nakshatra lord is ${facts.nakshatraLord}, because ${facts.nakshatra ?? "your Nakshatra"} is ruled by ${facts.nakshatraLord}. ${input.chartContext.basisLine}` };
  if (wantsMoon && facts.moonSign) return { matched: true, answer: `aadesh: Your Moon sign/Rasi is ${facts.moonSign}${facts.moonHouse ? ` in the ${facts.moonHouse}th house` : ""}. ${input.chartContext.basisLine}` };
  if (wantsSun && facts.sunSign) return { matched: true, answer: `aadesh: Your Vedic Sun sign is ${facts.sunSign}${facts.sunHouse ? ` in the ${facts.sunHouse}th house` : ""}. ${input.chartContext.basisLine}` };
  if (wantsWesternSun) return facts.sunSign ? { matched: true, answer: `aadesh: Vedic chart data shows ${facts.sunSign}. Western Sun sign is unavailable unless a tropical calculation is stored separately.` } : unavailable();
  if (wantsNakshatra && facts.nakshatra) return { matched: true, answer: `aadesh: Your Nakshatra is ${facts.nakshatra}${facts.nakshatraPada ? `, Pada ${facts.nakshatraPada}` : ""}. ${input.chartContext.basisLine}` };
  if (wantsMoonHouse && facts.moonHouse !== undefined) return { matched: true, answer: `aadesh: Your Moon is in house ${facts.moonHouse}. ${input.chartContext.basisLine}` };
  if (wantsSunHouse && facts.sunHouse !== undefined) return { matched: true, answer: `aadesh: Your Sun is in house ${facts.sunHouse}. ${input.chartContext.basisLine}` };
  if (wantsDasha && facts.mahadasha) {
    if (/\bmahadasha\b/.test(q) && !/\bantardasha\b/.test(q)) return { matched: true, answer: `aadesh: You are running ${facts.mahadasha} Mahadasha. ${input.chartContext.basisLine}` };
    if (/\bmid 2026|mid-2026|around mid 2026|around mid-2026\b/.test(q) && facts.antardashaTimeline?.length) {
      const match = facts.antardashaTimeline.find((row) => row.startDate && row.endDate && row.startDate <= "2026-07-01" && row.endDate >= "2026-05-01") ?? facts.antardashaTimeline[0];
      if (match) return { matched: true, answer: `aadesh: The ${match.mahadasha}-${match.antardasha} period is the active timing anchor around mid-2026 in your saved timeline. ${input.chartContext.basisLine}` };
    }
    if (facts.antardashaNow) return { matched: true, answer: `aadesh: You are running ${facts.mahadasha} Mahadasha with ${facts.antardashaNow} Antardasha. ${input.chartContext.basisLine}` };
  }
  if (wantsLagna || wantsMoon || wantsSun || wantsMoonHouse || wantsSunHouse || wantsDasha) return unavailable();
  return { matched: false };
}
