/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const loadCurrentAstroChartForUserMock = vi.hoisted(() => vi.fn())
const answerExactFactFromPublicFactsMock = vi.hoisted(() => vi.fn())
const buildPublicChartFactsMock = vi.hoisted(() => vi.fn())
const answerCanonicalAstroQuestionMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/astro/current-chart-version', () => ({
  loadCurrentAstroChartForUser: loadCurrentAstroChartForUserMock,
}))
vi.mock('@/lib/astro/public-chart-facts', () => ({
  buildPublicChartFacts: buildPublicChartFactsMock,
  validatePublicChartFacts: vi.fn(() => ({ ok: true })),
  sanitizeVisibleAstroAnswer: vi.fn((value) => value),
}))
vi.mock('@/lib/astro/exact-chart-facts', () => ({
  answerExactFactFromPublicFacts: answerExactFactFromPublicFactsMock,
}))
vi.mock('@/lib/astro/ask/answer-canonical-astro-question', () => ({
  answerCanonicalAstroQuestion: answerCanonicalAstroQuestionMock,
}))
vi.mock('@/lib/astro/app/one-shot-question-guard', () => ({
  guardOneShotAstroQuestion: vi.fn((question: string) => ({ allowed: true, normalizedQuestion: question })),
}))
vi.mock('@/lib/astro/app/question-quality', () => ({
  analyzeQuestionQuality: vi.fn((question: string) => ({ normalizedQuestion: question, warnings: [] })),
}))
vi.mock('@/lib/security/request-guards', () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
  checkRateLimit: vi.fn(() => ({ ok: true })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))
vi.mock('@/lib/security/e2e-rate-limit', () => ({
  isE2ERateLimitDisabled: vi.fn(() => true),
  logE2ERateLimitDisabled: vi.fn(),
}))

import { POST as askPOST } from '@/app/api/astro/ask/route'
import { POST as readingPOST } from '@/app/api/astro/v2/reading/route'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { loadCurrentAstroChartForUser } from '@/lib/astro/current-chart-version'
import { answerExactFactFromPublicFacts } from '@/lib/astro/exact-chart-facts'
import { answerCanonicalAstroQuestion } from '@/lib/astro/ask/answer-canonical-astro-question'

function req(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://www.tarayai.com' },
    body: JSON.stringify(body),
  })
}

function currentChart() {
  return {
    ok: true,
    profile: { id: 'profile-1', user_id: 'user-1', status: 'active', current_chart_version_id: 'chart-2' },
    chartVersion: {
      id: 'chart-2',
      profile_id: 'profile-1',
      user_id: 'user-1',
      chart_version: 2,
      schema_version: 'chart_json_v2',
      status: 'completed',
      is_current: true,
      chart_json: {
        schemaVersion: 'chart_json_v2',
        metadata: {
          profileId: 'profile-1',
          chartVersionId: 'chart-2',
          chartVersion: 2,
          inputHash: 'input-hash',
          settingsHash: 'settings-hash',
          engineVersion: 'engine',
          ephemerisVersion: 'ephemeris',
          ayanamsha: 'lahiri',
          houseSystem: 'whole_sign',
          runtimeClockIso: '2026-05-05T00:00:00.000Z',
        },
        sections: {
          timeFacts: { status: 'computed', source: 'deterministic_calculation', fields: { utcDateTimeIso: '2026-05-05T00:00:00.000Z' } },
          planetaryPositions: { status: 'computed', source: 'deterministic_calculation', fields: { byBody: { Sun: { sign: 'Taurus' }, Moon: { sign: 'Gemini' } } } },
          lagna: { status: 'computed', source: 'deterministic_calculation', fields: { ascendant: { sign: 'Leo' } } },
          houses: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          panchang: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          d1Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          d9Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          shodashvarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          shodashvargaBhav: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: { currentMahadasha: { lord: 'Saturn' } } },
          kp: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          dosha: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          ashtakavarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          transits: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
          advanced: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
        },
      },
    },
    predictionSummary: { prediction_context: { lagnaSign: 'Leo', moonSign: 'Gemini', sunSign: 'Taurus' } },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
  } as never)
  vi.mocked(createServiceClient).mockReturnValue({} as never)
  vi.mocked(loadCurrentAstroChartForUser).mockResolvedValue(currentChart() as never)
  vi.mocked(buildPublicChartFactsMock).mockReturnValue({
    lagnaSign: 'Leo',
    moonSign: 'Gemini',
    sunSign: 'Taurus',
    moonHouse: 11,
    sunHouse: 10,
    confidence: 'complete',
    warnings: [],
  } as never)
  vi.mocked(answerExactFactFromPublicFacts).mockReturnValue({ matched: true, answer: 'aadesh: Your Lagna is Leo.' } as never)
  vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: 'aadesh: interpretive answer' } as never)
})

describe('astro integrated current chart end to end', () => {
  it('reuses strict current chart reload and ignores spoofed client chart data', async () => {
    const askResponse = await askPOST(req('https://www.tarayai.com/api/astro/ask', {
      question: 'What is my Lagna?',
      chart: { lagna: { sign: 'Virgo' } },
      context: { lagna: 'Virgo' },
      publicFacts: { lagnaSign: 'Virgo' },
      userId: 'spoofed-user',
      profileId: 'spoofed-profile',
      chartVersionId: 'spoofed-version',
    }))
    const askBody = await askResponse.json()
    expect(askBody.answer).toContain('Leo')

    const readingResponse = await readingPOST(req('https://www.tarayai.com/api/astro/v2/reading', {
      question: 'What is my Lagna?',
      chart: { lagna: { sign: 'Virgo' } },
      context: { lagna: 'Virgo' },
      publicFacts: { lagnaSign: 'Virgo' },
    }))

    expect(readingResponse.status).toBe(200)
    expect(loadCurrentAstroChartForUser).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      options: { mode: 'strict_user_runtime' },
    }))
    expect(buildPublicChartFactsMock).toHaveBeenCalledWith(expect.objectContaining({
      chartVersionId: 'chart-2',
      profileId: 'profile-1',
    }))
    expect(answerExactFactFromPublicFacts).toHaveBeenCalled()
    expect(answerCanonicalAstroQuestion).not.toHaveBeenCalled()
  })
})
