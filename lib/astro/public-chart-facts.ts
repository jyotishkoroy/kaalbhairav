/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

type SignName = typeof SIGNS[number];

export type PublicPlanetPlacement = {
  sign?: string;
  house?: number;
  nakshatra?: string;
  pada?: number;
};

export type PublicChartFacts = {
  profileId: string;
  chartVersionId: string;
  source: "chart_json" | "prediction_summary" | "report_derived" | "merged";
  confidence: "complete" | "partial" | "invalid";
  warnings: string[];

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
  antardashaStart?: string;
  antardashaEnd?: string;
  antardashaTimeline?: Array<{ mahadasha: string; antardasha: string; startDate?: string; endDate?: string }>;

  mangalDosha?: boolean;
  kalsarpaYoga?: boolean;

  placements: Record<string, PublicPlanetPlacement>;
};

export function computeWholeSignHouse(lagnaSign: string, planetSign: string): number | undefined {
  const lagnaIndex = SIGNS.indexOf(lagnaSign as SignName);
  const planetIndex = SIGNS.indexOf(planetSign as SignName);
  if (lagnaIndex < 0 || planetIndex < 0) return undefined;
  return ((planetIndex - lagnaIndex + 12) % 12) + 1;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}
function str(root: unknown, ...paths: string[][]): string | undefined {
  for (const path of paths) {
    let cur: unknown = root;
    for (const p of path) { if (!isRecord(cur)) { cur = undefined; break; } cur = (cur as Record<string, unknown>)[p]; }
    if (typeof cur === "string" && cur.trim()) return cur.trim().replace(/\s+/g, " ");
  }
  return undefined;
}
function num(root: unknown, ...paths: string[][]): number | undefined {
  for (const path of paths) {
    let cur: unknown = root;
    for (const p of path) { if (!isRecord(cur)) { cur = undefined; break; } cur = (cur as Record<string, unknown>)[p]; }
    if (typeof cur === "number" && Number.isFinite(cur)) return cur;
    if (typeof cur === "string" && cur.trim()) { const n = Number(cur); if (Number.isFinite(n)) return n; }
  }
  return undefined;
}
function bool(root: unknown, ...paths: string[][]): boolean | undefined {
  for (const path of paths) {
    let cur: unknown = root;
    for (const p of path) { if (!isRecord(cur)) { cur = undefined; break; } cur = (cur as Record<string, unknown>)[p]; }
    if (typeof cur === "boolean") return cur;
    if (typeof cur === "string") { if (/^(true|yes|1)$/i.test(cur)) return true; if (/^(false|no|0)$/i.test(cur)) return false; }
  }
  return undefined;
}
function canonSign(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const m: Record<string, string> = { aries:"Aries",taurus:"Taurus",gemini:"Gemini",cancer:"Cancer",leo:"Leo",virgo:"Virgo",libra:"Libra",scorpio:"Scorpio",sagittarius:"Sagittarius",capricorn:"Capricorn",aquarius:"Aquarius",pisces:"Pisces" };
  return m[s.toLowerCase().trim()] ?? s.trim();
}

function extractPlacements(chartJson: unknown, lagnaSign?: string): Record<string, PublicPlanetPlacement> {
  const planets = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Rahu","Ketu"];
  const result: Record<string, PublicPlanetPlacement> = {};
  // Try multiple containers
  const containers: unknown[] = [];
  if (isRecord(chartJson)) {
    const cj = chartJson as Record<string, unknown>;
    for (const key of ["public_facts","publicFacts","d1","d1_chart","planets"]) {
      const sub = cj[key];
      if (isRecord(sub)) {
        const planetsKey = (sub as Record<string, unknown>)["planets"] ?? (sub as Record<string, unknown>)["placements"];
        if (isRecord(planetsKey)) containers.push(planetsKey);
        else containers.push(sub);
      }
    }
    if (isRecord(cj["planets"])) containers.push(cj["planets"]);
    containers.push(cj);
  }
  for (const name of planets) {
    for (const container of containers) {
      if (!isRecord(container)) continue;
      const row = (container as Record<string, unknown>)[name] ?? (container as Record<string, unknown>)[name.toLowerCase()];
      if (!isRecord(row)) continue;
      const sign = canonSign(str(row, ["sign"],["rashi"],["house_sign"]));
      const house = num(row, ["house"],["house_number"],["bhava"]) ?? (sign && lagnaSign ? computeWholeSignHouse(lagnaSign, sign) : undefined);
      const nakshatra = str(row, ["nakshatra"],["nakshatra_name"]);
      const pada = num(row, ["pada"],["nakshatra_pada"]);
      if (sign || house !== undefined || nakshatra || pada !== undefined) {
        result[name] = { sign, house, nakshatra, pada };
        break;
      }
    }
  }
  return result;
}

export function buildPublicChartFacts(input: {
  profileId: string;
  chartVersionId: string;
  chartJson: unknown;
  predictionSummary?: unknown;
  reportFacts?: unknown;
  now?: Date;
}): PublicChartFacts {
  const { chartJson, predictionSummary, reportFacts } = input;
  const warnings: string[] = [];
  const sources: string[] = [];

  // Extract lagna from multiple paths
  const lagnaSign = canonSign(
    str(chartJson,
      ["public_facts","lagna_sign"], ["publicFacts","lagnaSign"],
      ["d1","lagna","sign"], ["d1","ascendant","sign"], ["d1_chart","lagna","sign"],
      ["rashi","lagna","sign"], ["lagna","sign"], ["ascendant","sign"],
      ["vedic","lagna","sign"], ["sidereal","lagna","sign"]
    ) ??
    str(predictionSummary,
      ["public_facts","lagna_sign"], ["publicFacts","lagnaSign"],
      ["normalizedFacts","lagnaSign"], ["lagna_sign"], ["lagnaSign"], ["lagna"], ["ascendant"]
    ) ??
    str(reportFacts, ["lagnaSign"], ["lagna"], ["ascendant"], ["ascendantSign"])
  );
  if (lagnaSign) sources.push("chart_json");

  const moonSign = canonSign(
    str(chartJson,
      ["public_facts","moon_sign"], ["publicFacts","moonSign"],
      ["d1","planets","Moon","sign"], ["planets","Moon","sign"], ["moon","sign"]
    ) ??
    str(predictionSummary,
      ["public_facts","moon_sign"], ["publicFacts","moonSign"],
      ["normalizedFacts","moonSign"], ["moonSign"]
    ) ??
    str(reportFacts, ["moonSign"], ["moon","sign"])
  );

  let moonHouse = num(chartJson,
    ["public_facts","moon_house"], ["publicFacts","moonHouse"],
    ["d1","planets","Moon","house"], ["planets","Moon","house"], ["moon","house"]
  ) ?? num(predictionSummary,
    ["public_facts","moon_house"], ["publicFacts","moonHouse"], ["normalizedFacts","moonHouse"], ["moonHouse"]
  ) ?? num(reportFacts, ["moonHouse"]);

  const sunSign = canonSign(
    str(chartJson,
      ["public_facts","sun_sign"], ["publicFacts","sunSign"],
      ["d1","planets","Sun","sign"], ["planets","Sun","sign"], ["sun","sign"]
    ) ??
    str(predictionSummary,
      ["public_facts","sun_sign"], ["publicFacts","sunSign"],
      ["normalizedFacts","sunSign"], ["sunSign"]
    ) ??
    str(reportFacts, ["sunSign"], ["sun","sign"])
  );

  let sunHouse = num(chartJson,
    ["public_facts","sun_house"], ["publicFacts","sunHouse"],
    ["d1","planets","Sun","house"], ["planets","Sun","house"], ["sun","house"]
  ) ?? num(predictionSummary,
    ["public_facts","sun_house"], ["publicFacts","sunHouse"], ["normalizedFacts","sunHouse"], ["sunHouse"]
  ) ?? num(reportFacts, ["sunHouse"]);

  // Derive houses if missing
  if (lagnaSign && moonSign && moonHouse === undefined) moonHouse = computeWholeSignHouse(lagnaSign, moonSign);
  if (lagnaSign && sunSign && sunHouse === undefined) sunHouse = computeWholeSignHouse(lagnaSign, sunSign);

  const nakshatra = str(chartJson,
    ["public_facts","moon_nakshatra"], ["publicFacts","moonNakshatra"],
    ["nakshatra"], ["moonNakshatra"], ["moon_nakshatra"],
    ["d1","planets","Moon","nakshatra"], ["planets","Moon","nakshatra"]
  ) ?? str(predictionSummary, ["nakshatra"], ["moonNakshatra"], ["public_facts","moon_nakshatra"], ["publicFacts","moonNakshatra"]);

  const nakshatraPada = num(chartJson,
    ["public_facts","moon_pada"], ["publicFacts","moonPada"],
    ["nakshatraPada"], ["nakshatra_pada"],
    ["d1","planets","Moon","pada"], ["planets","Moon","pada"]
  ) ?? num(predictionSummary, ["nakshatraPada"], ["nakshatra_pada"], ["public_facts","moon_pada"], ["publicFacts","moonPada"]);

  const nakshatraLord = str(chartJson, ["nakshatraLord"], ["nakshatra_lord"], ["publicFacts","nakshatraLord"], ["public_facts","nakshatra_lord"])
    ?? str(predictionSummary, ["nakshatraLord"], ["nakshatra_lord"]);
  const lagnaLord = str(chartJson, ["lagnaLord"], ["lagna_lord"], ["publicFacts","lagnaLord"], ["public_facts","lagna_lord"])
    ?? str(predictionSummary, ["lagnaLord"], ["lagna_lord"]);
  const rasiLord = str(chartJson, ["rasiLord"], ["rasi_lord"], ["publicFacts","rasiLord"], ["public_facts","rasi_lord"])
    ?? str(predictionSummary, ["rasiLord"], ["rasi_lord"]);
  const westernSunSign = str(chartJson, ["westernSunSign"], ["tropicalSunSign"], ["western_sun_sign"])
    ?? str(predictionSummary, ["westernSunSign"], ["western_sun_sign"]);

  const mahadasha = str(chartJson,
    ["public_facts","mahadasha"], ["publicFacts","mahadasha"], ["public_facts","current_mahadasha"], ["publicFacts","currentMahadasha"], ["mahadasha"], ["currentMahadasha"]
  ) ?? str(predictionSummary,
    ["public_facts","mahadasha"], ["publicFacts","mahadasha"], ["mahadasha"], ["currentMahadasha"]
  ) ?? str(reportFacts, ["mahadasha"], ["currentMahadasha"]);

  const mahadashaStart = str(chartJson,
    ["public_facts","mahadasha_start"], ["publicFacts","mahadashaStart"], ["public_facts","current_mahadasha_start"], ["publicFacts","currentMahadashaStart"], ["mahadashaStart"], ["mahadasha_start"]
  ) ?? str(predictionSummary, ["public_facts","mahadasha_start"], ["publicFacts","mahadashaStart"], ["mahadashaStart"], ["mahadasha_start"]);
  const mahadashaEnd = str(chartJson,
    ["public_facts","mahadasha_end"], ["publicFacts","mahadashaEnd"], ["public_facts","current_mahadasha_end"], ["publicFacts","currentMahadashaEnd"], ["mahadashaEnd"], ["mahadasha_end"]
  ) ?? str(predictionSummary, ["public_facts","mahadasha_end"], ["publicFacts","mahadashaEnd"], ["mahadashaEnd"], ["mahadasha_end"]);
  const antardashaNow = str(chartJson,
    ["public_facts","antardasha_now"], ["publicFacts","antardashaNow"], ["public_facts","current_antardasha"], ["publicFacts","currentAntardasha"], ["antardashaNow"], ["currentAntardasha"]
  ) ?? str(predictionSummary, ["public_facts","antardasha_now"], ["publicFacts","antardashaNow"], ["antardashaNow"], ["currentAntardasha"]);

  // Try to find antardasha end date from timeline
  let antardashaEnd: string | undefined;
  let antardashaStart: string | undefined;
  const timelineSrc = isRecord(chartJson) ? (chartJson as Record<string, unknown>)["antardashaTimeline"] ?? (chartJson as Record<string, unknown>)["mahadasha_sequence"] : undefined;
  const timelineArr = Array.isArray(timelineSrc) ? timelineSrc : (isRecord(predictionSummary) ? ((predictionSummary as Record<string, unknown>)["antardashaTimeline"]) : undefined);
  const antardashaTimeline: Array<{ mahadasha: string; antardasha: string; startDate?: string; endDate?: string }> = [];
  if (Array.isArray(timelineArr)) {
    for (const row of timelineArr) {
      if (!isRecord(row)) continue;
      const md = str(row, ["mahadasha"], ["lord"], ["name"]);
      const ad = str(row, ["antardasha"], ["sub_lord"]);
      if (!md || !ad) continue;
      const startDate = str(row, ["startDate"], ["start_date"], ["from"]);
      const endDate = str(row, ["endDate"], ["end_date"], ["to"]);
      antardashaTimeline.push({ mahadasha: md, antardasha: ad, startDate, endDate });
      if (antardashaNow && (antardashaNow.includes(ad) || (md + "-" + ad) === antardashaNow)) {
        antardashaStart = startDate;
        antardashaEnd = endDate;
      }
    }
  }

  const mangalDosha = bool(chartJson,
    ["public_facts","mangal_dosha"], ["publicFacts","mangalDosha"], ["public_facts","manglik"], ["publicFacts","manglik"], ["mangalDosha"], ["manglik"]
  ) ?? bool(predictionSummary, ["public_facts","mangal_dosha"], ["publicFacts","mangalDosha"], ["mangalDosha"], ["manglik"]);
  const kalsarpaYoga = bool(chartJson,
    ["public_facts","kalsarpa_yoga"], ["publicFacts","kalsarpaYoga"], ["public_facts","kalsarpa"], ["publicFacts","kalsarpa"], ["kalsarpaYoga"], ["kalsarpa"]
  ) ?? bool(predictionSummary, ["public_facts","kalsarpa_yoga"], ["publicFacts","kalsarpaYoga"], ["kalsarpaYoga"], ["kalsarpa"]);

  const placements = extractPlacements(chartJson, lagnaSign);

  // Check for conflicts
  if (!lagnaSign) warnings.push("lagna_sign_missing");
  if (!moonSign) warnings.push("moon_sign_missing");
  if (!sunSign) warnings.push("sun_sign_missing");
  if (!nakshatra) warnings.push("nakshatra_missing");
  if (!mahadasha) warnings.push("mahadasha_missing");

  const complete = Boolean(lagnaSign && moonSign && sunSign && nakshatra && mahadasha && (moonHouse !== undefined) && (sunHouse !== undefined));
  const confidence: "complete" | "partial" | "invalid" = !lagnaSign ? "invalid" : complete ? "complete" : "partial";

  const source: "chart_json" | "prediction_summary" | "report_derived" | "merged" =
    sources.includes("chart_json") && predictionSummary ? "merged" :
    sources.includes("chart_json") ? "chart_json" :
    predictionSummary ? "prediction_summary" : "report_derived";

  return {
    profileId: input.profileId,
    chartVersionId: input.chartVersionId,
    source,
    confidence,
    warnings,
    lagnaSign,
    lagnaLord,
    moonSign,
    moonHouse,
    rasiLord,
    sunSign,
    sunHouse,
    westernSunSign,
    nakshatra,
    nakshatraPada,
    nakshatraLord,
    mahadasha,
    mahadashaStart,
    mahadashaEnd,
    antardashaNow,
    antardashaStart,
    antardashaEnd,
    antardashaTimeline: antardashaTimeline.length ? antardashaTimeline : undefined,
    mangalDosha,
    kalsarpaYoga,
    placements,
  };
}

export function validatePublicChartFacts(facts: PublicChartFacts): {
  ok: boolean;
  missing: string[];
  contradictions: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const contradictions: string[] = [];
  const warnings = [...facts.warnings];

  if (!facts.lagnaSign) missing.push("lagnaSign");
  if (!facts.moonSign) missing.push("moonSign");
  if (!facts.sunSign) missing.push("sunSign");
  if (!facts.nakshatra) missing.push("nakshatra");
  if (!facts.mahadasha) missing.push("mahadasha");

  if (facts.lagnaSign && facts.moonSign && facts.moonHouse === undefined) {
    const derived = computeWholeSignHouse(facts.lagnaSign, facts.moonSign);
    if (derived === undefined) missing.push("moonHouse");
  }
  if (facts.lagnaSign && facts.sunSign && facts.sunHouse === undefined) {
    const derived = computeWholeSignHouse(facts.lagnaSign, facts.sunSign);
    if (derived === undefined) missing.push("sunHouse");
  }

  // Check placements for contradictions
  if (facts.lagnaSign && facts.placements["Moon"]?.sign && facts.moonSign) {
    if (facts.placements["Moon"].sign.toLowerCase() !== facts.moonSign.toLowerCase()) {
      contradictions.push(`moon_sign_mismatch: top=${facts.moonSign} placement=${facts.placements["Moon"].sign}`);
    }
  }

  const ok = missing.length === 0 && contradictions.length === 0 && facts.confidence !== "invalid";
  return { ok, missing, contradictions, warnings };
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export function formatPublicChartBasis(facts: PublicChartFacts): string {
  const parts: string[] = [];
  if (facts.lagnaSign) parts.push(`${facts.lagnaSign} Lagna`);
  if (facts.moonSign) {
    const mh = facts.moonHouse ?? (facts.lagnaSign && facts.moonSign ? computeWholeSignHouse(facts.lagnaSign, facts.moonSign) : undefined);
    parts.push(mh ? `${facts.moonSign} Moon in the ${ordinal(mh)} house` : `${facts.moonSign} Moon`);
  }
  if (facts.sunSign) {
    const sh = facts.sunHouse ?? (facts.lagnaSign && facts.sunSign ? computeWholeSignHouse(facts.lagnaSign, facts.sunSign) : undefined);
    parts.push(sh ? `${facts.sunSign} Sun in the ${ordinal(sh)} house` : `${facts.sunSign} Sun`);
  }
  if (facts.nakshatra) {
    parts.push(facts.nakshatraPada ? `${facts.nakshatra} Nakshatra Pada ${facts.nakshatraPada}` : facts.nakshatra);
  }
  if (facts.mahadasha) parts.push(`running ${facts.mahadasha} Mahadasha`);
  if (facts.antardashaNow) {
    const endPart = facts.antardashaEnd ? `, ${facts.antardashaNow} until ${facts.antardashaEnd}` : "";
    if (endPart) parts.push(facts.antardashaNow + " until " + facts.antardashaEnd);
    else parts.push(facts.antardashaNow + " Antardasha");
  }
  return parts.join(", ") + (parts.length ? "." : "");
}

const LEAK_PATTERNS: RegExp[] = [
  /profile_id\s*[:=]\s*[^\s,\n)]+/gi,
  /chart_version_id\s*[:=]\s*[^\s,\n)]+/gi,
  /user_id\s*[:=]\s*[^\s,\n)]+/gi,
  /\bfact:\s+[^\n]*/gi,
  /\bchart_fact:\s+[^\n]*/gi,
  /\bprovider\s*[:=]\s*[^\s,\n)]+/gi,
  /\bmodel\s*[:=]\s*[^\s,\n)]+/gi,
  /\bserver\s*[:=]\s*[^\s,\n)]+/gi,
  /\bmetadata\s*[:=]\s*\{[^}]*\}/gi,
  /\bdebugTrace\b[^\n]*/gi,
  /Retrieval cue:[\s\S]*?(?=\n\n|\n[A-Z]|$)/gi,
  /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi,
  /\b[a-f0-9]{32,}\b/gi,
];

export function sanitizeVisibleAstroAnswer(answer: string): string {
  if (!answer) return "aadesh: I am unable to answer this question right now. Please try again.";
  let clean = answer;
  for (const pattern of LEAK_PATTERNS) {
    clean = clean.replace(pattern, "");
  }
  clean = clean.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
  if (!clean.toLowerCase().startsWith("aadesh:")) {
    clean = `aadesh: ${clean}`;
  }
  return clean;
}
