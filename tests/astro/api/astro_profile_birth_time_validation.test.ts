/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/astro/feature-flags', () => ({ astroV1ApiEnabled: vi.fn(() => true) }))
vi.mock('@/lib/astro/encryption', () => ({ encryptJson: vi.fn(() => 'encrypted_payload') }))
vi.mock('@/lib/astro/settings', () => ({ hashSettings: vi.fn(() => 'settings_hash'), DEFAULT_SETTINGS: { astrology_system: 'parashari' } }))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/astro/v1/profile/route'

const user = { id: 'u1', email: 'u1@example.com', user_metadata: { full_name: 'U One' } }

function makeReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/astro/v1/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/astro/v1/profile birth time validation', () => {
  it('rejects invalid timezone before saving', async () => {
    const insertSpy = vi.fn()
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return {
            select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
            insert: insertSpy,
          }
        }
        return { insert: vi.fn(), upsert: vi.fn() }
      }),
    } as never)

    const resp = await POST(makeReq({
      birth_date: '1999-06-14',
      birth_time: '09:58:00',
      birth_time_known: true,
      birth_time_precision: 'exact',
      birth_place_name: 'New York',
      latitude: 40.7484,
      longitude: -73.9857,
      timezone: 'Mars/Olympus',
      data_consent_version: 'astro-v1',
    }))

    expect(resp.status).toBe(400)
    const body = await resp.json()
    expect(body.code).toBe('invalid_timezone')
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('rejects DST nonexistent local time before saving', async () => {
    const insertSpy = vi.fn()
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return {
            select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
            insert: insertSpy,
          }
        }
        return { insert: vi.fn(), upsert: vi.fn() }
      }),
    } as never)

    const resp = await POST(makeReq({
      birth_date: '2024-03-10',
      birth_time: '02:30:00',
      birth_time_known: true,
      birth_time_precision: 'exact',
      birth_place_name: 'New York',
      latitude: 40.7484,
      longitude: -73.9857,
      timezone: 'America/New_York',
      data_consent_version: 'astro-v1',
    }))

    expect(resp.status).toBe(400)
    const body = await resp.json()
    expect(body.code).toBe('nonexistent_local_time')
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('rejects DST ambiguous local time before saving', async () => {
    const insertSpy = vi.fn()
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return {
            select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
            insert: insertSpy,
          }
        }
        return { insert: vi.fn(), upsert: vi.fn() }
      }),
    } as never)

    const resp = await POST(makeReq({
      birth_date: '2024-11-03',
      birth_time: '01:30:00',
      birth_time_known: true,
      birth_time_precision: 'exact',
      birth_place_name: 'New York',
      latitude: 40.7484,
      longitude: -73.9857,
      timezone: 'America/New_York',
      data_consent_version: 'astro-v1',
    }))

    expect(resp.status).toBe(400)
    const body = await resp.json()
    expect(body.code).toBe('ambiguous_local_time')
    expect(insertSpy).not.toHaveBeenCalled()
  })
})
