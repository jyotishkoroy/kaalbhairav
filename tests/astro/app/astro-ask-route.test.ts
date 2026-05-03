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

// Mock V2 handler
vi.mock('@/lib/astro/rag/astro-v2-reading-handler', () => ({
  handleAstroV2ReadingRequest: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { handleAstroV2ReadingRequest } from '@/lib/astro/rag/astro-v2-reading-handler'
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
    expect(resp.status).toBe(404)
    const body = await resp.json()
    expect(body.error).toBe('setup_required')
  })

  it('returns setup_required when no chart exists', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1' }, chart: null }) as never)

    const req = makeRequest({ question: 'What is my Lagna?' })
    const resp = await POST(req)
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body.answer).toContain('chart context is not ready')
  })

  it('returns safe answer when question is blocked by guard (model question)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1' }, chart: { id: 'c1' } }) as never)
    // V2 handler should NOT be called for blocked questions
    vi.mocked(handleAstroV2ReadingRequest).mockResolvedValue(
      new Response(JSON.stringify({ answer: 'should not appear' }), { status: 200 })
    )

    const req = makeRequest({ question: 'Which AI model do you use?' })
    const resp = await POST(req)
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body.answer).toContain('aadesh')
    // V2 handler must not be called for blocked questions
    expect(vi.mocked(handleAstroV2ReadingRequest)).not.toHaveBeenCalled()
  })

  it('calls V2 handler with server-resolved userId and profileId, ignoring client-supplied values', async () => {
    const mockUser = { id: 'real-user-id', email: 'real@test.com', user_metadata: {} }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(mockUser) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'real-profile-id' }, chart: { id: 'real-chart-id', chart_json: { ascendant: { sign: 'Leo' } } } }) as never)
    vi.mocked(handleAstroV2ReadingRequest).mockResolvedValue(
      new Response(JSON.stringify({ answer: 'Your Lagna is Leo.' }), { status: 200 })
    )

    // Client tries to supply fake user/profile ids — must be ignored
    const req = makeRequest({
      question: 'What about my career?',
      userId: 'evil-injected-user',
      profileId: 'evil-injected-profile',
      chartVersionId: 'evil-injected-chart',
    })
    const resp = await POST(req)
    expect(resp.status).toBe(200)

    const callArg = vi.mocked(handleAstroV2ReadingRequest).mock.calls[0][0]
    const callBody = await callArg.json()
    expect(callBody.userId).toBe('real-user-id')
    expect(callBody.profileId).toBe('real-profile-id')
    expect(callBody.chartVersionId).toBe('real-chart-id')
  })

  it('strips followUpQuestion and followUpAnswer from response', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com', user_metadata: {} }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1' }, chart: { id: 'c1', chart_json: { ascendant: { sign: 'Leo' } } } }) as never)
    vi.mocked(handleAstroV2ReadingRequest).mockResolvedValue(
      new Response(JSON.stringify({
        answer: 'Career answer.',
        followUpQuestion: 'Do you want more?',
        followUpAnswer: 'More details here.',
        meta: { engine: 'rag' },
      }), { status: 200 })
    )

    const req = makeRequest({ question: 'What about my career?' })
    const resp = await POST(req)
    const body = await resp.json()
    expect(body.answer).toContain('Career answer.')
    expect(body.followUpQuestion).toBeUndefined()
    expect(body.followUpAnswer).toBeUndefined()
    expect(body.meta).toBeUndefined()
  })

  it('sets oneShot/disableFollowUps/disableMemory in V2 request metadata', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com', user_metadata: {} }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1' }, chart: { id: 'c1', chart_json: { ascendant: { sign: 'Leo' } } } }) as never)
    vi.mocked(handleAstroV2ReadingRequest).mockResolvedValue(
      new Response(JSON.stringify({ answer: 'Your answer.' }), { status: 200 })
    )

    const req = makeRequest({ question: 'What about my career?', requestId: 'test-req-1' })
    await POST(req)

    const callArg = vi.mocked(handleAstroV2ReadingRequest).mock.calls[0][0]
    const callBody = await callArg.json()
    expect(callBody.metadata.oneShot).toBe(true)
    expect(callBody.metadata.disableFollowUps).toBe(true)
    expect(callBody.metadata.disableMemory).toBe(true)
    expect(callBody.metadata.requestId).toBe('test-req-1')
  })

  it('returns error when V2 handler returns non-ok', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'u1', email: 'a@b.com', user_metadata: {} }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({ profile: { id: 'p1' }, chart: { id: 'c1', chart_json: { ascendant: { sign: 'Leo' } } } }) as never)
    vi.mocked(handleAstroV2ReadingRequest).mockResolvedValue(
      new Response(JSON.stringify({ error: 'reading_failed' }), { status: 500 })
    )

    const req = makeRequest({ question: 'What about my career?' })
    const resp = await POST(req)
    expect(resp.status).toBe(500)
    const body = await resp.json()
    expect(body.error).toBeTruthy()
  })
})
