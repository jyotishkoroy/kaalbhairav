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
vi.mock('@/lib/astro/engine/backend', () => ({ isRemoteAstroEngineConfigured: vi.fn(() => false) }))
vi.mock('@/lib/astro/engine/version', () => ({
  getRuntimeEngineVersion: vi.fn(() => 'engine'),
  getRuntimeEphemerisVersion: vi.fn(() => 'ephemeris'),
  SCHEMA_VERSION: '1',
}))
vi.mock('@/lib/astro/settings', () => ({
  DEFAULT_SETTINGS: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' },
  hashSettings: vi.fn(() => 'settings_hash'),
}))
vi.mock('@/lib/astro/chart-json-persistence', () => ({ mergeAvailableJyotishSectionsIntoChartJson: vi.fn((a) => a) }))
vi.mock('@/lib/astro/profile-chart-json-adapter', () => ({ buildProfileChartJsonFromMasterOutput: vi.fn(() => ({ metadata: { chart_version_id: 'cv1' } })) }))
vi.mock('@/lib/astro/normalize', () => ({ normalizeBirthInput: vi.fn(() => ({ input_hash_material_version: '2.0.0', birth_date_iso: '2024-11-03', birth_time_iso: '01:30:00', birth_time_known: true, birth_time_precision: 'exact', birth_time_uncertainty_seconds: 0, timezone: 'America/New_York', timezone_status: 'valid', latitude_full: 40.7484, longitude_full: -73.9857, latitude_rounded: 40.748, longitude_rounded: -73.986, coordinate_confidence: 0.95, warnings: [] })) }))
vi.mock('@/lib/astro/profile-birth-data', () => ({ normalizeStoredBirthData: vi.fn((value) => value) }))
let decryptedBirthData: Record<string, unknown> = { birth_date: '2024-11-03', birth_time: '01:30:00', birth_time_known: true, birth_time_precision: 'exact', birth_place_name: 'New York', latitude: 40.7484, longitude: -73.9857, timezone: 'America/New_York', data_consent_version: 'astro-v1' }
vi.mock('@/lib/astro/encryption', () => ({ decryptJson: vi.fn(() => decryptedBirthData) }))
vi.mock('@/lib/security/request-guards', () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
  checkRateLimit: vi.fn(() => ({ ok: true })),
}))
vi.mock('@/lib/astro/calculations/master', () => ({ calculateMasterAstroOutput: vi.fn() }))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateMasterAstroOutput } from '@/lib/astro/calculations/master'
import { POST } from '@/app/api/astro/v1/calculate/route'

const user = { id: 'u1' }
const profileId = '11111111-1111-4111-8111-111111111111'

function makeReq() {
  return new NextRequest('http://localhost/api/astro/v1/calculate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify({ profile_id: profileId }),
  })
}

beforeEach(() => vi.clearAllMocks())
beforeEach(() => {
  decryptedBirthData = { birth_date: '2024-11-03', birth_time: '01:30:00', birth_time_known: true, birth_time_precision: 'exact', birth_place_name: 'New York', latitude: 40.7484, longitude: -73.9857, timezone: 'America/New_York', data_consent_version: 'astro-v1' }
})

describe('POST /api/astro/v1/calculate birth time validation', () => {
  function mockDb(profile: Record<string, unknown>) {
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    const calcInsertSpy = vi.fn()
    const rpcSpy = vi.fn()
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }) }) }
        if (table === 'astrology_settings') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) }) }
        if (table === 'chart_calculations') return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }) }) }), insert: calcInsertSpy }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
      }),
      rpc: rpcSpy,
    } as never)
    return { calcInsertSpy, rpcSpy }
  }

  it('rejects nonexistent DST time before calculation', async () => {
    decryptedBirthData = { ...decryptedBirthData, birth_date: '2024-03-10', birth_time: '02:30:00', timezone: 'America/New_York' }
    const { calcInsertSpy, rpcSpy } = mockDb({ id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' })
    const resp = await POST(makeReq())
    expect(resp.status).toBe(400)
    expect((await resp.json()).code).toBe('nonexistent_local_time')
    expect(vi.mocked(calculateMasterAstroOutput)).not.toHaveBeenCalled()
    expect(calcInsertSpy).not.toHaveBeenCalled()
    expect(rpcSpy).not.toHaveBeenCalled()
  })

  it('rejects ambiguous DST time before calculation', async () => {
    decryptedBirthData = { ...decryptedBirthData, birth_date: '2024-11-03', birth_time: '01:30:00', timezone: 'America/New_York' }
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' }, error: null }) }) }) }) }
        if (table === 'astrology_settings') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) }) }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
      }),
      rpc: vi.fn(),
    } as never)

    const resp = await POST(makeReq())
    expect(resp.status).toBe(400)
    expect((await resp.json()).code).toBe('ambiguous_local_time')
    expect(vi.mocked(calculateMasterAstroOutput)).not.toHaveBeenCalled()
  })

  it('rejects missing birth time before calculation', async () => {
    decryptedBirthData = { birth_date: '1999-06-14', birth_time: null, birth_time_known: false, birth_time_precision: 'unknown', birth_place_name: 'New York', latitude: 40.7484, longitude: -73.9857, timezone: 'Asia/Kolkata', data_consent_version: 'astro-v1' }
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' }, error: null }) }) }) }) }
        if (table === 'astrology_settings') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) }) }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
      }),
      rpc: vi.fn(),
    } as never)
    vi.mocked(calculateMasterAstroOutput).mockResolvedValue({} as never)

    const resp = await POST(makeReq())
    expect(resp.status).toBe(400)
    const body = await resp.json()
    expect(body.code).toBe('missing_birth_time')
    expect(body.birth_time_validation.warnings).toBeUndefined()
    expect(vi.mocked(calculateMasterAstroOutput)).not.toHaveBeenCalled()
  })
})
