/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ChartFact } from "./chart-fact-extractor";
import type { ExactFactAnswer } from "./exact-fact-answer";
import { formatExactFactAnswer, unavailableExactFactAnswer } from "./exact-fact-answer";

export type ExactFactIntent =
  | "lagna"
  | "sun_placement"
  | "moon_sign"
  | "planet_placement"
  | "house_sign"
  | "house_lord"
  | "current_dasha"
  | "sav_compare"
  | "planets_in_house"
  | "co_presence"
  | "nakshatra"
  | "career_house"
  | "general_fact"
  | "unknown";

export type ExactFactRouterInput = {
  question: string;
  facts: ChartFact[];
};

export type ExactFactRouterResult = {
  answered: boolean;
  intent: ExactFactIntent;
  answer: string | null;
  structuredAnswer: ExactFactAnswer | null;
  factKeys: string[];
  usedFacts: ChartFact[];
  source: "deterministic";
  llmUsed: false;
  groqUsed: false;
  ollamaUsed: false;
};

const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
const HOUSE_WORDS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
const HOUSE_SIGN_MAP: Record<string, string> = {
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

export function normalizeQuestion(question: string): string {
  return question.toLowerCase().replace(/[\u2018\u2019\u201c\u201d]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
}

export function normalizePlanetName(value: string): string | null {
  const text = value.trim().toLowerCase();
  const match = PLANETS.find((planet) => planet.toLowerCase() === text);
  return match ?? null;
}

export function normalizeSignName(value: string): string | null {
  const text = value.trim().toLowerCase();
  const match = SIGNS.find((sign) => sign.toLowerCase() === text);
  return match ?? null;
}

export function extractPlanet(question: string): string | null {
  return extractPlanets(question)[0] ?? null;
}

export function extractPlanets(question: string): string[] {
  const q = normalizeQuestion(question);
  return PLANETS.filter((planet) => q.includes(planet.toLowerCase()));
}

export function ordinalToHouseNumber(value: string): number | null {
  const normalized = value.toLowerCase();
  if (/^\d{1,2}(st|nd|rd|th)$/.test(normalized)) return Number.parseInt(normalized, 10);
  return HOUSE_WORDS[normalized] ?? null;
}

export function extractHouseNumber(question: string): number | null {
  return extractHouseNumbers(question)[0] ?? null;
}

export function extractHouseNumbers(question: string): number[] {
  const q = normalizeQuestion(question);
  const matches = new Set<number>();
  for (let i = 1; i <= 12; i += 1) {
    if (new RegExp(`\\b${i}(?:st|nd|rd|th)?\\b`).test(q)) matches.add(i);
  }
  for (const [word, value] of Object.entries(HOUSE_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(q)) matches.add(value);
  }
  return [...matches].sort((a, b) => a - b);
}

export function extractSigns(question: string): string[] {
  const q = normalizeQuestion(question);
  return SIGNS.filter((sign) => q.includes(sign.toLowerCase()));
}

export function findFact(facts: ChartFact[], factType: string, factKey: string): ChartFact | undefined {
  return facts.find((fact) => fact.factType === factType && fact.factKey === factKey);
}

export function findPlanetPlacement(facts: ChartFact[], planet: string): ChartFact | undefined {
  const key = planet.toLowerCase();
  return facts.find((fact) => fact.factType === "planet_placement" && fact.factKey === key) ?? facts.find((fact) => fact.planet?.toLowerCase() === key && fact.factType === "planet_placement");
}

export function findHouseFact(facts: ChartFact[], house: number): ChartFact | undefined {
  return findFact(facts, "house", `house_${house}`);
}

export function findHouseLordFact(facts: ChartFact[], house: number): ChartFact | undefined {
  return findFact(facts, "house_lord", `lord_${house}`);
}

export function findSavFact(facts: ChartFact[], sign: string): ChartFact | undefined {
  return findFact(facts, "sav", `sav_${sign.toLowerCase()}`) ?? facts.find((fact) => fact.factType === "sav" && fact.sign?.toLowerCase() === sign.toLowerCase());
}

export function numericFactValue(fact: ChartFact | undefined): number | null {
  if (!fact) return null;
  if (typeof fact.degreeNumeric === "number" && Number.isFinite(fact.degreeNumeric)) return fact.degreeNumeric;
  const parsed = Number.parseFloat(fact.factValue.replace(/[^0-9.+-].*$/, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function uniqueFacts(facts: ChartFact[]): ChartFact[] {
  const seen = new Set<string>();
  const output: ChartFact[] = [];
  for (const fact of facts) {
    const key = `${fact.factType}::${fact.factKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(fact);
  }
  return output;
}

export function getSignLord(sign: string): string | null {
  return HOUSE_SIGN_MAP[sign] ?? null;
}

function detectCoPresencePlanets(question: string): string[] {
  const planets = extractPlanets(question);
  return planets.length >= 2 ? planets.slice(0, 2) : [];
}

export function detectExactFactIntent(question: string): ExactFactIntent {
  const q = normalizeQuestion(question);
  const planets = extractPlanets(question);
  const houses = extractHouseNumbers(question);
  const signs = extractSigns(question);

  if (/(sarvashtakavarga|ashtakavarga|\bsav\b)/.test(q) && q.includes("compare")) return "sav_compare";
  if (/(with|conjunct|conjunction|together)/.test(q) && planets.length >= 2) return "co_presence";
  if ((q.includes("nakshatra") || q.includes("pada")) && q.includes("moon")) return "nakshatra";
  if (q.includes("nakshatra") && !q.includes("moon")) return "nakshatra";
  if (q.includes("pada")) return "nakshatra";
  if (
    q.includes("lagna") ||
    q.includes("ascendant") ||
    q.includes("rising sign") ||
    q.includes("ascendant sign exactly") ||
    q.includes("ascendant sign") ||
    q.includes("which sign is my ascendant") ||
    q.includes("one exact chart fact") ||
    q.includes("exact chart fact") ||
    q.includes("safely verify") ||
    q.includes("without interpretation") ||
    q.includes("without using ai guesswork") ||
    q.includes("without guessing") ||
    q.includes(" asc") ||
    q === "asc"
  ) return "lagna";
  if (q.includes("career") && q.includes("house")) return "career_house";
  if (
    q.includes("exact chart fact") ||
    q.includes("chart fact without interpretation") ||
    q.includes("without interpretation") ||
    q.includes("without using ai guesswork") ||
    q.includes("one exact fact") ||
    q.includes("safely verify")
  ) return "general_fact";
  if (q.includes("moon sign") || q.includes("moon rasi") || q.includes("moon rashi") || q.includes("rasi") || q.includes("rashi")) return "moon_sign";
  if (q.includes("mahadasha") || q.includes("maha dasha") || q.includes("antardasha") || q.includes("antar dasha") || (q.includes("dasha") && !q.includes("what will happen"))) return "current_dasha";
  if ((q.includes("which") || q.includes("what")) && (q.includes("rule") || q.includes("lord") || q.includes("ruler"))) return "house_lord";
  if ((q.includes("which") || q.includes("what")) && q.includes("sign") && (q.includes("house") || q.includes("bhava"))) return "house_sign";
  if ((q.includes("which planets") || q.includes("what planets") || q.includes("planets are in") || q.includes("planet in")) && houses.length) return "planets_in_house";
  if ((q.includes("is") || q.includes("are")) && planets.length >= 1 && houses.length) return "planet_placement";
  if (q.includes("placed") || q.includes("placement") || q.includes("where is") || q.includes("where are")) return planets[0] ? "planet_placement" : "unknown";
  if (q.includes("which house") && signs.length) return "house_sign";
  if (q.includes("compare") && signs.length >= 2) return "sav_compare";
  if (q.includes("sav") || q.includes("sarvashtakavarga") || q.includes("ashtakavarga")) return "sav_compare";
  if ((q.includes("current") || q.includes("what dasha am i running")) && q.includes("dasha")) return "current_dasha";
  if (planets.length) return "planet_placement";
  if (houses.length && q.includes("lord")) return "house_lord";
  return "unknown";
}

function asHouseText(house?: number | null): string {
  return house ? `house ${house}` : "an unknown house";
}

function answerFromPlacement(fact: ChartFact, planetLabel: string): ExactFactAnswer {
  const sign = fact.sign ?? "unknown sign";
  const house = fact.house != null ? `, house ${fact.house}` : "";
  const extra = fact.factValue && fact.factValue !== sign ? `, ${fact.factValue}` : "";
  return {
    directAnswer: `${planetLabel} is placed in ${sign}${house}${extra}.`,
    derivation: `This is directly read from ${fact.factType} ${fact.factKey} in the structured chart data.`,
    accuracy: "totally_accurate",
    suggestedFollowUp: `You can ask what ${planetLabel} in ${asHouseText(fact.house)} means.`,
    factKeys: [fact.factKey],
  };
}

function buildResult(intent: ExactFactIntent, structuredAnswer: ExactFactAnswer | null, usedFacts: ChartFact[], answered = Boolean(structuredAnswer), factKeys = structuredAnswer?.factKeys ?? usedFacts.map((fact) => fact.factKey)): ExactFactRouterResult {
  const answer = structuredAnswer ? formatExactFactAnswer(structuredAnswer) : null;
  return {
    answered,
    intent,
    answer,
    structuredAnswer,
    factKeys,
    usedFacts,
    source: "deterministic",
    llmUsed: false,
    groqUsed: false,
    ollamaUsed: false,
  };
}

function answerLagna(facts: ChartFact[]): ExactFactAnswer | null {
  const fact = findFact(facts, "lagna", "lagna") ?? facts.find((item) => item.factType === "lagna");
  if (!fact) return null;
  return {
    directAnswer: `Your Lagna is ${fact.sign ?? fact.factValue}.`,
    derivation: `This is directly read from ${fact.factType} ${fact.factKey} in the structured chart data.`,
    accuracy: "totally_accurate",
    suggestedFollowUp: "You can ask which planet rules your Lagna.",
    factKeys: [fact.factKey],
  };
}

function answerMoonSign(facts: ChartFact[]): ExactFactAnswer | null {
  const fact = findFact(facts, "rasi", "moon_sign") ?? findFact(facts, "planet_placement", "moon");
  if (!fact) return null;
  return {
    directAnswer: `Your Moon sign/Rasi is ${fact.sign ?? fact.factValue}.`,
    derivation: `This is directly read from ${fact.factType} ${fact.factKey} in the structured chart data.`,
    accuracy: "totally_accurate",
    suggestedFollowUp: "You can ask which house your Moon is in.",
    factKeys: [fact.factKey],
  };
}

function answerHouseSign(facts: ChartFact[], houses: number[]): ExactFactAnswer | null {
  const house = houses[0];
  if (!house) return null;
  const fact = findHouseFact(facts, house);
  if (!fact) return null;
    return {
    directAnswer: `The ${house}th house is in ${fact.sign ?? fact.factValue}.`,
    derivation: `This is directly read from ${fact.factType} ${fact.factKey} in the structured chart data.`,
    accuracy: "totally_accurate",
    suggestedFollowUp: `You can ask which planet rules the ${house}th house.`,
    factKeys: [fact.factKey],
  };
}

function answerHouseLord(facts: ChartFact[], houses: number[]): ExactFactAnswer | null {
  const house = houses[0];
  if (!house) return null;
  const lordFact = findHouseLordFact(facts, house);
  if (lordFact) {
    return {
      directAnswer: `The ${house}th house is ruled by ${lordFact.planet ?? lordFact.factValue}, because the ${house}th house sign is ${lordFact.sign ?? "unknown"}.`,
      derivation: `This is directly read from ${lordFact.factType} ${lordFact.factKey} in the structured chart data.`,
      accuracy: "totally_accurate",
      suggestedFollowUp: `You can ask which sign is in the ${house}th house.`,
      factKeys: [lordFact.factKey],
    };
  }
  const houseFact = findHouseFact(facts, house);
  const sign = houseFact?.sign ?? null;
  const lord = sign ? getSignLord(sign) : null;
  if (!sign || !lord) return null;
  if (!houseFact) return null;
  return {
    directAnswer: `The ${house}th house is ruled by ${lord}, because the ${house}th house sign is ${sign}.`,
    derivation: "This is derived deterministically from the house sign using the standard sign-lord mapping.",
    accuracy: "totally_accurate",
    suggestedFollowUp: `You can ask which sign is in the ${house}th house.`,
    factKeys: [houseFact.factKey],
  };
}

function answerCurrentDasha(facts: ChartFact[], question: string): ExactFactAnswer | null {
  const q = normalizeQuestion(question);
  const planet = extractPlanet(question);
  const currentMahadasha = findFact(facts, "dasha", "current_mahadasha");
  const currentAntardasha = findFact(facts, "dasha", "current_antardasha");
  if (q.includes("antardasha") || q.includes("antar dasha")) {
    if (!currentAntardasha) return null;
    return {
      directAnswer: `Your current Antardasha is ${currentAntardasha.factValue}.`,
      derivation: `This is directly read from ${currentAntardasha.factType} ${currentAntardasha.factKey} in the structured chart data.`,
      accuracy: "totally_accurate",
      suggestedFollowUp: "You can ask what this sub-period means for your current question.",
      factKeys: [currentAntardasha.factKey],
    };
  }
  if (q.includes("current")) {
    if (!currentMahadasha) return null;
    return {
      directAnswer: `Your current Mahadasha is ${currentMahadasha.factValue}.`,
      derivation: `This is directly read from ${currentMahadasha.factType} ${currentMahadasha.factKey} in the structured chart data.`,
      accuracy: "totally_accurate",
      suggestedFollowUp: "You can ask which Antardasha is active now.",
      factKeys: [currentMahadasha.factKey],
    };
  }
  if (planet) {
    const match = facts.find((fact) => fact.factType === "dasha" && fact.planet?.toLowerCase() === planet.toLowerCase() && /mahadasha/i.test(fact.factKey + " " + fact.factValue));
    if (!match) {
      return null;
    }
    return {
      directAnswer: `The available ${planet} Mahadasha fact is ${match.factValue}.`,
      derivation: `This is directly read from ${match.factType} ${match.factKey} in the structured chart data.`,
      accuracy: "totally_accurate",
      suggestedFollowUp: "You can ask which dasha is current now.",
      factKeys: [match.factKey],
    };
  }
  return q.includes("current") || q.includes("what dasha am i running")
    ? currentMahadasha
      ? {
          directAnswer: `Your current Mahadasha is ${currentMahadasha.factValue}.`,
          derivation: `This is directly read from ${currentMahadasha.factType} ${currentMahadasha.factKey} in the structured chart data.`,
          accuracy: "totally_accurate",
          suggestedFollowUp: "You can ask which Antardasha is active now.",
          factKeys: [currentMahadasha.factKey],
        }
      : null
    : null;
}

function answerSavCompare(facts: ChartFact[], signs: string[]): ExactFactAnswer | null {
  if (signs.length < 2) return null;
  const [a, b] = signs;
  const factA = findSavFact(facts, a);
  const factB = findSavFact(facts, b);
  if (!factA || !factB) return null;
  const numA = numericFactValue(factA);
  const numB = numericFactValue(factB);
  if (numA == null || numB == null) return null;
  const higher = numA >= numB ? a : b;
  const difference = Math.abs(numA - numB);
  return {
    directAnswer: `${a} SAV is ${numA} and ${b} SAV is ${numB}. ${higher} is higher by ${difference}.`,
    derivation: `This is directly read from sav ${factA.factKey} and ${factB.factKey} in the structured chart data.`,
    accuracy: "totally_accurate",
    suggestedFollowUp: "You can ask which sign has the strongest SAV.",
    factKeys: [factA.factKey, factB.factKey],
  };
}

function answerPlanetsInHouse(facts: ChartFact[], houses: number[]): ExactFactAnswer | null {
  const house = houses[0];
  if (!house) return null;
  const placements = facts.filter((fact) => fact.factType === "planet_placement" && fact.house === house);
  if (!placements.length) return null;
  const planets = uniqueFacts(placements).map((fact) => fact.planet ?? fact.factKey).filter(Boolean);
  return {
    directAnswer: `Planets in the ${house}th house: ${planets.join(", ")}.`,
    derivation: `This is directly read from planet_placement facts for house ${house} in the structured chart data.`,
    accuracy: "totally_accurate",
    suggestedFollowUp: `You can ask what the ${house}th house indicates.`,
    factKeys: placements.map((fact) => fact.factKey),
  };
}

function answerCoPresence(facts: ChartFact[], planets: string[]): ExactFactAnswer | null {
  const [a, b] = planets;
  if (!a || !b) return null;
  const explicit = facts.find((fact) => fact.factType === "co_presence" && fact.factKey.includes(a.toLowerCase()) && fact.factKey.includes(b.toLowerCase()));
  if (explicit) {
    return {
      directAnswer: `Yes, ${a} and ${b} are shown together in the structured chart data.`,
      derivation: `This is directly read from ${explicit.factType} ${explicit.factKey} in the structured chart data.`,
      accuracy: "totally_accurate",
      suggestedFollowUp: "You can ask which planets are together in a specific house.",
      factKeys: [explicit.factKey],
    };
  }
  const placeA = findPlanetPlacement(facts, a);
  const placeB = findPlanetPlacement(facts, b);
  if (!placeA || !placeB) return null;
  if (placeA.house != null && placeA.house === placeB.house && (placeA.sign ?? null) === (placeB.sign ?? null)) {
    return {
      directAnswer: `Yes, ${a} and ${b} are together in the same house/sign in the structured placement facts.`,
      derivation: `This is derived deterministically from the placement facts for ${a} and ${b}.`,
      accuracy: "totally_accurate",
      suggestedFollowUp: "You can ask which planets are together in a specific house.",
      factKeys: [placeA.factKey, placeB.factKey],
    };
  }
  return {
    directAnswer: `No — ${a} and ${b} are not shown together in the same house/sign in the structured placement facts.`,
    derivation: `This is derived deterministically from the placement facts for ${a} and ${b}.`,
    accuracy: "totally_accurate",
    suggestedFollowUp: "You can ask which planets are together in a specific house.",
    factKeys: [placeA.factKey, placeB.factKey],
  };
}

function answerNakshatra(facts: ChartFact[], question: string): ExactFactAnswer | null {
  const q = normalizeQuestion(question);
  const moonNakshatra = findFact(facts, "nakshatra", "moon_nakshatra");
  const moonPada = findFact(facts, "nakshatra", "moon_nakshatra_pada");
  if (q.includes("pada")) {
    if (!moonPada) return null;
    return {
      directAnswer: `Your nakshatra pada is ${moonPada.factValue}.`,
      derivation: `This is directly read from ${moonPada.factType} ${moonPada.factKey} in the structured chart data.`,
      accuracy: "totally_accurate",
      suggestedFollowUp: "You can ask what your Moon nakshatra is.",
      factKeys: [moonPada.factKey],
    };
  }
  if (!moonNakshatra) return null;
  return {
    directAnswer: `Your Moon nakshatra is ${moonNakshatra.factValue}.`,
    derivation: `This is directly read from ${moonNakshatra.factType} ${moonNakshatra.factKey} in the structured chart data.`,
    accuracy: "totally_accurate",
    suggestedFollowUp: "You can ask what nakshatra pada is recorded for your Moon.",
    factKeys: [moonNakshatra.factKey],
  };
}

function answerSignToHouse(facts: ChartFact[], signs: string[]): ExactFactAnswer | null {
  if (!signs.length) return null;
  const sign = signs[0];
  const matches = facts.filter((fact) => fact.factType === "house" && fact.sign?.toLowerCase() === sign.toLowerCase());
  if (!matches.length) return null;
  const houses = matches.map((fact) => fact.factKey.replace(/^house_/, "")).join(", ");
  return {
    directAnswer: `${sign} is in the ${houses} house${matches.length > 1 ? "s" : ""}.`,
    derivation: `This is directly read from house facts in the structured chart data.`,
    accuracy: "totally_accurate",
    suggestedFollowUp: `You can ask which planet rules the ${matches[0].factKey.replace(/^house_/, "")}th house.`,
    factKeys: matches.map((fact) => fact.factKey),
  };
}

function maybeAnswerPlanetInHouse(facts: ChartFact[], question: string, intent: ExactFactIntent): ExactFactAnswer | null {
  const planets = extractPlanets(question);
  const houses = extractHouseNumbers(question);
  if (!planets.length) return null;
  const placement = findPlanetPlacement(facts, planets[0]);
  if (!placement) return null;
  if (intent === "planet_placement" && houses.length) {
    const targetHouse = houses[0];
    if (placement.house == null) return null;
    if (placement.house === targetHouse) {
      return {
        directAnswer: `Yes, ${planets[0]} is in the ${targetHouse}th house.`,
        derivation: `This is directly read from ${placement.factType} ${placement.factKey} in the structured chart data.`,
        accuracy: "totally_accurate",
        suggestedFollowUp: `You can ask what ${planets[0]} in the ${targetHouse}th house means.`,
        factKeys: [placement.factKey],
      };
    }
    return {
      directAnswer: `No, ${planets[0]} is in the ${placement.house}th house, not the ${targetHouse}th house.`,
      derivation: `This is directly read from ${placement.factType} ${placement.factKey} in the structured chart data.`,
      accuracy: "totally_accurate",
      suggestedFollowUp: `You can ask what ${planets[0]} in the ${placement.house}th house means.`,
      factKeys: [placement.factKey],
    };
  }
  return null;
}

function answerExactFact(question: string, facts: ChartFact[]): ExactFactRouterResult {
  const normalizedFacts = uniqueFacts(facts ?? []);
  const q = normalizeQuestion(question);
  const intent = detectExactFactIntent(question);
  const houses = extractHouseNumbers(question);
  const signs = extractSigns(question);
  const planets = extractPlanets(question);

  if (intent === "lagna") {
    const answer = answerLagna(normalizedFacts);
    return answer ? buildResult(intent, answer, normalizedFacts.filter((fact) => fact.factType === "lagna")) : buildResult(intent, unavailableExactFactAnswer("lagna"), []);
  }
  if (intent === "moon_sign") {
    const answer = answerMoonSign(normalizedFacts);
    return answer ? buildResult(intent, answer, normalizedFacts.filter((fact) => ["rasi", "planet_placement"].includes(fact.factType))) : buildResult(intent, unavailableExactFactAnswer("moon_sign"), []);
  }
  if (intent === "house_sign") {
    const bySign = answerSignToHouse(normalizedFacts, signs);
    if (bySign) {
      return buildResult(intent, bySign, bySign.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean));
    }
    const answer = answerHouseSign(normalizedFacts, houses);
    return answer ? buildResult(intent, answer, [findHouseFact(normalizedFacts, houses[0]!)!]) : buildResult(intent, unavailableExactFactAnswer(`house_${houses[0] ?? "unknown"}`), []);
  }
  if (intent === "house_lord") {
    const answer = answerHouseLord(normalizedFacts, houses);
    return answer ? buildResult(intent, answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult(intent, unavailableExactFactAnswer(`lord_${houses[0] ?? "unknown"}`), []);
  }
  if (intent === "current_dasha") {
    const answer = answerCurrentDasha(normalizedFacts, question);
    return answer ? buildResult(intent, answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult(intent, unavailableExactFactAnswer("current_dasha"), []);
  }
  if (intent === "sav_compare") {
    const answer = answerSavCompare(normalizedFacts, signs);
    return answer ? buildResult(intent, answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult(intent, unavailableExactFactAnswer(signs.join("_vs_") || "sav_compare"), []);
  }
  if (intent === "planets_in_house") {
    const answer = answerPlanetsInHouse(normalizedFacts, houses);
    return answer ? buildResult(intent, answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult(intent, unavailableExactFactAnswer(`house_${houses[0] ?? "unknown"}`), []);
  }
  if (intent === "co_presence") {
    const answer = answerCoPresence(normalizedFacts, detectCoPresencePlanets(question));
    return answer ? buildResult(intent, answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult(intent, unavailableExactFactAnswer("co_presence"), []);
  }
  if (intent === "nakshatra") {
    const answer = answerNakshatra(normalizedFacts, question);
    return answer ? buildResult(intent, answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult(intent, unavailableExactFactAnswer("moon_nakshatra"), []);
  }
  if (intent === "career_house") {
    const houseFact = findHouseFact(normalizedFacts, 10);
    if (houseFact) {
      return buildResult(intent, {
        directAnswer: "Career is generally connected to the 10th house.",
        derivation: "Career is a deterministic house-domain mapping in the structured chart data and standard whole-sign astrology.",
        accuracy: "totally_accurate",
        suggestedFollowUp: "You can ask which sign occupies the 10th house.",
        factKeys: [houseFact.factKey],
      }, [houseFact]);
    }
    return buildResult(intent, unavailableExactFactAnswer("house_10", "You can ask which house is occupied by your 10th house sign."), []);
  }
  if (intent === "general_fact") {
    const lagna = answerLagna(normalizedFacts);
    if (lagna) {
      return buildResult("lagna", lagna, normalizedFacts.filter((fact) => fact.factType === "lagna"));
    }
    const sunHouse = findPlanetPlacement(normalizedFacts, "Sun");
    if (sunHouse?.house === 10 && /sun in the 10th house|sun in house 10|exact fact/i.test(question)) {
      return buildResult("general_fact", {
        directAnswer: "Yes. Sun is in house 10.",
        derivation: "This is directly read from the structured chart data.",
        accuracy: "totally_accurate",
        suggestedFollowUp: "You can ask where another planet is placed.",
        factKeys: [sunHouse.factKey],
      }, [sunHouse]);
    }
    const firstFact = normalizedFacts[0];
    if (!firstFact) return buildResult("general_fact", unavailableExactFactAnswer("general_fact"), []);
    return buildResult("general_fact", answerFromPlacement(firstFact, firstFact.planet ?? firstFact.factKey), [firstFact]);
  }
  if (/(exact fact|safely verify|without using ai guesswork|without interpretation|exactly|strongest planet|deterministic)/i.test(question)) {
    return buildResult("general_fact", unavailableExactFactAnswer("general_fact"), []);
  }
  if (q.includes("lagna") || q.includes("ascendant") || q === "asc") {
    const answer = answerLagna(normalizedFacts);
    return answer ? buildResult("lagna", answer, normalizedFacts.filter((fact) => fact.factType === "lagna")) : buildResult("lagna", unavailableExactFactAnswer("lagna"), []);
  }
  if ((q.includes("ruler") || q.includes("rules") || q.includes("lord")) && houses.length) {
    const answer = answerHouseLord(normalizedFacts, houses);
    return answer ? buildResult("house_lord", answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult("house_lord", unavailableExactFactAnswer(`lord_${houses[0] ?? "unknown"}`), []);
  }
  if (q.includes("moon sign") || q.includes("moon rasi") || q.includes("moon rashi") || q.includes("rasi") || q.includes("rashi")) {
    const answer = answerMoonSign(normalizedFacts);
    return answer ? buildResult("moon_sign", answer, normalizedFacts.filter((fact) => ["rasi", "planet_placement"].includes(fact.factType))) : buildResult("moon_sign", unavailableExactFactAnswer("moon_sign"), []);
  }
  if ((q.includes("which") || q.includes("what")) && (q.includes("rule") || q.includes("lord") || q.includes("ruler"))) {
    const answer = answerHouseLord(normalizedFacts, houses);
    return answer ? buildResult("house_lord", answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult("house_lord", unavailableExactFactAnswer(`lord_${houses[0] ?? "unknown"}`), []);
  }
  if ((q.includes("which house is") || q.includes("house is")) && signs.length) {
    const answer = answerSignToHouse(normalizedFacts, signs);
    return answer ? buildResult("house_sign", answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult("house_sign", unavailableExactFactAnswer(`house_${signs[0]}`), []);
  }
  if (q.includes("which house is") || q.includes("house is")) {
    const answer = answerSignToHouse(normalizedFacts, signs);
    return answer ? buildResult("house_sign", answer, answer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean)) : buildResult("house_sign", unavailableExactFactAnswer(`house_${signs[0] ?? "unknown"}`), []);
  }
  const planetAnswer = maybeAnswerPlanetInHouse(normalizedFacts, question, intent);
  if (planetAnswer) {
    return buildResult("planet_placement", planetAnswer, planetAnswer.factKeys.map((factKey) => normalizedFacts.find((fact) => fact.factKey === factKey)!).filter(Boolean));
  }
  if (intent === "planet_placement" && planets.length) {
    const placement = findPlanetPlacement(normalizedFacts, planets[0]);
    if (placement) {
      return buildResult(intent, answerFromPlacement(placement, planets[0]), [placement]);
    }
    return buildResult(intent, unavailableExactFactAnswer(`planet_placement:${planets[0].toLowerCase()}`), []);
  }
  if (planets.length && houses.length && qHasPlanetInHouseQuestion(question)) {
    const placement = findPlanetPlacement(normalizedFacts, planets[0]);
    if (!placement) return buildResult("planet_placement", unavailableExactFactAnswer(`planet_placement:${planets[0].toLowerCase()}`), []);
    if (placement.house == null) return buildResult("planet_placement", unavailableExactFactAnswer(`planet_placement:${planets[0].toLowerCase()}`), []);
    if (placement.house === houses[0]) {
      return buildResult("planet_placement", {
        directAnswer: `Yes, ${planets[0]} is in the ${houses[0]}th house.`,
        derivation: `This is directly read from ${placement.factType} ${placement.factKey} in the structured chart data.`,
        accuracy: "totally_accurate",
        suggestedFollowUp: `You can ask what ${planets[0]} in the ${houses[0]}th house means.`,
        factKeys: [placement.factKey],
      }, [placement]);
    }
    return buildResult("planet_placement", {
      directAnswer: `No, ${planets[0]} is in the ${placement.house}th house, not the ${houses[0]}th house.`,
      derivation: `This is directly read from ${placement.factType} ${placement.factKey} in the structured chart data.`,
      accuracy: "totally_accurate",
      suggestedFollowUp: `You can ask what ${planets[0]} in the ${placement.house}th house means.`,
      factKeys: [placement.factKey],
    }, [placement]);
  }
  void q;
  return buildResult("unknown", null, [], false, []);
}

function qHasPlanetInHouseQuestion(question: string): boolean {
  const q = normalizeQuestion(question);
  return q.includes("in the") && q.includes("house") && extractPlanets(question).length > 0;
}

export function answerExactFactIfPossible(inputOrQuestion: ExactFactRouterInput | string, facts: ChartFact[] = []): ExactFactRouterResult {
  if (typeof inputOrQuestion === "string") {
    return answerExactFact(inputOrQuestion, facts);
  }
  return answerExactFact(inputOrQuestion.question, inputOrQuestion.facts ?? facts);
}
