/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { describe, expect, it } from 'vitest'
import type {
  AstroEvidence,
  AstroEvidenceWithSource,
  ReadingTopic,
} from '@/lib/astro/interpretation/evidence'
import type {
  BirthDetailsInput,
  ChartSummary,
  ReadingV2Input,
  ReadingV2Result,
  UserConcern,
} from '@/lib/astro/reading/reading-types'
import { createPredictionContext } from '@/lib/astro/reading/prediction-context'

describe('Reading V2 type model', () => {
  it('accepts a valid AstroEvidence object', () => {
    const evidence: AstroEvidence = {
      id: 'saturn-career-delay',
      topic: 'career',
      factor: 'Saturn influence',
      humanMeaning: 'Slow but stable growth.',
      likelyExperience: 'The person may feel progress is delayed.',
      guidance: 'Stay consistent.',
      confidence: 'medium',
      visibleToUser: true,
    }

    expect(evidence.topic).toBe('career')
    expect(evidence.confidence).toBe('medium')
  })

  it('accepts AstroEvidence with structured source metadata', () => {
    const evidence: AstroEvidenceWithSource = {
      id: 'moon-nakshatra-emotion',
      topic: 'relationship',
      factor: 'Moon nakshatra',
      humanMeaning: 'The emotional pattern is important.',
      likelyExperience: 'The person may overthink close relationships.',
      guidance: 'Pause before making final emotional decisions.',
      confidence: 'low',
      visibleToUser: true,
      sources: [
        {
          kind: 'nakshatra',
          label: 'Moon Nakshatra',
          value: 'Mrigasira',
        },
      ],
    }

    expect(evidence.sources?.[0]?.kind).toBe('nakshatra')
  })

  it('accepts a valid UserConcern object', () => {
    const concern: UserConcern = {
      topic: 'marriage',
      emotionalTone: 'sad',
      questionType: 'timing',
      needsReassurance: true,
      wantsTechnicalAstrology: false,
      wantsPracticalSteps: true,
      highRiskFlags: [],
    }

    expect(concern.topic).toBe('marriage')
    expect(concern.needsReassurance).toBe(true)
  })

  it('accepts Reading V2 input and result objects', () => {
    const birthDetails: BirthDetailsInput = {
      date: '1999-06-14',
      time: '09:58:00',
      place: 'Kolkata',
      timezone: 5.5,
      latitude: 22.5667,
      longitude: 88.3667,
    }

    const input: ReadingV2Input = {
      userId: 'test-user',
      question: 'When will my career improve?',
      birthDetails,
    }
    const result: ReadingV2Result = {
      answer: 'This is a typed Reading V2 response.',
      meta: {
        version: 'v2',
        topic: 'career',
        mode: 'practical_guidance',
        evidenceCount: 1,
      },
    }

    expect(input.question).toContain('career')
    expect(result.meta.version).toBe('v2')
  })

  it('creates a prediction context with safe defaults', () => {
    const concern: UserConcern = {
      topic: 'career',
      emotionalTone: 'anxious',
      questionType: 'timing',
      needsReassurance: true,
      wantsTechnicalAstrology: false,
      wantsPracticalSteps: true,
      highRiskFlags: [],
    }

    const chartSummary: ChartSummary = {
      lagna: 'Leo',
      moonSign: 'Gemini',
      nakshatra: 'Mrigasira',
    }
    const context = createPredictionContext({
      concern,
      chartSummary,
    })

    expect(context.concern.topic).toBe('career')
    expect(context.chartSummary.lagna).toBe('Leo')
    expect(context.evidence).toEqual([])
    expect(context.safetyWarnings).toEqual([])
  })

  it('keeps ReadingTopic constrained to known topics', () => {
    const topic: ReadingTopic = 'spirituality'

    expect(topic).toBe('spirituality')
  })
})
