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
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile ?? null }),
  }
  const chartQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: chart ?? null }),
  }
  const summaryQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: predictionSummary ?? null }),
  }
  return {
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') return profileQuery
      if (table === 'chart_json_versions') return chartQuery
      if (table === 'prediction_ready_summaries') return summaryQuery
      return profileQuery
    }),
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
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1', current_chart_version_id: 'c1' }, chart: { id: 'c1', is_current: true, status: 'completed' } }) as never)
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
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'real-profile-id', current_chart_version_id: 'real-chart-id' }, chart: { id: 'real-chart-id', is_current: true, status: 'completed', chart_json: { public_facts: { lagna_sign: 'Leo', moon_sign: 'Gemini', moon_house: 11, sun_sign: 'Taurus', sun_house: 10, moon_nakshatra: 'Mrigasira', moon_pada: 4, mahadasha: 'Jupiter' } } } }) as never)
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
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1', current_chart_version_id: 'c1' }, chart: { id: 'c1', is_current: true, status: 'completed', chart_json: { public_facts: { lagna_sign: 'Leo', moon_sign: 'Gemini', moon_house: 11, sun_sign: 'Taurus', sun_house: 10, moon_nakshatra: 'Mrigasira', moon_pada: 4, mahadasha: 'Jupiter' } } } }) as never)
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
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1', current_chart_version_id: 'c1' }, chart: { id: 'c1', is_current: true, status: 'completed', chart_json: { public_facts: { lagna_sign: 'Leo', moon_sign: 'Gemini', moon_house: 11, sun_sign: 'Taurus', sun_house: 10, moon_nakshatra: 'Mrigasira', moon_pada: 4, mahadasha: 'Jupiter' } } } }) as never)
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: 'Your answer.' })

    const req = makeRequest({ question: 'What about my career?', requestId: 'test-req-1' })
    await POST(req)

    const callBody = vi.mocked(answerCanonicalAstroQuestion).mock.calls[0][0]
    expect(callBody.requestId).toBe('test-req-1')
  })

  it('returns sanitized canonical answer', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com', user_metadata: {} }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1', current_chart_version_id: 'c1' }, chart: { id: 'c1', is_current: true, status: 'completed', chart_json: { public_facts: { lagna_sign: 'Leo', moon_sign: 'Gemini', moon_house: 11, sun_sign: 'Taurus', sun_house: 10, moon_nakshatra: 'Mrigasira', moon_pada: 4, mahadasha: 'Jupiter' } } } }) as never)
    vi.mocked(answerCanonicalAstroQuestion).mockResolvedValue({ answer: 'profile_id=abc123 Your answer.' })

    const req = makeRequest({ question: 'What about my career?' })
    const resp = await POST(req)
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body.answer).not.toContain('profile_id')
  })
})
