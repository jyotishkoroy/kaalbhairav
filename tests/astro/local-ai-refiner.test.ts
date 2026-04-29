/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, expect, it, vi } from 'vitest'
import {
  refineReadingWithLocalAI,
  refineReadingWithSafeLLM,
  shouldAcceptRefinedAnswer,
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
    expect(call?.system).toContain(
      'Do not replace a topic-specific answer with a generic disclaimer',
    )
    expect(call?.system).toContain('medical')
    expect(call?.system).toContain('guaranteed')
  })

  it('rejects monthly guidance added to a non-monthly answer', () => {
    expect(
      shouldAcceptRefinedAnswer({
        originalAnswer: 'The answer is about career stability.',
        refinedAnswer: 'Monthly guidance for April 2026: stay steady.',
        question: 'When will I get a job?',
      }),
    ).toBe(false)
  })

  it('rejects multi-topic dump added by the refiner', () => {
    expect(
      shouldAcceptRefinedAnswer({
        originalAnswer: 'The answer is about timing and effort.',
        refinedAnswer:
          'Career and relationship both matter here, so stay calm and balanced.',
        question: 'How will tomorrow be?',
      }),
    ).toBe(false)
  })

  it('rejects remedy text added when the question was not about remedies', () => {
    expect(
      shouldAcceptRefinedAnswer({
        originalAnswer: 'The answer is about timing only.',
        refinedAnswer: 'A simple remedy can help here.',
        question: 'How will tomorrow be?',
      }),
    ).toBe(false)
  })

  it('accepts a refined answer that preserves career topic', () => {
    expect(
      shouldAcceptRefinedAnswer({
        originalAnswer: 'Career effort is the focus.',
        refinedAnswer: 'Career effort is the focus, and progress should stay practical.',
        question: 'I am working hard and not getting promotion.',
      }),
    ).toBe(true)
  })

  it('accepts a refined answer that preserves a specific timing date', () => {
    expect(
      shouldAcceptRefinedAnswer({
        originalAnswer: 'The answer mentions 8th November 2026 and timing.',
        refinedAnswer: 'The answer mentions 8th November 2026 and timing clearly.',
        question: 'how will be my 8th November 2026?',
      }),
    ).toBe(true)
  })
})
