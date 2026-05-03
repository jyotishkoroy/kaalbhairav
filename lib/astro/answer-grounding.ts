/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { AstroChartContext } from "@/lib/astro/chart-context";
import { formatChartBasisForAnswer } from "@/lib/astro/chart-context";

function stripMetadata(answer: string): string {
  return answer
    .replace(/\b(provider|model|server|followUpQuestion|followUpAnswer|debugTrace|metadata):\s*[^\n]+/gi, "")
    .replace(/\bmeta:\s*\{[^}]*\}/gi, "")
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
  if (!cleaned) return `aadesh: ${formatChartBasisForAnswer(input.chartContext)}\n\nI could not complete a deeper reading right now, but based on the saved chart context, avoid taking the result as certainty. Please try again shortly.`;
  if (cleaned.toLowerCase().startsWith("aadesh:")) return cleaned;
  return `aadesh: ${formatChartBasisForAnswer(input.chartContext)}\n\n${cleaned}`;
}
