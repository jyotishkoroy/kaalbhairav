import { describe, expect, it, vi } from 'vitest'
import { refineReadingWithLocalAI } from '@/lib/astro/reading/local-ai-refiner'
import { disabledLLMProvider } from '@/lib/llm'
import type { LLMProvider } from '@/lib/llm/provider'

describe('local AI reading refiner', () => {
  it('returns original answer when provider is disabled', async () => {
    const result = await refineReadingWithLocalAI({
      question: 'When will my career improve?',
      answer: 'This is the deterministic answer.',
      provider: disabledLLMProvider,
    })

    expect(result).toEqual({
      answer: 'This is the deterministic answer.',
      usedLLM: false,
      provider: 'disabled',
    })
  })

  it('returns provider text when local provider succeeds', async () => {
    const provider: LLMProvider = {
      name: 'test-provider',
      generate: vi.fn(async () => ({
        text: 'Refined local answer.',
        provider: 'test-provider',
      })),
    }

    const result = await refineReadingWithLocalAI({
      question: 'When will my career improve?',
      answer: 'This is the deterministic answer.',
      provider,
    })

    expect(result).toEqual({
      answer: 'Refined local answer.',
      usedLLM: true,
      provider: 'test-provider',
    })
    expect(provider.generate).toHaveBeenCalledTimes(1)
  })

  it('falls back to original answer when provider returns empty text', async () => {
    const provider: LLMProvider = {
      name: 'empty-provider',
      generate: vi.fn(async () => ({
        text: '   ',
        provider: 'empty-provider',
      })),
    }

    const result = await refineReadingWithLocalAI({
      question: 'When will my career improve?',
      answer: 'Original answer.',
      provider,
    })

    expect(result).toEqual({
      answer: 'Original answer.',
      usedLLM: false,
      provider: 'empty-provider',
    })
  })

  it('falls back to original answer when provider throws', async () => {
    const provider: LLMProvider = {
      name: 'throwing-provider',
      generate: vi.fn(async () => {
        throw new Error('local server down')
      }),
    }

    const result = await refineReadingWithLocalAI({
      question: 'When will my career improve?',
      answer: 'Original answer.',
      provider,
    })

    expect(result).toEqual({
      answer: 'Original answer.',
      usedLLM: false,
      provider: 'throwing-provider',
    })
  })
})
