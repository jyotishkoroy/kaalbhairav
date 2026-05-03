/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect } from 'vitest'
import { analyzeQuestionQuality } from '@/lib/astro/app/question-quality'

describe('analyzeQuestionQuality', () => {
  it('corrects "carreer" to "career"', () => {
    const r = analyzeQuestionQuality('my carreer is blocked what should I do')
    expect(r.normalizedQuestion.toLowerCase()).toContain('career')
    expect(r.suspectedMisspellings.length).toBeGreaterThan(0)
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('corrects "marrage" to "marriage"', () => {
    const r = analyzeQuestionQuality('marrage timing in my chart')
    expect(r.normalizedQuestion.toLowerCase()).toContain('marriage')
    expect(r.suspectedMisspellings.length).toBeGreaterThan(0)
  })

  it('corrects "relashionship" to "relationship"', () => {
    const r = analyzeQuestionQuality('when will my relashionship improve?')
    expect(r.normalizedQuestion.toLowerCase()).toContain('relationship')
  })

  it('corrects "bussiness" to "business"', () => {
    const r = analyzeQuestionQuality('my bussiness is not growing')
    expect(r.normalizedQuestion.toLowerCase()).toContain('business')
  })

  it('does not alter rahu ketu problem', () => {
    const r = analyzeQuestionQuality('rahu ketu problem in my chart')
    expect(r.normalizedQuestion).toBe('rahu ketu problem in my chart')
    expect(r.suspectedMisspellings.length).toBe(0)
  })

  it('does not alter unknown name or place', () => {
    const r = analyzeQuestionQuality('What does Subramaniam say about my lagna?')
    expect(r.normalizedQuestion).toContain('Subramaniam')
  })

  it('corrects Vedic term "raahu" to "rahu"', () => {
    const r = analyzeQuestionQuality('Is raahu in my 7th house causing delay?')
    expect(r.normalizedQuestion.toLowerCase()).toContain('rahu')
  })

  it('returns no warnings for well-spelled question', () => {
    const r = analyzeQuestionQuality('What is my current mahadasha?')
    expect(r.warnings.length).toBe(0)
    expect(r.suspectedMisspellings.length).toBe(0)
  })

  it('preserves meaning when correcting', () => {
    const r = analyzeQuestionQuality('My carreer and marrage are both stuck')
    expect(r.normalizedQuestion.toLowerCase()).toContain('career')
    expect(r.normalizedQuestion.toLowerCase()).toContain('marriage')
  })

  it('does not change "business" (already correct)', () => {
    const r = analyzeQuestionQuality('my business is struggling this year')
    expect(r.normalizedQuestion).toBe('my business is struggling this year')
    expect(r.suspectedMisspellings.length).toBe(0)
  })
})
