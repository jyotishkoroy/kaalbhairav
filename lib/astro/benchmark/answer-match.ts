/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

const STOPWORDS = new Set(["a","an","the","is","are","am","to","of","and","or","in","on","for","with","your","my","this","that","it","be","as","by","at","from","if","when","then","but","do","does","did","will","would","can","could","should"]);
const KEYWORDS = new Set(["lagna","ascendant","moon","sun","rahu","ketu","saturn","jupiter","venus","mars","mercury","house","dasha","transit","marriage","career","finance","remedy","mantra","gemstone","chart","sign","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces","aries","taurus","gemini","cancer"]);

const UUID_RE = /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i;
const LEAK_PATTERNS = [
  /profile_id\s*[:=]/i,
  /chart_version_id\s*[:=]/i,
  /user_id\s*[:=]/i,
  /\bfact:\s/i,
  /\bchart_fact:\s/i,
  /\bprovider\s*[:=]/i,
  /\bmodel\s*[:=]/i,
  /\bserver\s*[:=]/i,
  /\bmetadata\s*[:=]/i,
  /\bdebugTrace\b/i,
  /Retrieval cue:/i,
];

export type AnswerMatchResult = {
  matched: boolean;
  exact: boolean;
  normalizedExact: boolean;
  semanticScore: number;
  keywordScore: number;
  // Extended multi-dimensional fields
  exactMatch: boolean;
  normalizedExactMatch: boolean;
  semanticMatch: boolean;
  deterministicFactAccuracy: boolean;
  wrongChartFact: boolean;
  hasLeak: boolean;
  reasons: string[];
  score: number;
};

export function normalizeAnswerForMatch(answer: string): string {
  return answer.toLowerCase().replace(/^aadesh:\s*/, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text: string): string[] { return normalizeAnswerForMatch(text).split(" ").filter((t) => t && !STOPWORDS.has(t)); }

function containsLeak(text: string): boolean {
  if (UUID_RE.test(text)) return true;
  return LEAK_PATTERNS.some((re) => re.test(text));
}

function checkDeterministicFactAccuracy(expected: string, actual: string): boolean {
  const exp = expected.toLowerCase();
  const act = actual.toLowerCase();

  // Only check when expected mentions specific facts
  if (/leo lagna/.test(exp) && !/leo lagna/.test(act)) return false;
  if (/gemini moon/.test(exp) && !/gemini moon/.test(act)) return false;
  if (/taurus sun in the 10th/.test(exp) && !/taurus sun in the 10th/.test(act)) return false;
  if (/jupiter mahadasha/.test(exp) && !/jupiter mahadasha/.test(act)) return false;
  if (/jupiter.?ketu/.test(exp) && !/jupiter.?ketu|ketu antardasha/i.test(act)) return false;
  if (/mrigasira|mrigashira/.test(exp) && !/mrigasira|mrigashira/i.test(act)) return false;
  return true;
}

function checkWrongChartFact(actual: string): boolean {
  const act = actual.toLowerCase();
  if (/virgo lagna/.test(act)) return true;
  if (/gemini moon in the 10th/.test(act)) return true;
  if (/taurus sun in the 9th/.test(act)) return true;
  // Saturn Mahadasha is wrong when context expects Jupiter — only flag if detected without Jupiter Mahadasha
  if (/saturn mahadasha/.test(act) && !/jupiter mahadasha/.test(act)) return true;
  return false;
}

export function detectDeterministicContradiction(input: { expected: string; actual: string }): { contradicted: boolean; reasons: string[] } {
  const expected = normalizeAnswerForMatch(input.expected);
  const actual = normalizeAnswerForMatch(input.actual);
  const reasons: string[] = [];
  const pairs = [
    { expected: [/lagna is leo/, /leo lagna/], actual: [/lagna is virgo/, /virgo lagna/] , reason: "lagna" },
    { expected: [/moon sign.*gemini/, /gemini moon.*11/, /moon.*gemini.*11/], actual: [/moon.*10/, /gemini moon.*10/] , reason: "moon" },
    { expected: [/sun.*taurus.*10/], actual: [/sun.*9/, /taurus.*9/] , reason: "sun" },
    { expected: [/mrigasira/, /mrigashira/], actual: [/unavailable/, /not available/, /unknown/] , reason: "nakshatra" },
    { expected: [/jupiter mahadasha/], actual: [/unavailable/, /not available/, /unknown/] , reason: "mahadasha" },
    { expected: [/jupiter ketu/, /jupiter venus/], actual: [/unavailable/, /not available/, /unknown/] , reason: "antardasha" },
    { expected: [/no mangal dosha/, /mangal dosha not present/], actual: [/manglik/, /mangal dosha present/] , reason: "mangal_dosha" },
    { expected: [/no kalsarpa/, /kalsarpa yoga not present/], actual: [/kalsarpa yoga present/, /kala sarpa present/] , reason: "kalsarpa" },
  ];
  for (const pair of pairs) {
    if (pair.expected.some((re) => re.test(expected)) && pair.actual.some((re) => re.test(actual))) reasons.push(`deterministic_fact_contradiction:${pair.reason}`);
  }
  return { contradicted: reasons.length > 0, reasons };
}

export function scoreAnswerMatch(input: { actual: string; expected: string; mode?: "strict" | "normalized" | "semantic-lite" }): AnswerMatchResult {
  const exact = input.actual.trim() === input.expected.trim();
  const normalizedActual = normalizeAnswerForMatch(input.actual);
  const normalizedExpected = normalizeAnswerForMatch(input.expected);
  const normalizedExact = normalizedActual === normalizedExpected;
  const actualTokens = tokens(input.actual);
  const expectedTokens = tokens(input.expected);
  const overlap = expectedTokens.filter((t) => actualTokens.includes(t));
  const keywordOverlap = expectedTokens.filter((t) => KEYWORDS.has(t)).filter((t) => actualTokens.includes(t));
  const semanticScore = Math.min(1, (overlap.length / Math.max(1, expectedTokens.length)) * 0.6 + (keywordOverlap.length / Math.max(1, Array.from(new Set(expectedTokens.filter((t) => KEYWORDS.has(t)))).length || 1)) * 0.4);

  const hasLeak = containsLeak(input.actual);
  const wrongChartFact = checkWrongChartFact(input.actual);
  const deterministicFactAccuracy = checkDeterministicFactAccuracy(input.expected, input.actual);
  const semanticMatch = semanticScore >= 0.4;
  const contradiction = detectDeterministicContradiction({ expected: input.expected, actual: input.actual });

  // Multi-dimensional matched determination
  const strictPasses = exact || normalizedExact || semanticScore >= 0.65;
  const matched = !hasLeak && !wrongChartFact && !contradiction.contradicted &&
    (
      (deterministicFactAccuracy && (semanticMatch || normalizedExact || exact)) ||
      (semanticScore > 0.6)
    );

  const reasons = [
    exact ? "exact" : "",
    normalizedExact ? "normalizedExact" : "",
    hasLeak ? "leak" : "",
    wrongChartFact ? "wrongChartFact" : "",
    !deterministicFactAccuracy ? "deterministicFactMismatch" : "",
    contradiction.reasons.join("|"),
    semanticScore >= 0.65 ? "semantic" : "",
  ].filter(Boolean).flatMap((r) => r.split("|")).filter(Boolean);

  const result: AnswerMatchResult = {
    matched,
    exact,
    normalizedExact,
    semanticScore,
    keywordScore: keywordOverlap.length,
    // Extended fields
    exactMatch: exact,
    normalizedExactMatch: normalizedExact,
    semanticMatch,
    deterministicFactAccuracy,
    wrongChartFact,
    hasLeak,
    reasons,
    score: semanticScore,
  };

  if (input.mode === "strict") return { ...result, matched: exact && !hasLeak };
  if (input.mode === "normalized") return { ...result, matched: (exact || normalizedExact) && !hasLeak };
  return result;
}

export function aggregateMatchStats(results: AnswerMatchResult[]): {
  total: number;
  passed: number;
  acceptedMatchRate: number;
  exactMatchRate: number;
  normalizedExactRate: number;
  semanticRate: number;
  deterministicFactAccuracyRate: number;
  wrongChartFactRate: number;
  leakRate: number;
  uniqueAnswerCount: number;
  topAnswerFrequency: number;
} {
  const total = results.length;
  if (total === 0) return { total: 0, passed: 0, acceptedMatchRate: 0, exactMatchRate: 0, normalizedExactRate: 0, semanticRate: 0, deterministicFactAccuracyRate: 0, wrongChartFactRate: 0, leakRate: 0, uniqueAnswerCount: 0, topAnswerFrequency: 0 };
  const passed = results.filter((r) => r.matched).length;
  const exactCount = results.filter((r) => r.exactMatch).length;
  const normalizedExactCount = results.filter((r) => r.normalizedExactMatch).length;
  const semanticCount = results.filter((r) => r.semanticMatch).length;
  const deterministicCount = results.filter((r) => r.deterministicFactAccuracy).length;
  const wrongChartCount = results.filter((r) => r.wrongChartFact).length;
  const leakCount = results.filter((r) => r.hasLeak).length;
  // uniqueAnswerCount and topAnswerFrequency based on score buckets
  const scoreBuckets = new Map<string, number>();
  for (const r of results) {
    const bucket = r.score.toFixed(2);
    scoreBuckets.set(bucket, (scoreBuckets.get(bucket) ?? 0) + 1);
  }
  const uniqueAnswerCount = scoreBuckets.size;
  const topAnswerFrequency = Math.max(...Array.from(scoreBuckets.values())) / total;
  return {
    total,
    passed,
    acceptedMatchRate: passed / total,
    exactMatchRate: exactCount / total,
    normalizedExactRate: normalizedExactCount / total,
    semanticRate: semanticCount / total,
    deterministicFactAccuracyRate: deterministicCount / total,
    wrongChartFactRate: wrongChartCount / total,
    leakRate: leakCount / total,
    uniqueAnswerCount,
    topAnswerFrequency,
  };
}
