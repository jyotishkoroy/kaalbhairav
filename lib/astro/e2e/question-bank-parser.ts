/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type ParsedQuestionBankCase = {
  number: number;
  question: string;
  expectedAnswer: string;
  mode: "exact_fact" | "companion";
  rules: string[];
  rawRule: string;
};

export type ParsedQuestionBank = {
  sourcePath: string;
  cases: ParsedQuestionBankCase[];
  warnings: string[];
};

export function splitRules(rawRule: string): string[] {
  return rawRule
    .split("|")
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
}

type RawCase = {
  number: number;
  lines: string[];
};

function extractField(lines: string[], fieldName: string, nextFields: string[]): string {
  const prefix = `${fieldName}:`;
  const startIdx = lines.findIndex((l) => l.startsWith(prefix));
  if (startIdx === -1) return "";

  const firstLine = lines[startIdx].slice(prefix.length).trim();
  const collected: string[] = [firstLine];

  for (let i = startIdx + 1; i < lines.length; i++) {
    const isNextField = nextFields.some((f) => lines[i].startsWith(`${f}:`));
    if (isNextField) break;
    const trimmed = lines[i].trim();
    if (trimmed.length > 0) {
      collected.push(trimmed);
    }
  }

  return collected.join(" ").trim();
}

export function parseQuestionBankMarkdown(input: {
  sourcePath: string;
  content: string;
}): ParsedQuestionBank {
  const { sourcePath, content } = input;
  const warnings: string[] = [];
  const cases: ParsedQuestionBankCase[] = [];

  const lines = content.split("\n");

  // Find all case boundaries (## N. headings)
  const caseStarts: Array<{ lineIdx: number; number: number }> = [];
  const headingRegex = /^## (\d+)\./;
  for (let i = 0; i < lines.length; i++) {
    const match = headingRegex.exec(lines[i]);
    if (match) {
      caseStarts.push({ lineIdx: i, number: parseInt(match[1], 10) });
    }
  }

  // Extract each case's lines
  const rawCases: RawCase[] = [];
  for (let ci = 0; ci < caseStarts.length; ci++) {
    const start = caseStarts[ci].lineIdx + 1;
    const end = ci + 1 < caseStarts.length ? caseStarts[ci + 1].lineIdx : lines.length;
    rawCases.push({
      number: caseStarts[ci].number,
      lines: lines.slice(start, end),
    });
  }

  for (const raw of rawCases) {
    const caseLines = raw.lines;

    const questionText = extractField(caseLines, "Question", ["Answer", "Mode", "Rule"]);
    const answerText = extractField(caseLines, "Answer", ["Mode", "Rule"]);
    const modeText = extractField(caseLines, "Mode", ["Rule"]);
    const ruleText = extractField(caseLines, "Rule", []);

    if (!questionText) {
      warnings.push(`Case ${raw.number}: missing Question field — skipped`);
      continue;
    }
    if (!answerText) {
      warnings.push(`Case ${raw.number}: missing Answer field — skipped`);
      continue;
    }
    if (!modeText) {
      warnings.push(`Case ${raw.number}: missing Mode field — skipped`);
      continue;
    }

    const modeNorm = modeText.trim().toLowerCase();
    if (modeNorm !== "exact_fact" && modeNorm !== "companion") {
      warnings.push(`Case ${raw.number}: invalid Mode "${modeText}" (expected exact_fact|companion) — skipped`);
      continue;
    }

    const rawRule = ruleText.trim();
    const rules = splitRules(rawRule);

    cases.push({
      number: raw.number,
      question: questionText,
      expectedAnswer: answerText,
      mode: modeNorm as "exact_fact" | "companion",
      rules,
      rawRule,
    });
  }

  return { sourcePath, cases, warnings };
}
