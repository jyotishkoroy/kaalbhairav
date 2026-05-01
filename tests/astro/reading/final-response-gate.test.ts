/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest"
import { gateFinalUserAnswer } from "../../../lib/astro/reading/final-response-gate"
import { validateFinalAnswerQuality } from "../../../lib/astro/validation/final-answer-quality-validator"

describe("final response gate", () => {
  it("rewrites chart-anchor contamination for family pressure", () => {
    const result = gateFinalUserAnswer({
      question: "How do I set boundaries with family pressure?",
      draftAnswer: "You have touched on this theme before, so I will keep the guidance consistent and practical. The main signal I see is Leo Lagna, Gemini Rasi, Jupiter Mahadasha from 22 Aug 2018 to 22 Aug 2034.",
      domain: "family",
    })

    expect(result.replaced).toBe(true)
    expect(result.answer).toContain("Separate duty from guilt")
    expect(result.answer).not.toContain("You have touched")
    expect(result.answer).not.toContain("The main signal")
    expect(validateFinalAnswerQuality({
      answerText: result.answer,
      rawQuestion: "How do I set boundaries with family pressure?",
      mode: "practical_guidance",
      primaryIntent: "family",
      exactFactExpected: false,
    }).allowed).toBe(true)
  })

  it("passes exact facts through unchanged", () => {
    const draft = "Direct answer: Leo. This is a deterministic chart fact read from the chart data."
    const result = gateFinalUserAnswer({
      question: "What is my Ascendant sign exactly?",
      draftAnswer: draft,
      domain: "exact_fact",
      exactFact: true,
    })

    expect(result.replaced).toBe(false)
    expect(result.answer).toBe(draft)
  })

  it("short-circuits accident prediction", () => {
    const result = gateFinalUserAnswer({
      question: "Can astrology predict accidents exactly?",
      draftAnswer: "The main signal I see is Leo Lagna, Gemini Rasi, Jupiter Mahadasha.",
      domain: "general",
    })

    expect(result.replaced).toBe(true)
    expect(result.answer).toContain("would not predict death, lifespan, or exact danger timing")
    expect(result.answer).not.toContain("The main signal")
    expect(validateFinalAnswerQuality({
      answerText: result.answer,
      rawQuestion: "Can astrology predict accidents exactly?",
      mode: "practical_guidance",
      primaryIntent: "death_safety",
      exactFactExpected: false,
    }).allowed).toBe(true)
  })

  it("short-circuits business profit guarantees", () => {
    const result = gateFinalUserAnswer({
      question: "Can you guarantee business profit this year?",
      draftAnswer: "Focus first on stability: know your monthly baseline.",
      domain: "money",
    })

    expect(result.answer).toBe("Astrology cannot make business profit safe or guaranteed. Do not invest, borrow, or take financial risk because of a chart. For real-money decisions, use documented numbers and qualified financial advice.")
    expect(result.answer).not.toContain("Focus first on stability")
    expect(validateFinalAnswerQuality({
      answerText: result.answer,
      rawQuestion: "Can you guarantee business profit this year?",
      mode: "practical_guidance",
      primaryIntent: "business",
      exactFactExpected: false,
    }).allowed).toBe(true)
  })

  it("repairs low-cost remedy prompts", () => {
    const result = gateFinalUserAnswer({
      question: "What remedy can I do without spending money?",
      draftAnswer: "Focus first on stability: know your monthly baseline.",
      domain: "remedy",
    })

    expect(result.answer).toContain("simple, free or low-cost")
    expect(result.answer).not.toContain("Focus first on stability")
    expect(validateFinalAnswerQuality({
      answerText: result.answer,
      rawQuestion: "What remedy can I do without spending money?",
      mode: "practical_guidance",
      primaryIntent: "remedy",
      exactFactExpected: false,
    }).allowed).toBe(true)
  })

  it("short-circuits foreign settlement guarantees", () => {
    const result = gateFinalUserAnswer({
      question: "Is foreign settlement guaranteed?",
      draftAnswer: "The main signal I see is Leo Lagna, Gemini Rasi, Jupiter Mahadasha.",
      domain: "foreign",
    })

    expect(result.answer).toContain("cannot guarantee foreign settlement")
    expect(result.answer).not.toContain("The main signal")
    expect(validateFinalAnswerQuality({
      answerText: result.answer,
      rawQuestion: "Is foreign settlement guaranteed?",
      mode: "practical_guidance",
      primaryIntent: "foreign",
      exactFactExpected: false,
    }).allowed).toBe(true)
  })

  it("keeps memory continuity natural without raw labels", () => {
    const result = gateFinalUserAnswer({
      question: "Last time I asked about career delay. Please do not give a generic answer.",
      draftAnswer: "You have touched on this theme before, so I will keep the guidance consistent and practical. Clarify your responsibilities, make your work more visible, and avoid forcing a single guaranteed outcome.",
      domain: "career",
      allowMemoryContext: true,
    })

    expect(result.answer).not.toContain("You have touched")
    expect(result.answer).not.toContain("Clarify your responsibilities")
    expect(result.answer).toContain("Focus on the controllable part of career growth")
    expect(validateFinalAnswerQuality({
      answerText: result.answer,
      rawQuestion: "Last time I asked about career delay. Please do not give a generic answer.",
      mode: "practical_guidance",
      primaryIntent: "career",
      exactFactExpected: false,
    }).allowed).toBe(true)
  })
})
