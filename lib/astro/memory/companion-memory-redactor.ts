/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { CompanionMemoryConfidence, CompanionMemoryDraft, CompanionMemoryTopic, CompanionMemoryType } from "./companion-memory-types";

const TOKEN_RE = /\b(?:sk|rk|pk|tok|token|secret|api[_-]?key)[\w-]*\b|\b[a-f0-9]{32,}\b|\b(?:secret|token|password)\b/i;
const URL_RE = /https?:\/\/\S+|localhost:\d+|127\.0\.0\.1:\d+/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /\b(?:\+?\d[\d\s().-]{7,}\d)\b/;
const MARKDOWN_RE = /[`*_>#-]/g;

const SENSITIVE_PATTERNS: Array<[string, RegExp]> = [
  ["secret_or_token", /\b(?:secret|token|password|api[_-]?key|sk-[a-z0-9-]+)\b/i],
  ["death_lifespan", /\b(when will i die|death date|lifespan|life span|how long will i live)\b/i],
  ["self_harm", /\b(suicide|kill myself|end my life|self[- ]harm|hurt myself)\b/i],
  ["medical", /\b(cancer|diagnos(?:is|ed)|disease|hospital|surgery|medicine|doctor|patient)\b/i],
  ["legal", /\b(lawyer|lawsuit|court|legal dispute|police case|custody case)\b/i],
  ["third_party_private", /\b(?:my|his|her|their)\s+(?:wife|husband|partner|ex|boss|coworker|friend|sister|brother|mother|father|son|daughter)\b/i],
  ["raw_birth_data", /\b(born at|time of birth|birth place|exact birth|date of birth|dob)\b/i],
  ["sexual_private", /\b(sex|sexual|intimate|nude|private parts?)\b/i],
  ["financial_guarantee", /\b(guaranteed profit|sure shot|money will definitely|financial guarantee)\b/i],
  ["curse_fear", /\b(curse|black magic|evil eye|doom|spell)\b/i],
  ["one_off_venting", /\b(i just need to vent|i am so angry|i feel hopeless|i am overwhelmed)\b/i],
];

function trimText(value: string, maxLength = 280): string {
  const compact = String(value ?? "").replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? compact.slice(0, maxLength).trimEnd() : compact;
}

export function redactCompanionMemoryText(value: string, maxLength = 280): string {
  return trimText(
    String(value ?? "")
      .replace(MARKDOWN_RE, " ")
      .replace(EMAIL_RE, "[redacted-email]")
      .replace(PHONE_RE, "[redacted-phone]")
      .replace(TOKEN_RE, "[redacted-token]")
      .replace(URL_RE, "[redacted-url]")
      .replace(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[:/]\d{1,2}[:/]\d{2,4})\b/g, "[redacted-date]"),
    maxLength,
  );
}

export function redactCompanionMemoryForUserFacingText(memoryText: string): string {
  const compact = redactCompanionMemoryText(memoryText, 220)
    .replace(/\b(?:previous concern|preference|guidance already given|memory|retrieved memory|companion memory|user memory)\s*:/gi, "")
    .replace(/\b(?:previous concern)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return compact.slice(0, 180);
}

export function classifySensitiveMemoryReasons(value: string): string[] {
  const text = String(value ?? "");
  const reasons = SENSITIVE_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([reason]) => reason);
  if (/\b\d{1,2}:\d{2}\b/.test(text) && /\b(?:born|birth|place|city|town)\b/i.test(text)) reasons.push("raw_birth_data");
  if (/\b(?:date|time|place)\b/i.test(text) && /\b(?:born|birth)\b/i.test(text)) reasons.push("raw_birth_data");
  return [...new Set(reasons)];
}

export function containsSensitiveMemoryContent(value: string): boolean {
  return classifySensitiveMemoryReasons(value).length > 0;
}

export function normalizeMemoryTopic(value?: string | null): CompanionMemoryTopic {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "relationship" || text.includes("partner") || text.includes("dating") || text.includes("relationship")) return "relationship";
  if (text === "marriage" || text.includes("marri")) return "marriage";
  if (text === "career" || text.includes("job") || text.includes("work") || text.includes("promotion")) return "career";
  if (text === "money" || text.includes("income") || text.includes("salary") || text.includes("finance")) return "money";
  if (text === "health" || text.includes("sleep") || text.includes("medical")) return "health";
  if (text === "family" || text.includes("parent") || text.includes("home")) return "family";
  if (text === "education" || text.includes("study") || text.includes("exam")) return "education";
  if (text === "timing" || text.includes("time") || text.includes("when")) return "timing";
  if (text === "remedy" || text.includes("puja") || text.includes("mantra")) return "remedy";
  if (text === "spirituality" || text.includes("spiritual") || text.includes("vedic")) return "spirituality";
  if (!text || text === "unknown") return "general";
  return "unknown";
}

export function normalizeMemoryType(value?: string | null): CompanionMemoryType | null {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "preference" || text === "recurring_concern" || text === "emotional_pattern" || text === "guidance_given" || text === "boundary" || text === "birth_context" || text === "relationship_context" || text === "career_context") {
    return text as CompanionMemoryType;
  }
  return null;
}

export function normalizeMemoryConfidence(value?: string | null): CompanionMemoryConfidence {
  const text = String(value ?? "").trim().toLowerCase();
  return text === "low" || text === "high" ? text : "medium";
}

export function sanitizeMemoryDraft(draft: CompanionMemoryDraft): CompanionMemoryDraft | null {
  const memoryType = normalizeMemoryType(draft.memoryType);
  if (!memoryType) return null;
  const content = redactCompanionMemoryText(draft.content, 280);
  if (!content) return null;
  if (containsSensitiveMemoryContent(content)) return null;
  return {
    memoryType,
    topic: normalizeMemoryTopic(draft.topic),
    content,
    confidence: normalizeMemoryConfidence(draft.confidence),
    sourceMessageId: draft.sourceMessageId && /^[0-9a-f-]{8,}$/i.test(draft.sourceMessageId) ? draft.sourceMessageId : null,
  };
}
