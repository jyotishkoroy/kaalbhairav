/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { AstroChartContext } from "./chart-context.ts";
import { formatChartBasisForAnswer } from "./chart-context.ts";
import { enforceFinalAnswerChartConsistency } from "./final-answer-chart-consistency.ts";

function stripMetadata(answer: string): string {
  return answer
    .replace(/\n?\s*Retrieval cue:[\s\S]*$/i, "")
    .replace(/\b(provider|model|server|followUpQuestion|followUpAnswer|debugTrace|metadata):\s*[^\n]+/gi, "")
    .replace(/\bmeta:\s*\{[^}]*\}/gi, "")
    .replace(/\b(profile_id|chart_version_id|user_id)\s*[:=]\s*[^,\n)]+/gi, "")
    .replace(/\bfact:\s*/gi, "chart_fact: ")
    .trim();
}

export function answerLooksChartGrounded(answer: string, chartContext: AstroChartContext): boolean {
  const normalized = answer.toLowerCase();
  return normalized.startsWith("aadesh:") && chartContext.basisFacts.some((fact) => normalized.includes(fact.toLowerCase().split(":")[0] ?? fact.toLowerCase()));
}

export function ensureChartGroundedAnswer(input: {
  answer: string;
  chartContext: AstroChartContext;
}): string {
  const cleaned = stripMetadata(input.answer || "");
  const basis = formatChartBasisForAnswer(input.chartContext);
  const basisSafe = basis.replace(/\s+/g, " ").trim();
  const candidate = !cleaned ? `aadesh: ${basisSafe}\n\nI could not complete a deeper reading right now, but based on the saved chart context, avoid taking the result as certainty. Please try again shortly.` : cleaned.toLowerCase().startsWith("aadesh:") ? cleaned : `aadesh: ${basisSafe}\n\n${cleaned}`;
  const enforced = enforceFinalAnswerChartConsistency({ answer: candidate, facts: input.chartContext.normalizedFacts });
  return enforced.answer;
}
