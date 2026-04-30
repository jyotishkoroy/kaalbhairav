// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerValidationInput, ValidationIssue } from "../validation-types";
import { buildIssue, collectAllowedAnchorKeys, normalizeText, textIncludesLoose, uniqueStrings } from "./validator-utils";

function factByKey(input: AnswerValidationInput, key: string) {
  return (input.context.chartFacts ?? []).find((fact) => normalizeText(fact.factKey) === normalizeText(key));
}

function factByPlanet(input: AnswerValidationInput, planet: string) {
  return (input.context.chartFacts ?? []).find((fact) => normalizeText(fact.planet ?? fact.factKey ?? fact.factType) === normalizeText(planet));
}

function hasHouseFact(input: AnswerValidationInput, house: number) {
  return (input.context.chartFacts ?? []).find((fact) => Number(fact.house) === house || normalizeText(fact.factKey) === `house_${house}`);
}

function hasClaim(answer: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(answer));
}

function anchorSatisfied(answer: string, sectionText: string, anchor: string): boolean {
  return textIncludesLoose(answer, anchor) || textIncludesLoose(sectionText, anchor);
}

function anchorFactSatisfied(input: AnswerValidationInput, anchorKey: string, text: string): boolean {
  const normalized = normalizeText(anchorKey);
  const fact = (input.context.chartFacts ?? []).find((item) => normalizeText(item.factKey) === normalized || normalizeText(item.factType) === normalized);
  if (!fact) return false;
  return [
    fact.factValue,
    fact.sign,
    fact.planet,
    fact.house ? `house ${fact.house}` : "",
    fact.house ? `${fact.house}th house` : "",
    fact.planet && fact.sign ? `${fact.planet} ${fact.sign}` : "",
    fact.planet && fact.house ? `${fact.planet} house ${fact.house}` : "",
  ].map((snippet) => String(snippet)).filter(Boolean).some((snippet) => textIncludesLoose(text, snippet));
}

function hasFactValue(answer: string, values: string[]): boolean {
  return values.some((value) => value && textIncludesLoose(answer, value));
}

function matchingSectionText(input: AnswerValidationInput): string {
  return Object.values(input.json?.sections ?? {}).join(" \n ");
}

export function validateFactGrounding(input: AnswerValidationInput): {
  issues: ValidationIssue[];
  missingAnchors: string[];
  wrongFacts: string[];
} {
  const answer = input.answer ?? "";
  const sections = matchingSectionText(input);
  const combined = `${answer}\n${sections}`;
  const issues: ValidationIssue[] = [];
  const missingAnchors: string[] = [];
  const wrongFacts: string[] = [];
  const allowedKeys = new Set(collectAllowedAnchorKeys(input.contract, input.context, input.reasoningPath, input.timing));
  const usedAnchors = uniqueStrings([...(input.json?.usedAnchors ?? [])]);

  for (const anchor of input.contract.anchors ?? []) {
    if (!anchor.required) continue;
    const satisfied =
      anchorSatisfied(answer, sections, anchor.key) ||
      hasFactValue(combined, [anchor.label, ...(anchor.factKeys ?? []), ...(anchor.ruleKeys ?? []), anchor.description]) ||
      usedAnchors.some((used) => normalizeText(used) === normalizeText(anchor.key)) ||
      anchorFactSatisfied(input, anchor.key, combined);
    if (!satisfied) {
      missingAnchors.push(anchor.key);
      issues.push(buildIssue("missing_required_anchor", "error", `Missing required anchor: ${anchor.key}`, anchor.label));
    }
  }

  for (const used of usedAnchors) {
    const normalized = normalizeText(used).replace(/\s+/g, "_");
    if (!allowedKeys.has(normalized)) {
      issues.push(buildIssue("unknown_anchor", "error", `Unknown used anchor: ${used}`, used));
    }
  }

  const sunFact = factByPlanet(input, "sun");
  const moonFact = factByPlanet(input, "moon");
  const lagnaFact = factByKey(input, "lagna");
  const house10Fact = hasHouseFact(input, 10);
  const lord10Fact = factByKey(input, "lord_10");
  const venusFact = factByPlanet(input, "venus");
  const house7Fact = hasHouseFact(input, 7);

  if (hasClaim(answer, [/\bsun\b.*\baries\b/i, /\baries\b.*\bsun\b/i]) && /taurus/i.test(`${sunFact?.factValue ?? ""} ${sunFact?.sign ?? ""}`)) {
    wrongFacts.push("Sun in Aries");
    issues.push(buildIssue("wrong_chart_fact", "error", "Sun placement conflicts with supplied chart fact.", "Sun Taurus"));
  }
  if (hasClaim(answer, [/\bmoon\b.*\bcancer\b/i, /\bcancer\b.*\bmoon\b/i, /\bmoon sign is cancer\b/i]) && /gemini/i.test(`${moonFact?.factValue ?? ""} ${moonFact?.sign ?? ""}`)) {
    wrongFacts.push("Moon in Cancer");
    issues.push(buildIssue("wrong_chart_fact", "error", "Moon sign conflicts with supplied chart fact.", "Moon Gemini"));
  }
  if (hasClaim(answer, [/\blagna\b.*\bscorpio\b/i, /\bascendant\b.*\bscorpio\b/i, /\bscorpio\b.*\blagna\b/i, /\bscorpio\b.*\bascendant\b/i]) && /leo/i.test(`${lagnaFact?.factValue ?? ""} ${lagnaFact?.sign ?? ""}`)) {
    wrongFacts.push("Scorpio Lagna");
    issues.push(buildIssue("wrong_chart_fact", "error", "Lagna conflicts with supplied chart fact.", "Lagna Leo"));
  }
  if (hasClaim(answer, [/\b10th house\b.*\baries\b/i, /\bhouse 10\b.*\baries\b/i, /\baries\b.*\b10th house\b/i, /\baries\b.*\bhouse 10\b/i]) && /taurus/i.test(`${house10Fact?.factValue ?? ""} ${house10Fact?.sign ?? ""}`)) {
    wrongFacts.push("10th house Aries");
    issues.push(buildIssue("wrong_chart_fact", "error", "10th house sign conflicts with supplied chart fact.", "10th house Taurus"));
  }
  if (hasClaim(answer, [/\b10th lord\b.*\bmars\b/i, /\blord 10\b.*\bmars\b/i, /\bmars\b.*\b10th lord\b/i, /\bmars\b.*\blord 10\b/i]) && /venus/i.test(`${lord10Fact?.factValue ?? ""} ${lord10Fact?.factType ?? ""}`)) {
    wrongFacts.push("10th lord Mars");
    issues.push(buildIssue("wrong_chart_fact", "error", "10th lord conflicts with supplied chart fact.", "10th lord Venus"));
  }
  if (hasClaim(answer, [/\bvenus\b.*\b(in|in the|placed in|located in)\b.*\b10th\b/i, /\bvenus\b.*\bhouse 10\b/i]) && venusFact && Number(venusFact.house) === 12) {
    wrongFacts.push("Venus in 10th");
    issues.push(buildIssue("wrong_chart_fact", "error", "Venus house placement conflicts with supplied chart fact.", "Venus house 12"));
  }

  const rahuMentioned = /rahu/i.test(answer);
  const rahuIn7th = rahuMentioned && /\b(7th house|house 7|7th)\b/i.test(answer);
  const contextHasRahu7 = Boolean(house7Fact && normalizeText(house7Fact.factType) === "planet_placement");
  const chartFactsSupplyRahu = (input.context.chartFacts ?? []).some((fact) => normalizeText(fact.planet ?? fact.factKey ?? fact.factType) === "rahu");
  if (rahuMentioned && rahuIn7th && !contextHasRahu7 && !chartFactsSupplyRahu) {
      wrongFacts.push("Rahu placement");
      issues.push(buildIssue("invented_chart_fact", "error", "Rahu placement is invented or unsupported.", "Rahu"));
  }

  if (!input.contract.anchors?.length && !input.context.chartFacts?.length) {
    issues.push(buildIssue("missing_required_anchor", "error", "No grounded anchors are available.", "missing_context"));
    missingAnchors.push("missing_context");
  }

  return {
    issues,
    missingAnchors: uniqueStrings(missingAnchors),
    wrongFacts: uniqueStrings(wrongFacts),
  };
}
