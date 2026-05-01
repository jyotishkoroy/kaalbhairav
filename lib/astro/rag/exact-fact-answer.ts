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
