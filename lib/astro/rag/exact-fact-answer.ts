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
  const accuracy =
    answer.accuracy === "totally_accurate"
      ? "Totally accurate — this is a deterministic chart fact."
      : "Unavailable — this exact fact is not available from the current structured data.";

  return [
    "Direct answer:",
    answer.directAnswer,
    "",
    "How this is derived:",
    answer.derivation,
    "",
    "Accuracy:",
    accuracy,
    "",
    "Suggested follow-up:",
    answer.suggestedFollowUp,
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
