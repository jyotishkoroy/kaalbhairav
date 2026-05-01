import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateReadingV2 } from '@/lib/astro/reading/reading-orchestrator-v2'
import type { AstrologyReadingInput } from '@/lib/astro/reading/reading-router-types'

const refineMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/astro/reading/local-ai-refiner', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/astro/reading/local-ai-refiner')>()

  return {
    ...actual,
    refineReadingWithSafeLLM: refineMock,
  }
})

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

describe('Reading Orchestrator V2 with safe LLM refinement', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.ASTRO_MEMORY_ENABLED
    delete process.env.ASTRO_REMEDIES_ENABLED
    delete process.env.ASTRO_MONTHLY_ENABLED
    delete process.env.ASTRO_LLM_REFINER_ENABLED
    delete process.env.ASTRO_LLM_PROVIDER
    delete process.env.GROQ_MODEL
    delete process.env.GROQ_MAX_TOKENS
    delete process.env.GROQ_TEMPERATURE
    delete process.env.GROQ_TIMEOUT_MS
    refineMock.mockReset()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('keeps refiner disabled by default', async () => {
    process.env.ASTRO_READING_V2_ENABLED = 'true'
    process.env.ASTRO_LLM_PROVIDER = 'groq'

    const result = await generateReadingV2(makeInput())

    expect(result.meta?.llmProvider).toBe('groq')
    expect(result.meta?.llmRefinerEnabled).toBe(false)
    expect(result.meta?.llmRefinerUsed).toBe(false)
    expect(refineMock).not.toHaveBeenCalled()
  })

  it('uses safe refiner when enabled', async () => {
    process.env.ASTRO_READING_V2_ENABLED = 'true'
    process.env.ASTRO_LLM_PROVIDER = 'groq'
    process.env.ASTRO_LLM_REFINER_ENABLED = 'true'
    process.env.GROQ_MODEL = 'openai/gpt-oss-120b'

    refineMock.mockResolvedValueOnce({
      answer: 'Refined with safe human flow.',
      usedLLM: true,
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      fallback: false,
    })

    const result = await generateReadingV2(makeInput())

    expect(String(result.answer ?? '')).toContain('clarify the role you want')
    expect(result.meta?.llmProvider).toBe('groq')
    expect(result.meta?.llmRefinerEnabled).toBe(true)
    expect(result.meta?.llmRefinerUsed).toBe(true)
    expect(result.meta?.llmRefinerFallback).toBe(false)
    expect(result.meta?.llmModel).toBe('openai/gpt-oss-120b')
    expect(refineMock).toHaveBeenCalledTimes(1)
  })

  it('runs safety after refiner and falls back from unsafe text', async () => {
    process.env.ASTRO_READING_V2_ENABLED = 'true'
    process.env.ASTRO_LLM_PROVIDER = 'groq'
    process.env.ASTRO_LLM_REFINER_ENABLED = 'true'
    process.env.GROQ_MODEL = 'openai/gpt-oss-120b'

    refineMock.mockResolvedValueOnce({
      answer: 'You have cancer. Your death date is shown.',
      usedLLM: true,
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      fallback: false,
    })

    const result = await generateReadingV2(
      makeInput({
        question: 'Do I have a serious disease according to my chart?',
      }),
    )

    const answer = String(result.answer ?? '')

    expect(answer).not.toContain('You have cancer')
    expect(answer).toContain('qualified doctor')
    expect(result.meta?.safetyRiskNames).toEqual(
      expect.arrayContaining(['medical', 'death']),
    )
    expect(result.meta?.safetyReplacedAnswer).toBe(true)
  })
})
