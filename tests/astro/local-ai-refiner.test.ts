import { describe, expect, it, vi } from 'vitest'
import {
  refineReadingWithLocalAI,
  refineReadingWithSafeLLM,
} from '@/lib/astro/reading/local-ai-refiner'
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

  it('returns original answer when provider is disabled in safe refiner', async () => {
    const result = await refineReadingWithSafeLLM({
      question: 'When will my career improve?',
      answer: 'This is the deterministic answer.',
      provider: disabledLLMProvider,
    })

    expect(result).toEqual({
      answer: 'This is the deterministic answer.',
      usedLLM: false,
      provider: 'disabled',
      fallback: true,
    })
  })

  it('returns provider text when safe provider succeeds', async () => {
    const provider: LLMProvider = {
      name: 'test-provider',
      generate: vi.fn(async () => ({
        text: 'Refined local answer.',
        provider: 'test-provider',
      })),
    }

    const result = await refineReadingWithSafeLLM({
      question: 'When will my career improve?',
      answer: 'This is the deterministic answer.',
      provider,
    })

    expect(result).toEqual({
      answer: 'Refined local answer.',
      usedLLM: true,
      provider: 'test-provider',
      model: undefined,
      fallback: false,
    })
  })

  it('falls back to original answer when safe provider returns empty text', async () => {
    const provider: LLMProvider = {
      name: 'empty-provider',
      generate: vi.fn(async () => ({
        text: '   ',
        provider: 'empty-provider',
      })),
    }

    const result = await refineReadingWithSafeLLM({
      question: 'When will my career improve?',
      answer: 'Original answer.',
      provider,
    })

    expect(result).toEqual({
      answer: 'Original answer.',
      usedLLM: false,
      provider: 'empty-provider',
      model: undefined,
      fallback: true,
    })
  })

  it('falls back to original answer when safe provider throws', async () => {
    const provider: LLMProvider = {
      name: 'throwing-provider',
      generate: vi.fn(async () => {
        throw new Error('local server down')
      }),
    }

    const result = await refineReadingWithSafeLLM({
      question: 'When will my career improve?',
      answer: 'Original answer.',
      provider,
    })

    expect(result).toEqual({
      answer: 'Original answer.',
      usedLLM: false,
      provider: 'throwing-provider',
      fallback: true,
    })
  })

  it('instructs provider to rewrite without adding unsafe claims', async () => {
    const generate = vi.fn(async () => ({
      text: 'Refined answer.',
      provider: 'test-provider',
    }))

    const provider: LLMProvider = {
      name: 'test-provider',
      generate,
    }

    await refineReadingWithSafeLLM({
      question: 'When will I get a job?',
      answer: 'Original safe answer.',
      provider,
    })

    const callArgs = generate.mock.calls[0] as unknown as
      | [{ system?: string }]
      | undefined
    const call = callArgs?.[0]
    expect(call).toBeDefined()

    expect(call?.system).toContain('Do not add new predictions')
    expect(call?.system).toContain('Do not add new remedies')
    expect(call?.system).toContain('medical')
    expect(call?.system).toContain('guaranteed')
  })
})
