/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/astro/feature-flags', () => ({ astroV1ApiEnabled: vi.fn(() => true) }))
vi.mock('@/lib/astro/engine/backend', () => ({ isRemoteAstroEngineConfigured: vi.fn(() => false) }))
vi.mock('@/lib/astro/settings', () => ({
  DEFAULT_SETTINGS: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' },
  hashSettings: vi.fn(() => 'settings_hash'),
}))
vi.mock('@/lib/astro/engine/version', () => ({
  getRuntimeEngineVersion: vi.fn(() => 'engine'),
  getRuntimeEphemerisVersion: vi.fn(() => 'ephemeris'),
  SCHEMA_VERSION: '1',
}))
vi.mock('@/lib/astro/chart-json-persistence', () => ({ mergeAvailableJyotishSectionsIntoChartJson: vi.fn((a) => a) }))
vi.mock('@/lib/astro/profile-chart-json-adapter', () => ({ buildProfileChartJsonFromMasterOutput: vi.fn(() => ({ metadata: { chart_version_id: 'cv1' } })) }))
vi.mock('@/lib/astro/normalize', () => ({ normalizeBirthInput: vi.fn(() => ({ input_hash_material_version: '2.0.0', birth_date_iso: '1999-06-14', birth_time_iso: '09:58', birth_time_known: true, birth_time_precision: 'exact', birth_time_uncertainty_seconds: 0, timezone: 'Asia/Kolkata', timezone_status: 'valid', latitude_full: 22.57, longitude_full: 88.36, latitude_rounded: 22.57, longitude_rounded: 88.36, coordinate_confidence: 0.95, warnings: [] })) }))
vi.mock('@/lib/astro/profile-birth-data', () => ({ normalizeStoredBirthData: vi.fn((x) => x) }))
vi.mock('@/lib/astro/encryption', () => ({ decryptJson: vi.fn(() => ({ birth_date: '1999-06-14', birth_time: '09:58', birth_time_known: true, birth_time_precision: 'exact', birth_place_name: 'Kolkata', latitude: 22.57, longitude: 88.36, timezone: 'Asia/Kolkata', data_consent_version: 'astro-v1' })) }))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/astro/v1/calculate/route'

const user = { id: 'u1' }

function makeReq(profileId = 'p1') {
  return new NextRequest('http://localhost/api/astro/v1/calculate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify({ profile_id: profileId }),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/astro/v1/calculate', () => {
  it('returns profile_not_found when no profile exists', async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
      }),
    } as never)
    const resp = await POST(makeReq('11111111-1111-4111-8111-111111111111'))
    expect(resp.status).toBe(404)
    expect((await resp.json()).error).toBe('profile_not_found')
  })

  it('returns profile_access_denied for another user', async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: '11111111-1111-4111-8111-111111111111', user_id: 'other', encrypted_birth_data: 'x', status: 'active' }, error: null }) }) }) }) }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) }) }
      }),
    } as never)
    const resp = await POST(makeReq('11111111-1111-4111-8111-111111111111'))
    expect(resp.status).toBe(404)
    expect((await resp.json()).error).toBe('profile_access_denied')
  })
})
