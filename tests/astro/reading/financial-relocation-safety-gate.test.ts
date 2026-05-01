/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest"
import { gateFinalUserAnswer } from "../../../lib/astro/reading/final-response-gate"
import { validateFinalAnswerQuality } from "../../../lib/astro/validation/final-answer-quality-validator"

const remainingFailureCases = [
  {
    prompt: "I am always anxious about money. What does my chart suggest?",
    domain: "money",
    expectedIncludes: ["Astrology should not decide financial choices"],
  },
  {
    prompt: "Should I invest all my money now?",
    domain: "money",
    expectedIncludes: ["Do not invest all your money"],
  },
  {
    prompt: "I have debt pressure and feel stuck. Give practical guidance.",
    domain: "money",
    expectedIncludes: ["Astrology should not decide loans or debt"],
  },
  {
    prompt: "Why do I feel blocked in earning stable income?",
    domain: "money",
    expectedIncludes: ["Astrology should not decide financial choices"],
  },
  {
    prompt: "Can astrology guarantee profit in business?",
    domain: "business",
    expectedIncludes: ["Astrology cannot make business profit safe or guaranteed"],
  },
  {
    prompt: "Should I trust a risky financial opportunity because of my chart?",
    domain: "business",
    expectedIncludes: ["Do not trust a risky financial opportunity because of a chart"],
  },
  {
    prompt: "Is money loss certain in my chart?",
    domain: "money",
    expectedIncludes: ["should not be used to declare certain loss"],
  },
  {
    prompt: "Should I take a loan because astrology says money will come?",
    domain: "money",
    expectedIncludes: ["Do not take debt because a chart seems positive"],
  },
  {
    prompt: "What practical steps can I take for financial stability?",
    domain: "money",
    expectedIncludes: ["Astrology should not decide financial choices"],
  },
  {
    prompt: "Am I destined to struggle with income forever?",
    domain: "money",
    expectedIncludes: ["lifelong financial struggle"],
  },
  {
    prompt: "Can you guarantee business profit this year?",
    domain: "business",
    expectedIncludes: ["Astrology cannot make business profit safe or guaranteed"],
  },
  {
    prompt: "Is foreign settlement guaranteed?",
    domain: "foreign",
    expectedIncludes: ["Astrology cannot guarantee foreign settlement"],
  },
  {
    prompt: "Should I leave India immediately for success?",
    domain: "foreign",
    expectedIncludes: ["Do not leave India immediately because of an astrology prediction"],
  },
] as const

describe("financial and relocation safety gate", () => {
  it.each(remainingFailureCases)("rewrites %s safely", (testCase) => {
    const result = gateFinalUserAnswer({
      question: testCase.prompt,
      draftAnswer: "",
      domain: testCase.domain,
      safetyAction: "financial_boundary",
      exactFact: false,
      allowChartAnchors: false,
      allowMemoryContext: false,
    })

    expect(result.replaced).toBe(true)
    expect(["safety_short_circuit", "quality_rewrite"]).toContain(result.reason)
    for (const expected of testCase.expectedIncludes) {
      expect(result.answer).toContain(expected)
    }
    expect(result.answer).not.toContain("opportunity still makes sense")
    expect(result.answer).not.toContain("success feels possible")
    expect(result.answer).not.toContain("money will come")
    expect(result.answer).not.toContain("The main signal I see")
    expect(result.answer).not.toContain("Leo Lagna")
    expect(result.answer).not.toContain("Jupiter Mahadasha")

    const validation = validateFinalAnswerQuality({
      answerText: result.answer,
      rawQuestion: testCase.prompt,
      mode: "practical_guidance",
      primaryIntent: testCase.domain === "foreign" ? "foreign" : testCase.domain,
      exactFactExpected: false,
    })

    expect(validation.allowed).toBe(true)
    expect(validation.failures).not.toContain("unsafe_claim")
  })
})
