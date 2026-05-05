/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/astro/ask/answer-canonical-astro-question', () => ({
  answerCanonicalAstroQuestion: vi.fn(),
}))
vi.mock('@/lib/astro/public-chart-facts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/astro/public-chart-facts')>()
  return {
    ...actual,
    buildPublicChartFacts: vi.fn(() => ({
      lagnaSign: 'Leo',
      moonSign: 'Gemini',
      sunSign: 'Taurus',
      moonHouse: 11,
      sunHouse: 10,
      confidence: 1,
      warnings: [],
    })),
    validatePublicChartFacts: vi.fn(() => ({ ok: true })),
  }
})

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { answerCanonicalAstroQuestion } from '@/lib/astro/ask/answer-canonical-astro-question'
import { POST } from '@/app/api/astro/ask/route'
import { NextRequest } from 'next/server'

function makeRequest(body: unknown, url = 'http://localhost/api/astro/ask') {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeSupabaseMock(user: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeServiceMock({
  profile,
  chart,
  predictionSummary,
}: {
  profile?: unknown
  chart?: unknown
  predictionSummary?: unknown
}) {
  function makeQuery<T>(data: T, error: unknown = null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data, error })),
      single: vi.fn(async () => ({ data, error })),
    }
    return query
  }
  const profileQuery = makeQuery(profile ?? null)
  const chartQuery = makeQuery(chart ?? null)
  const summaryQuery = makeQuery(predictionSummary ?? null)
  return {
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') return profileQuery
      if (table === 'chart_json_versions') return chartQuery
      if (table === 'prediction_ready_summaries') return summaryQuery
      return makeQuery(null)
    }),
  }
}

function makeChartJson(chartVersionId: string, profileId = 'p1', userId = 'u1') {
  return {
    schemaVersion: 'chart_json_v2',
    metadata: {
      profileId,
      chartVersionId,
      chartVersion: 1,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'test-engine',
      ephemerisVersion: 'test-ephemeris',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: '2026-05-05T00:00:00.000Z',
    },
    sections: {
      timeFacts: { status: 'computed', source: 'deterministic_calculation', fields: { utcDateTimeIso: '2026-05-05T02:00:00.000Z' } },
      planetaryPositions: { status: 'computed', source: 'deterministic_calculation', fields: { byBody: { Sun: { sign: 'Taurus' }, Moon: { sign: 'Gemini' } } } },
      lagna: { status: 'computed', source: 'deterministic_calculation', fields: { ascendant: { sign: 'Leo' } } },
      houses: { status: 'computed', source: 'deterministic_calculation', fields: { placements: { Moon: 11, Sun: 10 } } },
      panchang: { status: 'computed', source: 'deterministic_calculation', fields: { tithi: 'test-tithi' } },
      d1Chart: { status: 'computed', source: 'deterministic_calculation', fields: { lagnaSign: 'Leo', moonSign: 'Gemini', sunSign: 'Taurus' } },
      d9Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      shodashvarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      shodashvargaBhav: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: { currentMahadasha: { lord: 'Saturn' }, currentAntardasha: { lord: 'Mercury' } } },
      kp: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      dosha: { status: 'computed', source: 'deterministic_calculation', fields: { manglik: { isManglik: false } } },
      ashtakavarga: { status: 'computed', source: 'deterministic_calculation', fields: { sarvashtakavargaTotal: { grandTotal: 292 } } },
      transits: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: { value: { status: 'unavailable', value: null, reason: 'insufficient_birth_data', source: 'none', requiredModule: 'transits', fieldKey: 'transits' } } },
      advanced: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: { value: { status: 'unavailable', value: null, reason: 'insufficient_birth_data', source: 'none', requiredModule: 'advanced', fieldKey: 'advanced' } } },
    },
    public_facts: { lagna_sign: 'Leo', moon_sign: 'Gemini', sun_sign: 'Taurus', moon_house: 11, sun_house: 10 },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: 'aadesh: Leo Lagna answer.' })
})

describe('POST /api/astro/ask', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({}) as never)

    const req = makeRequest({ question: 'What is my Lagna?' })
    const resp = await POST(req)
    expect(resp.status).toBe(401)
    const body = await resp.json()
    expect(body.error).toBe('unauthenticated')
  })

  it('returns setup_required when no active profile', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: null }) as never)

    const req = makeRequest({ question: 'What is my Lagna?' })
    const resp = await POST(req)
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body.answer).toMatch(/complete birth profile setup/i)
  })

  it('returns setup_required when no chart exists', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com' }) as never)
    // Profile with no current_chart_version_id — strict mode returns chart_not_ready
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1', current_chart_version_id: null }, chart: null }) as never)

    const req = makeRequest({ question: 'What is my Lagna?' })
    const resp = await POST(req)
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body.answer).toContain('chart')
  })

  it('returns safe answer when question is blocked by guard (model question)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1', user_id: 'u1', status: 'active', current_chart_version_id: 'c1' }, chart: { id: 'c1', profile_id: 'p1', user_id: 'u1', chart_version: 1, schema_version: 'chart_json_v2', is_current: true, status: 'completed', chart_json: makeChartJson('c1') } }) as never)
    const req = makeRequest({ question: 'Which AI model do you use?' })
    const resp = await POST(req)
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body.answer).toContain('aadesh')
    expect(vi.mocked(answerCanonicalAstroQuestion)).not.toHaveBeenCalled()
  })

  it('calls canonical handler with server-resolved userId and profileId, ignoring client-supplied values', async () => {
    const mockUser = { id: 'real-user-id', email: 'real@test.com', user_metadata: {} }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(mockUser) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: 'real-profile-id', user_id: 'real-user-id', status: 'active', current_chart_version_id: 'real-chart-id' },
      chart: { id: 'real-chart-id', profile_id: 'real-profile-id', user_id: 'real-user-id', chart_version: 1, schema_version: 'chart_json_v2', is_current: true, status: 'completed', chart_json: makeChartJson('real-chart-id', 'real-profile-id', 'real-user-id') },
    }) as never)
    // Client tries to supply fake user/profile ids — must be ignored
    const req = makeRequest({
      question: 'What about my career?',
      userId: 'evil-injected-user',
      profileId: 'evil-injected-profile',
      chartVersionId: 'evil-injected-chart',
    })
    const resp = await POST(req)
    expect(resp.status).toBe(200)

    const callBody = vi.mocked(answerCanonicalAstroQuestion).mock.calls[0][0]
    expect(callBody.userId).toBe('real-user-id')
    expect(callBody.profileId).toBe('real-profile-id')
    expect(callBody.chartVersionId).toBe('real-chart-id')
  })

  it('strips followUpQuestion and followUpAnswer from response', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com', user_metadata: {} }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: 'p1', user_id: 'u1', status: 'active', current_chart_version_id: 'c1' },
      chart: { id: 'c1', profile_id: 'p1', user_id: 'u1', chart_version: 1, schema_version: 'chart_json_v2', is_current: true, status: 'completed', chart_json: makeChartJson('c1') },
    }) as never)
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: 'Career answer.' })

    const req = makeRequest({ question: 'What about my career?' })
    const resp = await POST(req)
    const body = await resp.json()
    expect(body.answer).toContain('Career answer.')
    expect(body.followUpQuestion).toBeUndefined()
    expect(body.followUpAnswer).toBeUndefined()
    expect(body.meta).toBeUndefined()
  })

  it('passes requestId into canonical handler metadata and does not expose it', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com', user_metadata: {} }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: 'p1', user_id: 'u1', status: 'active', current_chart_version_id: 'c1' },
      chart: { id: 'c1', profile_id: 'p1', user_id: 'u1', chart_version: 1, schema_version: 'chart_json_v2', is_current: true, status: 'completed', chart_json: makeChartJson('c1') },
    }) as never)
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: 'Your answer.' })

    const req = makeRequest({ question: 'What about my career?', requestId: 'test-req-1' })
    await POST(req)

    const callBody = vi.mocked(answerCanonicalAstroQuestion).mock.calls[0][0]
    expect(callBody.requestId).toBe('test-req-1')
  })

  it('returns sanitized canonical answer', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com', user_metadata: {} }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      profile: { id: 'p1', user_id: 'u1', status: 'active', current_chart_version_id: 'c1' },
      chart: { id: 'c1', profile_id: 'p1', user_id: 'u1', chart_version: 1, schema_version: 'chart_json_v2', is_current: true, status: 'completed', chart_json: makeChartJson('c1') },
    }) as never)
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: 'profile_id=abc123 Your answer.' })

    const req = makeRequest({ question: 'What about my career?' })
    const resp = await POST(req)
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body.answer).not.toContain('profile_id')
  })
})
