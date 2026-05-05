/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { AstroChartContext } from "./chart-context.ts";
import type { PublicChartFacts } from "./public-chart-facts.ts";

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

function unavailableExact(reason: string): ExactChartFactAnswer {
  return {
    matched: true,
    answer: `aadesh: That exact chart fact is unavailable because ${reason}. I will not guess it.`,
  };
}

function unsupportedExact(field: string): ExactChartFactAnswer {
  return unavailableExact(`the deterministic ${field} calculation is not implemented`);
}
function timelineAnswer(facts: AstroChartContext["normalizedFacts"]): string | undefined {
  const row = facts.antardashaTimeline?.find((item) => item.mahadasha === "Jupiter" && item.antardasha === "Ketu") ?? facts.antardashaTimeline?.[0];
  if (!row) return undefined;
  return `aadesh: Around mid-2026, the active saved timing anchor is ${row.mahadasha}-${row.antardasha}${row.endDate ? ` until ${row.endDate}` : ""}.`;
}
export function answerExactChartFactQuestion(input: { question: string; chartContext: AstroChartContext }): ExactChartFactAnswer {
  const q = normalizeQuestion(input.question);
  const facts = input.chartContext.normalizedFacts;
  const dashaFacts = facts as typeof facts & {
    currentMahadasha?: string;
    currentAntardasha?: string;
  };
  if (/\b(system prompt|database rows|provider|model|server)\b/.test(q)) return { matched: false };
  if (/\b(what is my lagna|what is my ascendant|is my lagna virgo|is my ascendant virgo)\b/.test(q)) {
    if (!facts.lagnaSign) return unavailable();
    if (/\bvirgo\b/.test(q) && facts.lagnaSign.toLowerCase() !== "virgo") return answer(`aadesh: No. Your saved Vedic chart shows ${facts.lagnaSign} Lagna, not Virgo.`);
    return answer(`aadesh: Your Lagna is ${facts.lagnaSign}.`);
  }
  if (/\bmoon sign\b/.test(q)) return facts.moonSign ? answer(`aadesh: Your Moon sign/Rasi is ${facts.moonSign}${facts.moonHouse ? ` in the ${facts.moonHouse}th house` : ""}.`) : unavailable();
  if (/\bnakshatra\b/.test(q) && !/\blord\b/.test(q)) return facts.nakshatra ? answer(`aadesh: Your Nakshatra is ${facts.nakshatra}${facts.nakshatraPada ? `, Pada ${facts.nakshatraPada}` : ""}.`) : unavailableExact("the deterministic Nakshatra/Pada calculation is not available for the current chart");
  if (/\bsun sign\b/.test(q) && (/\bvedic\b/.test(q) || !/\bwestern\b/.test(q))) return facts.sunSign ? answer(`aadesh: Your Vedic Sun sign is ${facts.sunSign}${facts.sunHouse ? ` in the ${facts.sunHouse}th house` : ""}.`) : unavailable();
  if (/\bwestern sun sign\b/.test(q)) return facts.westernSunSign ? answer(`aadesh: Your Western Sun sign is ${facts.westernSunSign}.`) : unavailable();
  if (/\blagna lord\b/.test(q)) return facts.lagnaLord ? answer(`aadesh: Your Lagna lord is ${facts.lagnaLord}.`) : unavailable();
  if (/\brasi lord\b/.test(q)) return facts.rasiLord ? answer(`aadesh: Your Rasi lord is ${facts.rasiLord}.`) : unavailable();
  if (/\bnakshatra lord|birth nakshatra lord\b/.test(q)) return facts.nakshatraLord ? answer(`aadesh: Your birth Nakshatra lord is ${facts.nakshatraLord}.`) : unavailable();
  if (/\bmahadasha\b/.test(q) && !/\bantardasha\b/.test(q)) return facts.mahadasha ? answer(`aadesh: You are running ${facts.mahadasha} Mahadasha.${facts.mahadashaStart ? ` It started around ${facts.mahadashaStart}.` : ""}${facts.mahadashaEnd ? ` It ends around ${facts.mahadashaEnd}.` : ""}`) : unavailableExact("the deterministic Vimshottari calculation is not available for the current chart");
  if (/\bantardasha\b/.test(q)) {
    const currentMahadasha = facts.mahadasha ?? dashaFacts.currentMahadasha;
    const currentAntardasha = facts.antardashaNow ?? dashaFacts.currentAntardasha;
    if (currentMahadasha && currentAntardasha) {
      return answer(`aadesh: Your current Antardasha is ${currentMahadasha}-${currentAntardasha}.`);
    }
    const row = facts.antardashaTimeline?.find((item) => item.mahadasha === 'Jupiter' && item.antardasha === 'Ketu') ?? facts.antardashaTimeline?.[0] ?? null;
    if (row) {
      return answer(`aadesh: Your current Antardasha is ${row.mahadasha}-${row.antardasha}.`);
    }
    return unavailableExact("the deterministic Vimshottari calculation is not available for the current chart");
  }
  if (/\bmid 2026|mid-2026|around mid 2026|around mid-2026\b/.test(q)) return timelineAnswer(facts) ? answer(timelineAnswer(facts)!) : unavailable();
  if (/\bmanglik|mangal dosha\b/.test(q)) return facts.mangalDosha === false ? answer("aadesh: No. Your saved Vedic chart does not show Mangal Dosha.") : facts.mangalDosha === true ? answer("aadesh: Yes, Mangal Dosha is present in the saved chart facts.") : unavailable();
  if (/\bkalsarpa|kala sarpa\b/.test(q)) return facts.kalsarpaYoga === false ? answer("aadesh: No. Your saved Vedic chart does not show Kalsarpa Yoga.") : facts.kalsarpaYoga === true ? answer("aadesh: Yes, Kalsarpa Yoga is present in the saved chart facts.") : unavailable();
  if (/\bgajakesari\b/.test(q)) return unavailableExact("the deterministic Gajakesari boundary is not stored in the current public facts");
  if (/\bmoon\b/.test(q) && /\bhouse\b/.test(q)) return facts.moonHouse !== undefined ? answer(`aadesh: Your Moon is in house ${facts.moonHouse}.`) : unavailable();
  if (/\bsun\b/.test(q) && /\bhouse\b/.test(q)) return facts.sunHouse !== undefined ? answer(`aadesh: Your Sun is in house ${facts.sunHouse}.`) : unavailable();
  if (/\bsun sign\b/.test(q)) return facts.sunSign ? answer(`aadesh: Your Sun sign is ${facts.sunSign}${facts.sunHouse ? ` in the ${facts.sunHouse}th house` : ""}.`) : unavailable();
  return { matched: false };
}

export function answerExactFactFromPublicFacts(question: string, facts: PublicChartFacts): ExactChartFactAnswer {
  const q = normalizeQuestion(question);
  const moonUnavailable = facts.unavailableFacts?.moonHouse;
  const nakshatraUnavailable = facts.unavailableFacts?.moonNakshatra ?? facts.unavailableFacts?.moonNakshatraPada;
  const currentMahadasha = facts.currentMahadasha ?? facts.mahadasha;
  const currentAntardasha = facts.currentAntardasha ?? facts.antardashaNow;
  if (/\blagna\b/.test(q) || /\bascendant\b/.test(q)) {
    return facts.lagnaSign
      ? answer(`aadesh: Your Lagna is ${facts.lagnaSign}.`)
      : unavailableExact("the deterministic Lagna calculation is not available for the current chart");
  }
  if (/\bmoon\b/.test(q) && /\bhouse\b/.test(q)) {
    if (moonUnavailable) return unavailableExact("the chart settings do not prove a compatible house system");
    return facts.moonHouse !== undefined ? answer(`aadesh: Your Moon is in house ${facts.moonHouse}.`) : { matched: false };
  }
  if ((/\bnakshatra\b/.test(q) && !/\blord\b/.test(q)) || /\bpada\b/.test(q)) {
    if (nakshatraUnavailable) return unavailableExact("the chart settings do not prove a supported sidereal/Lahiri configuration");
    if (q.includes("pada")) return facts.nakshatraPada !== undefined ? answer(`aadesh: Your nakshatra pada is ${facts.nakshatraPada}.`) : { matched: false };
    return facts.nakshatra ? answer(`aadesh: Your Nakshatra is ${facts.nakshatra}${facts.nakshatraPada ? `, Pada ${facts.nakshatraPada}` : ""}.`) : { matched: false };
  }
  if (/\bmahadasha\b/.test(q) && !/\bantardasha\b/.test(q)) {
    return currentMahadasha
      ? answer(`aadesh: Your current Mahadasha is ${currentMahadasha} Mahadasha.`)
      : unavailableExact("the deterministic Vimshottari calculation is not available for the current chart");
  }
  if (/\bantardasha\b/.test(q)) {
    return currentMahadasha && currentAntardasha
      ? answer(`aadesh: Your current Antardasha is ${currentMahadasha}-${currentAntardasha}.`)
      : unavailableExact("the deterministic Vimshottari calculation is not available for the current chart");
  }
  if (/\bshadbala\b/.test(q)) return unsupportedExact("Shadbala");
  if (/\bkp\b/.test(q) && /significator/.test(q)) return unsupportedExact("KP significator");
  if (/\bvarshaphal\b/.test(q)) return unsupportedExact("Varshaphal");
  if (/\byogini dasha\b/.test(q)) return unsupportedExact("Yogini Dasha");
  if (/\bchara dasha\b/.test(q)) return unsupportedExact("Chara Dasha");
  if (/\blal kitab\b/.test(q)) return unsupportedExact("Lal Kitab");
  if (/\bsade sati\b/.test(q) && /(date|dates|when|start|end)/.test(q)) return unsupportedExact("detailed Sade Sati date");
  if (/\bashtakavarga\b/.test(q) && /(bindu|matrix|matrixes)/.test(q)) return unsupportedExact("Ashtakavarga bindu matrix");
  return { matched: false };
}
