/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

type RecordLike = Record<string, unknown>;

export type NormalizedChartFacts = {
  lagnaSign?: string;
  lagnaLord?: string;
  moonSign?: string;
  moonHouse?: number;
  rasiLord?: string;
  sunSign?: string;
  sunHouse?: number;
  westernSunSign?: string;
  nakshatra?: string;
  nakshatraPada?: number;
  nakshatraLord?: string;
  mahadasha?: string;
  mahadashaStart?: string;
  mahadashaEnd?: string;
  antardashaNow?: string;
  antardashaTimeline?: Array<{ mahadasha: string; antardasha: string; startDate?: string; endDate?: string }>;
  mangalDosha?: boolean;
  kalsarpaYoga?: boolean;
  placements?: Record<string, { sign?: string; house?: number; nakshatra?: string; pada?: number }>;
  sourcePriority: string[];
  warnings: string[];
};

function isRecord(value: unknown): value is RecordLike {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function asRecord(value: unknown): RecordLike | undefined {
  return isRecord(value) ? value : undefined;
}
function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : undefined;
}
function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
function getPath(root: unknown, path: string[]): unknown {
  let current = root;
  for (const part of path) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}
function canonicalizeSign(value: string | undefined): string | undefined {
  const normalized = normalizeName(value);
  if (!normalized) return undefined;
  const map: Record<string, string> = {
    aries: "Aries",
    taurus: "Taurus",
    gemini: "Gemini",
    cancer: "Cancer",
    leo: "Leo",
    virgo: "Virgo",
    libra: "Libra",
    scorpio: "Scorpio",
    sagittarius: "Sagittarius",
    capricorn: "Capricorn",
    aquarius: "Aquarius",
    pisces: "Pisces",
  };
  return map[normalized.toLowerCase()] ?? normalized;
}
function getString(root: unknown, paths: string[][]): string | undefined {
  for (const path of paths) {
    const value = asString(getPath(root, path));
    if (value) return value;
  }
  return undefined;
}
function getNumber(root: unknown, paths: string[][]): number | undefined {
  for (const path of paths) {
    const value = asNumber(getPath(root, path));
    if (value !== undefined) return value;
  }
  return undefined;
}
function getBoolean(root: unknown, paths: string[][]): boolean | undefined {
  for (const path of paths) {
    const value = getPath(root, path);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (/^(true|yes|1)$/i.test(value.trim())) return true;
      if (/^(false|no|0)$/i.test(value.trim())) return false;
    }
  }
  return undefined;
}
function normalizeName(value: string | undefined): string | undefined {
  return value ? value.trim().replace(/\s+/g, " ") : undefined;
}
function findWholeSignHouse(lagna: string | undefined, sign: string | undefined): number | undefined {
  if (!lagna || !sign) return undefined;
  const order = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
  const start = order.indexOf(lagna.toLowerCase());
  const target = order.indexOf(sign.toLowerCase());
  if (start < 0 || target < 0) return undefined;
  return ((target - start + 12) % 12) + 1;
}
function getTimeline(container: unknown): Array<{ mahadasha: string; antardasha: string; startDate?: string; endDate?: string }> {
  const list = getPath(container, ["antardashaTimeline"]) ?? getPath(container, ["mahadasha_sequence"]) ?? getPath(container, ["timing_signatures", "mahadasha_sequence"]);
  if (!Array.isArray(list)) return [];
  return list.flatMap((row) => {
    const rec = asRecord(row);
    if (!rec) return [];
    const mahadasha = getString(rec, [["mahadasha"], ["lord"], ["name"]]);
    const antardasha = getString(rec, [["antardasha"], ["sub_lord"], ["name"]]);
    if (!mahadasha || !antardasha) return [];
    return [{ mahadasha, antardasha, startDate: getString(rec, [["startDate"], ["start_date"], ["from"]]), endDate: getString(rec, [["endDate"], ["end_date"], ["to"]]) }];
  });
}
function extractPlacements(container: unknown, lagnaSign?: string): Record<string, { sign?: string; house?: number; nakshatra?: string; pada?: number }> | undefined {
  if (!isRecord(container)) return undefined;
  const placements: Record<string, { sign?: string; house?: number; nakshatra?: string; pada?: number }> = {};
  const names = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
  for (const name of names) {
    const row = asRecord(container[name]) ?? asRecord(container[name.toLowerCase()]);
    if (!row) continue;
    const sign = getString(row, [["sign"], ["rashi"], ["house_sign"], ["current_sign"]]);
    const house = getNumber(row, [["house"], ["house_number"], ["bhava"]]);
    const nakshatra = getString(row, [["nakshatra"], ["nakshatra_name"], ["current_nakshatra"]]);
    const pada = getNumber(row, [["pada"], ["nakshatra_pada"]]);
    const derivedHouse = house ?? findWholeSignHouse(lagnaSign, sign);
    if (sign || derivedHouse !== undefined || nakshatra || pada !== undefined) placements[name] = { sign, house: derivedHouse, nakshatra, pada };
  }
  return Object.keys(placements).length ? placements : undefined;
}
function readPlanetContainer(root: unknown): unknown {
  return getPath(root, ["public_facts", "planets"]) ?? getPath(root, ["publicFacts", "planets"]) ?? getPath(root, ["d1", "planets"]) ?? getPath(root, ["d1_chart", "placements"]) ?? getPath(root, ["planets"]);
}
function chooseTrustedSign(input: Array<{ value?: string; source: string }>): { value?: string; sourcePriority: string[]; warning?: string } {
  const prioritized = input
    .map((item) => ({ ...item, value: canonicalizeSign(item.value) }))
    .filter((item): item is { value: string; source: string } => Boolean(item.value));
  if (!prioritized.length) return { sourcePriority: [] };
  const trustedOrder = [
    "reportDerivedFacts",
    "predictionSummary.public_facts",
    "predictionSummary.normalizedFacts",
    "chartJson.public_facts",
    "chartJson.publicFacts",
    "chartJson.d1",
    "chartJson.rashi",
    "chartJson.rasi",
    "chartJson.vedic",
    "chartJson.sidereal",
    "genericAscendant",
  ];
  const selected = [...trustedOrder]
    .map((source) => prioritized.find((item) => item.source === source))
    .find((item): item is { value: string; source: string } => Boolean(item));
  const warning = prioritized.some((item) => item.value !== selected?.value) ? "conflicting_lagna_sources" : undefined;
  return { value: selected?.value, sourcePriority: prioritized.map((item) => item.source), warning };
}

export function extractReportDerivedChartFacts(input: unknown): Partial<NormalizedChartFacts> {
  const facts: Partial<NormalizedChartFacts> = {};
  if (!isRecord(input)) return facts;

  const summary = input.predictionSummary && isRecord(input.predictionSummary) ? input.predictionSummary : undefined;
  const report = input.reportDerivedFacts && isRecord(input.reportDerivedFacts) ? input.reportDerivedFacts : input;
  const chart = input.chartJson;
  const reportPlanets = readPlanetContainer(report);
  const chartPlanets = readPlanetContainer(chart);

  const reportLagna = getString(report, [["lagnaSign"], ["lagna"], ["ascendant"], ["ascendantSign"], ["rashi"], ["d1", "lagna", "sign"]]);
  const summaryLagna = getString(summary, [["public_facts", "lagna_sign"], ["publicFacts", "lagnaSign"], ["normalizedFacts", "lagnaSign"], ["lagna_sign"], ["lagnaSign"], ["lagna"], ["ascendant"]]);
  const chartLagna = getString(chart, [["public_facts", "lagna_sign"], ["publicFacts", "lagnaSign"], ["d1", "lagna", "sign"], ["d1", "ascendant", "sign"], ["rashi", "lagna", "sign"], ["lagna", "sign"], ["ascendant", "sign"], ["vedic", "lagna", "sign"], ["sidereal", "lagna", "sign"]]);
  const genericLagna = getString(chart, [["ascendant", "sign"], ["tropical", "ascendant", "sign"]]);
  const lagnaChoice = chooseTrustedSign([
    { value: reportLagna, source: "reportDerivedFacts" },
    { value: summaryLagna, source: "predictionSummary.public_facts" },
    { value: getString(summary, [["normalizedFacts", "lagnaSign"], ["normalizedFacts", "lagna", "sign"]]), source: "predictionSummary.normalizedFacts" },
    { value: chartLagna, source: "chartJson.public_facts" },
    { value: genericLagna, source: "genericAscendant" },
  ]);
  facts.lagnaSign = lagnaChoice.value;
  const moonSignValue = getString(report, [["moonSign"], ["moon", "sign"], ["rasi", "sign"]]) ?? getString(reportPlanets, [["Moon", "sign"], ["moon", "sign"], ["Chandra", "sign"]]) ?? getString(chart, [["public_facts", "moon_sign"], ["publicFacts", "moonSign"], ["moon", "sign"], ["planets", "Moon", "sign"]]) ?? getString(chartPlanets, [["Moon", "sign"], ["moon", "sign"], ["Chandra", "sign"]]);
  facts.moonSign = canonicalizeSign(moonSignValue);
  facts.moonHouse = getNumber(report, [["moonHouse"], ["moon", "house"]]) ?? getNumber(reportPlanets, [["Moon", "house"], ["moon", "house"], ["Chandra", "house"]]) ?? getNumber(chart, [["public_facts", "moon_house"], ["publicFacts", "moonHouse"], ["moon", "house"], ["planets", "Moon", "house"]]) ?? getNumber(chartPlanets, [["Moon", "house"], ["moon", "house"], ["Chandra", "house"]]);
  const sunSignValue = getString(report, [["sunSign"], ["sun", "sign"], ["vedicSunSign"]]) ?? getString(reportPlanets, [["Sun", "sign"], ["sun", "sign"], ["Surya", "sign"]]) ?? getString(chart, [["public_facts", "sun_sign"], ["publicFacts", "sunSign"], ["sun", "sign"], ["planets", "Sun", "sign"]]) ?? getString(chartPlanets, [["Sun", "sign"], ["sun", "sign"], ["Surya", "sign"]]);
  facts.sunSign = normalizeName(sunSignValue);
  facts.sunHouse = getNumber(report, [["sunHouse"], ["sun", "house"]]) ?? getNumber(reportPlanets, [["Sun", "house"], ["sun", "house"], ["Surya", "house"]]) ?? getNumber(chart, [["public_facts", "sun_house"], ["publicFacts", "sunHouse"], ["sun", "house"], ["planets", "Sun", "house"]]) ?? getNumber(chartPlanets, [["Sun", "house"], ["sun", "house"], ["Surya", "house"]]);
  facts.westernSunSign = normalizeName(getString(report, [["westernSunSign"], ["tropicalSunSign"]]) ?? getString(chart, [["westernSunSign"], ["tropicalSunSign"]]));
  const nakshatraValue = getString(report, [["nakshatra"], ["moonNakshatra"], ["moon_nakshatra"]]) ?? getString(reportPlanets, [["Moon", "nakshatra"], ["moon", "nakshatra"], ["Chandra", "nakshatra"]]) ?? getString(chart, [["nakshatra"], ["moonNakshatra"], ["moon_nakshatra"], ["public_facts", "moon_nakshatra"], ["publicFacts", "moonNakshatra"]]) ?? getString(chartPlanets, [["Moon", "nakshatra"], ["moon", "nakshatra"], ["Chandra", "nakshatra"]]);
  facts.nakshatra = normalizeName(nakshatraValue);
  facts.nakshatraPada = getNumber(report, [["nakshatraPada"], ["nakshatra_pada"]]) ?? getNumber(reportPlanets, [["Moon", "pada"], ["moon", "pada"], ["Chandra", "pada"]]) ?? getNumber(chart, [["nakshatraPada"], ["nakshatra_pada"], ["public_facts", "moon_pada"], ["publicFacts", "moonPada"]]) ?? getNumber(chartPlanets, [["Moon", "pada"], ["moon", "pada"], ["Chandra", "pada"]]);
  facts.nakshatraLord = normalizeName(getString(report, [["nakshatraLord"], ["nakshatra_lord"]]) ?? getString(chart, [["nakshatraLord"], ["nakshatra_lord"], ["public_facts", "nakshatra_lord"], ["publicFacts", "nakshatraLord"]]));
  facts.lagnaLord = normalizeName(getString(report, [["lagnaLord"], ["lagna_lord"]]) ?? getString(chart, [["lagnaLord"], ["lagna_lord"], ["public_facts", "lagna_lord"], ["publicFacts", "lagnaLord"]]));
  facts.rasiLord = normalizeName(getString(report, [["rasiLord"], ["rasi_lord"]]) ?? getString(chart, [["rasiLord"], ["rasi_lord"], ["public_facts", "rasi_lord"], ["publicFacts", "rasiLord"]]));
  const mahadashaValue = getString(report, [["mahadasha"], ["currentMahadasha"]]) ?? getString(summary, [["mahadasha"]]) ?? getString(chart, [["mahadasha"], ["currentMahadasha"], ["public_facts", "mahadasha"], ["publicFacts", "mahadasha"], ["prediction_ready_summaries", "mahadasha"]]) ?? (() => {
    const timing = getString(summary, [["current_timing_summary"]]) ?? getString(chart, [["prediction_ready_summaries", "current_timing_summary"]]);
    return timing?.match(/\b(Jupiter|Saturn|Mercury|Venus|Mars|Sun|Moon|Rahu|Ketu)\b/i)?.[1];
  })();
  facts.mahadasha = normalizeName(mahadashaValue);
  facts.mahadashaStart = getString(report, [["mahadashaStart"], ["mahadasha_start"]]) ?? getString(summary, [["mahadashaStart"], ["mahadasha_start"]]);
  facts.mahadashaEnd = getString(report, [["mahadashaEnd"], ["mahadasha_end"]]) ?? getString(summary, [["mahadashaEnd"], ["mahadasha_end"]]);
  const antardashaNowValue = getString(report, [["antardashaNow"], ["currentAntardasha"]]) ?? getString(chart, [["antardashaNow"], ["currentAntardasha"], ["prediction_ready_summaries", "current_timing_summary"]]);
  facts.antardashaNow = normalizeName(antardashaNowValue);
  facts.antardashaTimeline = getTimeline(report).length ? getTimeline(report) : getTimeline(summary).length ? getTimeline(summary) : getTimeline(chart);
  facts.mangalDosha = getBoolean(report, [["mangalDosha"], ["manglik"]]) ?? getBoolean(chart, [["mangalDosha"], ["manglik"], ["public_facts", "mangalDosha"], ["publicFacts", "mangalDosha"]]);
  facts.kalsarpaYoga = getBoolean(report, [["kalsarpaYoga"], ["kalsarpa"]]) ?? getBoolean(chart, [["kalsarpaYoga"], ["kalsarpa"], ["public_facts", "kalsarpaYoga"], ["publicFacts", "kalsarpaYoga"]]);
  facts.placements = extractPlacements(reportPlanets ?? chartPlanets ?? chart, facts.lagnaSign);

  const summaryLagnaChoice = normalizeName(getString(summary, [["public_facts", "lagna_sign"], ["publicFacts", "lagnaSign"], ["normalizedFacts", "lagnaSign"], ["lagna_sign"], ["lagnaSign"], ["lagna"], ["ascendant"]]));
  const chosenLagna = chooseTrustedSign([
    { value: facts.lagnaSign, source: "reportDerivedFacts" },
    { value: summaryLagnaChoice, source: "predictionSummary.public_facts" },
    { value: getString(summary, [["normalizedFacts", "lagnaSign"], ["normalizedFacts", "lagna", "sign"]]), source: "predictionSummary.normalizedFacts" },
    { value: chartLagna, source: "chartJson.public_facts" },
    { value: genericLagna, source: "genericAscendant" },
  ]);
  if (chosenLagna.value) facts.lagnaSign = chosenLagna.value;
  facts.sourcePriority = chosenLagna.sourcePriority;
  facts.warnings = chosenLagna.warning ? [chosenLagna.warning] : [];

  if (!facts.moonSign) facts.moonSign = canonicalizeSign(getString(summary, [["public_facts", "moon_sign"], ["publicFacts", "moonSign"], ["normalizedFacts", "moonSign"], ["moonSign"]]));
  if (!facts.moonHouse) facts.moonHouse = getNumber(summary, [["public_facts", "moon_house"], ["publicFacts", "moonHouse"], ["normalizedFacts", "moonHouse"], ["moonHouse"]]);
  if (!facts.sunSign) facts.sunSign = canonicalizeSign(getString(summary, [["public_facts", "sun_sign"], ["publicFacts", "sunSign"], ["normalizedFacts", "sunSign"], ["sunSign"]]));
  if (!facts.sunHouse) facts.sunHouse = getNumber(summary, [["public_facts", "sun_house"], ["publicFacts", "sunHouse"], ["normalizedFacts", "sunHouse"], ["sunHouse"]]);
  if (!facts.westernSunSign) facts.westernSunSign = normalizeName(getString(summary, [["westernSunSign"], ["western_sun_sign"]]));
  if (!facts.nakshatra) facts.nakshatra = normalizeName(getString(summary, [["nakshatra"], ["moonNakshatra"]]));
  if (!facts.nakshatraPada) facts.nakshatraPada = getNumber(summary, [["nakshatraPada"], ["nakshatra_pada"]]);
  if (!facts.nakshatraLord) facts.nakshatraLord = normalizeName(getString(summary, [["nakshatraLord"], ["nakshatra_lord"]]));
  if (!facts.lagnaLord) facts.lagnaLord = normalizeName(getString(summary, [["lagnaLord"], ["lagna_lord"]]));
  if (!facts.rasiLord) facts.rasiLord = normalizeName(getString(summary, [["rasiLord"], ["rasi_lord"]]));
  if (!facts.mahadasha) facts.mahadasha = normalizeName(getString(summary, [["mahadasha"], ["currentMahadasha"], ["current_timing", "lord"]]));
  if (!facts.mahadashaStart) facts.mahadashaStart = getString(summary, [["mahadashaStart"], ["mahadasha_start"]]);
  if (!facts.mahadashaEnd) facts.mahadashaEnd = getString(summary, [["mahadashaEnd"], ["mahadasha_end"]]);
  if (!facts.antardashaNow) facts.antardashaNow = normalizeName(getString(summary, [["antardashaNow"], ["currentAntardasha"], ["current_timing", "antardasha"]]));
  if (!facts.antardashaTimeline?.length) facts.antardashaTimeline = facts.antardashaTimeline?.length ? facts.antardashaTimeline : getTimeline(summary);
  if (facts.placements == null) facts.placements = extractPlacements(readPlanetContainer(summary) ?? summary, facts.lagnaSign);
  if (facts.mangalDosha === undefined) facts.mangalDosha = getBoolean(summary, [["mangalDosha"], ["manglik"]]);
  if (facts.kalsarpaYoga === undefined) facts.kalsarpaYoga = getBoolean(summary, [["kalsarpaYoga"], ["kalsarpa"]]);

  if (facts.lagnaSign && facts.moonSign && !facts.moonHouse) facts.moonHouse = findWholeSignHouse(facts.lagnaSign, facts.moonSign);
  if (facts.lagnaSign && facts.sunSign && !facts.sunHouse) facts.sunHouse = findWholeSignHouse(facts.lagnaSign, facts.sunSign);
  return facts;
}

export function buildNormalizedChartFacts(input: { chartJson: unknown; predictionSummary?: unknown; reportFacts?: unknown }): NormalizedChartFacts {
  const extracted = extractReportDerivedChartFacts({ chartJson: input.chartJson, predictionSummary: input.predictionSummary, reportDerivedFacts: input.reportFacts });
  const sourcePriority = extracted.sourcePriority ?? [];
  const warnings = extracted.warnings ?? [];
  return {
    ...extracted,
    sourcePriority,
    warnings,
  };
}
