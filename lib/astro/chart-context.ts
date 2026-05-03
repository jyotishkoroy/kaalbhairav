/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

type ChartFactsRecord = Record<string, unknown>;

export type AstroChartContext = {
  ready: true;
  profileId: string;
  chartVersionId: string;
  basisFacts: string[];
  basisLine: string;
  compactPromptContext: string;
  publicFacts: Record<string, string | number | boolean | null>;
};

export type AstroChartContextUnavailable = {
  ready: false;
  reason: "missing_chart" | "empty_chart" | "no_deterministic_facts";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): ChartFactsRecord | undefined {
  return isRecord(value) ? (value as ChartFactsRecord) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function readPath(root: unknown, paths: string[][]): unknown {
  for (const path of paths) {
    let current: unknown = root;
    let ok = true;
    for (const part of path) {
      if (!isRecord(current)) {
        ok = false;
        break;
      }
      current = current[part];
    }
    if (ok && current !== undefined && current !== null) return current;
  }
  return undefined;
}

function readStringPath(root: unknown, paths: string[][]): string | undefined {
  return asString(readPath(root, paths));
}

function readNumberPath(root: unknown, paths: string[][]): number | undefined {
  return asNumber(readPath(root, paths));
}

function normalizeSign(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/\s+/g, " ") : undefined;
}

function extractLagnaSign(chartJson: unknown): string | undefined {
  const candidates = [
    ["public_facts", "lagna_sign"],
    ["publicFacts", "lagnaSign"],
    ["d1", "lagna", "sign"],
    ["d1", "ascendant", "sign"],
    ["rashi", "lagna", "sign"],
    ["rashi", "ascendant", "sign"],
    ["d1_chart", "lagna", "sign"],
    ["d1_chart", "ascendant", "sign"],
    ["divisionalCharts", "d1", "lagna", "sign"],
    ["divisionalCharts", "d1", "ascendant", "sign"],
    ["divisional_charts", "d1", "lagna", "sign"],
    ["divisional_charts", "d1", "ascendant", "sign"],
    ["ascendant", "sign"],
    ["lagna", "sign"],
    ["masterOutput", "ascendant", "sign"],
    ["master_output", "ascendant", "sign"],
    ["chart", "ascendant", "sign"],
  ];
  return normalizeSign(readStringPath(chartJson, candidates));
}

function extractLagnaDegree(chartJson: unknown): string | undefined {
  const raw =
    readStringPath(chartJson, [
      ["ascendant", "degree"],
      ["lagna", "degree"],
      ["masterOutput", "ascendant", "degree"],
      ["master_output", "ascendant", "degree"],
    ]) ??
    readNumberPath(chartJson, [
      ["ascendant", "degree"],
      ["lagna", "degree"],
      ["masterOutput", "ascendant", "degree"],
      ["master_output", "ascendant", "degree"],
    ])?.toFixed(2);
  return raw ? raw.replace(/\s+/g, " ") : undefined;
}

function extractPlanetPlacement(chartJson: unknown, planetNames: string[]): { sign?: string; house?: number } | undefined {
  const placements = [
    ["planets"],
    ["planet_positions"],
    ["placements"],
    ["grahas"],
    ["public_facts", "planets"],
    ["publicFacts", "planets"],
    ["d1_chart", "placements"],
    ["masterOutput", "planets"],
    ["master_output", "planets"],
  ];
  for (const rootPath of placements) {
    const container = readPath(chartJson, [rootPath]);
    if (!isRecord(container)) continue;
    for (const planetName of planetNames) {
      const planet = asRecord(container[planetName]) ?? asRecord(container[planetName.toLowerCase()]);
      if (!planet) continue;
      const sign = normalizeSign(asString(planet.sign));
      const house = asNumber(planet.house);
      if (sign || house !== undefined) return { sign, house };
    }
  }
  return undefined;
}

function extractMoonSun(chartJson: unknown, planetName: "Moon" | "Sun"): { sign?: string; house?: number } | undefined {
  return extractPlanetPlacement(chartJson, [planetName, planetName.toLowerCase(), planetName === "Moon" ? "Chandra" : "Surya"]);
}

function extractBirthTimePrecision(chartJson: unknown): string | undefined {
  return (
    readStringPath(chartJson, [
      ["normalized_input", "birth_time_precision"],
      ["birth_time_precision"],
      ["birthTimePrecision"],
      ["public_facts", "birth_time_precision"],
      ["publicFacts", "birthTimePrecision"],
    ]) ??
    readStringPath(chartJson, [
      ["normalized_input", "birth_time_known"],
      ["birth_time_known"],
      ["birthTimeKnown"],
    ])
  );
}

function extractCurrentDasha(chartJson: unknown): string | undefined {
  const summaryPaths = [
    ["currentDasha"],
    ["prediction_ready_summaries", "current_timing_summary"],
    ["prediction_ready_summaries", "current_timing"],
    ["prediction_ready_summaries", "summary"],
    ["timing_signatures", "current_timing_summary"],
    ["dashas", "current"],
    ["vimshottari_dasha", "current"],
  ];
  const value = readStringPath(chartJson, summaryPaths);
  return value ? value.replace(/\s+/g, " ") : undefined;
}

function extractPublicFact(chartJson: unknown, keys: string[]): string | undefined {
  for (const root of ["public_facts", "publicFacts", "facts"]) {
    for (const key of keys) {
      const value = readStringPath(chartJson, [[root, key]]);
      if (value) return value;
    }
  }
  return undefined;
}

function extractPredictionSummary(predictionSummary: unknown): string[] {
  if (!isRecord(predictionSummary)) return [];
  const summary = predictionSummary;
  const lines = uniqueStrings([
    asString(summary.summary),
    asString(summary.core_natal_summary && isRecord(summary.core_natal_summary) ? summary.core_natal_summary.summary : undefined),
    asString(summary.current_timing_summary),
    asString(summary.daily_transits_summary),
    asString(summary.panchang_summary),
    asString(summary.life_areas_summary),
  ]);
  return lines.slice(0, 4);
}

function formatBasisHeadline(fact: string): string {
  const lagnaMatch = fact.match(/^Lagna \(Ascendant\):\s*(.+)$/i);
  if (lagnaMatch) return `${lagnaMatch[1]} Lagna`;
  return fact;
}

export function buildAstroChartContext(input: {
  profileId: string;
  chartVersionId: string;
  chartJson: unknown;
  predictionSummary?: unknown;
}): AstroChartContext | AstroChartContextUnavailable {
  if (!input.chartJson || (isRecord(input.chartJson) && Object.keys(input.chartJson).length === 0)) {
    return { ready: false, reason: "empty_chart" };
  }

  const chartJson = input.chartJson;
  const basisFacts: string[] = [];
  const publicFacts: Record<string, string | number | boolean | null> = {};

  const lagnaSign = extractLagnaSign(chartJson);
  if (lagnaSign) {
    basisFacts.push(`Lagna (Ascendant): ${lagnaSign}`);
    publicFacts.lagnaSign = lagnaSign;
  }

  const lagnaDegree = extractLagnaDegree(chartJson);
  if (lagnaDegree) {
    basisFacts.push(`Ascendant degree: ${lagnaDegree}`);
    publicFacts.lagnaDegree = lagnaDegree;
  }

  const moon = extractMoonSun(chartJson, "Moon");
  if (moon?.sign) {
    basisFacts.push(`Moon sign: ${moon.sign}${moon.house ? ` (house ${moon.house})` : ""}`);
    publicFacts.moonSign = moon.sign;
    if (moon.house !== undefined) publicFacts.moonHouse = moon.house;
  }

  const sun = extractMoonSun(chartJson, "Sun");
  if (sun?.sign) {
    basisFacts.push(`Sun sign: ${sun.sign}${sun.house ? ` (house ${sun.house})` : ""}`);
    publicFacts.sunSign = sun.sign;
    if (sun.house !== undefined) publicFacts.sunHouse = sun.house;
  }

  const birthTimePrecision = extractBirthTimePrecision(chartJson);
  if (birthTimePrecision) {
    basisFacts.push(`Birth time precision: ${birthTimePrecision}`);
    publicFacts.birthTimePrecision = birthTimePrecision;
  }

  const currentDasha = extractCurrentDasha(chartJson);
  if (currentDasha) {
    basisFacts.push(`Current dasha: ${currentDasha}`);
    publicFacts.currentDasha = currentDasha;
  }

  const lagnaLord = extractPublicFact(chartJson, ["lagna_lord", "lagnaLord"]);
  if (lagnaLord) {
    basisFacts.push(`Lagna lord: ${lagnaLord}`);
    publicFacts.lagnaLord = lagnaLord;
  }

  const rasiLord = extractPublicFact(chartJson, ["rasi_lord", "rasiLord"]);
  if (rasiLord) {
    basisFacts.push(`Rasi lord: ${rasiLord}`);
    publicFacts.rasiLord = rasiLord;
  }

  const nakshatraLord = extractPublicFact(chartJson, ["nakshatra_lord", "nakshatraLord"]);
  if (nakshatraLord) {
    basisFacts.push(`Nakshatra lord: ${nakshatraLord}`);
    publicFacts.nakshatraLord = nakshatraLord;
  }

  const westernSunSign = extractPublicFact(chartJson, ["western_sun_sign", "westernSunSign"]);
  if (westernSunSign) {
    basisFacts.push(`Western sun sign: ${westernSunSign}`);
    publicFacts.westernSunSign = westernSunSign;
  }

  const nakshatra = readStringPath(chartJson, [
    ["nakshatra"],
    ["public_facts", "nakshatra"],
    ["publicFacts", "nakshatra"],
    ["moon", "nakshatra"],
  ]);
  if (nakshatra) {
    basisFacts.push(`Nakshatra: ${nakshatra}`);
    publicFacts.nakshatra = nakshatra;
  }

  const predictionSummaryFacts = extractPredictionSummary(input.predictionSummary);
  for (const fact of predictionSummaryFacts) basisFacts.push(`Prediction summary: ${fact}`);

  const uniqueBasisFacts = uniqueStrings(basisFacts);
  if (!uniqueBasisFacts.length) {
    return { ready: false, reason: "no_deterministic_facts" };
  }

  const basisLine = `Chart basis: ${formatBasisHeadline(uniqueBasisFacts[0])}. I am using only your saved chart facts and will avoid unsupported timing certainty.`;
  const compactPromptContext = [
    ...uniqueBasisFacts.map((fact) => `chart_fact: ${fact}`),
  ].join("\n");

  return {
    ready: true,
    profileId: input.profileId,
    chartVersionId: input.chartVersionId,
    basisFacts: uniqueBasisFacts,
    basisLine,
    compactPromptContext,
    publicFacts,
  };
}

export function formatChartBasisForAnswer(context: AstroChartContext): string {
  return context.basisLine;
}
