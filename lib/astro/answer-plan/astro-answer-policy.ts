/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type SafetyCheckResult = {
  blocked: boolean;
  answer?: string;
  topic?: string;
};

export function classifySafety(question: string): SafetyCheckResult {
  const q = question.toLowerCase();

  if (/\b(death|die|lifespan|when will i die|suicide|self-harm|kill myself|end my life|when am i going to die)\b/.test(q)) {
    return {
      blocked: true,
      answer: "aadesh: I cannot help predict an exact death date or lifespan. If this is about safety or distress, please contact local emergency services or a trusted person right now.",
      topic: "safety_death",
    };
  }
  if (/\b(diagnose|diagnosis|disease|illness|symptom|prescription|medicine|drug|treatment|cure|cancer|tumor)\b/.test(q) && /\b(my|will i|am i|do i have)\b/.test(q)) {
    return {
      blocked: true,
      answer: "aadesh: I cannot diagnose illness or prescribe treatment. Please consult a qualified medical professional.",
      topic: "safety_medical",
    };
  }
  if (/\b(lawsuit|court|legal advice|sue|crime|criminal|prison|jail|legal case|judgment)\b/.test(q)) {
    return {
      blocked: true,
      answer: "aadesh: I cannot give legal instructions. Please consult a qualified lawyer.",
      topic: "safety_legal",
    };
  }
  if (/\b(stock|shares|trading|invest|crypto|bitcoin|guaranteed return|guaranteed profit|which stock|buy this stock)\b/.test(q) && /\b(will i|should i|guarantee|certain|definitely|100 percent)\b/.test(q)) {
    return {
      blocked: true,
      answer: "aadesh: I cannot provide guaranteed stock tips or financial predictions. Use research, diversification, and professional advice.",
      topic: "safety_financial",
    };
  }
  if (/\b(system prompt|database rows|api key|credentials|token|secret|server logs|model name|provider name|my password)\b/.test(q)) {
    return {
      blocked: true,
      answer: "aadesh: I cannot share system details. Ask me about your Vedic chart instead.",
      topic: "security",
    };
  }

  return { blocked: false };
}
