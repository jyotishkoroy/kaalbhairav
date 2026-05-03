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
  nakshatra?: string;
  nakshatraPada?: number;
  nakshatraLord?: string;
  mahadasha?: string;
  antardashaNow?: string;
  antardashaTimeline?: Array<{
    mahadasha: string;
    antardasha: string;
    startDate?: string;
    endDate?: string;
  }>;
  placements?: Record<string, { sign?: string; house?: number; nakshatra?: string; pada?: number }>;
  sourcePriority: string[];
  warnings: string[];
};

function isRecord(value: unknown): value is RecordLike {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function asRecord(value: unknown): RecordLike | undefined { return isRecord(value) ? (value as RecordLike) : undefined; }
function asString(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) { const n = Number(value); return Number.isFinite(n) ? n : undefined; }
  return undefined;
}
function normalizeName(value: string | undefined): string | undefined { return value ? value.trim().replace(/\s+/g, " ") : undefined; }
function getPath(root: unknown, path: string[]): unknown {
  let cur: unknown = root;
  for (const part of path) {
    if (!isRecord(cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}
function getString(root: unknown, paths: string[][]): string | undefined {
  for (const path of paths) {
    const value = asString(getPath(root, path));
    if (value) return normalizeName(value);
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
function getArray(root: unknown, paths: string[][]): unknown[] {
  for (const path of paths) {
    const value = getPath(root, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}
function findPlacement(container: unknown, names: string[]): { sign?: string; house?: number; nakshatra?: string; pada?: number } | undefined {
  const record = asRecord(container);
  if (!record) return undefined;
  for (const name of names) {
    const row = asRecord(record[name]) ?? asRecord(record[name.toLowerCase()]);
    if (!row) continue;
    const sign = getString(row, [["sign"], ["rashi"], ["house_sign"], ["current_sign"]]);
    const house = getNumber(row, [["house"], ["house_number"], ["bhava"]]);
    const nakshatra = getString(row, [["nakshatra"], ["current_nakshatra"], ["nakshatra_name"]]);
    const pada = getNumber(row, [["pada"], ["nakshatra_pada"]]);
    if (sign || house !== undefined || nakshatra || pada !== undefined) return { sign, house, nakshatra, pada };
  }
  return undefined;
}
function findWholeSignHouse(lagna: string | undefined, sign: string | undefined): number | undefined {
  if (!lagna || !sign) return undefined;
  const order = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  const l = order.indexOf(lagna.toLowerCase());
  const s = order.indexOf(sign.toLowerCase());
  if (l < 0 || s < 0) return undefined;
  return ((s - l + 12) % 12) + 1;
}
function readSources(root: unknown, paths: string[][]): string[] {
  const out: string[] = [];
  for (const path of paths) {
    const v = getPath(root, path);
    if (v && typeof v === "object") out.push(path.join("."));
  }
  return out;
}
function chooseString(candidates: Array<{ value?: string; source: string; trusted: boolean }>): { value?: string; sourcePriority: string[]; warning?: string } {
  const valid = candidates.filter((c) => c.value);
  if (!valid.length) return { sourcePriority: [] };
  const trusted = valid.find((c) => c.trusted);
  const selected = trusted ?? valid[0];
  const conflict = valid.some((c) => c.value && c.value.toLowerCase() !== selected.value?.toLowerCase());
  return { value: selected.value, sourcePriority: valid.map((c) => c.source), warning: conflict ? "conflicting_lagna_sources" : undefined };
}

export function extractReportDerivedChartFacts(input: unknown): Partial<NormalizedChartFacts> {
  const facts: Partial<NormalizedChartFacts> = {};
  if (!isRecord(input)) return facts;
  const current = input.current_timing ?? input.currentTiming ?? input.timing_signatures ?? input.dashas;
  const currentRecord = asRecord(current);
  const mahadasha = getString(currentRecord, [["current_mahadasha","lord"], ["current_reference_mahadasha","lord"]]) ?? getString(current, [["lord"], ["mahadasha"], ["name"]]);
  const antardasha = getString(currentRecord, [["current_antardasha","lord"], ["current_reference_antardasha","lord"]]) ?? getString(current, [["antardasha"], ["lord"], ["name"]]);
  if (mahadasha) facts.mahadasha = mahadasha;
  if (antardasha) facts.antardashaNow = antardasha;
  const seq = getArray(input, [["current_timing","mahadasha_sequence"], ["mahadasha_sequence"], ["timing_signatures","mahadasha_sequence"]]);
  const timeline = seq.map((row) => {
    const rec = asRecord(row);
    const mah = getString(rec, [["mahadasha"], ["lord"], ["name"]]);
    const ant = getString(rec, [["antardasha"], ["sub_lord"], ["name"]]);
    if (!mah || !ant) return null;
    return { mahadasha: mah, antardasha: ant, startDate: getString(rec, [["start_date"], ["from"]]), endDate: getString(rec, [["end_date"], ["to"]]) };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (timeline.length) facts.antardashaTimeline = timeline;
  const summary = getString(input, [["summary"], ["current_timing_summary"], ["currentTimingSummary"]]);
  if (summary && /jupiter/i.test(summary)) facts.mahadasha = facts.mahadasha ?? "Jupiter";
  return facts;
}

export function buildNormalizedChartFacts(input: {
  chartJson: unknown;
  predictionSummary?: unknown;
  reportFacts?: unknown;
}): NormalizedChartFacts {
  const warnings: string[] = [];
  const sourcePriority: string[] = [];
  const out: NormalizedChartFacts = { sourcePriority, warnings };
  const sources = [input.reportFacts, input.predictionSummary, input.chartJson];
  const reportFacts = extractReportDerivedChartFacts(input.reportFacts) || extractReportDerivedChartFacts(input.predictionSummary);
  if (reportFacts.lagnaSign) out.lagnaSign = reportFacts.lagnaSign;
  if (reportFacts.mahadasha) out.mahadasha = reportFacts.mahadasha;
  if (reportFacts.antardashaNow) out.antardashaNow = reportFacts.antardashaNow;
  if (reportFacts.antardashaTimeline) out.antardashaTimeline = reportFacts.antardashaTimeline;

  const chart = input.chartJson;
  const trustedLagna = chooseString([
    { value: getString(reportFacts, [["lagnaSign"]]), source: "reportFacts", trusted: true },
    { value: getString(input.predictionSummary, [["core_natal_summary","lagna_sign"], ["lagna_sign"], ["summary","lagna_sign"]]), source: "predictionSummary", trusted: true },
    { value: getString(chart, [["public_facts","lagna_sign"], ["publicFacts","lagnaSign"], ["d1","lagna","sign"], ["d1","ascendant","sign"], ["rashi","lagna","sign"], ["ascendant","sign"], ["lagna","sign"]]), source: "chartJson", trusted: false },
  ]);
  if (trustedLagna.value) out.lagnaSign = trustedLagna.value;
  if (trustedLagna.warning) warnings.push(trustedLagna.warning);
  sourcePriority.push(...trustedLagna.sourcePriority);

  out.lagnaLord = getString(chart, [["public_facts","lagna_lord"], ["publicFacts","lagnaLord"]]) ?? getString(input.predictionSummary, [["lagna_lord"]]);
  out.rasiLord = getString(chart, [["public_facts","rasi_lord"], ["publicFacts","rasiLord"]]);
  out.nakshatraLord = getString(chart, [["public_facts","nakshatra_lord"], ["publicFacts","nakshatraLord"]]);
  out.nakshatra = getString(input.reportFacts, [["nakshatra"], ["moon_nakshatra"]]) ?? getString(chart, [["nakshatra"], ["public_facts","nakshatra"], ["publicFacts","nakshatra"], ["moon","nakshatra"], ["moon","nakshatra_name"], ["public_facts","planets","Moon","nakshatra"], ["publicFacts","planets","Moon","nakshatra"], ["planetary_positions","Moon","nakshatra"]]);
  out.nakshatraPada = getNumber(input.reportFacts, [["nakshatraPada"], ["nakshatra_pada"]]) ?? getNumber(chart, [["public_facts","nakshatra_pada"], ["publicFacts","nakshatraPada"], ["public_facts","planets","Moon","pada"], ["publicFacts","planets","Moon","pada"], ["planetary_positions","Moon","pada"]]);

  const moon = findPlacement(getPath(chart, ["public_facts","planets"]) ?? getPath(chart, ["publicFacts","planets"]) ?? getPath(chart, ["d1","planets"]) ?? getPath(chart, ["d1_chart","placements"]) ?? getPath(chart, ["planets"]), ["Moon","moon","Chandra"]);
  const sun = findPlacement(getPath(chart, ["public_facts","planets"]) ?? getPath(chart, ["publicFacts","planets"]) ?? getPath(chart, ["d1","planets"]) ?? getPath(chart, ["d1_chart","placements"]) ?? getPath(chart, ["planets"]), ["Sun","sun","Surya"]);
  const placements: Record<string, { sign?: string; house?: number; nakshatra?: string; pada?: number }> = {};
  if (moon?.sign) placements.Moon = moon;
  if (sun?.sign) placements.Sun = sun;
  out.placements = Object.keys(placements).length ? placements : undefined;
  out.moonSign = moon?.sign ?? getString(chart, [["public_facts","moon_sign"], ["publicFacts","moonSign"], ["moon","sign"], ["planets","moon","sign"], ["d1","moon","sign"]]);
  out.sunSign = sun?.sign ?? getString(chart, [["public_facts","sun_sign"], ["publicFacts","sunSign"], ["sun","sign"], ["planets","sun","sign"], ["d1","sun","sign"]]);
  out.moonHouse = moon?.house ?? getNumber(chart, [["public_facts","moon_house"], ["publicFacts","moonHouse"], ["moon","house"], ["planets","moon","house"], ["d1","moon","house"]]);
  out.sunHouse = sun?.house ?? getNumber(chart, [["public_facts","sun_house"], ["publicFacts","sunHouse"], ["sun","house"], ["planets","sun","house"], ["d1","sun","house"]]);
  if (!out.moonHouse && out.lagnaSign && out.moonSign) out.moonHouse = findWholeSignHouse(out.lagnaSign, out.moonSign);
  if (!out.sunHouse && out.lagnaSign && out.sunSign) out.sunHouse = findWholeSignHouse(out.lagnaSign, out.sunSign);
  const chartLagna = getString(chart, [["ascendant","sign"], ["lagna","sign"], ["d1","lagna","sign"], ["d1","ascendant","sign"]]);
  if (out.lagnaSign && chartLagna && chartLagna.toLowerCase() !== out.lagnaSign.toLowerCase()) warnings.push("conflicting_lagna_sources");
  if (out.lagnaSign && out.moonSign) sourcePriority.push("chartJson.moon", "chartJson.sun");
  const timing = extractReportDerivedChartFacts(input.predictionSummary);
  if (timing.mahadasha) out.mahadasha = timing.mahadasha;
  if (timing.antardashaNow) out.antardashaNow = timing.antardashaNow;
  if (timing.antardashaTimeline) out.antardashaTimeline = timing.antardashaTimeline;
  if (!out.mahadasha) out.mahadasha = getString(chart, [["prediction_ready_summaries","current_timing_summary"], ["prediction_ready_summaries","summary"], ["currentDasha"], ["dashas","current","mahadasha"], ["vimshottari_dasha","current","mahadasha"]]);
  if (!out.antardashaNow) out.antardashaNow = getString(chart, [["prediction_ready_summaries","current_timing_summary"], ["prediction_ready_summaries","summary"], ["dashas","current","antardasha"], ["vimshottari_dasha","current","antardasha"]]);
  if (!out.antardashaTimeline) {
    const seq = getArray(chart, [["prediction_ready_summaries","mahadasha_sequence"], ["dashas","mahadasha_sequence"], ["vimshottari_dasha","sequence"]]);
    const timeline = seq.map((row) => {
      const rec = asRecord(row);
      const mah = getString(rec, [["mahadasha"], ["lord"], ["name"]]);
      const ant = getString(rec, [["antardasha"], ["sub_lord"], ["name"]]);
      if (!mah || !ant) return null;
      return { mahadasha: mah, antardasha: ant, startDate: getString(rec, [["start_date"], ["from"]]), endDate: getString(rec, [["end_date"], ["to"]]) };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (timeline.length) out.antardashaTimeline = timeline;
  }
  if (out.lagnaSign && out.moonSign && out.sunSign) sourcePriority.push("whole_sign_house_derivation");
  return out;
}
