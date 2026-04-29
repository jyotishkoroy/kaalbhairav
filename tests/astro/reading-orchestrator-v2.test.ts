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
    expect(String(result.answer ?? '')).toContain('Yeh')
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
    expect(result.meta?.['safetyRiskNames']).toContain('death')
    expect(result.meta?.['safetyReplacedAnswer']).toBe(true)
    expect(answer).toContain('I would not predict death')
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
        question: 'Should I change my job now?',
      }),
    )

    expect(second.meta?.memoryLayer).toBe('enabled_phase_7')
    expect(second.meta?.memorySummaryUsed).toBe(true)
    expect(String(second.answer ?? '')).toContain('From the earlier context')
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

  it('includes remedy evidence for explicit remedy requests even when ASTRO_REMEDIES_ENABLED is false', async () => {
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
    expect(result.meta?.remedyEvidenceIncluded).toBe(true)
    expect(answer).toContain('routine')
    expect(answer).not.toContain('wear blue sapphire immediately')
    expect(answer).not.toContain('guaranteed result')
  })

  it('can include remedy evidence proactively when ASTRO_REMEDIES_ENABLED is true', async () => {
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
    expect(result.meta?.remedyEvidenceIncluded).toBe(true)
    expect(answer).toContain('routine')
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

  it('includes monthly guidance for explicit monthly requests even when ASTRO_MONTHLY_ENABLED is false', async () => {
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
    expect(result.meta?.monthlyGuidanceIncluded).toBe(true)
    expect(answer).toContain('Monthly guidance')
    expect(answer).toContain('Career focus:')
  })

  it('can include monthly guidance proactively when ASTRO_MONTHLY_ENABLED is true', async () => {
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
    expect(result.meta?.monthlyGuidanceIncluded).toBe(true)
    expect(answer).toContain('Monthly guidance')
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
})
