/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { PublicChartFacts } from "../public-chart-facts.ts";
import type { AnswerValidationResult, ValidationIssue, AnswerValidationInput } from "./validation-types.ts";
import { buildIssue } from "./validators/validator-utils.ts";
import { validateAnswerRemedies } from "./validators/remedy-validator.ts";

export type ExtractedAstroClaim = {
  kind:
    | "lagna_sign"
    | "moon_sign"
    | "sun_sign"
    | "moon_house"
    | "sun_house"
    | "nakshatra"
    | "pada"
    | "mahadasha"
    | "antardasha"
    | "planet_house"
    | "dosha_status"
    | "transit_date"
    | "remedy_condition"
    | "unsupported_advanced_field";
  value: string | number | boolean;
  rawText: string;
  planet?: string;
  fieldKey?: string;
  unsupportedField?: string;
  normalizedValue?: string | number | boolean;
};

const SIGN_MAP: Record<string, string> = {
  aries: "Aries", mesha: "Aries",
  taurus: "Taurus", vrishabha: "Taurus",
  gemini: "Gemini", mithuna: "Gemini",
  cancer: "Cancer", karka: "Cancer",
  leo: "Leo", simha: "Leo",
  virgo: "Virgo", kanya: "Virgo",
  libra: "Libra", tula: "Libra",
  scorpio: "Scorpio", vrischika: "Scorpio", vrishchika: "Scorpio",
  sagittarius: "Sagittarius", dhanu: "Sagittarius",
  capricorn: "Capricorn", makara: "Capricorn",
  aquarius: "Aquarius", kumbha: "Aquarius",
  pisces: "Pisces", meena: "Pisces",
};

const PLANET_MAP: Record<string, string> = {
  sun: "Sun", surya: "Sun",
  moon: "Moon", chandra: "Moon",
  mercury: "Mercury", budh: "Mercury", buddha: "Mercury",
  venus: "Venus", shukra: "Venus",
  mars: "Mars", mangal: "Mars",
  jupiter: "Jupiter", guru: "Jupiter", brihaspati: "Jupiter",
  saturn: "Saturn", shani: "Saturn",
  rahu: "Rahu", ketu: "Ketu",
};

const NAKSHATRA_MAP: Record<string, string> = {
  mrigashira: "Mrigashira",
  mrigasira: "Mrigashira",
};

const ADVANCED_FIELDS = [
  "shadbala", "bhavabala", "kp sub lord", "kp sub-lord", "kp cusp", "ashtakvarga", "varshaphal", "yogini dasha", "char dasha", "lal kitab", "jaimini", "pratyantar",
];

function normalizeText(answer: string): string {
  return answer.replace(/\s+/g, " ").trim();
}

function normalizeLower(answer: string): string {
  return normalizeText(answer).toLowerCase();
}

function canonicalPlanet(value: string): string | undefined {
  return PLANET_MAP[value.toLowerCase().trim()];
}

function canonicalNakshatra(value: string): string | undefined {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  return NAKSHATRA_MAP[normalized];
}

function pushUnique(claims: ExtractedAstroClaim[], next: ExtractedAstroClaim): void {
  if (claims.some((claim) => claim.kind === next.kind && claim.rawText === next.rawText && claim.value === next.value)) return;
  claims.push(next);
}

function addSignClaims(claims: ExtractedAstroClaim[], text: string): void {
  for (const [raw, normalized] of Object.entries(SIGN_MAP)) {
    const signPattern = new RegExp(`\\b${raw}\\b`, "i");
    if (!signPattern.test(text)) continue;
    const rawText = text.match(new RegExp(`(?:lagna|ascendant|moon sign|sun sign|moon|sun)[^.!?;:]{0,40}\\b${raw}\\b`, "i"))?.[0] ?? raw;
    if (/(lagna|ascendant)\b/i.test(text) && !/moon|sun/i.test(rawText)) pushUnique(claims, { kind: "lagna_sign", value: normalized, rawText, normalizedValue: normalized });
    if (/\bmoon\b/i.test(text) && /moon sign|moon in|moon\b/i.test(text) && !/sun/i.test(rawText)) pushUnique(claims, { kind: "moon_sign", value: normalized, rawText, normalizedValue: normalized });
    if (/\bsun\b/i.test(text) && /sun sign|sun in|sun\b/i.test(text) && !/moon/i.test(rawText)) pushUnique(claims, { kind: "sun_sign", value: normalized, rawText, normalizedValue: normalized });
  }
}

function addHouseClaims(claims: ExtractedAstroClaim[], text: string): void {
  const moonHouse = text.match(/\b(?:moon|chandra)\b[^.!?;:]{0,30}\bhouse\s*(\d{1,2})\b/i) ?? text.match(/\b(?:moon|chandra)\b[^.!?;:]{0,30}\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i);
  if (moonHouse) pushUnique(claims, { kind: "moon_house", value: Number(moonHouse[1]), rawText: moonHouse[0], normalizedValue: Number(moonHouse[1]) });
  const sunHouse = text.match(/\b(?:sun|surya)\b[^.!?;:]{0,30}\bhouse\s*(\d{1,2})\b/i) ?? text.match(/\b(?:sun|surya)\b[^.!?;:]{0,30}\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i);
  if (sunHouse) pushUnique(claims, { kind: "sun_house", value: Number(sunHouse[1]), rawText: sunHouse[0], normalizedValue: Number(sunHouse[1]) });
  const planetMatchers: Array<{ planet?: string; kind: "moon_house" | "sun_house" | "planet_house"; patterns: RegExp[] }> = [
    { kind: "moon_house", patterns: [/\bmoon\b[^.!?;:]{0,20}\bhouse\s*(\d{1,2})\b/i, /\bmoon\b[^.!?;:]{0,20}\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i, /\bchandra\b[^.!?;:]{0,20}\bhouse\s*(\d{1,2})\b/i, /\bchandra\b[^.!?;:]{0,20}\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i] },
    { kind: "sun_house", patterns: [/\bsun\b[^.!?;:]{0,20}\bhouse\s*(\d{1,2})\b/i, /\bsun\b[^.!?;:]{0,20}\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i, /\bsurya\b[^.!?;:]{0,20}\bhouse\s*(\d{1,2})\b/i, /\bsurya\b[^.!?;:]{0,20}\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i] },
    { kind: "planet_house", planet: undefined, patterns: [/\b(?:mercury|venus|mars|jupiter|saturn|rahu|ketu)\b[^.!?;:]{0,20}\bhouse\s*(\d{1,2})\b/i, /\b(?:mercury|venus|mars|jupiter|saturn|rahu|ketu)\b[^.!?;:]{0,20}\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i] },
  ];
  for (const item of planetMatchers) {
    const match = item.patterns.map((pattern) => text.match(pattern)).find(Boolean);
    if (!match) continue;
    const house = Number(match[1]);
    if (house === undefined) continue;
    if (item.kind === "planet_house") {
      const planet = canonicalPlanet(text.match(/\b(?:mercury|venus|mars|jupiter|saturn|rahu|ketu|sun|moon)\b/i)?.[0] ?? "");
      pushUnique(claims, { kind: "planet_house", value: house, rawText: match[0], planet, normalizedValue: house });
      continue;
    }
    pushUnique(claims, { kind: item.kind, value: house, rawText: match[0], normalizedValue: house });
  }
}

function addNakshatraClaims(claims: ExtractedAstroClaim[], text: string): void {
  const match = text.match(/\b(mrigashira|mrigasira)\b/i);
  if (match) pushUnique(claims, { kind: "nakshatra", value: canonicalNakshatra(match[1]) ?? "Mrigashira", rawText: match[0], normalizedValue: "Mrigashira" });
  const padaMatch = text.match(/\bpada\s*(\d)\b/i);
  if (padaMatch) pushUnique(claims, { kind: "pada", value: Number(padaMatch[1]), rawText: padaMatch[0], normalizedValue: Number(padaMatch[1]) });
}

function addDashaClaims(claims: ExtractedAstroClaim[], text: string): void {
  const dashas = ["Jupiter", "Saturn", "Mercury", "Venus", "Mars", "Sun", "Moon", "Rahu", "Ketu"];
  for (const planet of dashas) {
    const pat = new RegExp(`\\b${planet}\\s+mahadasha\\b`, "i");
    if (pat.test(text)) pushUnique(claims, { kind: "mahadasha", value: planet, rawText: text.match(pat)?.[0] ?? `${planet} Mahadasha`, normalizedValue: planet });
    const antardasha = new RegExp(`\\b(?:antardasha|sub-period|sub period)\\s*(?:is|:)?\\s*${planet}\\b`, "i");
    if (antardasha.test(text)) pushUnique(claims, { kind: "antardasha", value: planet, rawText: text.match(antardasha)?.[0] ?? planet, normalizedValue: planet });
  }
  const currentDasha = text.match(/\b(?:current\s+)?dasha\s+(?:is|:)?\s*(Jupiter|Saturn|Mercury|Venus|Mars|Sun|Moon|Rahu|Ketu)\b/i);
  if (currentDasha) pushUnique(claims, { kind: "mahadasha", value: currentDasha[1][0].toUpperCase() + currentDasha[1].slice(1).toLowerCase(), rawText: currentDasha[0], normalizedValue: currentDasha[1][0].toUpperCase() + currentDasha[1].slice(1).toLowerCase() });
  const pair = text.match(/\b(Jupiter|Saturn|Mercury|Venus|Mars|Sun|Moon|Rahu|Ketu)\s*[-/]\s*(Jupiter|Saturn|Mercury|Venus|Mars|Sun|Moon|Rahu|Ketu)\b/i);
  if (pair) {
    pushUnique(claims, { kind: "mahadasha", value: pair[1][0].toUpperCase() + pair[1].slice(1).toLowerCase(), rawText: pair[0], normalizedValue: pair[1][0].toUpperCase() + pair[1].slice(1).toLowerCase() });
    pushUnique(claims, { kind: "antardasha", value: pair[2][0].toUpperCase() + pair[2].slice(1).toLowerCase(), rawText: pair[0], normalizedValue: pair[2][0].toUpperCase() + pair[2].slice(1).toLowerCase() });
  }
}

function addDoshaClaims(claims: ExtractedAstroClaim[], text: string): void {
  const hasDosha = /\b(mangal dosha|manglik dosha|kalsarpa yoga|kaal sarp yoga|sade sati)\b/i.test(text);
  if (!hasDosha) return;
  const negated = /\b(no|not|without|absent)\b[^.!?]{0,20}\b(mangal dosha|manglik dosha|kalsarpa yoga|kaal sarp yoga|sade sati)\b/i.test(text);
  pushUnique(claims, { kind: "dosha_status", value: !negated, rawText: text.match(/\b(mangal dosha|manglik dosha|kalsarpa yoga|kaal sarp yoga|sade sati)\b/i)?.[0] ?? "dosha", normalizedValue: !negated });
}

function addTimingClaims(claims: ExtractedAstroClaim[], text: string): void {
  const isoDates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  for (const date of isoDates) pushUnique(claims, { kind: "transit_date", value: date, rawText: date, normalizedValue: date });
  const monthYear = text.match(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/gi) ?? [];
  for (const phrase of monthYear) pushUnique(claims, { kind: "transit_date", value: phrase.toLowerCase(), rawText: phrase, normalizedValue: phrase.toLowerCase() });
}

function addRemedyClaims(claims: ExtractedAstroClaim[], text: string): void {
  if (/\b(expensive gemstone|buy.*gemstone|blue sapphire|expensive puja|must buy|guarantee|guaranteed|will be solved|will fix|definitely happen)\b/i.test(text)) {
    pushUnique(claims, { kind: "remedy_condition", value: true, rawText: text.match(/\b(expensive gemstone|buy.*gemstone|blue sapphire|expensive puja|must buy|guarantee|guaranteed|will be solved|will fix|definitely happen)\b/i)?.[0] ?? text.slice(0, 80), normalizedValue: true });
  }
}

function addUnsupportedAdvancedClaims(claims: ExtractedAstroClaim[], text: string): void {
  for (const field of ADVANCED_FIELDS) {
    if (!new RegExp(`\\b${field.replace(/\s+/g, "\\s+")}\\b`, "i").test(text)) continue;
    pushUnique(claims, { kind: "unsupported_advanced_field", value: true, rawText: text.match(new RegExp(`\\b${field.replace(/\s+/g, "\\s+")}\\b`, "i"))?.[0] ?? field, unsupportedField: field, normalizedValue: true });
  }
}

export function extractAstroClaimsFromAnswer(answer: string): ExtractedAstroClaim[] {
  const text = normalizeLower(answer);
  const claims: ExtractedAstroClaim[] = [];
  if (!text) return claims;
  addSignClaims(claims, text);
  addHouseClaims(claims, text);
  addNakshatraClaims(claims, text);
  addDashaClaims(claims, text);
  addDoshaClaims(claims, text);
  addTimingClaims(claims, text);
  addRemedyClaims(claims, text);
  addUnsupportedAdvancedClaims(claims, text);
  return claims;
}

function issue(code: ValidationIssue["code"], message: string, evidence: string): ValidationIssue {
  return buildIssue(code, "error", message, evidence);
}

export function validateExtractedClaimsAgainstPublicFacts(args: {
  claims: ExtractedAstroClaim[];
  publicFacts: PublicChartFacts;
  unavailableFields?: Set<string>;
}): AnswerValidationResult {
  const issues: ValidationIssue[] = [];
  const wrongFacts: string[] = [];
  const unsafeClaims: string[] = [];
  const unavailable = args.unavailableFields ?? new Set<string>();
  const facts = args.publicFacts;
  for (const claim of args.claims) {
    if (claim.kind === "lagna_sign") {
      if (facts.unavailableFacts?.lagnaSign || !facts.lagnaSign || unavailable.has("lagnaSign")) {
        issues.push(issue("contract_violation", "Lagna is unavailable.", claim.rawText));
      } else if (facts.lagnaSign.toLowerCase() !== String(claim.value).toLowerCase()) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Lagna mismatch.", `${claim.value} != ${facts.lagnaSign}`));
      }
    }
    if (claim.kind === "moon_sign") {
      if (!facts.moonSign) {
        issues.push(issue("contract_violation", "Moon sign is unavailable.", claim.rawText));
      } else if (facts.moonSign.toLowerCase() !== String(claim.value).toLowerCase()) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Moon sign mismatch.", `${claim.value} != ${facts.moonSign}`));
      }
    }
    if (claim.kind === "sun_sign") {
      if (!facts.sunSign) {
        issues.push(issue("contract_violation", "Sun sign is unavailable.", claim.rawText));
      } else if (facts.sunSign.toLowerCase() !== String(claim.value).toLowerCase()) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Sun sign mismatch.", `${claim.value} != ${facts.sunSign}`));
      }
    }
    if (claim.kind === "moon_house") {
      if (facts.unavailableFacts?.moonHouse || facts.moonHouse === undefined || unavailable.has("moonHouse")) {
        issues.push(issue("contract_violation", "Moon house is unavailable.", claim.rawText));
      } else if (facts.moonHouse !== claim.value) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Moon house mismatch.", `${claim.value} != ${facts.moonHouse}`));
      }
    }
    if (claim.kind === "sun_house") {
      if (facts.unavailableFacts?.sunHouse || facts.sunHouse === undefined || unavailable.has("sunHouse")) {
        issues.push(issue("contract_violation", "Sun house is unavailable.", claim.rawText));
      } else if (facts.sunHouse !== claim.value) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Sun house mismatch.", `${claim.value} != ${facts.sunHouse}`));
      }
    }
    if (claim.kind === "nakshatra") {
      if (facts.unavailableFacts?.moonNakshatra || !facts.nakshatra) {
        issues.push(issue("contract_violation", "Nakshatra is unavailable.", claim.rawText));
      } else if (canonicalNakshatra(String(claim.value)) !== canonicalNakshatra(facts.nakshatra)) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Nakshatra mismatch.", `${claim.value} != ${facts.nakshatra}`));
      }
    }
    if (claim.kind === "pada") {
      if (facts.unavailableFacts?.moonNakshatraPada || facts.nakshatraPada === undefined) {
        issues.push(issue("contract_violation", "Nakshatra pada is unavailable.", claim.rawText));
      } else if (facts.nakshatraPada !== claim.value) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Nakshatra pada mismatch.", `${claim.value} != ${facts.nakshatraPada}`));
      }
    }
    if (claim.kind === "mahadasha") {
      if (!facts.mahadasha) issues.push(issue("contract_violation", "Mahadasha is unavailable.", claim.rawText));
      else if (canonicalPlanet(String(claim.value)) !== canonicalPlanet(facts.mahadasha)) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Mahadasha mismatch.", `${claim.value} != ${facts.mahadasha}`));
      }
    }
    if (claim.kind === "antardasha") {
      if (!facts.antardashaNow && !facts.antardashaTimeline?.length) {
        issues.push(issue("contract_violation", "Antardasha is unavailable.", claim.rawText));
      } else if (facts.antardashaNow && canonicalPlanet(String(claim.value)) !== canonicalPlanet(facts.antardashaNow)) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Antardasha mismatch.", `${claim.value} != ${facts.antardashaNow}`));
      }
    }
    if (claim.kind === "planet_house") {
      const planet = claim.planet ?? "";
      const placement = facts.placements?.[planet];
      if (!planet || !placement?.house) {
        issues.push(issue("contract_violation", "Planet house is unavailable.", claim.rawText));
      } else if (placement.house !== claim.value) {
        wrongFacts.push(claim.rawText);
        issues.push(issue("wrong_chart_fact", "Planet house mismatch.", `${claim.value} != ${placement.house}`));
      }
    }
    if (claim.kind === "dosha_status") {
      if (facts.mangalDosha === undefined && facts.kalsarpaYoga === undefined) {
        issues.push(issue("contract_violation", "Dosha status is unavailable.", claim.rawText));
      }
    }
    if (claim.kind === "transit_date") {
      issues.push(issue("timing_not_allowed", "Exact timing claims are not allowed without a deterministic timing source.", claim.rawText));
    }
    if (claim.kind === "remedy_condition") {
      const remedyValidation = validateAnswerRemedies({
        question: "",
        answer: claim.rawText,
        contract: { remedyAllowed: false } as never,
        context: {} as never,
        reasoningPath: {} as never,
        timing: { available: false, windows: [], requested: false, allowed: false, missingSources: [], warnings: [], metadata: {} } as never,
      } as AnswerValidationInput);
      if (remedyValidation.some((item) => item.code === "remedy_not_allowed" || item.code === "unsafe_remedy")) {
        issues.push(...remedyValidation);
        unsafeClaims.push(claim.rawText);
      }
    }
    if (claim.kind === "unsupported_advanced_field") {
      issues.push(issue("contract_violation", "Unsupported advanced field claim.", claim.rawText));
    }
  }

  const ok = issues.length === 0;
  return {
    ok,
    score: ok ? 100 : 0,
    issues,
    missingAnchors: [],
    missingSections: [],
    wrongFacts,
    unsafeClaims,
    genericnessScore: 0,
    retryRecommended: false,
    fallbackRecommended: !ok,
    correctionInstruction: ok ? "" : "Remove unsupported or incorrect exact chart claims.",
    metadata: {
      checkedAnchors: 0,
      checkedSections: 0,
      checkedTimingWindows: 0,
      contractDomain: "public_facts",
      contractAnswerMode: "interpretive",
      strictFailureCount: issues.length,
      warningCount: 0,
    },
  };
}
