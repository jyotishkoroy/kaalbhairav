/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { generateAstrologyReadingWithRouter } from '@/lib/astro/reading/reading-router'
import type { AstrologyReadingInput } from '@/lib/astro/reading/reading-router-types'

const ORIGINAL_ENV = { ...process.env }

describe('astro reading router', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.ASTRO_READING_V2_ENABLED
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('uses the stable path by default', async () => {
    const stableGenerator = vi.fn(async () => ({
      answer: 'stable answer',
    }))
    const v2Generator = vi.fn(async () => ({
      answer: 'v2 answer',
    }))
    const input: AstrologyReadingInput = {
      question: 'Will my career improve?',
    }
    const result = await generateAstrologyReadingWithRouter(input, {
      stableGenerator,
      v2Generator,
    })
    expect(stableGenerator).toHaveBeenCalledTimes(1)
    expect(v2Generator).not.toHaveBeenCalled()
    expect(result.answer).toBe('stable answer')
    expect(result.meta?.version).toBe('stable')
  })

  it('uses V2 only when ASTRO_READING_V2_ENABLED is true', async () => {
    process.env.ASTRO_READING_V2_ENABLED = 'true'
    const stableGenerator = vi.fn(async () => ({
      answer: 'stable answer',
    }))
    const v2Generator = vi.fn(async () => ({
      answer: 'v2 answer',
      meta: {
        version: 'v2' as const,
      },
    }))
    const result = await generateAstrologyReadingWithRouter(
      { question: 'Will my career improve?' },
      {
        stableGenerator,
        v2Generator,
      },
    )
    expect(stableGenerator).not.toHaveBeenCalled()
    expect(v2Generator).toHaveBeenCalledTimes(1)
    expect(result.answer).toBe('v2 answer')
    expect(result.meta?.version).toBe('v2')
  })

  it('uses the default real V2 orchestrator when V2 flag is true but no custom V2 generator is provided', async () => {
    process.env.ASTRO_READING_V2_ENABLED = 'true'
    const stableGenerator = vi.fn(async () => ({
      answer: 'stable fallback answer',
    }))
    const result = await generateAstrologyReadingWithRouter(
      {
        userId: 'test-user',
        question: 'When will I get a job?',
        chart: {
          lagna: 'Leo',
          moonSign: 'Gemini',
        },
        dasha: {
          mahadasha: 'Saturn',
          antardasha: 'Mercury',
        },
      },
      {
        stableGenerator,
      },
    )

    expect(stableGenerator).not.toHaveBeenCalled()
    expect(result.answer ?? result.text ?? result.message).toBeTruthy()
    expect(result.meta?.version).toBe('v2')
    expect(result.meta?.usedFallback).toBe(false)
    expect(result.meta?.topic).toBe('career')
  })

  it('treats invalid flag values as false', async () => {
    process.env.ASTRO_READING_V2_ENABLED = 'maybe'
    const stableGenerator = vi.fn(async () => ({
      answer: 'stable answer',
    }))
    const v2Generator = vi.fn(async () => ({
      answer: 'v2 answer',
    }))
    const result = await generateAstrologyReadingWithRouter(
      { question: 'Will my career improve?' },
      {
        stableGenerator,
        v2Generator,
      },
    )
    expect(stableGenerator).toHaveBeenCalledTimes(1)
    expect(v2Generator).not.toHaveBeenCalled()
    expect(result.answer).toBe('stable answer')
  })
})
