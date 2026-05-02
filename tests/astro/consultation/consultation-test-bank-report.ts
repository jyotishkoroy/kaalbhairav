/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ConsultationScoreDimension, ConsultationTestBankScenario } from "./consultation-test-bank.fixtures";

export type ConsultationCategoryScores = {
  readonly factAccuracy: number;
  readonly lifeContext: number;
  readonly emotionalTone: number;
  readonly culturalContext: number;
  readonly practicalConstraints: number;
  readonly timingJudgement: number;
  readonly remedySafety: number;
  readonly humanConsultationFeel: number;
  readonly memoryReset: number;
};

export type ConsultationTestBankReport = {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly warnings: readonly string[];
  readonly categoryScores: ConsultationCategoryScores;
};

export type ConsultationScenarioScore = {
  readonly scenarioId: string;
  readonly passed: boolean;
  readonly warnings: readonly string[];
  readonly scores: Partial<Record<ConsultationScoreDimension, number>>;
};

const ZERO_REPORT: ConsultationCategoryScores = {
  factAccuracy: 0,
  lifeContext: 0,
  emotionalTone: 0,
  culturalContext: 0,
  practicalConstraints: 0,
  timingJudgement: 0,
  remedySafety: 0,
  humanConsultationFeel: 0,
  memoryReset: 0,
};

export function createEmptyConsultationTestBankReport(total = 300): ConsultationTestBankReport {
  return {
    total,
    passed: 0,
    failed: 0,
    warnings: [],
    categoryScores: { ...ZERO_REPORT },
  };
}

export function scoreScenarioPassFail(
  scenario: ConsultationTestBankScenario,
  passed: boolean,
  warnings: readonly string[] = [],
  scores: Partial<Record<ConsultationScoreDimension, number>> = {},
): ConsultationScenarioScore {
  return {
    scenarioId: scenario.id,
    passed,
    warnings: [...new Set(warnings)],
    scores,
  };
}

export function buildConsultationTestBankReport(
  scenarioScores: readonly ConsultationScenarioScore[],
): ConsultationTestBankReport {
  const warnings = uniqueStrings(scenarioScores.flatMap((score) => score.warnings)).slice(0, 25);
  const counts = {
    passed: scenarioScores.filter((score) => score.passed).length,
    total: scenarioScores.length,
  };

  return {
    total: counts.total,
    passed: counts.passed,
    failed: counts.total - counts.passed,
    warnings,
    categoryScores: {
      factAccuracy: aggregateScore(scenarioScores, ["factAccuracy", "groundedChartReasoning", "noHallucinatedChartFacts"]),
      lifeContext: aggregateScore(scenarioScores, ["lifeContext"]),
      emotionalTone: aggregateScore(scenarioScores, ["emotionalTone", "nonFearLanguage"]),
      culturalContext: aggregateScore(scenarioScores, ["culturalContext"]),
      practicalConstraints: aggregateScore(scenarioScores, ["practicalConstraints"]),
      timingJudgement: aggregateScore(scenarioScores, ["timingJudgement"]),
      remedySafety: aggregateScore(scenarioScores, ["remedySafety"]),
      humanConsultationFeel: aggregateScore(scenarioScores, ["humanConsultationFeel", "followUpQuality"]),
      memoryReset: aggregateScore(scenarioScores, ["memoryReset"]),
    },
  };
}

function aggregateScore(
  scenarioScores: readonly ConsultationScenarioScore[],
  dimensions: readonly ConsultationScoreDimension[],
): number {
  const values = scenarioScores.flatMap((scenario) =>
    dimensions
      .map((dimension) => scenario.scores[dimension])
      .filter((value): value is number => typeof value === "number"),
  );
  if (values.length === 0) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return clampScore(Math.round(average));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}
