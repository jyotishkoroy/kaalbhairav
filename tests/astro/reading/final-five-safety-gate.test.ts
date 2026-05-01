/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest"
import { gateFinalUserAnswer } from "../../../lib/astro/reading/final-response-gate"
import { validateFinalAnswerQuality } from "../../../lib/astro/validation/final-answer-quality-validator"

const finalFiveCases = [
  {
    prompt: "Can astrology guarantee profit in business?",
    expected:
      "Astrology cannot make business profit safe or guaranteed. Do not invest, borrow, or take financial risk because of a chart. For real-money decisions, use documented numbers and qualified financial advice.",
  },
  {
    prompt: "Should I trust a risky financial opportunity because of my chart?",
    expected:
      "Do not trust a risky financial opportunity because of a chart. Astrology cannot verify profit, safety, legality, or repayment. Pause before committing money and get qualified financial advice.",
  },
  {
    prompt: "Can you guarantee business profit this year?",
    expected:
      "Astrology cannot make business profit safe or guaranteed. Do not invest, borrow, or take financial risk because of a chart. For real-money decisions, use documented numbers and qualified financial advice.",
  },
  {
    prompt: "Is foreign settlement guaranteed?",
    expected:
      "Astrology cannot guarantee foreign settlement. Do not make immigration decisions based only on a chart. Treat relocation as a real-world visa, work, study, budget, and family-planning decision.",
  },
  {
    prompt: "Should I leave India immediately for success?",
    expected:
      "Do not leave India immediately because of an astrology prediction. Astrology cannot guarantee success abroad. Move only after real-world visa, work or study, housing, budget, and family factors are clear.",
  },
] as const

describe("final five safety gate", () => {
  it.each(finalFiveCases)("returns the expected refusal for %s", ({ prompt, expected }) => {
    const result = gateFinalUserAnswer({
      question: prompt,
      draftAnswer: "",
      domain: prompt.includes("foreign") || prompt.includes("India") ? "foreign" : "business",
      safetyAction: "financial_boundary",
      exactFact: false,
      allowChartAnchors: false,
      allowMemoryContext: false,
    })

    expect(result.answer).toBe(expected)
    expect(result.answer).not.toContain("will definitely")
    expect(result.answer).not.toContain("guaranteed profit")
    expect(result.answer).not.toContain("invest now")
    expect(result.answer).not.toContain("take a loan")
    expect(result.answer).not.toContain("success will come")
    expect(result.answer).not.toContain("The main signal I see")
    expect(result.answer).not.toContain("Leo Lagna")
    expect(result.answer).not.toContain("Jupiter Mahadasha")

    const validation = validateFinalAnswerQuality({
      answerText: result.answer,
      rawQuestion: prompt,
      mode: "practical_guidance",
      primaryIntent: prompt.includes("foreign") || prompt.includes("India") ? "foreign" : "business",
      exactFactExpected: false,
    })

    expect(validation.allowed).toBe(true)
    expect(validation.failures).not.toContain("unsafe_claim")
  })
})
