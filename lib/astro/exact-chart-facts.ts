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
  return { matched: true, answer: "aadesh: I could not find that chart fact in your saved chart context." };
}
function answer(text: string): ExactChartFactAnswer {
  return { matched: true, answer: text };
}
function timelineAnswer(facts: AstroChartContext["normalizedFacts"]): string | undefined {
  const row = facts.antardashaTimeline?.find((item) => item.mahadasha === "Jupiter" && item.antardasha === "Ketu") ?? facts.antardashaTimeline?.[0];
  if (!row) return undefined;
  return `aadesh: Around mid-2026, the active saved timing anchor is ${row.mahadasha}-${row.antardasha}${row.endDate ? ` until ${row.endDate}` : ""}.`;
}
export function answerExactChartFactQuestion(input: { question: string; chartContext: AstroChartContext }): ExactChartFactAnswer {
  const q = normalizeQuestion(input.question);
  const facts = input.chartContext.normalizedFacts;
  if (/\b(system prompt|database rows|provider|model|server)\b/.test(q)) return { matched: false };
  if (/\b(what is my lagna|what is my ascendant|is my lagna virgo|is my ascendant virgo)\b/.test(q)) {
    if (!facts.lagnaSign) return unavailable();
    if (/\bvirgo\b/.test(q) && facts.lagnaSign.toLowerCase() !== "virgo") return answer(`aadesh: No. Your saved Vedic chart shows ${facts.lagnaSign} Lagna, not Virgo.`);
    return answer(`aadesh: Your Lagna is ${facts.lagnaSign}.`);
  }
  if (/\bmoon sign\b/.test(q)) return facts.moonSign ? answer(`aadesh: Your Moon sign/Rasi is ${facts.moonSign}${facts.moonHouse ? ` in the ${facts.moonHouse}th house` : ""}.`) : unavailable();
  if (/\bnakshatra\b/.test(q) && !/\blord\b/.test(q)) return facts.nakshatra ? answer(`aadesh: Your Nakshatra is ${facts.nakshatra}${facts.nakshatraPada ? `, Pada ${facts.nakshatraPada}` : ""}.`) : unavailable();
  if (/\bsun sign\b/.test(q) && (/\bvedic\b/.test(q) || !/\bwestern\b/.test(q))) return facts.sunSign ? answer(`aadesh: Your Vedic Sun sign is ${facts.sunSign}${facts.sunHouse ? ` in the ${facts.sunHouse}th house` : ""}.`) : unavailable();
  if (/\bwestern sun sign\b/.test(q)) return facts.westernSunSign ? answer(`aadesh: Your Western Sun sign is ${facts.westernSunSign}.`) : unavailable();
  if (/\blagna lord\b/.test(q)) return facts.lagnaLord ? answer(`aadesh: Your Lagna lord is ${facts.lagnaLord}.`) : unavailable();
  if (/\brasi lord\b/.test(q)) return facts.rasiLord ? answer(`aadesh: Your Rasi lord is ${facts.rasiLord}.`) : unavailable();
  if (/\bnakshatra lord|birth nakshatra lord\b/.test(q)) return facts.nakshatraLord ? answer(`aadesh: Your birth Nakshatra lord is ${facts.nakshatraLord}.`) : unavailable();
  if (/\bmahadasha\b/.test(q) && !/\bantardasha\b/.test(q)) return facts.mahadasha ? answer(`aadesh: You are running ${facts.mahadasha} Mahadasha.${facts.mahadashaStart ? ` It started around ${facts.mahadashaStart}.` : ""}${facts.mahadashaEnd ? ` It ends around ${facts.mahadashaEnd}.` : ""}`) : unavailable();
  if (/\bmid 2026|mid-2026|around mid 2026|around mid-2026\b/.test(q)) return timelineAnswer(facts) ? answer(timelineAnswer(facts)!) : unavailable();
  if (/\bmanglik|mangal dosha\b/.test(q)) return facts.mangalDosha === false ? answer("aadesh: No. Your saved Vedic chart does not show Mangal Dosha.") : facts.mangalDosha === true ? answer("aadesh: Yes, Mangal Dosha is present in the saved chart facts.") : unavailable();
  if (/\bkalsarpa|kala sarpa\b/.test(q)) return facts.kalsarpaYoga === false ? answer("aadesh: No. Your saved Vedic chart does not show Kalsarpa Yoga.") : facts.kalsarpaYoga === true ? answer("aadesh: Yes, Kalsarpa Yoga is present in the saved chart facts.") : unavailable();
  if (/\bmoon\b/.test(q) && /\bhouse\b/.test(q)) return facts.moonHouse !== undefined ? answer(`aadesh: Your Moon is in house ${facts.moonHouse}.`) : unavailable();
  if (/\bsun\b/.test(q) && /\bhouse\b/.test(q)) return facts.sunHouse !== undefined ? answer(`aadesh: Your Sun is in house ${facts.sunHouse}.`) : unavailable();
  if (/\bsun sign\b/.test(q)) return facts.sunSign ? answer(`aadesh: Your Sun sign is ${facts.sunSign}${facts.sunHouse ? ` in the ${facts.sunHouse}th house` : ""}.`) : unavailable();
  return { matched: false };
}
