/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type {
  ChartEvidenceDomain,
  ChartEvidenceFactorPolarity,
  ChartEvidenceSource,
  ConsultationChartFactSet,
  ConsultationConfidence,
} from "./consultation-types";

export type ChartEvidenceInputFact = {
  readonly key: string;
  readonly label?: string;
  readonly value?: string;
  readonly text?: string;
  readonly source?: ChartEvidenceSource | string;
  readonly confidence?: ConsultationConfidence;
  readonly polarity?: ChartEvidenceFactorPolarity;
  readonly domains?: readonly ChartEvidenceDomain[];
  readonly tags?: readonly string[];
  readonly birthTimeSensitive?: boolean;
};

export type ChartEvidenceFactSource = readonly ChartEvidenceInputFact[] | Record<string, unknown> | undefined;

export type ChartEvidenceInput = {
  readonly domain: ChartEvidenceDomain;
  readonly chartFacts?: ConsultationChartFactSet;
  readonly chart?: ChartEvidenceFactSource;
  readonly dasha?: ChartEvidenceFactSource;
  readonly transits?: ChartEvidenceFactSource;
};

export type ChartEvidenceFactor = {
  readonly factor: string;
  readonly source: ChartEvidenceSource;
  readonly confidence: ConsultationConfidence;
  readonly interpretationHint: string;
};

export type ChartEvidenceNeutralFact = {
  readonly fact: string;
  readonly source: string;
};

export type ChartEvidence = {
  readonly domain: ChartEvidenceDomain;
  readonly supportiveFactors: readonly ChartEvidenceFactor[];
  readonly challengingFactors: readonly ChartEvidenceFactor[];
  readonly neutralFacts: readonly ChartEvidenceNeutralFact[];
  readonly birthTimeSensitivity: ConsultationConfidence;
};

type NormalizedEvidenceFact = ChartEvidenceInputFact & {
  readonly source: ChartEvidenceSource;
  readonly polarity: ChartEvidenceFactorPolarity;
  readonly confidence: ConsultationConfidence;
  readonly text: string;
};

const FORBIDDEN_GENERATED_WORDS = [
  "guarantee",
  "definitely",
  "will happen",
  "death",
  "cure",
  "wear blue sapphire",
  "perform puja",
];

export function buildChartEvidence(input: ChartEvidenceInput): ChartEvidence {
  const facts = normalizeEvidenceFacts(input);
  const relevantFacts = facts.filter((fact) => isRelevantToDomain(fact, input.domain));

  const supportiveFactors: ChartEvidenceFactor[] = [];
  const challengingFactors: ChartEvidenceFactor[] = [];
  const neutralFacts: ChartEvidenceNeutralFact[] = [];
  const seen = new Set<string>();

  for (const fact of relevantFacts) {
    const polarity = classifyPolarity(fact, input.domain);
    const factorText = buildFactorText(fact);
    const dedupeKey = `${factorText}|${fact.source}|${polarity}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    if (polarity === "neutral") {
      neutralFacts.push({ fact: factorText, source: fact.source });
      continue;
    }

    const factor = {
      factor: factorText,
      source: fact.source,
      confidence: fact.confidence,
      interpretationHint: buildInterpretationHint(fact, input.domain, polarity),
    };

    if (polarity === "supportive") {
      supportiveFactors.push(factor);
    } else {
      challengingFactors.push(factor);
    }
  }

  return {
    domain: input.domain,
    supportiveFactors,
    challengingFactors,
    neutralFacts,
    birthTimeSensitivity: inferBirthTimeSensitivity(input.domain, relevantFacts),
  };
}

function normalizeEvidenceFacts(input: ChartEvidenceInput): NormalizedEvidenceFact[] {
  const collected: NormalizedEvidenceFact[] = [];

  for (const fact of input.chartFacts?.facts ?? []) {
    collected.push({
      key: fact.key,
      label: fact.label,
      value: fact.value,
      source: inferSourceFromKeyLabel(`${fact.key} ${fact.label ?? ""} ${fact.value ?? ""}`),
      confidence: fact.confidence ?? "medium",
      polarity: "neutral",
      domains: undefined,
      tags: undefined,
      birthTimeSensitive: undefined,
      text: sanitizeEvidenceText(`${fact.label ?? fact.key} ${fact.value ?? ""}`),
    });
  }

  collected.push(...normalizeFactSource(input.chart, "chart"));
  collected.push(...normalizeFactSource(input.dasha, "dasha"));
  collected.push(...normalizeFactSource(input.transits, "transits"));

  return dedupeNormalizedFacts(collected);
}

function normalizeFactSource(source: ChartEvidenceFactSource, fallbackName: string): NormalizedEvidenceFact[] {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.flatMap((fact) => normalizeInputFact(fact));
  }
  if (!isPlainObject(source)) return [];

  const output: NormalizedEvidenceFact[] = [];
  for (const [key, value] of Object.entries(source)) {
    const fact = normalizeObjectEntry(key, value, fallbackName);
    if (fact) output.push(fact);
  }
  return output;
}

function normalizeInputFact(fact: ChartEvidenceInputFact | null | undefined): NormalizedEvidenceFact[] {
  if (!fact || typeof fact !== "object") return [];
  const key = sanitizeEvidenceText(fact.key);
  const label = sanitizeEvidenceText(fact.label ?? "");
  const value = sanitizeEvidenceText(fact.value ?? "");
  const text = sanitizeEvidenceText(fact.text ?? [label, value].filter(Boolean).join(" "));
  if (!key && !label && !value && !text) return [];
  const source = normalizeSource(fact.source, `${key} ${label} ${value} ${text}`);
  const confidence = fact.confidence ?? "medium";
  const polarity = fact.polarity ?? "neutral";
  return [
    {
      key,
      label,
      value,
      text: text || value || label || key,
      source,
      confidence,
      polarity,
      domains: fact.domains,
      tags: fact.tags,
      birthTimeSensitive: fact.birthTimeSensitive,
    },
  ];
}

function normalizeObjectEntry(key: string, value: unknown, fallbackName: string): NormalizedEvidenceFact | undefined {
  const normalizedKey = sanitizeEvidenceText(key);
  if (!normalizedKey) return undefined;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = sanitizeEvidenceText(String(value));
    if (!text) return undefined;
    return {
      key: normalizedKey,
      label: normalizedKey,
      value: text,
      text,
      source: inferSourceFromKeyLabel(`${normalizedKey} ${text} ${fallbackName}`),
      confidence: "medium",
      polarity: "neutral",
      domains: undefined,
      tags: undefined,
      birthTimeSensitive: undefined,
    };
  }

  if (!isPlainObject(value)) return undefined;

  const nestedKey = sanitizeEvidenceText(asText(value.key) ?? normalizedKey);
  const label = sanitizeEvidenceText(asText(value.label) ?? normalizedKey);
  const nestedValue = sanitizeEvidenceText(asText(value.value) ?? asText(value.text) ?? "");
  const text = sanitizeEvidenceText(asText(value.text) ?? [label, nestedValue].filter(Boolean).join(" "));
  if (!nestedKey && !label && !nestedValue && !text) return undefined;

  return {
    key: nestedKey || normalizedKey,
    label: label || normalizedKey,
    value: nestedValue || text || undefined,
    text: text || nestedValue || label || nestedKey || normalizedKey,
    source: normalizeSource(asText(value.source), `${normalizedKey} ${label} ${nestedValue} ${text}`),
    confidence: normalizeConfidence(asText(value.confidence)),
    polarity: normalizePolarity(asText(value.polarity)),
    domains: normalizeDomains(value.domains),
    tags: normalizeTags(value.tags),
    birthTimeSensitive: asBoolean(value.birthTimeSensitive),
  };
}

function dedupeNormalizedFacts(facts: NormalizedEvidenceFact[]): NormalizedEvidenceFact[] {
  const seen = new Set<string>();
  const output: NormalizedEvidenceFact[] = [];

  for (const fact of facts) {
    const text = fact.text || buildFactorText(fact);
    const key = `${text.toLowerCase()}|${fact.source}|${fact.polarity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...fact, text });
  }

  return output;
}

function isRelevantToDomain(fact: NormalizedEvidenceFact, domain: ChartEvidenceDomain): boolean {
  if (domain === "general") return Boolean(fact.text);
  if (fact.domains?.includes(domain)) return true;
  if (fact.tags?.some((tag) => normalizeText(tag).includes(domain))) return true;

  const text = normalizeText([fact.key, fact.label, fact.value, fact.text].filter(Boolean).join(" "));
  return DOMAIN_KEYWORDS[domain].some((keyword) => text.includes(keyword));
}

function classifyPolarity(fact: NormalizedEvidenceFact, domain: ChartEvidenceDomain): ChartEvidenceFactorPolarity {
  if (fact.polarity && fact.polarity !== "neutral") return fact.polarity;
  const text = normalizeText([fact.key, fact.label, fact.value, fact.text].filter(Boolean).join(" "));

  const supportive = countKeywordHits(text, SUPPORTIVE_WORDS);
  const challenging = countKeywordHits(text, CHALLENGING_WORDS);

  if (supportive === 0 && challenging === 0) return "neutral";
  if (supportive > challenging) return "supportive";
  if (challenging > supportive) return domain === "health" ? "challenging" : "challenging";
  return "neutral";
}

function inferSourceFromKeyLabel(text: string): ChartEvidenceSource {
  const normalized = normalizeText(text);
  if (/(navamsa|\bd9\b|darakaraka)/.test(normalized)) return "navamsa";
  if (/(dasha|mahadasha|antardasha|pratyantardasha)/.test(normalized)) return "dasha";
  if (/(transit|gochar|sade sati|sadesati|ashtama shani|jupiter transit|saturn transit|rahu transit|ketu transit)/.test(normalized)) {
    return "transit";
  }
  if (/(derived|yoga|combustion|retrogression|dignity|aspect|lordship)/.test(normalized)) return "derived_rule";
  return "rashi";
}

function normalizeSource(source: unknown, fallbackText: string): ChartEvidenceSource {
  if (source === "rashi" || source === "navamsa" || source === "dasha" || source === "transit" || source === "derived_rule") {
    return source;
  }
  if (typeof source === "string" && source.trim()) {
    return inferSourceFromKeyLabel(`${source} ${fallbackText}`);
  }
  return inferSourceFromKeyLabel(fallbackText);
}

function buildInterpretationHint(
  fact: NormalizedEvidenceFact,
  domain: ChartEvidenceDomain,
  polarity: ChartEvidenceFactorPolarity,
): string {
  const domainHints: Record<ChartEvidenceDomain, Record<ChartEvidenceFactorPolarity, string>> = {
    career: {
      supportive:
        "This supplied career indicator can support professional growth, visibility, responsibility, or work stability depending on the wider chart.",
      challenging:
        "This supplied career indicator can point to pressure, delay, authority friction, or the need for structure in professional matters.",
      neutral: "This supplied career fact is relevant to career interpretation but needs synthesis with other evidence.",
    },
    marriage: {
      supportive:
        "This supplied relationship indicator can support partnership clarity, commitment potential, or relational support depending on the wider chart.",
      challenging:
        "This supplied relationship indicator can point to delay, seriousness, pressure, distance, or the need for careful commitment.",
      neutral: "This supplied relationship fact is relevant but should not be interpreted alone.",
    },
    relationship: {
      supportive:
        "This supplied relationship indicator can support partnership clarity, mutual effort, or relational support depending on the wider chart.",
      challenging:
        "This supplied relationship indicator can point to pressure, distance, uncertainty, or the need for careful relational boundaries.",
      neutral: "This supplied relationship fact is relevant but should not be interpreted alone.",
    },
    money: {
      supportive:
        "This supplied money indicator can support earning, savings, gains, or resource development depending on the wider chart.",
      challenging:
        "This supplied money indicator can point to financial pressure, leakage, volatility, or the need for careful planning.",
      neutral: "This supplied money fact is relevant but needs synthesis with other evidence.",
    },
    health: {
      supportive:
        "This supplied health-sensitive indicator is reflective astrological context only, not a medical assessment.",
      challenging:
        "This supplied health-sensitive indicator is reflective astrological context only and must not be treated as a medical assessment.",
      neutral:
        "This supplied health-sensitive fact is reflective only and requires non-astrological medical support for real health concerns.",
    },
    family: {
      supportive:
        "This supplied family indicator can support home, family responsibility, or emotional grounding depending on the wider chart.",
      challenging:
        "This supplied family indicator can point to pressure around home, parents, responsibility, or emotional security.",
      neutral: "This supplied family fact is relevant but should not be interpreted alone.",
    },
    general: {
      supportive: "This supplied chart fact may be supportive, but it requires domain-specific synthesis before interpretation.",
      challenging: "This supplied chart fact may indicate pressure or complexity, but it requires domain-specific synthesis before interpretation.",
      neutral: "This supplied chart fact is available as neutral evidence only.",
    },
  };

  const hint = domainHints[domain][polarity];
  return ensureNoForbiddenGeneratedClaims(hint);
}

function inferBirthTimeSensitivity(domain: ChartEvidenceDomain, relevantFacts: readonly NormalizedEvidenceFact[]): ConsultationConfidence {
  if (relevantFacts.length === 0) return "low";
  if (relevantFacts.some((fact) => fact.birthTimeSensitive)) return "high";

  const text = relevantFacts.map((fact) => [fact.key, fact.label, fact.value, fact.text].filter(Boolean).join(" ")).join(" ").toLowerCase();
  if (/(divisional|navamsa|\bd9\b|\bd10\b|exact degree|\bdegree\b|lagna degree|house cusp|\bcusp\b|pratyantardasha|darakaraka)/.test(text)) {
    return "high";
  }
  if (domain === "marriage" || domain === "relationship") {
    if (/(navamsa|\bd9\b|darakaraka)/.test(text)) return "high";
  }
  if (domain === "career" && /(d10|dashamsha)/.test(text)) return "high";
  if (/(house lord|10th house|7th house|2nd house|11th house|6th house|8th house|12th house)/.test(text)) return "medium";
  return "low";
}

function buildFactorText(fact: NormalizedEvidenceFact): string {
  return sanitizeEvidenceText(fact.text || [fact.label, fact.value, fact.key].filter(Boolean).join(" "));
}

function sanitizeEvidenceText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\s*\n\s*/g, " ").trim();
}

function ensureNoForbiddenGeneratedClaims(text: string): string {
  const safeText = sanitizeEvidenceText(text);
  if (FORBIDDEN_GENERATED_WORDS.some((word) => safeText.toLowerCase().includes(word))) {
    return `${safeText} This is supplied evidence, not a guarantee.`;
  }
  return safeText;
}

function normalizeDomains(value: unknown): readonly ChartEvidenceDomain[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const domains = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is ChartEvidenceDomain => isChartEvidenceDomain(item));
  return domains.length > 0 ? domains : undefined;
}

function normalizeTags(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value.map((item) => (typeof item === "string" ? sanitizeEvidenceText(item).toLowerCase() : "")).filter(Boolean);
  return tags.length > 0 ? Array.from(new Set(tags)) : undefined;
}

function normalizePolarity(value: unknown): ChartEvidenceFactorPolarity {
  if (value === "supportive" || value === "challenging" || value === "neutral") return value;
  return "neutral";
}

function normalizeConfidence(value: unknown): ConsultationConfidence {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const text = sanitizeEvidenceText(value);
    return text || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChartEvidenceDomain(value: string): value is ChartEvidenceDomain {
  return value === "career" || value === "marriage" || value === "relationship" || value === "money" || value === "health" || value === "family" || value === "general";
}

function normalizeText(value: string): string {
  return sanitizeEvidenceText(value).toLowerCase();
}

function countKeywordHits(text: string, keywords: readonly string[]): number {
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) hits += 1;
  }
  return hits;
}

const SUPPORTIVE_WORDS = [
  "strong",
  "exalted",
  "own sign",
  "moolatrikona",
  "benefic",
  "supportive",
  "supports",
  "well placed",
  "favorable",
  "good dignity",
  "growth",
  "gains",
  "supported",
  "aspect from benefic",
  "connected to",
  "active support",
  "promising",
];

const CHALLENGING_WORDS = [
  "weak",
  "debilitated",
  "combust",
  "afflicted",
  "malefic pressure",
  "pressure",
  "delayed",
  "delay",
  "blocked",
  "obstruction",
  "challenging",
  "difficult",
  "retrograde",
  "enemy sign",
  "dusthana",
  "rahu pressure",
  "ketu separation",
  "saturn pressure",
  "mars pressure",
];

const DOMAIN_KEYWORDS: Record<ChartEvidenceDomain, readonly string[]> = {
  career: ["career", "10th", "tenth", "10th house", "tenth house", "10th lord", "tenth lord", "6th", "sixth", "6th house", "2nd", "second", "11th", "eleventh", "sun", "saturn", "mercury", "d10", "dashamsha", "profession", "job", "promotion", "authority", "workplace", "service", "income", "gains"],
  marriage: ["marriage", "spouse", "7th", "seventh", "7th house", "seventh house", "7th lord", "seventh lord", "venus", "jupiter", "navamsa", "d9", "darakaraka", "rahu", "ketu", "saturn influence", "proposal", "partnership", "commitment"],
  relationship: ["relationship", "partner", "partnership", "love", "romance", "dating", "7th", "seventh", "venus", "moon", "jupiter", "navamsa", "d9", "darakaraka", "rahu", "ketu", "saturn", "commitment"],
  money: ["money", "finance", "wealth", "savings", "income", "2nd", "second", "2nd house", "11th", "eleventh", "11th house", "5th", "fifth", "speculation", "8th", "eighth", "joint finance", "venus", "jupiter", "mercury", "gains", "assets"],
  health: ["health", "stress", "illness", "disease", "6th", "sixth", "6th house", "8th", "eighth", "8th house", "12th", "twelfth", "12th house", "moon", "lagna", "ascendant", "lagna lord", "saturn", "mars", "rahu", "pressure", "vitality"],
  family: ["family", "home", "parents", "mother", "father", "4th", "fourth", "4th house", "moon", "saturn", "2nd", "second", "household", "lineage", "duty", "responsibility"],
  general: [""],
};
