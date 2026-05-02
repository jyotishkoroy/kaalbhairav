/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroRuleRankingContext } from "./types";

export type ChartFact = {
  userId?: string;
  profileId?: string | null;
  chartVersionId?: string | null;
  factType: string;
  factKey: string;
  factValue: string;
  planet?: string | null;
  house?: number | null;
  sign?: string | null;
  degreeNumeric?: number | null;
  source: "chart_json" | "derived" | "report_json" | "unknown";
  confidence: "deterministic" | "derived" | "imported";
  tags: string[];
  metadata: Record<string, unknown>;
};

export type ExtractChartFactsOptions = {
  userId?: string;
  profileId?: string | null;
  chartVersionId?: string | null;
};

type FactDraft = Omit<ChartFact, "tags" | "metadata"> & {
  tags: string[];
  metadata: Record<string, unknown>;
};

const SIGN_NAMES = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

const PLANET_NAMES = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
  "Ascendant",
  "Lagna",
] as const;

export const LIFE_AREA_QUERY_KEYWORDS: Record<string, string[]> = {
  marriage: ["marriage", "spouse", "wife", "husband", "partner", "relationship", "love"],
  relationship: ["relationship", "love", "partner", "marriage", "dating"],
  career: ["career", "job", "work", "profession", "business", "status"],
  finance: ["money", "wealth", "income", "finance", "debt", "gains"],
  education: ["education", "study", "exam", "learning"],
  children: ["children", "child", "pregnancy", "progeny"],
  health: ["health", "disease", "illness", "mental", "anxiety"],
  spirituality: ["spiritual", "dharma", "karma", "remedy", "mantra"],
  property: ["property", "home", "vehicle", "land"],
  travel: ["foreign", "travel", "abroad", "settlement"],
};

export function inferLifeAreaTagsFromQuestion(question: string): string[] {
  const lower = question.toLowerCase();
  const tags: string[] = [];
  for (const [tag, keywords] of Object.entries(LIFE_AREA_QUERY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) tags.push(tag);
  }
  return Array.from(new Set(tags));
}

export function inferPlanetsFromQuestion(question: string): string[] {
  const lower = question.toLowerCase();
  const aliases: Record<string, string> = {
    sun: "Sun",
    surya: "Sun",
    moon: "Moon",
    chandra: "Moon",
    mars: "Mars",
    mangal: "Mars",
    kuja: "Mars",
    mercury: "Mercury",
    budha: "Mercury",
    jupiter: "Jupiter",
    guru: "Jupiter",
    venus: "Venus",
    shukra: "Venus",
    saturn: "Saturn",
    shani: "Saturn",
    rahu: "Rahu",
    ketu: "Ketu",
  };
  return Array.from(new Set(Object.entries(aliases).filter(([alias]) => lower.includes(alias)).map(([, planet]) => planet)));
}

export function inferHousesFromQuestion(question: string): number[] {
  const lower = question.toLowerCase();
  const houses = new Set<number>();
  const digitMatches = lower.matchAll(/\b(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th|[1-9]|1[0-2])\s+house\b/g);
  for (const match of digitMatches) {
    const value = match[1].replace(/\D/g, "");
    const parsed = Number.parseInt(value, 10);
    if (parsed >= 1 && parsed <= 12) houses.add(parsed);
  }
  if (/\blagna\b|\bascendant\b|\bfirst house\b/.test(lower)) houses.add(1);
  if (/\bsecond house\b/.test(lower)) houses.add(2);
  if (/\bthird house\b/.test(lower)) houses.add(3);
  if (/\bfourth house\b/.test(lower)) houses.add(4);
  if (/\bfifth house\b/.test(lower)) houses.add(5);
  if (/\bsixth house\b/.test(lower)) houses.add(6);
  if (/\bseventh house\b/.test(lower)) houses.add(7);
  if (/\beighth house\b/.test(lower)) houses.add(8);
  if (/\bninth house\b/.test(lower)) houses.add(9);
  if (/\btenth house\b/.test(lower)) houses.add(10);
  if (/\beleventh house\b/.test(lower)) houses.add(11);
  if (/\btwelfth house\b/.test(lower)) houses.add(12);
  return Array.from(houses);
}

const HOUSE_DOMAIN_TAGS: Record<number, string[]> = {
  1: ["self", "body"],
  2: ["money", "family", "speech"],
  3: ["courage", "communication"],
  4: ["home", "mother"],
  5: ["education", "children", "creativity"],
  6: ["health", "conflict", "service"],
  7: ["marriage", "partnership"],
  8: ["transformation", "hidden"],
  9: ["dharma", "luck", "father"],
  10: ["career", "status", "action"],
  11: ["gains", "network"],
  12: ["foreign", "sleep", "expense"],
};

const PLANET_DOMAIN_TAGS: Record<string, string[]> = {
  Sun: ["career", "authority"],
  Moon: ["mind", "emotion"],
  Mars: ["energy"],
  Mercury: ["communication"],
  Jupiter: ["growth", "wisdom"],
  Venus: ["relationship", "comfort"],
  Saturn: ["discipline", "delay"],
  Rahu: ["foreign", "unconventional"],
  Ketu: ["spiritual", "detachment"],
};

const HOUSE_LORDS: Record<string, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

const PATHS = {
  birthDate: [["birth", "date"], ["birthDate"], ["birth_date"], ["native", "birthDate"], ["input", "birthDate"]],
  birthTime: [["birth", "time"], ["birthTime"], ["birth_time"], ["native", "birthTime"], ["input", "birthTime"]],
  birthPlace: [["birth", "place"], ["birthPlace"], ["birth_place"], ["native", "birthPlace"], ["input", "birthPlace"]],
  birthTimezone: [["birth", "timezone"], ["timezone"], ["birth_timezone"], ["input", "timezone"]],
  lagna: [["lagna"], ["ascendant"], ["asc"], ["chart", "lagna"], ["chart", "asc"], ["chart", "ascendant"], ["houses", "1", "sign"], ["houses", 0, "sign"]],
  rasi: [["rasi"], ["moonSign"], ["moon_sign"], ["chart", "rasi"], ["planets", "Moon", "sign"], ["planets", "moon", "sign"]],
  moonNakshatra: [["nakshatra"], ["moonNakshatra"], ["moon_nakshatra"], ["planets", "Moon", "nakshatra"], ["planets", "moon", "nakshatra"]],
  moonPada: [["nakshatraPada"], ["moonNakshatraPada"], ["moon_nakshatra_pada"], ["planets", "Moon", "pada"], ["planets", "moon", "pada"]],
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const text = asString(value);
  if (!text) {
    return null;
  }
  const parsed = Number(text.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSign(value: unknown): string | null {
  const text = asString(value)?.toLowerCase().replace(/\s+/g, "");
  if (!text) return null;
  const match = SIGN_NAMES.find((sign) => sign.toLowerCase() === text || sign.toLowerCase().replace(/\s+/g, "") === text);
  return match ?? null;
}

export function normalizePlanet(value: unknown): string | null {
  const text = asString(value)?.toLowerCase().replace(/\s+/g, "");
  if (!text) return null;
  if (["asc", "ascendant", "lagna"].includes(text)) return "Lagna";
  const match = PLANET_NAMES.find((planet) => planet.toLowerCase() === text);
  return match ?? null;
}

export function normalizeTags(tags: unknown): string[] {
  const values = toArray(tags)
    .flatMap((tag) => {
      const text = asString(tag)?.toLowerCase();
      return text ? [text] : [];
    })
    .filter(Boolean);
  return [...new Set(values)];
}

export function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

export function getPath(root: unknown, path: Array<string | number>): unknown {
  let current: unknown = root;
  for (const segment of path) {
    if (!isRecord(current) && !Array.isArray(current)) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = typeof segment === "number" ? segment : Number(segment);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }
    const record = current as Record<string, unknown>;
    const key = String(segment);
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      current = record[key];
      continue;
    }
    const foundKey = Object.keys(record).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    current = foundKey ? record[foundKey] : undefined;
  }
  return current;
}

export function findFirstString(root: unknown, paths: Array<Array<string | number>>): string | null {
  for (const path of paths) {
    const value = asString(getPath(root, path));
    if (value) return value;
  }
  return null;
}

export function stableFactValue(parts: Array<unknown>): string {
  return parts
    .filter((part) => part !== null && part !== undefined)
    .map((part) => {
      const text = asString(part);
      if (text !== null) return text;
      if (typeof part === "number" || typeof part === "boolean") return String(part);
      if (Array.isArray(part)) return `[${part.map((item) => stableFactValue([item])).join(", ")}]`;
      if (isRecord(part)) {
        return `{${Object.keys(part).sort().map((key) => `${key}:${stableFactValue([part[key]])}`).join(",")}}`;
      }
      return String(part);
    })
    .filter(Boolean)
    .join(" | ");
}

export function parseDegreeNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const text = asString(value);
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const parts = text.split(/[^0-9.]+/).filter(Boolean);
  if (!parts.length) return null;
  const base = Number(parts[0]);
  if (!Number.isFinite(base)) return null;
  if (parts.length === 1) return base;
  const minutes = Number(parts[1] ?? 0);
  const seconds = Number(parts[2] ?? 0);
  if (![minutes, seconds].every(Number.isFinite)) return base;
  return base + minutes / 60 + seconds / 3600;
}

function factKeyForPlanet(planet: string): string {
  return planet.toLowerCase().replace(/\s+/g, "_");
}

function makeTags(base: string[], extras: string[] = []): string[] {
  return [...new Set([...base, ...extras].map((tag) => tag.toLowerCase()).filter(Boolean))];
}

function addFact(facts: Map<string, FactDraft>, fact: FactDraft): void {
  const key = `${fact.factType}::${fact.factKey}`;
  if (!facts.has(key)) {
    facts.set(key, {
      ...fact,
      tags: [...new Set(fact.tags.map((tag) => tag.toLowerCase()))],
    });
  }
}

function factFromSource(input: {
  factType: string;
  factKey: string;
  factValue: string;
  sourcePath: string;
  source: ChartFact["source"];
  confidence: ChartFact["confidence"];
  planet?: string | null;
  house?: number | null;
  sign?: string | null;
  degreeNumeric?: number | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): FactDraft {
  return {
    userId: undefined,
    profileId: undefined,
    chartVersionId: undefined,
    factType: input.factType,
    factKey: input.factKey,
    factValue: input.factValue,
    planet: input.planet ?? null,
    house: input.house ?? null,
    sign: input.sign ?? null,
    degreeNumeric: input.degreeNumeric ?? null,
    source: input.source,
    confidence: input.confidence,
    tags: makeTags(input.tags ?? [], ["chart_json"]),
    metadata: {
      sourcePath: input.sourcePath,
      ...input.metadata,
    },
  };
}

function injectDefaults(fact: ChartFact, options: ExtractChartFactsOptions): ChartFact {
  return {
    ...fact,
    userId: fact.userId ?? options.userId,
    profileId: fact.profileId ?? options.profileId ?? null,
    chartVersionId: fact.chartVersionId ?? options.chartVersionId ?? null,
  };
}

function pickHouseNumber(value: unknown): number | null {
  const number = asNumber(value);
  if (number == null) return null;
  const whole = Math.trunc(number);
  return whole >= 1 && whole <= 12 ? whole : null;
}

function extractBirthFacts(root: unknown, facts: Map<string, FactDraft>): void {
  const birthDate = findFirstString(root, PATHS.birthDate);
  const birthTime = findFirstString(root, PATHS.birthTime);
  const birthPlace = findFirstString(root, PATHS.birthPlace);
  const birthTimezone = findFirstString(root, PATHS.birthTimezone);
  const metadata = { sourceShape: "birth" };
  if (birthDate) addFact(facts, factFromSource({ factType: "birth", factKey: "birth_date", factValue: birthDate, sourcePath: "birth.date", source: "chart_json", confidence: "deterministic", tags: ["birth"], metadata }));
  if (birthTime) addFact(facts, factFromSource({ factType: "birth", factKey: "birth_time", factValue: birthTime, sourcePath: "birth.time", source: "chart_json", confidence: "deterministic", tags: ["birth"], metadata }));
  if (birthPlace) addFact(facts, factFromSource({ factType: "birth", factKey: "birth_place", factValue: birthPlace, sourcePath: "birth.place", source: "chart_json", confidence: "deterministic", tags: ["birth"], metadata }));
  if (birthTimezone) addFact(facts, factFromSource({ factType: "birth", factKey: "birth_timezone", factValue: birthTimezone, sourcePath: "birth.timezone", source: "chart_json", confidence: "deterministic", tags: ["birth"], metadata }));
}

function extractLagnaFacts(root: unknown, facts: Map<string, FactDraft>): void {
  const candidates = PATHS.lagna.map((path) => getPath(root, path));
  const lagnaValue = candidates.find((candidate) => candidate != null);
  const lagnaRecord = isRecord(lagnaValue) ? lagnaValue : null;
  const sign = normalizeSign(
    lagnaRecord ? (lagnaRecord.sign ?? lagnaRecord.rashi ?? lagnaRecord.raashi ?? lagnaRecord.zodiacSign) : lagnaValue,
  );
  const degreeNumeric = parseDegreeNumeric(
    lagnaRecord ? (lagnaRecord.degree ?? lagnaRecord.degrees ?? lagnaRecord.degreeNumeric ?? lagnaRecord.deg) : undefined,
  );
  const nakshatra = asString(lagnaRecord ? (lagnaRecord.nakshatra ?? lagnaRecord.star) : undefined);
  const pada = asString(lagnaRecord ? (lagnaRecord.pada ?? lagnaRecord.nakshatraPada) : undefined);
  if (!sign && degreeNumeric == null && !nakshatra && !pada) return;
  const factValue = stableFactValue([
    sign ? `sign=${sign}` : null,
    degreeNumeric != null ? `degree=${degreeNumeric}` : null,
    nakshatra ? `nakshatra=${nakshatra}` : null,
    pada ? `pada=${pada}` : null,
  ]);
  addFact(
    facts,
    factFromSource({
      factType: "lagna",
      factKey: "lagna",
      factValue,
      sourcePath: "lagna",
      source: "chart_json",
      confidence: "deterministic",
      planet: "Lagna",
      sign,
      degreeNumeric,
      tags: ["lagna", "ascendant", "chart"],
      metadata: { sourceShape: "lagna", nakshatra, pada },
    }),
  );
}

function extractMoonSignAndNakshatra(root: unknown, facts: Map<string, FactDraft>): void {
  const sign = normalizeSign(findFirstString(root, PATHS.rasi));
  if (sign) {
    addFact(
      facts,
      factFromSource({
        factType: "rasi",
        factKey: "moon_sign",
        factValue: sign,
        sourcePath: "rasi",
        source: "chart_json",
        confidence: "deterministic",
        planet: "Moon",
        sign,
        tags: ["rasi", "moon", "sign"],
        metadata: { sourceShape: "moon_sign" },
      }),
    );
  }
  const nakshatra = findFirstString(root, PATHS.moonNakshatra);
  if (nakshatra) {
    addFact(
      facts,
      factFromSource({
        factType: "nakshatra",
        factKey: "moon_nakshatra",
        factValue: nakshatra,
        sourcePath: "nakshatra",
        source: "chart_json",
        confidence: "deterministic",
        planet: "Moon",
        tags: ["moon", "nakshatra"],
        metadata: { sourceShape: "moon_nakshatra" },
      }),
    );
  }
  const pada = findFirstString(root, PATHS.moonPada);
  if (pada) {
    addFact(
      facts,
      factFromSource({
        factType: "nakshatra",
        factKey: "moon_nakshatra_pada",
        factValue: pada,
        sourcePath: "nakshatraPada",
        source: "chart_json",
        confidence: "deterministic",
        planet: "Moon",
        tags: ["moon", "nakshatra"],
        metadata: { sourceShape: "moon_nakshatra_pada" },
      }),
    );
  }
}

function extractPlanetEntry(name: string, entry: unknown, facts: Map<string, FactDraft>, sourcePath: string): void {
  const planet = normalizePlanet(name) ?? normalizePlanet(isRecord(entry) ? (entry.name ?? entry.planet) : name);
  if (!planet || planet === "Lagna") return;
  const record = isRecord(entry) ? entry : {};
  const sign = normalizeSign(record.sign ?? record.rashi ?? record.raashi ?? record.zodiacSign);
  const house = pickHouseNumber(record.house ?? record.bhava ?? record.bhaya ?? record.bhavas);
  const nakshatra = asString(record.nakshatra);
  const pada = asString(record.pada ?? record.nakshatraPada);
  const degreeNumeric = parseDegreeNumeric(record.degree ?? record.degrees ?? record.longitude ?? record.position);
  const retrograde = record.retrograde ?? record.rx ?? record.isRetrograde;
  const factValue = stableFactValue([
    sign ? `sign=${sign}` : null,
    house != null ? `house=${house}` : null,
    degreeNumeric != null ? `degree=${degreeNumeric}` : null,
    nakshatra ? `nakshatra=${nakshatra}` : null,
    pada ? `pada=${pada}` : null,
    retrograde != null ? `retrograde=${asString(retrograde)}` : null,
  ]);
  addFact(
    facts,
    factFromSource({
      factType: "planet_placement",
      factKey: factKeyForPlanet(planet),
      factValue,
      sourcePath,
      source: "chart_json",
      confidence: "deterministic",
      planet,
      house,
      sign,
      degreeNumeric,
      tags: makeTags(["planet_placement", planet.toLowerCase(), sign?.toLowerCase() ?? ""], house != null ? [`house_${house}`] : []).concat(PLANET_DOMAIN_TAGS[planet] ?? []),
      metadata: {
        sourceShape: sourcePath,
        nakshatra,
        pada,
        retrograde: retrograde ?? null,
      },
    }),
  );
}

function extractPlanetFacts(root: unknown, facts: Map<string, FactDraft>): void {
  const planetSources: Array<{ value: unknown; path: string }> = [
    { value: getPath(root, ["planets"]), path: "planets" },
    { value: getPath(root, ["chart", "planets"]), path: "chart.planets" },
    { value: getPath(root, ["planetaryPositions"]), path: "planetaryPositions" },
    { value: getPath(root, ["grahas"]), path: "grahas" },
    { value: getPath(root, ["chart", "grahas"]), path: "chart.grahas" },
  ];
  for (const source of planetSources) {
    const value = source.value;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (!isRecord(entry)) continue;
        extractPlanetEntry(asString(entry.name ?? entry.planet) ?? "unknown", entry, facts, source.path);
      }
      continue;
    }
    if (!isRecord(value)) continue;
    for (const [key, entry] of Object.entries(value)) {
      if (isRecord(entry) || typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
        extractPlanetEntry(key, entry, facts, `${source.path}.${key}`);
      }
    }
  }
}

function extractHouseFacts(root: unknown, facts: Map<string, FactDraft>): void {
  const houseSources: Array<{ value: unknown; path: string }> = [
    { value: getPath(root, ["houses"]), path: "houses" },
    { value: getPath(root, ["chart", "houses"]), path: "chart.houses" },
    { value: getPath(root, ["bhavas"]), path: "bhavas" },
    { value: getPath(root, ["chart", "bhavas"]), path: "chart.bhavas" },
  ];
  for (const source of houseSources) {
    const value = source.value;
    const entries = Array.isArray(value) ? value : isRecord(value) ? Object.entries(value).map(([key, entry]) => ({ key, entry })) : [];
    for (const item of entries) {
      const record = Array.isArray(value) ? item : (item as { key: string; entry: unknown });
      const entry = Array.isArray(value) ? (record as unknown) : record.entry;
      if (!isRecord(entry)) continue;
      const house = pickHouseNumber(entry.house ?? entry.number ?? (Array.isArray(value) ? undefined : (record as { key: string }).key));
      const sign = normalizeSign(entry.sign ?? entry.rashi ?? entry.raashi);
      if (house == null && !sign) continue;
      const factValue = stableFactValue([sign ? `sign=${sign}` : null]);
      addFact(
        facts,
        factFromSource({
          factType: "house",
          factKey: `house_${house ?? asString(Array.isArray(value) ? undefined : (record as { key: string }).key)}`,
          factValue,
          sourcePath: `${source.path}.${Array.isArray(value) ? "[]" : (record as { key: string }).key}`,
          source: "chart_json",
          confidence: "deterministic",
          house,
          sign,
          tags: makeTags(["house", house != null ? `house_${house}` : "", sign?.toLowerCase() ?? ""], house != null ? HOUSE_DOMAIN_TAGS[house] ?? [] : []),
          metadata: { sourceShape: source.path },
        }),
      );
    }
  }
}

function extractHouseLords(root: unknown, facts: Map<string, FactDraft>): void {
  const houseFacts = [...facts.values()].filter((fact) => fact.factType === "house" && fact.sign);
  for (const fact of houseFacts) {
    const sign = fact.sign;
    const house = fact.house;
    if (!sign || house == null) continue;
    const lord = HOUSE_LORDS[sign];
    if (!lord) continue;
    addFact(
      facts,
      factFromSource({
        factType: "house_lord",
        factKey: `lord_${house}`,
        factValue: `house ${house} lord is ${lord} because sign is ${sign}`,
        sourcePath: `houses.${house}`,
        source: "derived",
        confidence: "derived",
        planet: lord,
        house,
        sign,
        tags: makeTags(["house_lord", "lordship", `house_${house}`, lord.toLowerCase()], HOUSE_DOMAIN_TAGS[house] ?? []),
        metadata: { sourceShape: "derived_house_lord", sourceSign: sign },
      }),
    );
  }
}

function extractDashaFacts(root: unknown, facts: Map<string, FactDraft>): void {
  const dashaSources = [
    { value: getPath(root, ["dashas"]), path: "dashas" },
    { value: getPath(root, ["dasha"]), path: "dasha" },
    { value: getPath(root, ["vimshottariDasha"]), path: "vimshottariDasha" },
    { value: getPath(root, ["currentDasha"]), path: "currentDasha" },
    { value: getPath(root, ["current_dasha"]), path: "current_dasha" },
    { value: getPath(root, ["mahadasha"]), path: "mahadasha" },
    { value: getPath(root, ["antardasha"]), path: "antardasha" },
  ];
  for (const source of dashaSources) {
    const value = source.value;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (!isRecord(entry)) continue;
        const planet = normalizePlanet(entry.planet ?? entry.lord ?? entry.name);
        const type = asString(entry.type ?? entry.level ?? entry.periodType);
        const key = `${type ? `${type}_` : ""}${planet ? factKeyForPlanet(planet) : asString(entry.label ?? entry.name ?? "unknown")?.toLowerCase().replace(/\s+/g, "_") ?? "unknown"}`;
        const factValue = stableFactValue([planet ?? entry.label ?? entry.name, entry.startsOn ?? entry.from ?? entry.start, entry.endsOn ?? entry.to ?? entry.end]);
        addFact(
          facts,
          factFromSource({
            factType: "dasha",
            factKey: key,
            factValue,
            sourcePath: source.path,
            source: "chart_json",
            confidence: "deterministic",
            planet,
            tags: makeTags(["timing", "dasha", planet?.toLowerCase() ?? ""], []),
            metadata: { sourceShape: source.path, startsOn: entry.startsOn ?? entry.from ?? entry.start ?? null, endsOn: entry.endsOn ?? entry.to ?? entry.end ?? null, dashaType: type ?? null },
          }),
        );
      }
      continue;
    }
    if (!isRecord(value)) continue;
    const current = isRecord(value.current) ? value.current : value;
    const maha = normalizePlanet(current.maha ?? current.mahadasha ?? current.mahadasha ?? value.mahadasha ?? value.current_mahadasha);
    const antar = normalizePlanet(current.antar ?? current.antardasha ?? value.antardasha ?? value.current_antardasha);
    if (maha) {
      addFact(
        facts,
        factFromSource({
          factType: "dasha",
          factKey: "current_mahadasha",
          factValue: stableFactValue([maha, current.startsOn ?? current.from ?? current.start, current.endsOn ?? current.to ?? current.end]),
          sourcePath: source.path,
          source: "chart_json",
          confidence: "deterministic",
          planet: maha,
          tags: ["timing", "dasha", maha.toLowerCase()],
          metadata: { sourceShape: source.path, startsOn: current.startsOn ?? current.from ?? current.start ?? null, endsOn: current.endsOn ?? current.to ?? current.end ?? null },
        }),
      );
    }
    if (antar) {
      addFact(
        facts,
        factFromSource({
          factType: "dasha",
          factKey: "current_antardasha",
          factValue: stableFactValue([antar, current.startsOn ?? current.from ?? current.start, current.endsOn ?? current.to ?? current.end]),
          sourcePath: source.path,
          source: "chart_json",
          confidence: "deterministic",
          planet: antar,
          tags: ["timing", "dasha", antar.toLowerCase()],
          metadata: { sourceShape: source.path, startsOn: current.startsOn ?? current.from ?? current.start ?? null, endsOn: current.endsOn ?? current.to ?? current.end ?? null },
        }),
      );
    }
  }
}

function extractVarshaphalFacts(root: unknown, facts: Map<string, FactDraft>): void {
  const sources = [
    { value: getPath(root, ["varshaphal"]), path: "varshaphal" },
    { value: getPath(root, ["annualChart"]), path: "annualChart" },
    { value: getPath(root, ["annual_chart"]), path: "annual_chart" },
    { value: getPath(root, ["currentVarshaphal"]), path: "currentVarshaphal" },
  ];
  for (const source of sources) {
    const value = source.value;
    if (!isRecord(value)) continue;
    const year = asString(value.year ?? value.annualYear);
    const lord = normalizePlanet(value.lord ?? value.owner);
    addFact(
      facts,
      factFromSource({
        factType: "varshaphal",
        factKey: "current_varshaphal",
        factValue: stableFactValue([year ? `year=${year}` : null, lord ? `lord=${lord}` : null]),
        sourcePath: source.path,
        source: "chart_json",
        confidence: "deterministic",
        planet: lord,
        tags: ["timing", "varshaphal"],
        metadata: { sourceShape: source.path, year: year ?? null },
      }),
    );
    const periods = toArray(value.periods);
    periods.forEach((period, index) => {
      if (!isRecord(period)) return;
      const label = asString(period.label ?? period.name ?? `period_${index}`);
      addFact(
        facts,
        factFromSource({
          factType: "varshaphal",
          factKey: `varshaphal_${index}_${label?.toLowerCase().replace(/\s+/g, "_") ?? "period"}`,
          factValue: stableFactValue([label, period.startsOn ?? period.from ?? period.start, period.endsOn ?? period.to ?? period.end]),
          sourcePath: `${source.path}.periods[${index}]`,
          source: "chart_json",
          confidence: "deterministic",
          tags: ["timing", "varshaphal"],
          metadata: { sourceShape: `${source.path}.periods`, label: label ?? null, startsOn: period.startsOn ?? period.from ?? period.start ?? null, endsOn: period.endsOn ?? period.to ?? period.end ?? null },
        }),
      );
    });
  }
}

function extractSavFacts(root: unknown, facts: Map<string, FactDraft>): void {
  const sources = [
    getPath(root, ["sav"]),
    getPath(root, ["SAV"]),
    getPath(root, ["sarvashtakavarga"]),
    getPath(root, ["ashtakavarga", "sav"]),
  ];
  for (const source of sources) {
    if (!isRecord(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      const sign = normalizeSign(key);
      if (!sign) continue;
      const score = asNumber(value);
      addFact(
        facts,
        factFromSource({
          factType: "sav",
          factKey: `sav_${sign.toLowerCase()}`,
          factValue: asString(value) ?? "",
          sourcePath: "sav",
          source: "chart_json",
          confidence: "deterministic",
          sign,
          degreeNumeric: score,
          tags: ["sav", "sign_strength", sign.toLowerCase()],
          metadata: { sourceShape: "sav" },
        }),
      );
    }
  }
}

function extractExplicitRelations(root: unknown, facts: Map<string, FactDraft>): void {
  const sources = [
    { value: getPath(root, ["conjunctions"]), type: "co_presence", path: "conjunctions" },
    { value: getPath(root, ["coPresence"]), type: "co_presence", path: "coPresence" },
    { value: getPath(root, ["yuti"]), type: "co_presence", path: "yuti" },
    { value: getPath(root, ["aspects"]), type: "aspect", path: "aspects" },
    { value: getPath(root, ["drishti"]), type: "aspect", path: "drishti" },
  ];
  for (const source of sources) {
    for (const [index, item] of toArray(source.value).entries()) {
      if (!isRecord(item)) continue;
      const planets = toArray(item.planets ?? item.between ?? item.objects).map((planet) => normalizePlanet(planet)).filter((planet): planet is string => Boolean(planet));
      const from = normalizePlanet(item.from ?? item.aspectingPlanet ?? planets[0]);
      const to = normalizePlanet(item.to ?? item.aspectedPlanet ?? planets[1]);
      const house = pickHouseNumber(item.house ?? item.bhava);
      const sign = normalizeSign(item.sign ?? item.rashi);
      const involved = [...new Set([...planets, from, to].filter((value): value is string => Boolean(value)))];
      const keyParts = [source.type, ...involved.map((planet) => planet.toLowerCase())];
      if (house != null) keyParts.push(`house_${house}`);
      if (sign) keyParts.push(sign.toLowerCase());
      const factKey = keyParts.join("_") || `${source.type}_${index}`;
      addFact(
        facts,
        factFromSource({
          factType: source.type,
          factKey,
          factValue: stableFactValue([item.description ?? item.type ?? source.type, item.house ?? item.bhava, item.sign ?? item.rashi]),
          sourcePath: `${source.path}[${index}]`,
          source: "chart_json",
          confidence: "deterministic",
          house,
          sign,
          tags: makeTags([source.type, ...involved.map((planet) => planet.toLowerCase())], [house != null ? `house_${house}` : ""]).concat(sign ? [sign.toLowerCase()] : []),
          metadata: { sourceShape: source.path, from: from ?? null, to: to ?? null },
        }),
      );
    }
  }
}

export function extractChartFactsFromVersion(chartJson: unknown, options: ExtractChartFactsOptions = {}): ChartFact[] {
  if (!isRecord(chartJson) && !Array.isArray(chartJson)) return [];
  const root = chartJson;
  const facts = new Map<string, FactDraft>();
  extractBirthFacts(root, facts);
  extractLagnaFacts(root, facts);
  extractMoonSignAndNakshatra(root, facts);
  extractPlanetFacts(root, facts);
  extractHouseFacts(root, facts);
  extractHouseLords(root, facts);
  extractDashaFacts(root, facts);
  extractVarshaphalFacts(root, facts);
  extractSavFacts(root, facts);
  extractExplicitRelations(root, facts);
  return [...facts.values()]
    .map((fact) => injectDefaults(fact, options))
    .sort((left, right) => `${left.factType}::${left.factKey}`.localeCompare(`${right.factType}::${right.factKey}`));
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildStructuredRuleRankingContext(input: {
  userQuestion: string;
  chartFacts?: readonly ChartFact[];
  domains?: readonly string[];
  exactFactMode?: boolean;
  safetyBlocked?: boolean;
}): AstroRuleRankingContext {
  const chartFacts = input.chartFacts ?? [];
  return {
    userQuestion: input.userQuestion,
    domains: input.domains ?? [],
    lifeAreaTags: uniqueStrings([
      ...inferLifeAreaTagsFromQuestion(input.userQuestion),
      ...chartFacts.flatMap((fact) => fact.tags ?? []),
    ]),
    conditionTags: uniqueStrings(chartFacts.flatMap((fact) => fact.tags ?? [])),
    chartFactTags: uniqueStrings(chartFacts.flatMap((fact) => fact.tags ?? [])),
    planets: uniqueStrings([
      ...inferPlanetsFromQuestion(input.userQuestion),
      ...chartFacts.map((fact) => fact.planet ?? "").filter(Boolean),
    ]),
    houses: Array.from(new Set([
      ...inferHousesFromQuestion(input.userQuestion),
      ...chartFacts.map((fact) => fact.house ?? 0).filter((value) => Number.isInteger(value) && value >= 1 && value <= 12) as number[],
    ])),
    signs: uniqueStrings(chartFacts.map((fact) => fact.sign ?? "").filter(Boolean)),
    exactFactMode: input.exactFactMode,
    safetyBlocked: input.safetyBlocked,
  };
}
