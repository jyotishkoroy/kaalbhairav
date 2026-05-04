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
  getRuntimeEngineVersion: vi.fn(() => 'engine-1'),
  getRuntimeEphemerisVersion: vi.fn(() => 'ephemeris-1'),
  SCHEMA_VERSION: '2.0.0',
}))
vi.mock('@/lib/astro/settings', () => ({
  DEFAULT_SETTINGS: {
    astrology_system: 'parashari',
    zodiac_type: 'sidereal',
    ayanamsa: 'lahiri',
    house_system: 'whole_sign',
    node_type: 'mean_node',
    dasha_year_basis: 'civil_365.2425',
  },
  hashSettings: vi.fn(() => 'settings_hash'),
}))
vi.mock('@/lib/astro/chart-json-persistence', () => ({
  mergeAvailableJyotishSectionsIntoChartJson: vi.fn((value) => value),
}))
vi.mock('@/lib/astro/profile-chart-json-adapter', () => ({
  buildProfileChartJsonFromMasterOutput: vi.fn(() => ({
    metadata: { chart_version_id: 'placeholder', chart_version: 1 },
    prediction_ready_summaries: { summary: true },
    astronomical_data: {},
  })),
}))
vi.mock('@/lib/astro/normalize', () => ({
  normalizeBirthInput: vi.fn(() => ({
    input_hash_material_version: '2.0.0',
    birth_date_iso: '1999-06-14',
    birth_time_iso: '09:58',
    birth_time_known: true,
    birth_time_precision: 'exact',
    birth_time_uncertainty_seconds: 0,
    timezone: 'Asia/Kolkata',
    timezone_status: 'valid',
    latitude_full: 22.57,
    longitude_full: 88.36,
    latitude_rounded: 22.57,
    longitude_rounded: 88.36,
    coordinate_confidence: 0.95,
    warnings: [],
  })),
}))
vi.mock('@/lib/astro/profile-birth-data', () => ({ normalizeStoredBirthData: vi.fn((value) => value) }))
vi.mock('@/lib/astro/encryption', () => ({
  decryptJson: vi.fn(() => ({
    birth_date: '1999-06-14',
    birth_time: '09:58',
    birth_time_known: true,
    birth_time_precision: 'exact',
    birth_place_name: 'Kolkata',
    latitude: 22.57,
    longitude: 88.36,
    timezone: 'Asia/Kolkata',
    data_consent_version: 'astro-v1',
  })),
}))
vi.mock('@/lib/security/request-guards', () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
  checkRateLimit: vi.fn(() => ({ ok: true })),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
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

function query<T>(data: T, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('astro_calculate_cache_hit_promotes_pointer', () => {
  it('returns the current chart without calling the atomic RPC when pointer already matches', async () => {
    const rpcSpy = vi.fn()
    const service = {
      rpc: rpcSpy,
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return query({ id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active', current_chart_version_id: 'cv-1' })
        if (table === 'astrology_settings') return query({ astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' })
        if (table === 'chart_calculations') return query({ id: 'calc-1', current_chart_version_id: 'cv-1' })
        if (table === 'chart_json_versions') return query({ id: 'cv-1', profile_id: profileId, user_id: user.id, chart_json: { astronomical_data: { ok: true } }, chart_version: 7, status: 'completed', is_current: true })
        if (table === 'prediction_ready_summaries') return query({ id: 'sum-1', chart_version_id: 'cv-1', prediction_context: { summary: true } })
        return query(null)
      }),
    } as never

    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(service)

    const resp = await POST(makeReq())
    expect(resp.status).toBe(200)
    expect(rpcSpy).not.toHaveBeenCalledWith('persist_and_promote_current_chart_version', expect.anything())
    const body = await resp.json()
    expect(body).toBeDefined()
  })

  it('falls through to recalculation when the cache pointer is stale', async () => {
    const promoteSpy = vi.fn(async (_name: string, _args: Record<string, unknown>) => ({ data: null, error: { message: 'rpc boom' } }))
    const persistSpy = vi.fn(async (_name: string, _args: Record<string, unknown>) => ({ data: [{ chart_version_id: 'cv-new', chart_version: 8 }], error: null }))
    const service = {
      rpc: vi.fn((name: string, args: Record<string, unknown>) => {
        if (name === 'promote_current_chart_version') return promoteSpy(name, args)
        if (name === 'persist_and_promote_current_chart_version') return persistSpy(name, args)
        return Promise.resolve({ data: null, error: null })
      }),
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return query({ id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active', current_chart_version_id: null })
        if (table === 'astrology_settings') return query({ astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' })
        if (table === 'chart_calculations') {
          return {
            select: () => query({ id: 'calc-cache', current_chart_version_id: 'cv-cache' }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'calc-new' }, error: null }),
              }),
            }),
            update: () => query(null),
          }
        }
        if (table === 'chart_json_versions') return query({ id: 'cv-cache', profile_id: profileId, user_id: user.id, chart_json: { astronomical_data: { ok: true } }, chart_version: 7, status: 'completed', is_current: false })
        if (table === 'prediction_ready_summaries') return query({ id: 'sum-cache', chart_version_id: 'cv-cache', prediction_context: { summary: true } })
        if (table === 'calculation_audit_logs') return { insert: vi.fn() }
        return query(null)
      }),
    } as never

    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(service)

    const resp = await POST(makeReq())
    expect(resp.status).toBe(200)
    expect(promoteSpy).toHaveBeenCalled()
    expect(persistSpy).toHaveBeenCalled()
    const body = await resp.json()
    expect(body).toMatchObject({ chart_version_id: 'cv-new', chart_version: 8, reused_cache: false })
  })
})
