/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { describe, expect, it } from 'vitest'
import { classifyUserConcern } from '@/lib/astro/reading/concern-classifier'
import {
  detectPreferredLanguage,
  getEmotionalLanguagePack,
  getReadingStyleForConcern,
  getToneInstruction,
  localizeSupportiveLine,
  pickLocalizedSoftener,
} from '@/lib/astro/reading/language-style'
import { applyLanguageTone } from '@/lib/astro/reading/language-transformer'

describe('Reading language and tone support', () => {
  it('detects Hinglish', () => {
    expect(detectPreferredLanguage('kab shaadi hogi')).toBe('hinglish')
    expect(detectPreferredLanguage('meri naukri kab lagegi')).toBe('hinglish')
  })

  it('detects Hindi script', () => {
    expect(detectPreferredLanguage('मेरी शादी कब होगी')).toBe('hindi')
  })

  it('detects Bengali script', () => {
    expect(detectPreferredLanguage('আমার কাজ কবে ভালো হবে')).toBe('bengali')
  })

  it('defaults to English', () => {
    expect(detectPreferredLanguage('When will my career improve?')).toBe(
      'english',
    )
  })

  it('loads emotional language packs', () => {
    expect(getEmotionalLanguagePack('english').delayNotDenial).toContain(
      'delay',
    )
    expect(getEmotionalLanguagePack('hinglish').delayNotDenial).toContain(
      'delay',
    )
    expect(getEmotionalLanguagePack('hindi').softeners.length).toBeGreaterThan(0)
    expect(getEmotionalLanguagePack('bengali').softeners.length).toBeGreaterThan(0)
  })

  it('returns localized supportive lines', () => {
    expect(
      localizeSupportiveLine({
        language: 'hinglish',
        key: 'delayNotDenial',
      }),
    ).toContain('delay')

    expect(pickLocalizedSoftener('hindi')).toBeTruthy()
    expect(pickLocalizedSoftener('bengali')).toBeTruthy()
  })

  it('creates reading style from concern', () => {
    const concern = classifyUserConcern('I am tired of waiting for marriage')
    const style = getReadingStyleForConcern(concern)

    expect(style.warmth).toBeGreaterThanOrEqual(7)
    expect(style.reassurance).toBeGreaterThanOrEqual(7)
  })

  it('creates tone instruction', () => {
    const concern = classifyUserConcern('Explain my Saturn Mahadasha')
    const instruction = getToneInstruction({
      language: 'english',
      concern,
    })

    expect(instruction).toContain('Tone:')
    expect(instruction).toContain('technical depth')
  })

  it('applies Hinglish tone', () => {
    const text =
      'This phase shows delay, not denial. I would be careful about one thing.'
    const transformed = applyLanguageTone({
      text,
      language: 'hinglish',
    })

    expect(transformed).toContain('Yeh phase')
    expect(transformed).toContain('delay')
  })

  it('adds Hindi support line without removing original reading', () => {
    const text = 'This phase shows delay, not denial.'
    const transformed = applyLanguageTone({
      text,
      language: 'hindi',
    })

    expect(transformed).toContain('यह')
    expect(transformed).toContain(text)
  })

  it('adds Bengali support line without removing original reading', () => {
    const text = 'This phase shows delay, not denial.'
    const transformed = applyLanguageTone({
      text,
      language: 'bengali',
    })

    expect(transformed).toContain('এটা')
    expect(transformed).toContain(text)
  })

  it('leaves English unchanged', () => {
    const text = 'This phase shows delay, not denial.'

    expect(
      applyLanguageTone({
        text,
        language: 'english',
      }),
    ).toBe(text)
  })
})
