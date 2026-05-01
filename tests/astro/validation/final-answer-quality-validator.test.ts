/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest"
import { validateFinalAnswerQuality } from "../../../lib/astro/validation/final-answer-quality-validator"

const exactFactInput = (answerText: string, overrides: Record<string, unknown> = {}) => ({
  answerText,
  rawQuestion: "What is my Lagna?",
  coreQuestion: "What is my Lagna?",
  mode: "exact_fact",
  primaryIntent: "exact_fact",
  exactFactExpected: true,
  expectedDomain: "exact_fact",
  metadata: {},
  ...overrides,
})

describe("final answer quality validator", () => {
  it("blocks This question should be read through", () => {
    expect(validateFinalAnswerQuality({ answerText: "This question should be read through the chart.", rawQuestion: "x" }).failures).toContain("internal_instruction_leak")
  })
  it("blocks The person may be seeking", () => {
    expect(validateFinalAnswerQuality({ answerText: "The person may be seeking reassurance here.", rawQuestion: "x" }).failures).toContain("internal_instruction_leak")
  })
  it("blocks The answer should stay tied", () => {
    expect(validateFinalAnswerQuality({ answerText: "The answer should stay tied to the question.", rawQuestion: "x" }).failures).toContain("internal_instruction_leak")
  })
  it("blocks Keep the answer tied", () => {
    expect(validateFinalAnswerQuality({ answerText: "Keep the answer tied to the chart.", rawQuestion: "x" }).failures).toContain("internal_instruction_leak")
  })
  it("blocks raw Chart basis", () => {
    expect(validateFinalAnswerQuality({ answerText: "Chart basis: Saturn in the 10th.", rawQuestion: "x" }).failures).toContain("metadata_leak")
  })
  it("blocks raw Key anchors", () => {
    expect(validateFinalAnswerQuality({ answerText: "Key anchors: Sun, Moon, Saturn.", rawQuestion: "x" }).failures).toContain("metadata_leak")
  })
  it("blocks duplicated Safety note", () => {
    expect(validateFinalAnswerQuality({ answerText: "Safety note: Safety note: avoid guarantees.", rawQuestion: "x" }).failures).toContain("internal_instruction_leak")
  })
  it("blocks raw Accuracy", () => {
    expect(validateFinalAnswerQuality({ answerText: "Accuracy: grounded reading only.", rawQuestion: "x" }).failures).toContain("metadata_leak")
  })
  it("blocks raw Suggested follow-up", () => {
    expect(validateFinalAnswerQuality({ answerText: "Suggested follow-up: ask again later.", rawQuestion: "x" }).failures).toContain("metadata_leak")
  })
  it("blocks Previous concern visible leak", () => {
    expect(validateFinalAnswerQuality({ answerText: "Previous concern", rawQuestion: "x" }).failures).toContain("memory_contamination")
  })
  it("blocks Chart basis visible leak", () => {
    expect(validateFinalAnswerQuality({ answerText: "Chart basis", rawQuestion: "x" }).failures).toContain("metadata_leak")
  })
  it("blocks Key anchors visible leak", () => {
    expect(validateFinalAnswerQuality({ answerText: "Key anchors", rawQuestion: "x" }).failures).toContain("metadata_leak")
  })
  it("blocks Accuracy visible leak", () => {
    expect(validateFinalAnswerQuality({ answerText: "Accuracy", rawQuestion: "x" }).failures).toContain("metadata_leak")
  })
  it("blocks Suggested follow-up visible leak", () => {
    expect(validateFinalAnswerQuality({ answerText: "Suggested follow-up", rawQuestion: "x" }).failures).toContain("metadata_leak")
  })
  it("blocks raw metadata", () => {
    expect(validateFinalAnswerQuality({ answerText: "metadata chartAnchorsUsed directV2Route", rawQuestion: "x" }).failures).toContain("metadata_leak")
  })

  describe("strict live output cleanliness", () => {
    const blockedPhrases = [
      "Accuracy:",
      "How this is derived:",
      "For career, the chart should be read through",
      "Earlier context:",
      "You are asking for guidance on a specific situation",
      "The overall pattern matters more than one isolated prediction",
      "For education, the reading should focus",
      "For spiritual questions, the answer should stay",
      "So my honest reading is",
      "The main signal I would take from this is",
      "A useful career reading stays practical",
      "Marriage questions are best handled without fear or pressure",
      "This is an emotional question, so I would keep the reading gentle and practical",
      "[REDACTED]",
    ]

    it.each(blockedPhrases)("blocks visible scaffolding phrase: %s", (phrase) => {
      const result = validateFinalAnswerQuality({
        answerText: `This is a normal answer. ${phrase} This should not be visible.`,
        rawQuestion: "Why does my career feel stuck?",
        mode: "interpretive",
        primaryIntent: "career",
        exactFactExpected: false,
      })

      expect(result.allowed).toBe(false)
      expect(result.failures).toContain("internal_instruction_leak")
    })

    it("blocks repeated long sentence openings", () => {
      const repeated =
        "I would not suggest strong gemstones or expensive remedies without a careful full-chart review by a trusted expert."

      const result = validateFinalAnswerQuality({
        answerText: `${repeated} Start simple. ${repeated}`,
        rawQuestion: "Should I wear blue sapphire immediately?",
        mode: "remedy",
        primaryIntent: "remedy",
        exactFactExpected: false,
      })

      expect(result.allowed).toBe(false)
      expect(result.failures).toContain("duplicate_topic_phrase")
    })
  })

  it("blocks Previous concern", () => {
    expect(validateFinalAnswerQuality({ answerText: "Previous concern: money stress.", rawQuestion: "x" }).failures).toContain("memory_contamination")
  })
  it("blocks Previous concern repeated", () => {
    expect(validateFinalAnswerQuality({ answerText: "Previous concern: Previous concern: career guidance.", rawQuestion: "x" }).failures).toContain("memory_contamination")
  })
  it("blocks Preference", () => {
    expect(validateFinalAnswerQuality({ answerText: "Preference: practical advice.", rawQuestion: "x" }).failures).toContain("memory_contamination")
  })
  it("blocks Guidance already given", () => {
    expect(validateFinalAnswerQuality({ answerText: "Guidance already given: keep calm.", rawQuestion: "x" }).failures).toContain("memory_contamination")
  })
  it("blocks Retrieved memory", () => {
    expect(validateFinalAnswerQuality({ answerText: "Retrieved memory: prior fear of loss.", rawQuestion: "x" }).failures).toContain("memory_contamination")
  })
  it("passes a natural memory sentence", () => {
    expect(validateFinalAnswerQuality({ answerText: "You mentioned money stress before, so I will stay practical.", rawQuestion: "x" }).allowed).toBe(true)
  })

  it("blocks career progress career", () => {
    expect(validateFinalAnswerQuality({ answerText: "career progress career", rawQuestion: "Why do I feel anxious about money?" }).failures).toContain("duplicate_topic_phrase")
  })
  it("blocks career progress work", () => {
    expect(validateFinalAnswerQuality({ answerText: "career progress work", rawQuestion: "x" }).failures).toContain("duplicate_topic_phrase")
  })
  it("blocks career progress business", () => {
    expect(validateFinalAnswerQuality({ answerText: "career progress business", rawQuestion: "x" }).failures).toContain("duplicate_topic_phrase")
  })
  it("blocks relationship or marriage relationship", () => {
    expect(validateFinalAnswerQuality({ answerText: "relationship or marriage relationship", rawQuestion: "x" }).failures).toContain("duplicate_topic_phrase")
  })
  it("blocks relationship or marriage marriage", () => {
    expect(validateFinalAnswerQuality({ answerText: "relationship or marriage marriage", rawQuestion: "x" }).failures).toContain("duplicate_topic_phrase")
  })
  it("blocks relationship or marriage career", () => {
    expect(validateFinalAnswerQuality({ answerText: "relationship or marriage career", rawQuestion: "x" }).failures).toContain("duplicate_topic_phrase")
  })
  it("blocks money money", () => {
    expect(validateFinalAnswerQuality({ answerText: "money money", rawQuestion: "x" }).failures).toContain("duplicate_topic_phrase")
  })
  it("blocks specific situation work", () => {
    expect(validateFinalAnswerQuality({ answerText: "specific situation work", rawQuestion: "x" }).failures).toContain("duplicate_topic_phrase")
  })

  it("fails money question answered as career only", () => {
    expect(validateFinalAnswerQuality({ answerText: "You are asking about career progress business...", rawQuestion: "Why do I feel anxious about money?" }).failures).toContain("wrong_domain_answer")
  })
  it("allows money salary job-income answer to mention career", () => {
    expect(validateFinalAnswerQuality({ answerText: "Your salary growth may connect to career progress, but the money question points to income flow.", rawQuestion: "Why do I feel anxious about money?" }).allowed).toBe(true)
  })
  it("fails relationship question answered as career only", () => {
    expect(validateFinalAnswerQuality({ answerText: "This is mainly about career progress.", rawQuestion: "What relationship pattern should I reflect on?" }).failures).toContain("wrong_domain_answer")
  })
  it("fails marriage delay answered as career only", () => {
    expect(validateFinalAnswerQuality({ answerText: "This is mainly about career progress.", rawQuestion: "Will marriage delay?" }).failures).toContain("wrong_domain_answer")
  })
  it("fails sleep remedy answered as financial or career only", () => {
    expect(validateFinalAnswerQuality({ answerText: "Focus on career and money instead.", rawQuestion: "How can I sleep better?" }).failures).toContain("wrong_domain_answer")
  })
  it("fails exact fact answered as generic guidance", () => {
    expect(validateFinalAnswerQuality({ answerText: "The overall pattern matters more than one isolated prediction.", rawQuestion: "What is my Lagna?", mode: "exact_fact", primaryIntent: "exact_fact", exactFactExpected: true }).failures).toContain("generic_boilerplate")
  })

  it("fails generic medical legal financial disclaimer for exact fact", () => {
    expect(validateFinalAnswerQuality(exactFactInput("The chart can show general stress patterns, but it should not be treated as medical, legal, or financial advice.")).failures).toContain("safety_overreplacement")
  })
  it("passes exact fact direct answer with minimal boundary", () => {
    expect(validateFinalAnswerQuality(exactFactInput("Direct answer: Leo.")).allowed).toBe(true)
  })
  it("passes deterministic unavailable exact fact response", () => {
    expect(validateFinalAnswerQuality(exactFactInput("I cannot verify that exact chart fact from the deterministic data available here.")).allowed).toBe(true)
  })
  it("fails exact fact answered with only medical legal disclaimer", () => {
    expect(validateFinalAnswerQuality(exactFactInput("I cannot provide medical, legal, or financial advice.")).failures).toContain("safety_overreplacement")
  })

  it("fails definitely become rich next year", () => {
    expect(validateFinalAnswerQuality({ answerText: "you will definitely become rich next year", rawQuestion: "x" }).failures).toContain("unsafe_claim")
  })
  it("fails win the court case for sure", () => {
    expect(validateFinalAnswerQuality({ answerText: "you will win the court case for sure", rawQuestion: "x" }).failures).toContain("unsafe_claim")
  })
  it("fails death at age X", () => {
    expect(validateFinalAnswerQuality({ answerText: "you will die at age 72", rawQuestion: "x" }).failures).toContain("unsafe_claim")
  })
  it("passes death timing disclaimer", () => {
    expect(validateFinalAnswerQuality({ answerText: "I would not predict death, lifespan, or death timing.", rawQuestion: "x" }).allowed).toBe(true)
  })
  it("passes business profit disclaimer", () => {
    expect(validateFinalAnswerQuality({ answerText: "I cannot guarantee business profit.", rawQuestion: "x" }).allowed).toBe(true)
  })
  it("passes medical legal financial advice disclaimer", () => {
    expect(validateFinalAnswerQuality({ answerText: "Astrology should not be treated as medical, legal, or financial advice.", rawQuestion: "x" }).allowed).toBe(true)
  })

  describe("financial and relocation explicit refusals", () => {
    it.each([
      "Astrology should not decide investments. Do not invest all your money based on a chart. Pause, protect emergency cash, review downside risk, and speak with a qualified financial professional before making a real-money decision.",
      "Astrology should not decide loans or debt. Do not take debt because a chart seems positive. Review repayment capacity, essential expenses, and downside risk, and speak with a qualified financial professional before committing.",
      "Astrology cannot guarantee business profit. Do not treat a chart as permission to take financial risk. Review costs, contracts, downside risk, cash flow, and qualified professional advice before making a business decision.",
      "Astrology cannot guarantee business profit. Do not invest, borrow, or risk money because of astrology. For business decisions, use accounts, contracts, cash flow, risk review, and qualified financial advice.",
      "Do not trust a risky financial opportunity because of a chart. Astrology cannot verify profit, safety, legality, or repayment. Pause before committing money and get qualified financial advice.",
      "A chart should not be used to declare certain loss or lifelong financial struggle. Treat this as a planning question: protect essentials, avoid panic decisions, review debt and spending, and get qualified financial advice for real-money choices.",
    ])("allows explicit financial refusal: %s", (answerText) => {
      const result = validateFinalAnswerQuality({ answerText, rawQuestion: "What should I do about money?" })
      expect(result.allowed).toBe(true)
      expect(result.failures).not.toContain("unsafe_claim")
    })

    it.each([
      "You will definitely make profit this year.",
      "Invest all your money now because the chart is positive.",
      "Take the loan; money will come soon.",
      "Your chart guarantees stable income.",
    ])("blocks unsafe financial claim: %s", (answerText) => {
      expect(validateFinalAnswerQuality({ answerText, rawQuestion: "What should I do about money?" }).failures).toContain("unsafe_claim")
    })

    it.each([
      "Astrology cannot guarantee foreign settlement. Do not make immigration decisions based only on a chart. Treat relocation as a real-world visa, work, study, budget, and family-planning decision.",
      "Do not make an immediate relocation decision because of astrology. Astrology cannot guarantee success abroad. Check visa status, confirmed work or study, housing, budget, documents, and family responsibilities first.",
    ])("allows explicit relocation refusal: %s", (answerText) => {
      const result = validateFinalAnswerQuality({ answerText, rawQuestion: "Should I move abroad?" })
      expect(result.allowed).toBe(true)
      expect(result.failures).not.toContain("unsafe_claim")
    })

    it.each([
      "Foreign settlement is guaranteed.",
      "Leave India immediately and success will come.",
      "Your chart guarantees success abroad.",
    ])("blocks unsafe relocation claim: %s", (answerText) => {
      expect(validateFinalAnswerQuality({ answerText, rawQuestion: "Should I move abroad?" }).failures).toContain("unsafe_claim")
    })
  })

  it("flags long horizon premium prediction language as clean when exact message is used", () => {
    expect(validateFinalAnswerQuality({
      answerText: "Guru of guru (premium version) needed for predictions more than 3years",
      rawQuestion: "Give me a prediction for the next 10 years.",
      mode: "timing_prediction",
      primaryIntent: "timing",
      exactFactExpected: false,
    }).allowed).toBe(true)
  })

  it("fails gemstone fixes all problems", () => {
    expect(validateFinalAnswerQuality({ answerText: "This gemstone will fix all your problems.", rawQuestion: "x" }).failures).toContain("unsafe_remedy")
  })
  it("fails expensive puja pressure", () => {
    expect(validateFinalAnswerQuality({ answerText: "You must buy this expensive puja.", rawQuestion: "x" }).failures).toContain("unsafe_remedy")
  })
  it("fails stop medical treatment and only chant", () => {
    expect(validateFinalAnswerQuality({ answerText: "Stop medical treatment and only chant.", rawQuestion: "x" }).failures).toContain("unsafe_remedy")
  })
  it("passes low-cost sleep routine", () => {
    expect(validateFinalAnswerQuality({ answerText: "A simple calming routine can support sleep, without replacing medical care.", rawQuestion: "How can I sleep better?" }).allowed).toBe(true)
  })
  it("passes sleep night routine without scary remedies", () => {
    expect(validateFinalAnswerQuality({ answerText: "For sleep, keep the remedy simple, low-cost, and non-fear-based. Try a steady routine tonight.", rawQuestion: "Give a simple night routine for sleep without scary remedies." }).allowed).toBe(true)
  })
  it("passes mantra as support wording", () => {
    expect(validateFinalAnswerQuality({ answerText: "A mantra can be used as support, not as a medical replacement.", rawQuestion: "x" }).allowed).toBe(true)
  })

  it("fails empty answer", () => {
    expect(validateFinalAnswerQuality({ answerText: "", rawQuestion: "x" }).failures).toContain("empty_answer")
  })
  it("fails whitespace answer", () => {
    expect(validateFinalAnswerQuality({ answerText: "   ", rawQuestion: "x" }).failures).toContain("empty_answer")
  })
  it("passes meaningful exact fact compact answer", () => {
    expect(validateFinalAnswerQuality(exactFactInput("Leo.")).allowed).toBe(true)
  })
  it("fails repeated generic boilerplate", () => {
    expect(validateFinalAnswerQuality({ answerText: "The overall pattern matters more than one isolated prediction. A responsible reading should reduce fear.", rawQuestion: "x" }).failures).toContain("generic_boilerplate")
  })
  it("passes specific career answer", () => {
    expect(validateFinalAnswerQuality({ answerText: "It makes sense that this feels frustrating. Clarify your responsibilities, make your work more visible, and ask directly about promotion criteria.", rawQuestion: "Will my career improve?" }).allowed).toBe(true)
  })

  it("blocks the safety overreplacement regression pattern", () => {
    const result = validateFinalAnswerQuality(exactFactInput("The chart can show general stress patterns, but it should not be treated as medical, legal, or financial advice.", { rawQuestion: "What is my Lagna? Please answer without medical, legal, or financial certainty." }))
    expect(result.failures).toContain("safety_overreplacement")
  })
  it("blocks the money career duplicate regression pattern", () => {
    const result = validateFinalAnswerQuality({ answerText: "You are asking about career progress business...", rawQuestion: "Why do I feel anxious about money?" })
    expect(result.failures).toEqual(expect.arrayContaining(["wrong_domain_answer", "duplicate_topic_phrase"]))
  })
  it("blocks the relationship career regression pattern", () => {
    const result = validateFinalAnswerQuality({ answerText: "You are asking about career progress...", rawQuestion: "What relationship pattern should I reflect on?" })
    expect(result.failures).toContain("wrong_domain_answer")
  })
  it("blocks the repeated memory regression pattern", () => {
    expect(validateFinalAnswerQuality({ answerText: "Previous concern: Previous concern: career guidance.", rawQuestion: "x" }).failures).toContain("memory_contamination")
  })
  it("blocks the live quality leak regression pattern", () => {
    expect(validateFinalAnswerQuality({ answerText: "Previous concern career progress career money money relationship or marriage marriage Chart basis Key anchors Accuracy Suggested follow-up", rawQuestion: "x" }).failures.length).toBeGreaterThan(0)
  })
  it("blocks the internal instruction regression pattern", () => {
    expect(validateFinalAnswerQuality({ answerText: "The answer should stay tied to Sun in Taurus 10th and Moon in Gemini 11th.", rawQuestion: "x" }).failures).toContain("internal_instruction_leak")
  })
})
