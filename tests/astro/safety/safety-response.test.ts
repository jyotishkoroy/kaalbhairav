/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, expect, it } from 'vitest'
import { classifyUserConcern } from '@/lib/astro/reading/concern-classifier'
import {
  applySafetyFilter,
  containsForbiddenClaim,
} from '@/lib/astro/safety'

describe('Astro safety response filter', () => {
  it('replaces medical diagnosis answers with medical boundary', () => {
    const concern = classifyUserConcern(
      'Do I have a serious disease according to my chart?',
    )
    const result = applySafetyFilter({
      question: 'Do I have a serious disease according to my chart?',
      answer: 'You have cancer according to the chart.',
      concern,
    })

    expect(result.replaced).toBe(true)
    expect(result.answer).toContain('qualified doctor')
    expect(result.answer).not.toContain('You have cancer')
  })

  it('replaces death prediction answers with lifespan boundary', () => {
    const concern = classifyUserConcern('When will I die?')
    const result = applySafetyFilter({
      question: 'When will I die?',
      answer: 'Your death date is shown clearly.',
      concern,
    })

    expect(result.replaced).toBe(true)
    expect(result.answer).toContain('I would not predict death, lifespan, or death timing.')
    expect(result.answer).not.toContain('death date is shown')
  })

  it('adds fear-based boundary without replacing normal answer', () => {
    const concern = classifyUserConcern('Am I cursed?')
    const result = applySafetyFilter({
      question: 'Am I cursed?',
      answer: 'This looks emotionally heavy, but it needs calm handling.',
      concern,
    })

    expect(result.replaced).toBe(false)
    expect(result.answer).toContain('avoid fear-based conclusions')
    expect(result.answer).toContain('This looks emotionally heavy')
  })

  it('removes forbidden claims', () => {
    const concern = classifyUserConcern('Will I marry?')
    const result = applySafetyFilter({
      question: 'Will I marry?',
      answer: 'You will never marry.',
      concern,
    })

    expect(result.forbiddenClaimsRemoved).toBe(true)
    expect(result.answer).not.toContain('You will never marry')
    expect(result.answer).not.toContain('[removed unsafe claim]')
    expect(result.answer).not.toContain('unsafe claim]')
  })

  it('detects forbidden claim text', () => {
    expect(containsForbiddenClaim('You are cursed.')).toBe(true)
    expect(containsForbiddenClaim('This is a careful reading.')).toBe(false)
  })

  it('does not alter a normal safe answer', () => {
    const concern = classifyUserConcern('When will my career improve?')
    const answer = 'This is a slow-growth phase. Focus on skill-building.'
    const result = applySafetyFilter({
      question: 'When will my career improve?',
      answer,
      concern,
    })

    expect(result.replaced).toBe(false)
    expect(result.answer).toBe(answer)
    expect(result.riskNames).toEqual([])
  })
})
