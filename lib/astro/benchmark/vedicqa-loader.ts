/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import fs from "node:fs";
import crypto from "node:crypto";

export type VedicQAItem = {
  id: string;
  question: string;
  expectedAnswer: string;
  category?: string;
  source?: string;
  safetyLabel?: string;
};

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim().replace(/\s+/g, " ");
}

function makeId(question: string, expectedAnswer: string, index: number): string {
  return crypto.createHash("sha256").update(`${index}:${question}:${expectedAnswer}`).digest("hex").slice(0, 12);
}

function prefixAadesh(answer: string): string {
  const cleaned = normalizeText(answer);
  if (!cleaned) return cleaned;
  return cleaned.toLowerCase().startsWith("aadesh:") ? cleaned : `aadesh: ${cleaned}`;
}

function parseRows(input: string): VedicQAItem[] {
  const items: VedicQAItem[] = [];
  const blocks = input.split(/\n(?=##\s*\d+\.|\*\*Question:\*\*|###\s*Question:|\d+\.\s+Question:)/g);
  for (const [index, block] of blocks.entries()) {
    const question =
      block.match(/\*\*Question:\*\*\s*([\s\S]*?)(?:\n\*\*Expected answer:\*\*|\n\*\*Expected:\*\*|\n##\s*\d+\.|$)/i)?.[1] ??
      block.match(/###\s*Question:\s*([\s\S]*?)(?:\n###\s*Expected:\s*|\n\*\*Expected answer:\*\*|\n\*\*Expected:\*\*|$)/i)?.[1] ??
      block.match(/\d+\.\s*Question:\s*([\s\S]*?)(?:\n\d+\.\s*Expected:\s*|\n\*\*Expected answer:\*\*|\n\*\*Expected:\*\*|$)/i)?.[1];
    const expected =
      block.match(/\*\*Expected answer:\*\*\s*([\s\S]*?)(?:\n##\s*\d+\.|$)/i)?.[1] ??
      block.match(/\*\*Expected:\*\*\s*([\s\S]*?)(?:\n##\s*\d+\.|$)/i)?.[1] ??
      block.match(/###\s*Expected:\s*([\s\S]*?)(?:\n###\s*Question:|$)/i)?.[1] ??
      block.match(/\d+\.\s*Expected:\s*([\s\S]*?)(?:\n\d+\.\s*Question:|$)/i)?.[1];
    if (!question || !expected) continue;
    const normalizedQuestion = normalizeText(question);
    const normalizedAnswer = prefixAadesh(expected);
    if (!normalizedQuestion || !normalizedAnswer) continue;
    items.push({
      id: makeId(normalizedQuestion, normalizedAnswer, index),
      question: normalizedQuestion,
      expectedAnswer: normalizedAnswer,
      source: "vedicQA.md",
    });
  }
  return items;
}

function parseMarkdown(input: string): VedicQAItem[] {
  const items = parseRows(input);
  if (items.length > 0) return items;

  const tableLines = input.split("\n").filter((line) => line.includes("|"));
  if (tableLines.length === 0) return [];
  const tableItems: VedicQAItem[] = [];
  for (const [index, line] of tableLines.entries()) {
    const cols = line.split("|").map((part) => part.trim()).filter(Boolean);
    if (cols.length < 2 || /^[-:\s]+$/.test(cols[0]) || /^[-:\s]+$/.test(cols[1])) continue;
    const question = normalizeText(cols[0]);
    const expectedAnswer = prefixAadesh(cols[1]);
    if (!question || !expectedAnswer) continue;
    tableItems.push({ id: makeId(question, expectedAnswer, index), question, expectedAnswer, source: "vedicQA.md" });
  }
  return tableItems;
}

function parseJson(input: string): VedicQAItem[] {
  const parsed = JSON.parse(input) as unknown;
  const rows = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { items?: unknown }).items) ? (parsed as { items: unknown[] }).items : [];
  return rows.flatMap((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const r = row as Record<string, unknown>;
    const question = normalizeText(typeof r.question === "string" ? r.question : "");
    const expectedAnswer = normalizeText(typeof r.expectedAnswer === "string" ? r.expectedAnswer : typeof r.answer === "string" ? r.answer : "");
    if (!question || !expectedAnswer) return [];
    return [{
      id: typeof r.id === "string" && r.id.trim() ? r.id.trim() : makeId(question, expectedAnswer, index),
      question,
      expectedAnswer,
      category: typeof r.category === "string" ? r.category.trim() : undefined,
      source: typeof r.source === "string" ? r.source.trim() : undefined,
      safetyLabel: typeof r.safetyLabel === "string" ? r.safetyLabel.trim() : undefined,
    }];
  });
}

export function loadVedicQA(inputPath = "vedicQA.md"): VedicQAItem[] {
  if (!fs.existsSync(inputPath)) return [];
  const raw = fs.readFileSync(inputPath, "utf8");
  if (!raw.trim()) return [];
  try {
    if (inputPath.endsWith(".json") || inputPath.endsWith(".jsonl")) return parseJson(raw);
  } catch {
    return [];
  }
  return parseMarkdown(raw);
}
