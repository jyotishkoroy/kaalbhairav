/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

const STOPWORDS = new Set(["a","an","the","is","are","am","to","of","and","or","in","on","for","with","your","my","this","that","it","be","as","by","at","from","if","when","then","but","do","does","did","will","would","can","could","should"]);
const KEYWORDS = new Set(["lagna","ascendant","moon","sun","rahu","ketu","saturn","jupiter","venus","mars","mercury","house","dasha","transit","marriage","career","finance","remedy","mantra","gemstone","chart","sign","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces","aries","taurus","gemini","cancer"]);

export type AnswerMatchResult = { exact: boolean; normalizedExact: boolean; semanticScore: number; keywordScore: number; matched: boolean; reasons: string[] };
export function normalizeAnswerForMatch(answer: string): string { return answer.toLowerCase().replace(/^aadesh:\s*/,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim(); }
function tokens(text: string): string[] { return normalizeAnswerForMatch(text).split(" ").filter((t) => t && !STOPWORDS.has(t)); }
function ngrams(items: string[], n: number): string[] { const out: string[] = []; for (let i=0;i<=items.length-n;i+=1) out.push(items.slice(i,i+n).join(" ")); return out; }
function containsLeak(text: string): boolean { return /\b(profile_id|chart_version_id|user_id|fact)\b/i.test(text) || /\b[a-f0-9]{8,}\b/i.test(text); }
export function detectDeterministicContradiction(input: { expected: string; actual: string }): { contradicted: boolean; reasons: string[] } {
  const expected = normalizeAnswerForMatch(input.expected);
  const actual = normalizeAnswerForMatch(input.actual);
  const reasons: string[] = [];
  const pairs = [
    { key: "lagna", expected: [/lagna is leo/, /ascendant is leo/, /leo as the lagna/], actual: [/lagna is virgo/, /ascendant virgo/, /your lagna is virgo/] },
    { key: "moon", expected: [/moon.*gemini/, /rasi.*gemini/], actual: [/moon.*virgo/, /rasi.*virgo/] },
    { key: "sun", expected: [/sun.*taurus/], actual: [/sun.*virgo/, /sun.*gemini/] },
    { key: "nakshatra", expected: [/mrigasira/, /mrigashira/], actual: [/unavailable/, /not available/, /different nakshatra/, /unknown/] },
    { key: "mahadasha", expected: [/jupiter mahadasha/], actual: [/unavailable/, /not available/, /unknown/] },
    { key: "antardasha", expected: [/jupiter ketu/, /jupiter venus/], actual: [/unavailable/, /not available/, /unknown/] },
  ];
  for (const pair of pairs) {
    if (pair.expected.some((re) => re.test(expected)) && pair.actual.some((re) => re.test(actual))) reasons.push(`deterministic_fact_contradiction:${pair.key}`);
  }
  if (/not virgo/.test(expected) && /virgo/.test(actual)) reasons.push("deterministic_fact_contradiction:lagna");
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
  const phraseOverlap = [...new Set([...ngrams(expectedTokens,2), ...ngrams(expectedTokens,3)])].filter((ng) => ngrams(actualTokens,2).includes(ng) || ngrams(actualTokens,3).includes(ng));
  let semanticScore = Math.min(1, (overlap.length / Math.max(1, expectedTokens.length)) * 0.45 + (keywordOverlap.length / Math.max(1, Array.from(new Set(expectedTokens.filter((t) => KEYWORDS.has(t)))).length || 1)) * 0.4 + (phraseOverlap.length / Math.max(1, Math.max(1, expectedTokens.length - 1))) * 0.15);
  if (actualTokens.includes("lagna") && actualTokens.some((t) => KEYWORDS.has(t) && expectedTokens.includes(t))) semanticScore = Math.min(1, semanticScore + 0.1);
  const keywordScore = keywordOverlap.length / Math.max(1, Array.from(new Set(expectedTokens.filter((t) => KEYWORDS.has(t)))).length || 1);
  const leak = containsLeak(input.actual);
  const contradiction = detectDeterministicContradiction({ expected: input.expected, actual: input.actual });
  if (contradiction.contradicted) semanticScore = Math.min(semanticScore, 0.05);
  const matched = !leak && !contradiction.contradicted && (exact || normalizedExact || semanticScore >= 0.65);
  const reasons = [exact ? "exact" : "", normalizedExact ? "normalizedExact" : "", leak ? "leak" : "", contradiction.reasons.join("|"), semanticScore >= 0.65 ? "semantic" : ""].filter(Boolean).flatMap((r) => r.split("|"));
  if (input.mode === "strict") return { exact, normalizedExact, semanticScore, keywordScore, matched: exact && !leak, reasons };
  if (input.mode === "normalized") return { exact, normalizedExact, semanticScore, keywordScore, matched: (exact || normalizedExact) && !leak, reasons };
  return { exact, normalizedExact, semanticScore, keywordScore, matched, reasons };
}
