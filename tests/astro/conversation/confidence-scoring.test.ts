/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, it, expect } from 'vitest'
import { computeConfidence } from '../../../lib/astro/conversation/confidence-scoring'
import type { PredictionContext } from '../../../lib/astro/types'
import type { ConversationState } from '../../../lib/astro/conversation/types'

function makeContext(overrides: Partial<PredictionContext> = {}): PredictionContext {
  return {
    do_not_recalculate: true,
    chart_identity: {
      profile_id: 'test',
      chart_version_id: 'test',
      schema_version: '1.0.0',
      engine_version: '1.0.0',
      ephemeris_version: '1.0.0',
      calculation_status: 'real',
    },
    confidence: {},
    warnings: [],
    core_natal_summary: {},
    life_area_signatures: { career_status: { area: 'career_status' } },
    current_timing: { summary: 'active' },
    dashas: { current: 'Jupiter' },
    doshas: {},
    expanded_context: {
      daily_transits_summary: 'Sun in Gemini',
      panchang_summary: 'Tithi: Panchami',
      current_timing_summary: 'Jupiter Mahadasha',
      navamsa_lagna: null,
      navamsa_summary: null,
      aspects_summary: null,
      life_areas_summary: null,
      sections_unavailable: [],
    },
    allowed_astro_terms: [],
    unsupported_fields: [],
    llm_instructions: {
      do_not_calculate_astrology: true,
      do_not_modify_chart_values: true,
      do_not_invent_missing_data: true,
      do_not_infer_missing_data: true,
      explain_only_from_supplied_context: true,
      mention_warnings_where_relevant: true,
      refuse_deterministic_medical_legal_financial_death_or_guaranteed_event_predictions: true,
    },
    ...overrides,
  } as PredictionContext
}

function makeState(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    main_question: 'My career question',
    topic: 'career',
    specificity: 'clear',
    sub_questions_asked: 0,
    known_context: { situation: 'Meeting with manager', timeframe: 'today' },
    ready_to_answer: true,
    needs_follow_up: false,
    high_risk_flags: [],
    ...overrides,
  }
}

describe('computeConfidence', () => {
  it('null context → all 0, low', () => {
    const r = computeConfidence(null, makeState())
    expect(r.overall_confidence_score).toBe(0)
    expect(r.confidence_label).toBe('low')
  })

  it('stub engine → astro confidence capped at 30', () => {
    const ctx = makeContext({ chart_identity: { ...makeContext().chart_identity, calculation_status: 'stub' } })
    const r = computeConfidence(ctx, makeState())
    expect(r.astrology_data_confidence).toBeLessThanOrEqual(30)
    expect(r.penalty_reasons.some(p => p.includes('stub'))).toBe(true)
  })

  it('daily_guidance with no transits → penalty applied', () => {
    const ctx = makeContext({
      expanded_context: {
        daily_transits_summary: null,
        panchang_summary: null,
        current_timing_summary: 'Jupiter Mahadasha',
        navamsa_lagna: null,
        navamsa_summary: null,
        aspects_summary: null,
        life_areas_summary: null,
        sections_unavailable: ['daily_transits', 'panchang'],
      },
    })
    const r = computeConfidence(ctx, makeState({ topic: 'daily_guidance' }))
    expect(r.penalty_reasons.some(p => p.includes('daily transits'))).toBe(true)
    expect(r.penalty_reasons.some(p => p.includes('panchang'))).toBe(true)
  })

  it('high-risk flag → situation_confidence penalty', () => {
    const r = computeConfidence(makeContext(), makeState({ high_risk_flags: ['death'] }))
    expect(r.penalty_reasons.some(p => p.includes('high-risk'))).toBe(true)
  })

  it('no dashas → penalty', () => {
    const ctx = makeContext({ dashas: {} })
    const r = computeConfidence(ctx, makeState())
    expect(r.penalty_reasons.some(p => p.includes('dasha'))).toBe(true)
  })

  it('good data → medium-high or higher', () => {
    const r = computeConfidence(makeContext(), makeState())
    expect(['medium', 'medium-high', 'high']).toContain(r.confidence_label)
  })

  it('confidence label matches score ranges', () => {
    const r = computeConfidence(makeContext(), makeState())
    const score = r.overall_confidence_score
    if (score >= 85) expect(r.confidence_label).toBe('high')
    else if (score >= 65) expect(r.confidence_label).toBe('medium-high')
    else if (score >= 40) expect(r.confidence_label).toBe('medium')
    else expect(r.confidence_label).toBe('low')
  })
})
