/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ChartEvidence, ChartEvidenceFactor } from "./chart-evidence-builder";
import type { EmotionalStateResult } from "./emotional-state-detector";
import type { LifeContextExtraction } from "./life-context-extractor";
import type { PracticalConstraintResult } from "./practical-constraints-extractor";
import type { ConsultationConfidence } from "./consultation-types";

export type TimingStatus =
  | "supportive"
  | "mixed"
  | "heavy"
  | "unstable"
  | "clarifying"
  | "delayed"
  | "preparatory";

export type TimingRecommendedAction =
  | "proceed"
  | "prepare"
  | "wait"
  | "review"
  | "avoid_impulsive_decision"
  | "seek_more_information";

export type TimingWindow = {
  readonly label: string;
  readonly from?: string;
  readonly to?: string;
};

export type TimingFact = {
  readonly label?: string;
  readonly text?: string;
  readonly source?: "dasha" | "transit" | "chart_evidence" | "context" | string;
  readonly polarity?: "supportive" | "challenging" | "neutral";
  readonly confidence?: ConsultationConfidence;
  readonly from?: string;
  readonly to?: string;
  readonly birthTimeSensitive?: boolean;
  readonly tags?: readonly string[];
};

export type TimingJudgementInput = {
  readonly chartEvidence: ChartEvidence;
  readonly lifeContext?: LifeContextExtraction;
  readonly emotionalState?: EmotionalStateResult;
  readonly practicalConstraints?: PracticalConstraintResult;
  readonly timingFacts?: readonly TimingFact[];
};

export type TimingJudgement = {
  readonly status: TimingStatus;
  readonly currentPeriodMeaning: string;
  readonly recommendedAction: TimingRecommendedAction;
  readonly timeWindow?: TimingWindow;
  readonly reasoning: readonly string[];
  readonly confidence: ConsultationConfidence;
  readonly birthTimeSensitivity: ConsultationConfidence;
};

type ScoreBucket = {
  supportiveScore: number;
  challengingScore: number;
  heavyScore: number;
  unstableScore: number;
  clarifyingScore: number;
  delayedScore: number;
  preparatoryScore: number;
};

type NormalizedTimingFact = TimingFact & {
  readonly text: string;
  readonly source: string;
  readonly polarity: "supportive" | "challenging" | "neutral";
};

const DEFAULT_RESULT: TimingJudgement = {
  status: "clarifying",
  currentPeriodMeaning:
    "The available timing evidence is limited, so this should be treated as a clarification phase rather than a fixed prediction.",
  recommendedAction: "seek_more_information",
  reasoning: ["No supplied dasha, transit, or timing evidence was available."],
  confidence: "low",
  birthTimeSensitivity: "low",
};

const SUPPORTIVE_KEYWORDS = [
  "supportive",
  "favorable",
  "favourable",
  "growth",
  "active support",
  "opportunity",
  "opening",
  "movement",
  "progress",
  "proceed",
  "launch",
  "apply",
  "outreach",
  "commitment supported",
  "action supported",
  "benefic",
  "jupiter support",
  "venus support",
];

const CHALLENGING_KEYWORDS = [
  "challenging",
  "pressure",
  "blocked",
  "obstruction",
  "difficult",
  "friction",
  "conflict",
  "constrained",
  "caution",
  "stress",
];

const HEAVY_KEYWORDS = [
  "saturn",
  "responsibility",
  "duty",
  "delay",
  "burden",
  "discipline",
  "maturity",
  "heavy",
  "serious",
  "slow",
  "patience",
  "structure",
];

const UNSTABLE_KEYWORDS = [
  "unstable",
  "volatile",
  "sudden",
  "unpredictable",
  "disruption",
  "rahu",
  "ketu",
  "mars pressure",
  "impulsive",
  "accident-prone",
  "erratic",
  "reversal",
  "risky",
];

const CLARIFYING_KEYWORDS = [
  "clarity",
  "clarifying",
  "truth",
  "review",
  "sorting",
  "evaluation",
  "filter",
  "decide",
  "reassess",
  "understand",
  "conversation",
  "disclosure",
];

const DELAYED_KEYWORDS = ["delayed", "delay", "slow", "waiting", "maturation", "postponed", "not immediate", "gradual"];

const PREPARATORY_KEYWORDS = [
  "prepare",
  "preparation",
  "groundwork",
  "build foundation",
  "plan",
  "test first",
  "behind the scenes",
  "skill-building",
  "documentation",
  "savings",
  "backup plan",
  "runway",
];

const FORBIDDEN_OUTPUT_WORDS = [
  "guarantee",
  "guaranteed",
  "definitely",
  "certain",
  "will happen",
  "will never",
  "destined",
  "fixed fate",
  "death",
  "cure",
  "diagnosis",
  "treatment",
  "wear",
  "gemstone",
  "puja",
  "mantra",
  "donation",
  "fast",
  "resign now",
  "quit now",
  "invest now",
  "marry now",
  "divorce now",
];

const SUPPORTIVE_THRESHOLD = 2;

export function judgeTiming(input: TimingJudgementInput): TimingJudgement {
  const timingFacts = normalizeTimingFacts(input.timingFacts ?? []);
  const chartTimingFacts = timingFactsFromChartEvidence(input.chartEvidence);
  const allFacts = dedupeTimingFacts([...timingFacts, ...chartTimingFacts]);

  if (allFacts.length === 0) {
    return DEFAULT_RESULT;
  }

  const scores = scoreTimingFacts(allFacts);
  const timingBirthTimeSensitivity = inferTimingBirthTimeSensitivity(input, allFacts);
  const status = classifyTimingStatus(scores, allFacts, input);
  const recommendedAction = chooseRecommendedAction(status, input, scores);
  const currentPeriodMeaning = buildCurrentPeriodMeaning(status, input.chartEvidence.domain);
  const timeWindow = inferTimeWindow(allFacts);
  const reasoning = buildReasoning(allFacts, input, scores, timingBirthTimeSensitivity);
  const confidence = inferTimingConfidence(status, allFacts, input.chartEvidence, timingBirthTimeSensitivity, scores);

  return {
    status,
    currentPeriodMeaning,
    recommendedAction,
    timeWindow,
    reasoning,
    confidence,
    birthTimeSensitivity: timingBirthTimeSensitivity,
  };
}

export function containsForbiddenTimingOutput(text: string): boolean {
  const lower = normalizeText(text);
  return FORBIDDEN_OUTPUT_WORDS.some((word) => lower.includes(word));
}

function normalizeTimingFacts(input: readonly TimingFact[]): NormalizedTimingFact[] {
  return input.flatMap((fact) => {
    const text = normalizeText([fact.label, fact.text, fact.source, ...(fact.tags ?? [])].filter(Boolean).join(" "));
    if (!text) return [];
    return [
      {
        ...fact,
        label: sanitizeWindowLabel(fact.label ?? "") || undefined,
        text,
        source: typeof fact.source === "string" ? fact.source : "context",
        polarity: fact.polarity ?? inferPolarity(text, "context"),
      },
    ];
  });
}

function timingFactsFromChartEvidence(chartEvidence: ChartEvidence): NormalizedTimingFact[] {
  const facts: NormalizedTimingFact[] = [];

  for (const factor of chartEvidence.supportiveFactors) {
    if (!isTimingFactor(factor)) continue;
    facts.push({
      label: factor.factor,
      text: normalizeText(`${factor.factor} ${factor.interpretationHint}`),
      source: factor.source,
      polarity: "supportive",
      confidence: factor.confidence,
    });
  }

  for (const factor of chartEvidence.challengingFactors) {
    if (!isTimingFactor(factor)) continue;
    facts.push({
      label: factor.factor,
      text: normalizeText(`${factor.factor} ${factor.interpretationHint}`),
      source: factor.source,
      polarity: "challenging",
      confidence: factor.confidence,
    });
  }

  for (const fact of chartEvidence.neutralFacts) {
    const text = normalizeText(`${fact.fact} ${fact.source}`);
    if (!isTimingKeywordText(text)) continue;
    facts.push({
      label: fact.fact,
      text,
      source: fact.source,
      polarity: "neutral",
      confidence: "medium",
    });
  }

  return facts;
}

function isTimingFactor(factor: ChartEvidenceFactor): boolean {
  const text = normalizeText(`${factor.factor} ${factor.interpretationHint} ${factor.source}`);
  return isTimingKeywordText(text);
}

function isTimingKeywordText(text: string): boolean {
  return TIMING_KEYWORDS.some((keyword) => text.includes(keyword));
}

function inferPolarity(text: string, fallback: "context" | "chart" | string): "supportive" | "challenging" | "neutral" {
  const supportive = countKeywordHits(text, SUPPORTIVE_KEYWORDS);
  const challenging = countKeywordHits(text, CHALLENGING_KEYWORDS);
  if (supportive > challenging) return "supportive";
  if (challenging > supportive) return "challenging";
  if (fallback === "chart" && supportive > 0) return "supportive";
  return "neutral";
}

function scoreTimingFacts(facts: readonly NormalizedTimingFact[]): ScoreBucket {
  const bucket: ScoreBucket = {
    supportiveScore: 0,
    challengingScore: 0,
    heavyScore: 0,
    unstableScore: 0,
    clarifyingScore: 0,
    delayedScore: 0,
    preparatoryScore: 0,
  };

  for (const fact of facts) {
    const text = fact.text;
    const supportiveHits = countKeywordHits(text, SUPPORTIVE_KEYWORDS);
    const challengingHits = countKeywordHits(text, CHALLENGING_KEYWORDS);
    const heavyHits = countKeywordHits(text, HEAVY_KEYWORDS);
    const unstableHits = countKeywordHits(text, UNSTABLE_KEYWORDS);
    const clarifyingHits = countKeywordHits(text, CLARIFYING_KEYWORDS);
    const delayedHits = countKeywordHits(text, DELAYED_KEYWORDS);
    const preparatoryHits = countKeywordHits(text, PREPARATORY_KEYWORDS);

    if (fact.polarity === "supportive") bucket.supportiveScore += 1 + supportiveHits;
    if (fact.polarity === "challenging") bucket.challengingScore += 1 + challengingHits;

    bucket.supportiveScore += supportiveHits;
    bucket.challengingScore += challengingHits;
    bucket.heavyScore += heavyHits;
    bucket.unstableScore += unstableHits;
    bucket.clarifyingScore += clarifyingHits;
    bucket.delayedScore += delayedHits;
    bucket.preparatoryScore += preparatoryHits;

    if (fact.source === "dasha" || fact.source === "transit") {
      if (delayedHits > 0 || heavyHits > 0) bucket.delayedScore += 1;
      if (unstableHits > 0) bucket.unstableScore += 1;
      if (supportiveHits > 0) bucket.supportiveScore += 1;
    }
  }

  return bucket;
}

function classifyTimingStatus(
  scores: ScoreBucket,
  facts: readonly NormalizedTimingFact[],
  input: TimingJudgementInput,
): TimingStatus {
  if (facts.length === 0) return "clarifying";

  const highestScore = Math.max(
    scores.supportiveScore,
    scores.challengingScore,
    scores.heavyScore,
    scores.unstableScore,
    scores.clarifyingScore,
    scores.delayedScore,
    scores.preparatoryScore,
  );

  if (scores.unstableScore >= 2 && scores.unstableScore === highestScore) return "unstable";
  if (scores.heavyScore >= 2 && scores.heavyScore === highestScore) return "heavy";
  if (scores.supportiveScore >= SUPPORTIVE_THRESHOLD && scores.challengingScore === 0 && scores.unstableScore === 0) {
    return "supportive";
  }
  if (
    scores.supportiveScore > 0 &&
    (scores.challengingScore > 0 || scores.heavyScore > 0 || scores.unstableScore > 0) &&
    scores.delayedScore < 2 &&
    scores.preparatoryScore < 2
  ) {
    return "mixed";
  }
  if (scores.delayedScore >= 2) return "delayed";
  if (scores.preparatoryScore >= 2) return "preparatory";
  if (scores.clarifyingScore >= 1) return "clarifying";

  if (input.practicalConstraints?.healthConstraint === true || input.lifeContext?.lifeArea === "health") {
    return "clarifying";
  }
  return "clarifying";
}

function chooseRecommendedAction(
  status: TimingStatus,
  input: TimingJudgementInput,
  scores: ScoreBucket,
): TimingRecommendedAction {
  const emotionalIntensity = input.emotionalState?.intensity ?? "low";
  const emotionalPrimary = input.emotionalState?.primaryEmotion ?? "neutral";
  const healthSensitive = input.lifeContext?.lifeArea === "health" || input.practicalConstraints?.healthConstraint === true;
  const lowRiskTolerance = input.practicalConstraints?.riskTolerance === "low";
  const moneySensitive = input.practicalConstraints?.moneyConstraint === true;
  const unstable = status === "unstable" || scores.unstableScore > 0;

  if (status === "unstable") return "avoid_impulsive_decision";
  if (status === "mixed") return "avoid_impulsive_decision";
  if (healthSensitive) return "review";

  if (status === "supportive") {
    if (
      emotionalIntensity === "high" ||
      emotionalPrimary === "fear" ||
      emotionalPrimary === "anxiety" ||
      emotionalPrimary === "grief" ||
      emotionalPrimary === "exhaustion" ||
      lowRiskTolerance ||
      moneySensitive ||
      unstable
    ) {
      return "prepare";
    }
    return "proceed";
  }

  if (status === "heavy") {
    return input.lifeContext?.lifeArea === "relationship" || input.lifeContext?.lifeArea === "marriage" ? "review" : "prepare";
  }

  if (status === "delayed") {
    return lowRiskTolerance ? "prepare" : "wait";
  }

  if (status === "preparatory") {
    return "prepare";
  }

  if (status === "clarifying") {
    return healthSensitive ? "seek_more_information" : "review";
  }

  return "review";
}

function buildCurrentPeriodMeaning(status: TimingStatus, domain: ChartEvidence["domain"]): string {
  const base =
    status === "supportive"
      ? "This timing evidence looks supportive for measured action in this area, provided the user avoids impulsive decisions."
      : status === "mixed"
        ? "This timing evidence is mixed: some factors support movement, while others show pressure, delay, or caution."
        : status === "heavy"
          ? "This timing evidence emphasizes responsibility, patience, structure, and maturity rather than quick results."
          : status === "unstable"
            ? "This timing evidence suggests volatility or disruption, so irreversible decisions need extra caution."
            : status === "delayed"
              ? "This timing evidence points to slower movement, maturation, or delay rather than immediate resolution."
              : status === "preparatory"
                ? "This timing evidence favors preparation, groundwork, and practical readiness more than immediate final results."
                : "This timing evidence is better for clarification, sorting facts, and understanding the situation than for assuming a final outcome.";

  return domain === "health" && status !== "supportive"
    ? `${base} For health questions, use this as a prompt to seek more information rather than a conclusion.`
    : base;
}

function buildReasoning(
  facts: readonly NormalizedTimingFact[],
  input: TimingJudgementInput,
  scores: ScoreBucket,
  birthTimeSensitivity: ConsultationConfidence,
): string[] {
  const reasoning: string[] = [];
  const topFacts = facts.slice(0, 3).map((fact) => sanitizeReasoning(fact.label ?? fact.text));

  if (scores.supportiveScore > 0) reasoning.push("Supplied timing evidence includes supportive factors.");
  if (scores.challengingScore > 0) reasoning.push("Supplied timing evidence also includes pressure, delay, or caution factors.");
  if (scores.heavyScore > 0) reasoning.push("The supplied timing evidence carries responsibility, patience, or slow-movement themes.");
  if (scores.unstableScore > 0) reasoning.push("The supplied timing evidence shows volatility or disruption themes.");
  if (scores.clarifyingScore > 0) reasoning.push("The supplied timing evidence is useful for sorting facts and clarifying the situation.");
  if (scores.delayedScore > 0) reasoning.push("The supplied timing evidence suggests delay or slower maturation.");
  if (scores.preparatoryScore > 0) reasoning.push("The supplied timing evidence points toward groundwork and preparation.");

  if (input.lifeContext?.decisionType) {
    reasoning.push("The user is asking about a decision, so irreversible action should be avoided without more context.");
  }

  if (input.emotionalState && input.emotionalState.intensity === "high") {
    reasoning.push("High emotional intensity suggests avoiding impulsive timing decisions.");
  }

  if (
    input.practicalConstraints?.moneyConstraint === true ||
    input.practicalConstraints?.healthConstraint === true ||
    input.practicalConstraints?.familyConstraint === true ||
    input.practicalConstraints?.careerInstability === true ||
    input.practicalConstraints?.riskTolerance === "low"
  ) {
    reasoning.push("Practical constraints lower the suitability of high-risk action.");
  }

  if (birthTimeSensitivity === "high") {
    reasoning.push("Birth-time-sensitive evidence lowers confidence in precise timing.");
  }

  if (facts.some((fact) => fact.from || fact.to)) {
    reasoning.push("A supplied timing window is present, but only the provided dates are used.");
  }

  if (topFacts.length > 0) {
    reasoning.push(`Top supplied timing signals: ${topFacts.join("; ")}.`);
  }

  return clampReasoning(reasoning);
}

function inferTimeWindow(facts: readonly NormalizedTimingFact[]): TimingWindow | undefined {
  const dateFacts = facts.filter((fact) => fact.from || fact.to || fact.label);
  if (dateFacts.length === 0) return undefined;

  const windowFact = dateFacts.find((fact) => isValidIsoDateLike(fact.from ?? "") || isValidIsoDateLike(fact.to ?? "") || Boolean(fact.label)) ?? dateFacts[0];
  const label = sanitizeWindowLabel(windowFact.label ?? "") || "supplied timing window";
  const window: TimingWindow = {
    label,
    ...(isValidIsoDateLike(windowFact.from ?? "") ? { from: windowFact.from } : {}),
    ...(isValidIsoDateLike(windowFact.to ?? "") ? { to: windowFact.to } : {}),
  };
  return window.from || window.to || window.label ? window : undefined;
}

function inferTimingBirthTimeSensitivity(
  input: TimingJudgementInput,
  timingFacts: readonly NormalizedTimingFact[],
): ConsultationConfidence {
  if (input.chartEvidence.birthTimeSensitivity === "high") return "high";
  if (timingFacts.some((fact) => fact.birthTimeSensitive === true)) return "high";

  const text = timingFacts.map((fact) => fact.text).join(" ");
  if (/(pratyantardasha|exact degree|\bdegree\b|house cusp|\bcusp\b|divisional|\bd9\b|navamsa|\bd10\b|dashamsha)/.test(text)) {
    return "high";
  }
  if (input.chartEvidence.birthTimeSensitivity === "medium") return "medium";
  if (timingFacts.some((fact) => fact.source === "dasha" || fact.source === "transit") && !factsHaveConcreteDates(timingFacts)) {
    return "medium";
  }
  return timingFacts.length > 0 ? "low" : "low";
}

function inferTimingConfidence(
  status: TimingStatus,
  timingFacts: readonly NormalizedTimingFact[],
  chartEvidence: ChartEvidence,
  birthTimeSensitivity: ConsultationConfidence,
  scores: ScoreBucket,
): ConsultationConfidence {
  const relevantFacts = timingFacts.length;
  const scoreGap = highestScoreGap(scores);
  const healthSensitive = chartEvidence.domain === "health";

  if (healthSensitive) return "low";
  if (birthTimeSensitivity === "high" && relevantFacts < 3) return "low";
  if (relevantFacts >= 3 && scoreGap >= 2 && birthTimeSensitivity !== "high") return "high";
  if (relevantFacts >= 1 && (scoreGap >= 1 || status !== "clarifying")) return "medium";
  if (birthTimeSensitivity === "medium" && relevantFacts >= 1) return "medium";
  if (birthTimeSensitivity === "high") return "medium";
  return "low";
}

function factsHaveConcreteDates(facts: readonly NormalizedTimingFact[]): boolean {
  return facts.some((fact) => isValidIsoDateLike(fact.from ?? "") || isValidIsoDateLike(fact.to ?? ""));
}

function isValidIsoDateLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sanitizeReasoning(value: string): string {
  return normalizeText(value).replace(/[.:;]+$/g, "").trim();
}

function sanitizeWindowLabel(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeText(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function countKeywordHits(text: string, keywords: readonly string[]): number {
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) hits += 1;
  }
  return hits;
}

function clampReasoning(items: readonly string[]): string[] {
  return Array.from(new Set(items.map((item) => sanitizeReasoning(item)).filter(Boolean))).slice(0, 6);
}

function dedupeTimingFacts(facts: readonly NormalizedTimingFact[]): NormalizedTimingFact[] {
  const seen = new Set<string>();
  const output: NormalizedTimingFact[] = [];
  for (const fact of facts) {
    const key = `${fact.text}|${fact.source}|${fact.polarity}|${fact.from ?? ""}|${fact.to ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(fact);
  }
  return output;
}

function highestScoreGap(scores: ScoreBucket): number {
  const values = Object.values(scores).sort((a, b) => b - a);
  return (values[0] ?? 0) - (values[1] ?? 0);
}

const TIMING_KEYWORDS = [
  "dasha",
  "mahadasha",
  "antardasha",
  "pratyantardasha",
  "transit",
  "gochar",
  "sade sati",
  "ashtama shani",
  "current period",
  "present period",
  "window",
  "phase",
  "date",
  "from",
  "to",
  "until",
  "between",
  "active",
];
