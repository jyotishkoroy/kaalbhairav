/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/astro/feature-flags', () => ({
  astroV1ApiEnabled: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/astro/encryption', () => ({
  encryptJson: vi.fn().mockReturnValue('encrypted_payload'),
}))

vi.mock('@/lib/astro/settings', () => ({
  hashSettings: vi.fn().mockReturnValue('settings_hash_abc'),
  DEFAULT_SETTINGS: { system: 'north_india', ayanamsa: 'lahiri' },
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/astro/v1/profile/route'
import { NextRequest } from 'next/server'

const VALID_BODY = {
  birth_date: '1990-06-15',
  birth_time: '10:30',
  birth_time_known: true,
  birth_time_precision: 'exact',
  birth_place_name: 'Kolkata, India',
  latitude: 22.5667,
  longitude: 88.3667,
  timezone: 'Asia/Kolkata',
  data_consent_version: 'v1',
  terms_accepted_version: 'tarayai-v1',
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/astro/v1/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const MOCK_USER = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
}

function makeServiceWithNoProfile() {
  const auditInsert = { insert: vi.fn().mockResolvedValue({ error: null }) }
  const termsUpsert = { upsert: vi.fn().mockResolvedValue({ error: null }) }
  const settingsInsert = { insert: vi.fn().mockResolvedValue({ error: null }) }

  const profileChain = {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-profile-id' }, error: null }),
      }),
    }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') return profileChain
      if (table === 'astrology_settings') return settingsInsert
      if (table === 'calculation_audit_logs') return auditInsert
      if (table === 'user_terms_acceptances') return termsUpsert
      return auditInsert
    }),
    _settingsInsert: settingsInsert,
    _auditInsert: auditInsert,
    _termsUpsert: termsUpsert,
    _profileChain: profileChain,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/astro/v1/profile — singleton logic', () => {
  it('creates a new profile when no active profile exists', async () => {
    const supabaseMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER } }) } }
    vi.mocked(createClient).mockResolvedValue(supabaseMock as never)
    const service = makeServiceWithNoProfile()
    vi.mocked(createServiceClient).mockReturnValue(service as never)

    const req = makeRequest(VALID_BODY)
    const resp = await POST(req)
    const body = await resp.json()

    expect(resp.status).toBe(200)
    expect(body.status).toBe('created')
    expect(body.profile_id).toBe('new-profile-id')
    expect(body.birth_details_change_available_at).toBeTruthy()
  })

  it('returns 401 when user is not authenticated', async () => {
    const supabaseMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } }
    vi.mocked(createClient).mockResolvedValue(supabaseMock as never)
    vi.mocked(createServiceClient).mockReturnValue({} as never)

    const req = makeRequest(VALID_BODY)
    const resp = await POST(req)
    expect(resp.status).toBe(401)
  })

  it('rejects update within one-week lock period', async () => {
    const supabaseMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER } }) } }
    vi.mocked(createClient).mockResolvedValue(supabaseMock as never)

    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'existing-profile',
          last_birth_details_updated_at: new Date().toISOString(),
          birth_details_change_available_at: futureDate,
        },
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis() }),
    }

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue(profileChain),
    } as never)

    const req = makeRequest(VALID_BODY)
    const resp = await POST(req)
    expect(resp.status).toBe(423)
    const body = await resp.json()
    expect(body.error).toBe('profile_edit_locked')
  })

  it('uses Google name when display_name is omitted', async () => {
    const userWithGoogle = { ...MOCK_USER, user_metadata: { full_name: 'Google Full Name' } }
    const supabaseMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userWithGoogle } }) } }
    vi.mocked(createClient).mockResolvedValue(supabaseMock as never)

    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
      }),
    })

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: insertSpy,
    }

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((t: string) => {
        if (t === 'birth_profiles') return profileChain
        return { insert: vi.fn().mockResolvedValue({ error: null }), upsert: vi.fn().mockResolvedValue({ error: null }) }
      }),
    } as never)

    const bodyWithoutName = { ...VALID_BODY }
    const req = makeRequest(bodyWithoutName)
    await POST(req)

    const insertCall = insertSpy.mock.calls[0][0]
    expect(insertCall.display_name).toBe('Google Full Name')
    expect(insertCall.google_name).toBe('Google Full Name')
  })

  it('requires terms_accepted_version for canonical path and upserts acceptance', async () => {
    const supabaseMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER } }) } }
    vi.mocked(createClient).mockResolvedValue(supabaseMock as never)

    const termsUpsert = vi.fn().mockResolvedValue({ error: null })
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'p2' }, error: null }),
      }),
    })

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: insertSpy,
    }

    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((t: string) => {
        if (t === 'birth_profiles') return profileChain
        if (t === 'user_terms_acceptances') return { upsert: termsUpsert }
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }),
    } as never)

    const req = makeRequest(VALID_BODY)
    await POST(req)

    expect(termsUpsert).toHaveBeenCalled()
    const upsertArg = termsUpsert.mock.calls[0][0]
    expect(upsertArg.terms_version).toBe('tarayai-v1')
    expect(upsertArg.user_id).toBe('user-123')
  })

  it('handles unknown birth time: sets birth_time null and precision unknown', async () => {
    const supabaseMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER } }) } }
    vi.mocked(createClient).mockResolvedValue(supabaseMock as never)

    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'p3' }, error: null }),
      }),
    })
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: insertSpy,
    }
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((t: string) => {
        if (t === 'birth_profiles') return profileChain
        return { insert: vi.fn().mockResolvedValue({ error: null }), upsert: vi.fn().mockResolvedValue({ error: null }) }
      }),
    } as never)

    const bodyUnknownTime = {
      ...VALID_BODY,
      birth_time: null,
      birth_time_known: false,
      birth_time_precision: 'unknown',
    }

    const req = makeRequest(bodyUnknownTime)
    const resp = await POST(req)
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body.status).toBe('created')

    const insertArg = insertSpy.mock.calls[0][0]
    expect(insertArg.has_exact_birth_time).toBe(false)
  })
})
