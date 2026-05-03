/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type AstroQuestionGuardResult = { allowed: true; normalizedQuestion: string } | { allowed: false; code: string; answer: string };
const INTERNAL_PROBE_PATTERNS = [/\b(ai\s*model|model|server|system prompt|database rows|logs|credentials|token|secret|api key|groq|ollama|openai|llm)\b/i];
const COMPATIBILITY_PATTERNS = [/\b(compatibility|kundli\s*(matching|milan)|synastry|compare\s+my\s+chart|another\s+person|partner's birth|husband's birth|wife's birth|boyfriend's birth|girlfriend's birth)\b/i];
const FILE_IMAGE_PATTERNS = [/\b(upload|photo|picture|image|pdf|file|document|screenshot|kundli)\b/i, /\bread\s+(this\s+)?(pdf|file|document|image)\b/i, /\banalyze\s+(image|photo|picture|screenshot|pdf|document|kundli)\b/i, /\battachment\b/i];
const LANGUAGE_BLOCK_PATTERNS = [/[\u0900-\u097F]/, /[\u0980-\u09FF]/, /[\u0600-\u06FF]/, /\bkya\b/i, /\bkaise\b/i, /\bmera\b/i, /\bmeri\b/i, /\bmujhe\b/i, /\bshaadi\b/i, /\bpaisa\b/i];
const SAFE_ASTRO_PATTERNS = [/^what does (mercury|moon|sun|venus|mars|jupiter|saturn) in/i, /^what should the app answer if i ask/i];
function normalizeWhitespace(s: string): string { return s.replace(/\s+/g, " ").trim(); }
function isInternalProbe(question: string): boolean { return INTERNAL_PROBE_PATTERNS.some((pattern) => pattern.test(question)); }
export function guardOneShotAstroQuestion(question: string): AstroQuestionGuardResult {
  if (typeof question !== "string") return { allowed: false, code: "invalid_input", answer: "aadesh: Please ask one text question based on your own birth profile." };
  const normalized = normalizeWhitespace(question);
  if (!normalized) return { allowed: false, code: "empty_question", answer: "aadesh: Please enter a question to receive guidance." };
  if (normalized.length > 2000) return { allowed: false, code: "question_too_long", answer: "aadesh: Your question is too long. Please ask one focused question." };
  if (normalized.length < 2 || normalized === "?") return { allowed: false, code: "empty_question", answer: "aadesh: Please enter a question to receive guidance." };
  if (LANGUAGE_BLOCK_PATTERNS.some((pattern) => pattern.test(normalized))) return { allowed: false, code: "language_blocked", answer: "aadesh: Please ask in English only. Tarayai currently does not support Hindi, Bengali, Hinglish, Banglish, or other languages in the Ask Guru window." };
  if (isInternalProbe(normalized) && !SAFE_ASTRO_PATTERNS.some((pattern) => pattern.test(normalized.toLowerCase()))) return { allowed: false, code: "model_server_blocked", answer: "aadesh: I can answer astrology guidance from your saved birth profile, but I cannot help with bypassing safety, accessing private data, credentials, prompts, tools, logs, or system internals." };
  if (COMPATIBILITY_PATTERNS.some((pattern) => pattern.test(normalized))) return { allowed: false, code: "compatibility_blocked", answer: "aadesh: Tarayai uses only your saved birth profile for one-person guidance. It cannot compare another person’s chart or process another person’s birth details." };
  if (FILE_IMAGE_PATTERNS.some((pattern) => pattern.test(normalized))) return { allowed: false, code: "file_image_blocked", answer: "aadesh: Tarayai does not accept pictures, documents, screenshots, or uploaded charts. Please ask one text question based on your own saved birth profile." };
  return { allowed: true, normalizedQuestion: normalized };
}
