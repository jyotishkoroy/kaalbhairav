/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { LocalCriticClientInput } from "./local-critic";

export function buildLocalCriticMessages(input: LocalCriticClientInput): { system: string; user: string } {
  const system = [
    "You are a local critic for an astrology reading pipeline.",
    "Return JSON only.",
    "Do not write the user-facing answer.",
    "Do not add astrology facts.",
    "Compare the answer against the allowed chart facts, evidence, plan, contract, safety boundaries, and the user question.",
    "Mark invented facts, unsupported timing, unsupported remedies, generic language, missing emotional acknowledgement, unsafe or fear-based claims, and internal data leakage.",
    "Return bounded scores from 0 to 1.",
    "Never include markdown.",
  ].join(" ");

  const user = JSON.stringify({
    question: input.question,
    answer: input.answer,
    contract: {
      domain: input.contract.domain,
      answerMode: input.contract.answerMode,
      requiredSections: input.contract.requiredSections,
      anchors: input.contract.anchors.map((anchor) => ({ key: anchor.key, label: anchor.label, required: anchor.required, source: anchor.source })),
      forbiddenClaims: input.contract.forbiddenClaims.map((claim) => ({ key: claim.key, severity: claim.severity })),
      timingAllowed: input.contract.timingAllowed,
      remedyAllowed: input.contract.remedyAllowed,
      exactFactsOnly: input.contract.exactFactsOnly,
    },
    allowedFacts: {
      chartAnchors: input.contract.anchors.slice(0, 30).map((anchor) => anchor.key),
      reasoningSteps: input.reasoningPath?.steps?.slice(0, 8) ?? [],
      timingWindows: input.timing?.windows?.slice(0, 8) ?? [],
      validation: input.validation
        ? {
            ok: input.validation.ok,
            missingAnchors: input.validation.missingAnchors,
            missingSections: input.validation.missingSections,
            wrongFacts: input.validation.wrongFacts,
            unsafeClaims: input.validation.unsafeClaims,
            correctionInstruction: input.validation.correctionInstruction,
          }
        : null,
      context: input.context
        ? {
            retrievalTags: input.context.metadata?.retrievalTags?.slice(0, 20) ?? [],
            summary: input.context.memorySummary ?? "",
          }
        : null,
    },
    requiredOutput: {
      ok: true,
      safe: true,
      grounded: true,
      specific: true,
      compassionate: true,
      feelsHeardScore: 0,
      genericnessScore: 0,
      fearBasedScore: 0,
      groundingScore: 0,
      specificityScore: 0,
      practicalValueScore: 0,
      missingRequiredElements: [],
      unsafeClaims: [],
      inventedFacts: [],
      unsupportedTimingClaims: [],
      unsupportedRemedies: [],
      genericPhrases: [],
      emotionalGaps: [],
      rewriteInstructions: [],
      shouldRewrite: false,
      shouldFallback: false,
      source: "ollama",
      warnings: [],
    },
  });

  return { system, user };
}
