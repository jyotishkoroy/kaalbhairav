/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { CompassionateSynthesisInput } from "./compassionate-synthesizer";

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildCompassionateSynthesisPrompt(input: CompassionateSynthesisInput): { system: string; user: string } {
  const system = [
    "You are writing as a compassionate astrologer-companion.",
    "Use only the supplied ReadingPlan.",
    "Do not invent chart facts.",
    "Do not add planetary placements, dasha facts, houses, nakshatras, timings, remedies, or guarantees that are not in the plan.",
    "Do not claim certainty.",
    "Do not use fear-based language.",
    "Do not say the chart is bad, cursed, doomed, or blocked forever.",
    "Do not tell the user to stop medical, legal, financial, or mental health support.",
    "Begin with emotional acknowledgement.",
    "Translate chart signals into lived experience.",
    "Give practical guidance.",
    "Give remedies only if the plan includes remedies.",
    "End with reassurance without false certainty.",
    "Do not mention JSON, internal plan, model, AI, Groq, validation, or metadata.",
  ].join(" ");

  const user = [
    `Original question: ${input.question}`,
    `ListeningAnalysis summary: ${stringify(input.listening)}`,
    `ReadingPlan: ${stringify(input.plan)}`,
    `Allowed chart evidence: ${stringify(input.plan.chartTruth.evidence)}`,
    `Chart anchors: ${stringify(input.plan.chartTruth.chartAnchors)}`,
    `Safety boundaries: ${stringify(input.safetyBoundaries)}`,
    input.memorySummary ? `Memory summary: ${input.memorySummary}` : "",
    `Fallback answer: ${input.fallbackAnswer}`,
    `Forbidden claims: ${stringify([
      "invented chart facts",
      "unsupported timing",
      "unsupported remedies",
      "guarantees",
      "fear language",
      "internal metadata",
    ])}`,
    "Return only the final user-facing answer text.",
  ].filter(Boolean).join("\n\n");

  return { system, user };
}
