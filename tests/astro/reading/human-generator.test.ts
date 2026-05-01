/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, expect, it } from 'vitest'
import type { AstroEvidence } from '@/lib/astro/interpretation/evidence'
import { buildAstroEvidence } from '@/lib/astro/interpretation'
import { classifyUserConcern } from '@/lib/astro/reading/concern-classifier'
import {
  generateHumanReading,
  generateHumanReadingResult,
} from '@/lib/astro/reading/human-generator'
import { detectPreferredLanguage } from '@/lib/astro/reading/language-style'
import { selectReadingMode } from '@/lib/astro/reading/reading-modes'
import {
  containsAiStylePhrase,
  lintHumanStyle,
} from '@/lib/astro/reading/style-linter'

function makeEvidence(): AstroEvidence[] {
  return [
    {
      id: 'career-saturn-mahadasha',
      topic: 'career',
      factor: 'Saturn Mahadasha',
      humanMeaning:
        'Career growth may feel slower, but this phase supports long-term stability through discipline.',
      likelyExperience:
        'The person may feel under-recognized or delayed despite consistent effort.',
      guidance:
        'Focus on skill-building, process, discipline, and stable choices rather than sudden jumps.',
      caution: 'Avoid changing direction only because of frustration or comparison.',
      timingHint:
        'Improvement is more likely through gradual consolidation than one sudden breakthrough.',
      confidence: 'medium',
      visibleToUser: true,
    },
  ]
}

describe('Human reading generator', () => {
  it('generates a readable human-style answer from evidence', () => {
    const concern = classifyUserConcern(
      'I am working hard but not getting promotion. When will things improve?',
    )

    const answer = generateHumanReading({
      concern,
      evidence: makeEvidence(),
      question:
        'I am working hard but not getting promotion. When will things improve?',
    })

    expect(answer.length).toBeGreaterThan(300)
    expect(answer).toContain('I')
    expect(answer).toContain('Saturn Mahadasha')
    expect(answer).toContain('My practical guidance')
    expect(answer).not.toContain('as an AI')
    expect(answer).not.toContain('Based on the data provided')
    expect(containsAiStylePhrase(answer)).toBe(false)
  })

  it('creates a typed Reading V2 result', () => {
    const concern = classifyUserConcern('When will I get a job?')
    const result = generateHumanReadingResult({
      concern,
      evidence: makeEvidence(),
      question: 'When will I get a job?',
    })

    expect(result.answer).toBeTruthy()
    expect(result.meta.version).toBe('v2')
    expect(result.meta.topic).toBe('career')
    expect(result.meta.evidenceCount).toBe(1)
  })

  it('handles empty evidence without crashing', () => {
    const concern = classifyUserConcern('What is going on in my life?')
    const answer = generateHumanReading({
      concern,
      evidence: [],
      question: 'What is going on in my life?',
    })

    expect(answer.length).toBeGreaterThan(80)
    expect(answer).not.toContain('as an AI')
  })

  it('includes memory summary when provided', () => {
    const concern = classifyUserConcern('When will I get a job?')
    const answer = generateHumanReading({
      concern,
      evidence: makeEvidence(),
      question: 'Last time I asked about career delay. When will I get a job?',
      memorySummary:
        'Last time, the user asked about career delay and was advised to focus on steady preparation.',
    })

    expect(answer).toContain('career')
    expect(answer).not.toContain('You have touched on this theme before')
    expect(answer).not.toContain('Earlier context')
  })

  it('uses natural openings instead of template scaffolding', () => {
    const career = generateHumanReading({
      concern: classifyUserConcern('I am working hard but not getting promotion.'),
      evidence: makeEvidence(),
      question: 'I am working hard but not getting promotion.',
    })
    const timing = generateHumanReading({
      concern: classifyUserConcern('When will I get a job?'),
      evidence: makeEvidence(),
      question: 'When will I get a job?',
    })
    const spiritual = generateHumanReading({
      concern: classifyUserConcern('What spiritual practice should I follow?'),
      evidence: makeEvidence(),
      question: 'What spiritual practice should I follow?',
    })

    expect(career).not.toContain('A useful career reading stays practical')
    expect(career).not.toContain('The overall pattern matters more than one isolated prediction')
    expect(career).not.toContain('The first thing I would look at here')
    expect(timing).not.toContain('Let us make this practical rather than overly predictive')
    expect(spiritual).not.toContain('Spiritual guidance should reduce fear')
    expect(spiritual).not.toContain('So my honest reading is')
  })

  it('lints common AI-style phrases', () => {
    const text =
      'Based on the data provided, here are the key insights. In conclusion, as an AI, it is important to note this.'
    const linted = lintHumanStyle(text)

    expect(linted).not.toContain('Based on the data provided')
    expect(linted).not.toContain('as an AI')
    expect(linted).toContain('What I am seeing here')
    expect(linted).toContain('So my honest reading is')
  })

  it('detects preferred language', () => {
    expect(detectPreferredLanguage('kab shaadi hogi')).toBe('hinglish')
    expect(detectPreferredLanguage('मेरी शादी कब होगी')).toBe('hindi')
    expect(detectPreferredLanguage('আমার কাজ কবে ভালো হবে')).toBe('bengali')
    expect(detectPreferredLanguage('When will my career improve?')).toBe('english')
  })

  it('generates Hinglish-flavored support for Hinglish questions', () => {
    const concern = classifyUserConcern('meri naukri kab lagegi')
    const answer = generateHumanReading({
      concern,
      evidence: makeEvidence(),
      question: 'meri naukri kab lagegi',
    })

    expect(answer).toContain('Yeh')
    expect(answer.length).toBeGreaterThan(250)
  })

  it('generates Hindi support line for Hindi script questions', () => {
    const concern = classifyUserConcern('मेरी नौकरी कब लगेगी')
    const answer = generateHumanReading({
      concern,
      evidence: makeEvidence(),
      question: 'मेरी नौकरी कब लगेगी',
    })

    expect(/[अ-ह]/.test(answer)).toBe(true)
    expect(answer.length).toBeGreaterThan(250)
  })

  it('generates Bengali support line for Bengali script questions', () => {
    const concern = classifyUserConcern('আমার কাজ কবে ভালো হবে')
    const answer = generateHumanReading({
      concern,
      evidence: makeEvidence(),
      question: 'আমার কাজ কবে ভালো হবে',
    })

    expect(/[অ-হ]/.test(answer)).toBe(true)
    expect(answer.length).toBeGreaterThan(250)
  })

  it('selects reading modes from concern shape', () => {
    expect(selectReadingMode(classifyUserConcern('What remedy should I do?'))).toBe(
      'remedy_focused',
    )
    expect(selectReadingMode(classifyUserConcern('When will I get a job?'))).toBe(
      'timing_prediction',
    )
    expect(
      selectReadingMode(classifyUserConcern('Should I change my job now?')),
    ).toBe('practical_guidance')
    expect(
      selectReadingMode(
        classifyUserConcern('Explain my Saturn Mahadasha and Moon nakshatra.'),
      ),
    ).toBe('deep_astrology')
  })

  it('can generate from the real evidence engine output', () => {
    const concern = classifyUserConcern('When will I get a job?')
    const evidence = buildAstroEvidence({
      concern,
      chart: {
        lagna: 'Leo',
        moonSign: 'Gemini',
      },
      dasha: {
        mahadasha: 'Saturn',
        antardasha: 'Mercury',
      },
    })

    const answer = generateHumanReading({
      concern,
      evidence,
      question: 'When will I get a job?',
    })

    expect(evidence.length).toBeGreaterThan(0)
    expect(answer.length).toBeGreaterThan(250)
    expect(answer).toContain('Saturn')
  })

  it('does not expose hidden evidence marked invisible', () => {
    const concern = classifyUserConcern('When will I get a job?')
    const evidence: AstroEvidence[] = [
      {
        ...makeEvidence()[0],
        factor: 'Hidden internal factor',
        visibleToUser: false,
      },
    ]

    const answer = generateHumanReading({
      concern,
      evidence,
      question: 'When will I get a job?',
    })

    expect(answer).not.toContain('Hidden internal factor')
    expect(answer.length).toBeGreaterThan(80)
  })
})
