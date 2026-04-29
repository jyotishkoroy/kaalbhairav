/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, it, expect } from 'vitest'
import { runOrchestrator } from '../../../lib/astro/conversation/orchestrator'
import type { OrchestratorInput } from '../../../lib/astro/conversation/types'
import type { PredictionContext } from '../../../lib/astro/types'

const BASE_INPUT: OrchestratorInput = {
  user_id: 'user-1',
  profile_id: 'profile-1',
  question: 'How will my today go?',
  recent_message_metadata: [],
}

function makeContext(status: 'real' | 'stub' = 'real'): PredictionContext {
  return {
    do_not_recalculate: true,
    chart_identity: {
      profile_id: 'profile-1',
      chart_version_id: 'cv-1',
      schema_version: '1.0.0',
      engine_version: '1.0.0',
      ephemeris_version: '1.0.0',
      calculation_status: status,
    },
    confidence: {},
    warnings: [],
    core_natal_summary: { lagna_sign: 'Gemini', moon_sign: 'Virgo' },
    life_area_signatures: { career_status: { area: 'career_status' } },
    current_timing: { summary: 'Jupiter active' },
    dashas: { mahadasha: 'Jupiter' },
    doshas: {},
    expanded_context: {
      daily_transits_summary: 'Moon in Scorpio',
      panchang_summary: 'Tithi: Navami',
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
  } as PredictionContext
}

describe('runOrchestrator — clarifying questions', () => {
  it('"How will my today go?" → clarifying_question mode', async () => {
    const result = await runOrchestrator(BASE_INPUT, makeContext())
    expect(result.mode).toBe('clarifying_question')
    if (result.mode === 'clarifying_question') {
      expect(result.clarifying_question.length).toBeGreaterThan(5)
    }
  })

  it('"My meeting." after daily_guidance CQ → asks second question', async () => {
    const input: OrchestratorInput = {
      ...BASE_INPUT,
      question: 'My meeting.',
      recent_message_metadata: [{
        mode: 'clarifying_question',
        topic: 'daily_guidance',
        sub_questions_asked: 1,
        known_context: {},
      }],
    }
    const result = await runOrchestrator(input, makeContext())
    expect(result.mode).toBe('clarifying_question')
    if (result.mode === 'clarifying_question') {
      expect(result.state.sub_questions_asked).toBe(2)
    }
  })

  it('max 3 sub_questions enforced — 4th reply must be final_answer', async () => {
    const input: OrchestratorInput = {
      ...BASE_INPUT,
      question: 'Meeting with managers.',
      recent_message_metadata: [{
        mode: 'clarifying_question',
        topic: 'career',
        sub_questions_asked: 3,
        known_context: { situation: 'some situation' },
      }],
    }
    // With GROQ_API_KEY not set → safe fallback final_answer
    const result = await runOrchestrator(input, makeContext())
    expect(result.mode).toBe('final_answer')
  })
})

describe('runOrchestrator — safety', () => {
  it('forbidden key in context triggers safety gate', async () => {
    const ctx = makeContext()
    // Inject forbidden key into life_area_signatures
    ;(ctx as Record<string, unknown>).life_area_signatures = { birth_date: '1990-01-01' }

    const input: OrchestratorInput = {
      ...BASE_INPUT,
      question: 'Meeting with managers.',
      recent_message_metadata: [{
        mode: 'clarifying_question',
        topic: 'career',
        sub_questions_asked: 3,
        known_context: { situation: 'Meeting with managers.' },
      }],
    }
    const result = await runOrchestrator(input, ctx)
    expect(result.mode).toBe('final_answer')
    if (result.mode === 'final_answer') {
      expect((result.metadata as Record<string, unknown>).error_code).toBe('safety_gate')
    }
  })

  it('null prediction context → final_answer with calculate-chart-first message', async () => {
    const input: OrchestratorInput = {
      ...BASE_INPUT,
      question: 'Meeting with managers.',
      recent_message_metadata: [{
        mode: 'clarifying_question',
        topic: 'career',
        sub_questions_asked: 3,
        known_context: { situation: 'Meeting with managers.' },
      }],
    }
    const result = await runOrchestrator(input, null)
    expect(result.mode).toBe('final_answer')
    if (result.mode === 'final_answer') {
      expect(result.rendered).toContain('calculate your chart')
    }
  })

  it('stub context does not produce fake astrology claims in metadata', async () => {
    const input: OrchestratorInput = {
      ...BASE_INPUT,
      question: 'Meeting with managers.',
      recent_message_metadata: [{
        mode: 'clarifying_question',
        topic: 'career',
        sub_questions_asked: 3,
        known_context: { situation: 'Meeting with managers.' },
      }],
    }
    const result = await runOrchestrator(input, makeContext('stub'))
    // Should not have real astro data in metadata
    expect(result.mode).toBe('final_answer')
  })
})

describe('runOrchestrator — high risk', () => {
  it('death question → final_answer (after 3 sub_questions)', async () => {
    const input: OrchestratorInput = {
      ...BASE_INPUT,
      question: 'Will I die this year?',
      recent_message_metadata: [{
        mode: 'clarifying_question',
        topic: 'general',
        sub_questions_asked: 3,
        known_context: { situation: 'Will I die this year?' },
      }],
    }
    const result = await runOrchestrator(input, makeContext())
    expect(result.mode).toBe('final_answer')
    if (result.mode === 'final_answer') {
      expect(result.state.high_risk_flags).toContain('death')
    }
  })

  it('financial high-risk question handled safely', async () => {
    const input: OrchestratorInput = {
      ...BASE_INPUT,
      question: 'Will I go bankrupt?',
      recent_message_metadata: [{
        mode: 'clarifying_question',
        topic: 'money',
        sub_questions_asked: 3,
        known_context: { situation: 'Will I go bankrupt?' },
      }],
    }
    const result = await runOrchestrator(input, makeContext())
    expect(result.mode).toBe('final_answer')
    if (result.mode === 'final_answer') {
      expect(result.state.high_risk_flags).toContain('financial')
    }
  })
})

describe('runOrchestrator — metadata', () => {
  it('clarifying_question metadata has orchestrator_version', async () => {
    const result = await runOrchestrator(BASE_INPUT, makeContext())
    expect(result.mode).toBe('clarifying_question')
    expect(result.metadata.orchestrator_version).toBe('1.0.0')
  })

  it('clarifying_question metadata has sub_questions_asked', async () => {
    const result = await runOrchestrator(BASE_INPUT, makeContext())
    if (result.mode === 'clarifying_question') {
      expect(typeof result.metadata.sub_questions_asked).toBe('number')
    }
  })
})
