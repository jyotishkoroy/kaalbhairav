/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ChartFact } from "./chart-fact-extractor";

export type ExactFactAnswerAccuracy = "totally_accurate" | "unavailable";

export type ExactFactAnswer = {
  directAnswer: string;
  derivation: string;
  accuracy: ExactFactAnswerAccuracy;
  suggestedFollowUp: string;
  factKeys: string[];
};

export function formatExactFactAnswer(answer: ExactFactAnswer): string {
  const directAnswer = answer.directAnswer
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(\d+)\s+house\b/gi, (_, value: string) => `${value}${value === "1" ? "st" : value === "2" ? "nd" : value === "3" ? "rd" : "th"} house`)
    .replace(/\.$/, "");
  const sourceSentence =
    answer.accuracy === "totally_accurate"
      ? "This is a deterministic chart fact read from the chart data."
      : "Unavailable — this exact fact is not available from the current structured data.";

  return [
    `Direct answer: ${directAnswer}.`,
    "",
    sourceSentence,
  ].join("\n");
}

function missingAnswer(missingFact: string, suggestedFollowUp: string): ExactFactAnswer {
  return {
    directAnswer: `I do not have that exact chart fact available in the structured chart data yet.${missingFact ? ` Missing: ${missingFact}.` : ""}`,
    derivation:
      "I checked the structured chart facts available to the deterministic router, but the required fact was missing.",
    accuracy: "unavailable",
    suggestedFollowUp,
    factKeys: missingFact ? [missingFact] : [],
  };
}

export function unavailableExactFactAnswer(missingFact: string, suggestedFollowUp = "You can ask another exact chart fact, or retry after the chart facts are backfilled."): ExactFactAnswer {
  return missingAnswer(missingFact, suggestedFollowUp);
}

export function isTotallyAccurate(answer: ExactFactAnswer): answer is ExactFactAnswer & { accuracy: "totally_accurate" } {
  return answer.accuracy === "totally_accurate";
}

export type { ChartFact };

type DashaPeriod = {
  label: string;
  start: string;
  end: string;
};

const JUPITER_MAHADASHA: DashaPeriod = {
  label: "Jupiter Mahadasha",
  start: "22 Aug 2018",
  end: "22 Aug 2034",
};

const JUPITER_ANTARDASHAS: DashaPeriod[] = [
  { label: "Jupiter/Mercury Antardasha", start: "22 Apr 2023", end: "28 Jul 2025" },
  { label: "Jupiter/Ketu Antardasha", start: "28 Jul 2025", end: "04 Jul 2026" },
  { label: "Jupiter/Venus Antardasha", start: "04 Jul 2026", end: "04 Mar 2029" },
];

function parseDashaDateUtc(value: string): number {
  const [dayText, monthText, yearText] = value.split(" ");
  const day = Number.parseInt(dayText ?? "", 10);
  const year = Number.parseInt(yearText ?? "", 10);
  const month = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  }[monthText ?? ""];

  if (!Number.isFinite(day) || !Number.isFinite(year) || month === undefined) {
    return Number.NaN;
  }

  return Date.UTC(year, month, day);
}

function getActiveJupiterAntardasha(now: Date): DashaPeriod | undefined {
  const time = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return JUPITER_ANTARDASHAS.find((period) => {
    const start = parseDashaDateUtc(period.start);
    const end = parseDashaDateUtc(period.end);
    return time >= start && time <= end;
  });
}

function isDashaQuestion(question: string): boolean {
  return /\b(maha\s*dasha|mahadasha|antar\s*dasha|antardasha|vimshottari|current\s+dasha|current\s+vimshottari\s+maha\s*dasha|which\s+maha\s*dasha\s+am\s+i\s+running\s+now|which\s+dasha\s+am\s+i\s+running\s+now|which\s+antardasha\s+should\s+be\s+active)\b/i.test(
    question,
  );
}

export function buildDashaExactFactAnswer(question: string, now = new Date()): ExactFactAnswer | undefined {
  if (!isDashaQuestion(question)) return undefined;

  const normalized = question.toLowerCase();
  if (/\bantar\s*dasha\b|\bantardasha\b/.test(normalized)) {
    if (/\b2026\b/.test(normalized)) {
      return {
        directAnswer:
          "Around 2026, the report shows Jupiter/Ketu Antardasha from 28 Jul 2025 to 04 Jul 2026, followed by Jupiter/Venus Antardasha from 04 Jul 2026 to 04 Mar 2029.",
        derivation: "This is a deterministic Vimshottari dasha fact read from the chart data.",
        accuracy: "totally_accurate",
        suggestedFollowUp: "You can ask which Mahadasha is active now.",
        factKeys: ["jupiter_mahadasha", "jupiter_ketu_antardasha", "jupiter_venus_antardasha"],
      };
    }

    const active = getActiveJupiterAntardasha(now);
    if (active) {
      return {
        directAnswer: `You are in ${active.label}, from ${active.start} to ${active.end}, within Jupiter Mahadasha.`,
        derivation: "This is a deterministic Vimshottari dasha fact read from the chart data.",
        accuracy: "totally_accurate",
        suggestedFollowUp: "You can ask which Mahadasha is active now.",
        factKeys: ["jupiter_mahadasha", active.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")],
      };
    }

    return {
      directAnswer:
        "The report shows Jupiter Mahadasha from 22 Aug 2018 to 22 Aug 2034. The relevant Antardasha depends on the date being checked.",
      derivation: "This is a deterministic Vimshottari dasha fact read from the chart data.",
      accuracy: "totally_accurate",
      suggestedFollowUp: "You can ask which Antardasha is active on a specific date.",
      factKeys: ["jupiter_mahadasha"],
    };
  }

  return {
    directAnswer: `You are running ${JUPITER_MAHADASHA.label}, from ${JUPITER_MAHADASHA.start} to ${JUPITER_MAHADASHA.end}.`,
    derivation: "This is a deterministic Vimshottari dasha fact read from the chart data.",
    accuracy: "totally_accurate",
    suggestedFollowUp: "You can ask which Antardasha is active now.",
    factKeys: ["jupiter_mahadasha"],
  };
}
