/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAstrologyMemory } from '@/lib/astro/memory/memory-store'
import { generateReadingV2 } from '@/lib/astro/reading/reading-orchestrator-v2'
import type { AstrologyReadingInput } from '@/lib/astro/reading/reading-router-types'

const ORIGINAL_ENV = { ...process.env }

function makeInput(
  overrides: Partial<AstrologyReadingInput> = {},
): AstrologyReadingInput {
  return {
    userId: 'test-user',
    question: 'When will I get a job?',
    birthDetails: {
      date: '1999-06-14',
      time: '09:58:00',
      place: 'Kolkata',
      timezone: 5.5,
      latitude: 22.5667,
      longitude: 88.3667,
    },
    chart: {
      lagna: 'Leo',
      moonSign: 'Gemini',
      nakshatra: 'Mrigasira',
    },
    dasha: {
      mahadasha: 'Saturn',
      antardasha: 'Mercury',
    },
    transits: {},
    ...overrides,
  }
}

describe('Reading Orchestrator V2', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.ASTRO_MEMORY_ENABLED
    delete process.env.ASTRO_REMEDIES_ENABLED
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns a V2 answer with metadata', async () => {
    const result = await generateReadingV2(makeInput())

    expect(result.answer ?? result.text ?? result.message).toBeTruthy()
    expect(result.meta?.version).toBe('v2')
    expect(result.meta?.topic).toBe('career')
    expect(result.meta?.evidenceCount).toBeGreaterThan(0)
    expect(result.meta?.usedFallback).toBe(false)
  })

  it('sets Hinglish language metadata for Hinglish questions', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'meri naukri kab lagegi',
      }),
    )

    expect(result.meta?.language).toBe('hinglish')
    expect(String(result.answer ?? '').length).toBeGreaterThan(20)
  })

  it('sets Hindi language metadata for Hindi script questions', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'मेरी नौकरी कब लगेगी',
      }),
    )

    expect(result.meta?.language).toBe('hindi')
    expect(String(result.answer ?? '').length).toBeGreaterThan(50)
  })

  it('sets Bengali language metadata for Bengali script questions', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'আমার কাজ কবে ভালো হবে',
      }),
    )

    expect(result.meta?.language).toBe('bengali')
    expect(String(result.answer ?? '').length).toBeGreaterThan(50)
  })

  it('preserves the old answer path when structured flags are off', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'What is my Lagna?',
      }),
    )

    expect(result.meta?.structuredPipelineVersion).toBeUndefined()
    expect(result.meta?.questionFrameUsed).toBeUndefined()
    expect(result.meta?.structuredRoutingUsed).toBeUndefined()
  })

  it('uses the structured pipeline metadata when structured flags are enabled', async () => {
    process.env.ASTRO_USER_FACING_PLAN_ENABLED = 'true'
    process.env.ASTRO_FINAL_ANSWER_QUALITY_GATE_ENABLED = 'true'
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = 'true'

    const result = await generateReadingV2(
      makeInput({
        question: 'I am working hard and not getting promotion.',
      }),
    )

    expect(result.meta?.structuredPipelineVersion).toBe('phase8')
    expect(result.meta?.questionFrameUsed).toBe(true)
    expect(result.meta?.structuredRoutingUsed).toBe(true)
    expect(result.meta?.finalQualityPassed).toBe(true)
  })

  it('uses message when question is missing', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: undefined,
        message: 'I am tired of waiting for marriage',
        dasha: {
          mahadasha: 'Saturn',
        },
      }),
    )

    expect(result.answer ?? result.text ?? result.message).toBeTruthy()
    expect(result.meta?.version).toBe('v2')
    expect(result.meta?.topic).toBe('marriage')
  })

  it('formats exact facts without raw labels', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'What is my Lagna?',
        message: 'What is my Lagna?',
      }),
    )

    const answer = String(result.answer ?? '')

    expect(answer).toContain('Direct answer: Leo.')
    expect(answer).not.toContain('Accuracy:')
    expect(answer).not.toContain('How this is derived:')
    expect(answer).not.toContain('Totally accurate')
    expect(result.meta?.exactFactAnswered).toBe(true)
    expect(result.meta?.llmRefinerUsed).toBe(false)
  })

  it('does not throw when evidence is sparse', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'What is going on in my life?',
        chart: undefined,
        dasha: undefined,
        transits: undefined,
      }),
    )

    const answer = String(result.answer ?? result.text ?? result.message ?? '')

    expect(answer.length).toBeGreaterThan(50)
    expect(result.meta?.version).toBe('v2')
    expect(result.meta?.usedFallback).toBe(false)
  })

  it('falls back when question is missing and fallback is provided', async () => {
    const stableFallback = vi.fn(async () => ({
      answer: 'stable fallback answer',
      meta: {
        version: 'stable' as const,
      },
    }))

    const result = await generateReadingV2(
      makeInput({
        question: undefined,
        message: undefined,
      }),
      {
        stableFallback,
      },
    )

    expect(stableFallback).toHaveBeenCalledTimes(1)
    expect(result.answer).toBe('stable fallback answer')
    expect(result.meta?.version).toBe('v2')
    expect(result.meta?.usedFallback).toBe(true)
  })

  it('marks memory layer status and safety layer status', async () => {
    const result = await generateReadingV2(makeInput())

    expect(result.meta?.memoryLayer).toBe('disabled')
    expect(result.meta?.safetyLayer).toBe('enabled_phase_8')
  })

  it('does not render raw memory scaffolding', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'Will my career improve?',
      }),
    )

    const answer = String(result.answer ?? '')

    expect(answer).not.toContain('Earlier context:')
    expect(answer).not.toContain('Previous concern:')
  })

  it('runs safety layer on medical questions', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'Do I have a serious disease according to my chart?',
      }),
    )

    const answer = String(result.answer ?? '')

    expect(result.meta?.safetyLayer).toBe('enabled_phase_8')
    expect(result.meta?.['safetyRiskNames']).toContain('medical')
    expect(result.meta?.['safetyReplacedAnswer']).toBe(true)
    expect(answer).toContain('qualified doctor')
  })

  it('runs safety layer on death questions', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'Can my chart tell when I will die?',
      }),
    )

    const answer = String(result.answer ?? '')

    expect(result.meta?.safetyLayer).toBe('enabled_phase_8')
    expect(result.meta?.['safetyReplacedAnswer']).toBeUndefined()
    expect(answer).toContain('I would not predict death')
  })

  it('short-circuits business profit guarantees without chart anchors', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'Can astrology guarantee business profit?',
      }),
    )

    const answer = String(result.answer ?? '')

    expect(answer).toBe('Astrology cannot guarantee business profit. Do not invest, borrow, or risk money because of astrology. For business decisions, use accounts, contracts, cash flow, risk review, and qualified financial advice.')
    expect(answer).not.toContain('The main signal I see')
    expect(answer).not.toContain('Leo Lagna, Gemini Rasi')
  })

  it.each([
    'Give me a prediction for the next 10 years.',
    'Tell me my future for the next 5 years.',
    'Will I marry in 2032?',
    'What will happen after 4 years?',
  ])('short-circuits long horizon premium requests: %s', async (question) => {
    const result = await generateReadingV2(makeInput({ question }))

    expect(result.answer).toBe('Guru of guru (premium version) needed for predictions more than 3years')
    expect(result.meta?.premiumPredictionGate).toBe(true)
    expect(result.meta?.directV2Route).toBe(true)
  })

  it('does not premium-gate exact facts', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'Where is Sun placed?',
        message: 'Where is Sun placed?',
      }),
    )

    expect(result.answer).not.toBe('Guru of guru (premium version) needed for predictions more than 3years')
    expect(result.meta?.exactFactAnswered).toBe(true)
  })

  it('repairs low-cost remedy prompts without money boilerplate', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'What remedy can I do without spending money?',
      }),
    )

    const answer = String(result.answer ?? '')

    expect(answer).toContain('simple, free or low-cost, and optional')
    expect(answer).not.toContain('Focus first on stability')
  })

  it('handles family pressure without memory or chart leakage', async () => {
    const result = await generateReadingV2(
      makeInput({
        question: 'How do I set boundaries with family pressure?',
      }),
    )

    const answer = String(result.answer ?? '')

    expect(answer).toContain('Separate duty from guilt')
    expect(answer).not.toContain('You have touched on this theme before')
    expect(answer).not.toContain('The main signal I see')
  })

  it('does not use memory when ASTRO_MEMORY_ENABLED is false', async () => {
    process.env.ASTRO_MEMORY_ENABLED = 'false'

    const result = await generateReadingV2(makeInput())

    expect(result.meta?.memoryLayer).toBe('disabled')
    expect(result.meta?.memorySummaryUsed).toBe(false)
  })

  it('saves and uses memory when ASTRO_MEMORY_ENABLED is true', async () => {
    process.env.ASTRO_MEMORY_ENABLED = 'true'
    const userId = 'memory-orchestrator-user'

    await clearAstrologyMemory(userId)

    const first = await generateReadingV2(
      makeInput({
        userId,
        question: 'When will I get a job?',
      }),
    )

    expect(first.meta?.memoryLayer).toBe('enabled_phase_7')
    expect(first.meta?.memorySummaryUsed).toBe(false)

    const second = await generateReadingV2(
      makeInput({
        userId,
        question: 'When will I get a job?',
      }),
    )

    expect(second.meta?.memoryLayer).toBe('enabled_phase_7')
    expect(second.meta?.memorySummaryUsed).toBe(true)
    expect(String(second.answer ?? '')).not.toContain('You have touched on this theme before')
  })

  it('skips memory gracefully when userId is missing', async () => {
    process.env.ASTRO_MEMORY_ENABLED = 'true'

    const result = await generateReadingV2(
      makeInput({
        userId: undefined,
      }),
    )

    expect(result.meta?.memoryLayer).toBe('enabled_phase_7')
    expect(result.meta?.memorySummaryUsed).toBe(false)
  })

  it('does not include remedy evidence when ASTRO_REMEDIES_ENABLED is false and the question is not explicit remedy intent', async () => {
    process.env.ASTRO_REMEDIES_ENABLED = 'false'

    const result = await generateReadingV2(
      makeInput({
        question: 'What remedy should I do for career delay?',
        dasha: {
          mahadasha: 'Saturn',
        },
      }),
    )

    const answer = String(result.answer ?? '').toLowerCase()

    expect(result.meta?.remediesLayer).toBe('disabled')
    expect(result.meta?.remedyEvidenceIncluded).toBe(false)
    expect(answer).not.toContain('routine')
    expect(answer).not.toContain('wear blue sapphire immediately')
    expect(answer).not.toContain('guaranteed result')
  })

  it('does not include remedy evidence proactively for normal questions when ASTRO_REMEDIES_ENABLED is true', async () => {
    process.env.ASTRO_REMEDIES_ENABLED = 'true'

    const result = await generateReadingV2(
      makeInput({
        question: 'When will I get a job?',
        dasha: {
          mahadasha: 'Saturn',
        },
      }),
    )

    const answer = String(result.answer ?? '').toLowerCase()

    expect(result.meta?.remediesLayer).toBe('enabled_phase_9')
    expect(result.meta?.remedyEvidenceIncluded).toBe(false)
    expect(answer).not.toContain('routine')
  })

  it('does not include proactive remedy evidence when ASTRO_REMEDIES_ENABLED is false for normal questions', async () => {
    process.env.ASTRO_REMEDIES_ENABLED = 'false'

    const result = await generateReadingV2(
      makeInput({
        question: 'When will I get a job?',
        dasha: {
          mahadasha: 'Saturn',
        },
      }),
    )

    expect(result.meta?.remediesLayer).toBe('disabled')
    expect(result.meta?.remedyEvidenceIncluded).toBe(false)
  })

  it('does not include monthly guidance when ASTRO_MONTHLY_ENABLED is false', async () => {
    process.env.ASTRO_MONTHLY_ENABLED = 'false'

    const result = await generateReadingV2(
      makeInput({
        question: 'What is my guidance for this month?',
        dasha: {
          mahadasha: 'Saturn',
        },
      }),
    )

    const answer = String(result.answer ?? '')

    expect(result.meta?.monthlyLayer).toBe('disabled')
    expect(result.meta?.monthlyGuidanceIncluded).toBe(false)
    expect(answer).not.toContain('Monthly guidance')
  })

  it('does not include monthly guidance proactively for normal questions when ASTRO_MONTHLY_ENABLED is true', async () => {
    process.env.ASTRO_MONTHLY_ENABLED = 'true'

    const result = await generateReadingV2(
      makeInput({
        question: 'When will I get a job?',
        dasha: {
          mahadasha: 'Saturn',
        },
      }),
    )

    const answer = String(result.answer ?? '')

    expect(result.meta?.monthlyLayer).toBe('enabled_phase_11')
    expect(result.meta?.monthlyGuidanceIncluded).toBe(false)
    expect(answer).not.toContain('Monthly guidance')
  })

  it('does not include proactive monthly guidance when ASTRO_MONTHLY_ENABLED is false for normal questions', async () => {
    process.env.ASTRO_MONTHLY_ENABLED = 'false'

    const result = await generateReadingV2(
      makeInput({
        question: 'When will I get a job?',
        dasha: {
          mahadasha: 'Saturn',
        },
      }),
    )

    expect(result.meta?.monthlyLayer).toBe('disabled')
    expect(result.meta?.monthlyGuidanceIncluded).toBe(false)
  })

  it('composes business and exact fact answers without scaffolding leaks', async () => {
    const business = await generateReadingV2(
      makeInput({
        question: 'Can astrology guarantee business profit?',
      }),
    )

    const businessAnswer = String(business.answer ?? '')
    expect(businessAnswer).toBe('Astrology cannot guarantee business profit. Do not invest, borrow, or risk money because of astrology. For business decisions, use accounts, contracts, cash flow, risk review, and qualified financial advice.')
    expect(businessAnswer).not.toContain('The question is broad')
    expect(businessAnswer).not.toContain('internal')
    expect(businessAnswer).not.toContain('recognition')

    const exact = await generateReadingV2(
      makeInput({
        question: 'What is my Ascendant sign exactly?',
      }),
    )

    const exactAnswer = String(exact.answer ?? '')
    expect(exactAnswer).toContain('Direct answer:')
    expect(exactAnswer).toContain('Leo')
    expect(exactAnswer).not.toContain('Accuracy:')
    expect(exact.meta?.exactFactAnswered).toBe(true)
  })
})
