import { describe, expect, it, vi } from 'vitest'
import { generateReadingV2 } from '@/lib/astro/reading/reading-orchestrator-v2'
import type { AstrologyReadingInput } from '@/lib/astro/reading/reading-router-types'

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
  it('returns a V2 answer with metadata', async () => {
    const result = await generateReadingV2(makeInput())

    expect(result.answer ?? result.text ?? result.message).toBeTruthy()
    expect(result.meta?.version).toBe('v2')
    expect(result.meta?.topic).toBe('career')
    expect(result.meta?.evidenceCount).toBeGreaterThan(0)
    expect(result.meta?.usedFallback).toBe(false)
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

  it('marks memory and safety layers as not enabled in phase 6', async () => {
    const result = await generateReadingV2(makeInput())

    expect(result.meta?.memoryLayer).toBe('not_enabled_phase_6')
    expect(result.meta?.safetyLayer).toBe('not_enabled_phase_6')
  })
})
