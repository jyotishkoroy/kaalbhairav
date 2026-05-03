/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import fs from "node:fs";
import path from "node:path";
import { loadVedicQA } from "../../lib/astro/benchmark/vedicqa-loader.ts";
import { scoreAnswerMatch } from "../../lib/astro/benchmark/answer-match.ts";
import { answerCanonicalAstroQuestion } from "../../lib/astro/ask/answer-canonical-astro-question.ts";

const inputPath = process.env.VEDICQA_INPUT ?? "vedicQA.md";
const limit = Number(process.env.VEDICQA_LIMIT ?? "30");
const outputPath = process.env.VEDICQA_OUTPUT ?? "artifacts/vedicqa-benchmark-report.json";
const textOutput = process.env.VEDICQA_TEXT_OUTPUT ?? "artifacts/vedicqa-benchmark-summary.md";

const items = loadVedicQA(inputPath).slice(0, Number.isFinite(limit) ? limit : 30);
const results = [];
let passed = 0, exact = 0, normalized = 0, semantic = 0, blockedSafety = 0;
for (const item of items) {
  const actual = (await answerCanonicalAstroQuestion({ question: item.question, userId: "benchmark", profileId: "benchmark-profile", chartVersionId: "benchmark-chart", chartJson: { ascendant: { sign: "Leo" }, planets: { Moon: { sign: "Gemini", house: 11 }, Sun: { sign: "Taurus", house: 10 } }, nakshatra: "Mrigasira, Pada 4", currentDasha: "Jupiter Mahadasha", westernSunSign: "Gemini", public_facts: { lagna_sign: "Leo", nakshatra: "Mrigasira, Pada 4", lagna_lord: "Sun", rasi_lord: "Mercury", nakshatra_lord: "Mars", western_sun_sign: "Gemini" } } })).answer;
  const score = scoreAnswerMatch({ actual, expected: item.expectedAnswer });
  if (score.matched) passed += 1;
  if (score.exact) exact += 1;
  if (score.normalizedExact) normalized += 1;
  if (score.semanticScore >= 0.65) semantic += 1;
  if (/death|suicide|self-harm/i.test(item.question)) blockedSafety += 1;
  results.push({ id: item.id, question: item.question, expected: item.expectedAnswer, actual, score, category: item.category });
}
const summary = { total: items.length, passed, acceptedMatchRate: items.length ? passed / items.length : 0, exactMatchRate: items.length ? exact / items.length : 0, normalizedExactRate: items.length ? normalized / items.length : 0, semanticRate: items.length ? semantic / items.length : 0, blockedSafetyCount: blockedSafety, failedCount: items.length - passed };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({ summary, results }, null, 2));
fs.mkdirSync(path.dirname(textOutput), { recursive: true });
fs.writeFileSync(textOutput, `VedicQA benchmark\nTotal: ${summary.total}\nPassed: ${summary.passed}\nAccepted match rate: ${(summary.acceptedMatchRate * 100).toFixed(1)}%\nExact match rate: ${(summary.exactMatchRate * 100).toFixed(1)}%\nNormalized exact rate: ${(summary.normalizedExactRate * 100).toFixed(1)}%\nSemantic rate: ${(summary.semanticRate * 100).toFixed(1)}%\nBlocked safety count: ${summary.blockedSafetyCount}\nFailed count: ${summary.failedCount}\n`);
console.log(JSON.stringify(summary, null, 2));
