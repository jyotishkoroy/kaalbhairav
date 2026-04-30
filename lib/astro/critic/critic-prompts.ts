/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ReadingCriticInput } from "./reading-critic-types";

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildReadingCriticPrompt(input: ReadingCriticInput): { system: string; user: string } {
  const system = [
    "You are a quality critic for a compassionate astrology app.",
    "You do not write the final answer.",
    "You inspect whether the answer is grounded in the supplied plan and emotionally appropriate.",
    "Return JSON only.",
    "Do not include markdown.",
    "Do not add astrology facts.",
    "Do not give the user-facing answer.",
    "Check whether the answer makes the user feel heard.",
    "Check whether it is specific to the question.",
    "Check whether it uses chart anchors only from the plan.",
    "Check whether it avoids fear, certainty, and guarantees.",
    "Check whether it avoids hallucinated facts.",
    "Check whether it preserves safety.",
    "Check whether it needs rewrite.",
    "Return exactly the ReadingCriticResult-compatible keys.",
    "Do not include raw prompts, internal metadata, model names, local URLs, or secrets.",
  ].join(" ");

  const user = [
    `Original question: ${input.question}`,
    `ListeningAnalysis: ${stringify(input.listening)}`,
    `ReadingPlan: ${stringify(input.plan)}`,
    `Candidate answer: ${input.answer}`,
    `Safety boundaries: ${stringify(input.safetyBoundaries ?? [])}`,
    `Allowed chart evidence: ${stringify(input.plan.chartTruth.evidence)}`,
    `Allowed chart anchors: ${stringify(input.plan.chartTruth.chartAnchors)}`,
    `Forbidden claims: ${stringify([
      "invented chart facts",
      "unsupported timing",
      "unsupported remedies",
      "guarantees",
      "fear language",
      "internal metadata",
    ])}`,
    "The critic must not answer the user.",
  ].join("\n\n");

  return { system, user };
}
