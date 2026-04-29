import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runOrchestrator } from '@/lib/astro/conversation/orchestrator'
import type { OrchestratorInput } from '@/lib/astro/conversation/types'
import type { PredictionContext } from '@/lib/astro/types'
import {
  extractAnswerText,
  expectTextExcludesAll,
  expectTextIncludesAny,
  loadAllBaselineFixtures,
} from './baseline-test-utils'

const ORIGINAL_ENV = { ...process.env }

function makePredictionContext(topic: string): PredictionContext {
  return {
    do_not_recalculate: true,
    chart_identity: {
      profile_id: 'profile-1',
      chart_version_id: 'chart-version-1',
      schema_version: '1.0.0',
      engine_version: '1.0.0',
      ephemeris_version: '1.0.0',
      calculation_status: 'calculated',
    },
    confidence: {},
    warnings: [],
    core_natal_summary: { lagna_sign: 'Gemini', moon_sign: 'Virgo' },
    life_area_signatures: { career_status: { area: topic } },
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
  } as unknown as PredictionContext
}

describe('Phase 1 baseline - stable astrology reading path', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.ASTRO_READING_V2_ENABLED
    delete process.env.GROQ_API_KEY
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  for (const fixture of loadAllBaselineFixtures()) {
    it(`returns a stable baseline answer for ${fixture.id}`, async () => {
      const result = await runOrchestrator(
        {
          user_id: fixture.userId,
          profile_id: 'profile-1',
          session_id: 'session-1',
          question: fixture.question,
          recent_message_metadata: [],
        } satisfies OrchestratorInput,
        makePredictionContext(fixture.expected.topic),
      )

      expect(['final_answer', 'clarifying_question']).toContain(result.mode)
      const answerSource =
        result.mode === 'final_answer'
          ? result.rendered
          : (result as { clarifying_question?: string }).clarifying_question
      const answer = extractAnswerText(answerSource) || ''
      expect(answer).toBeTruthy()
      if (result.mode === 'final_answer') {
        expect(answer.length).toBeGreaterThanOrEqual(fixture.expected.minAnswerLength)
        if (fixture.expected.mustIncludeAny?.length && !fixture.expected.safetyRisk) {
          expectTextIncludesAny(answer, fixture.expected.mustIncludeAny)
        }
        if (fixture.expected.mustNotIncludeAny?.length) {
          expectTextExcludesAll(answer, fixture.expected.mustNotIncludeAny)
        }
      }
    })
  }
})
