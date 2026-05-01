/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest"
import bank from "./fixtures/bulk-answer-quality-regression-bank.json"
import type { FinalAnswerQualityFailure } from "../../lib/astro/validation/final-answer-quality-types"
import { runBulkAnswerQualityRegression } from "../../scripts/check-astro-bulk-answer-quality"

describe("bulk answer quality regression bank", () => {
  it("contains at least 300 curated cases", () => {
    expect(Array.isArray(bank)).toBe(true)
    expect(bank.length).toBeGreaterThanOrEqual(300)
  })

  it("has unique ids", () => {
    const ids = bank.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("covers required regression categories", () => {
    const categories = new Set(bank.map((item) => item.category))

    expect(categories).toContain("exact_fact_safety_suffix")
    expect(categories).toContain("exact_fact_style_suffix")
    expect(categories).toContain("money_anxiety")
    expect(categories).toContain("money_business_financial_guarantee")
    expect(categories).toContain("career_stagnation")
    expect(categories).toContain("career_business_study_choice")
    expect(categories).toContain("relationship_stability")
    expect(categories).toContain("marriage_delay")
    expect(categories).toContain("family_pressure")
    expect(categories).toContain("sleep_remedy")
    expect(categories).toContain("death_lifespan")
    expect(categories).toContain("curse_black_magic_fear")
    expect(categories).toContain("health_adjacent")
    expect(categories).toContain("legal_financial_boundary")
    expect(categories).toContain("vague_follow_up")
    expect(categories).toContain("metadata_memory_internal_leak")
  })

  it("detects all expected failures in bad answers and accepts good answers when provided", () => {
    const cases = bank as Array<{
      id: string
      category: string
      question: string
      badAnswer: string
      goodAnswer?: string
      expectedFailures: FinalAnswerQualityFailure[]
      expectedIntent?: string
      expectedMode?: string
      expectedDomain?: string
    }>

    const report = runBulkAnswerQualityRegression(cases)
    expect(report.failures).toEqual([])
    expect(report.passed).toBe(bank.length)
  })
})
