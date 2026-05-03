/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { buildNormalizedChartFacts, type NormalizedChartFacts } from "./normalized-chart-facts.ts";

export type AstroChartContext = {
  ready: true;
  profileId: string;
  chartVersionId: string;
  normalizedFacts: NormalizedChartFacts;
  basisFacts: string[];
  basisLine: string;
  compactPromptContext: string;
  publicFacts: Record<string, string | number | boolean | null>;
};

export type AstroChartContextUnavailable = { ready: false; reason: "missing_chart" | "empty_chart" | "no_deterministic_facts" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    if (!value) return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [trimmed];
  });
}
function formatHouse(value?: number): string | undefined {
  if (!value) return undefined;
  return `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"}`;
}
function formatBasisHeadline(facts: NormalizedChartFacts): string {
  const parts: string[] = [];
  if (facts.lagnaSign) parts.push(`${facts.lagnaSign} Lagna`);
  if (facts.moonSign && facts.moonHouse) parts.push(`${facts.moonSign} Moon in the ${formatHouse(facts.moonHouse)} house`);
  if (facts.sunSign && facts.sunHouse) parts.push(`${facts.sunSign} Sun in the ${formatHouse(facts.sunHouse)} house`);
  if (facts.nakshatra && facts.nakshatraPada) parts.push(`${facts.nakshatra} Nakshatra Pada ${facts.nakshatraPada}`);
  if (facts.mahadasha) parts.push(`running ${facts.mahadasha} Mahadasha`);
  return parts.join(", ");
}
export function buildAstroChartContext(input: { profileId: string; chartVersionId: string; chartJson: unknown; predictionSummary?: unknown }): AstroChartContext | AstroChartContextUnavailable {
  if (!input.chartJson || (isRecord(input.chartJson) && Object.keys(input.chartJson).length === 0)) return { ready: false, reason: "empty_chart" };
  const normalizedFacts = buildNormalizedChartFacts({ chartJson: input.chartJson, predictionSummary: input.predictionSummary, reportFacts: input.predictionSummary });
  const basisFacts = uniqueStrings([
    normalizedFacts.lagnaSign ? `Lagna (Ascendant): ${normalizedFacts.lagnaSign}` : undefined,
    normalizedFacts.moonSign ? `Moon sign: ${normalizedFacts.moonSign}${normalizedFacts.moonHouse ? ` (house ${normalizedFacts.moonHouse})` : ""}` : undefined,
    normalizedFacts.sunSign ? `Sun sign: ${normalizedFacts.sunSign}${normalizedFacts.sunHouse ? ` (house ${normalizedFacts.sunHouse})` : ""}` : undefined,
    normalizedFacts.nakshatra ? `Nakshatra: ${normalizedFacts.nakshatra}${normalizedFacts.nakshatraPada ? `, Pada ${normalizedFacts.nakshatraPada}` : ""}` : undefined,
    normalizedFacts.lagnaLord ? `Lagna lord: ${normalizedFacts.lagnaLord}` : undefined,
    normalizedFacts.rasiLord ? `Rasi lord: ${normalizedFacts.rasiLord}` : undefined,
    normalizedFacts.nakshatraLord ? `Nakshatra lord: ${normalizedFacts.nakshatraLord}` : undefined,
    normalizedFacts.mahadasha ? `Mahadasha: ${normalizedFacts.mahadasha}` : undefined,
    normalizedFacts.antardashaNow ? `Antardasha: ${normalizedFacts.antardashaNow}` : undefined,
  ]);
  if (!basisFacts.length) return { ready: false, reason: "no_deterministic_facts" };
  const basisLine = `Chart basis: ${formatBasisHeadline(normalizedFacts) || basisFacts[0]}`;
  const compactPromptContext = basisFacts.map((fact) => `chart_fact: ${fact}`).join("\n");
  const publicFacts: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries({
    lagnaSign: normalizedFacts.lagnaSign,
    lagnaLord: normalizedFacts.lagnaLord,
    rasiLord: normalizedFacts.rasiLord,
    nakshatraLord: normalizedFacts.nakshatraLord,
    moonSign: normalizedFacts.moonSign,
    moonHouse: normalizedFacts.moonHouse,
    sunSign: normalizedFacts.sunSign,
    sunHouse: normalizedFacts.sunHouse,
    westernSunSign: normalizedFacts.westernSunSign,
    nakshatra: normalizedFacts.nakshatra,
    nakshatraPada: normalizedFacts.nakshatraPada,
    mahadasha: normalizedFacts.mahadasha,
    mahadashaStart: normalizedFacts.mahadashaStart,
    mahadashaEnd: normalizedFacts.mahadashaEnd,
    antardashaNow: normalizedFacts.antardashaNow,
    mangalDosha: normalizedFacts.mangalDosha,
    kalsarpaYoga: normalizedFacts.kalsarpaYoga,
  })) {
    if (value !== undefined) publicFacts[key] = value as string | number | boolean | null;
  }
  return { ready: true, profileId: input.profileId, chartVersionId: input.chartVersionId, normalizedFacts, basisFacts, basisLine, compactPromptContext, publicFacts };
}
export function formatChartBasisForAnswer(context: AstroChartContext): string {
  return context.basisLine;
}
