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
vi.mock('@/lib/astro/calculations/master', () => ({
  calculateMasterAstroOutput: vi.fn(async () => ({
    calculation_status: 'calculated',
    prediction_ready_context: { summary: 'ready' },
    confidence: { overall: { value: 75, label: 'medium', reasons: [] } },
    warnings: [],
  })),
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

function makeQuery<T>(data: T, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.ASTRO_CALCULATE_DEBUG
})

describe('astro_calculate_persistence_is_atomic', () => {
  it('fails closed when the atomic RPC returns an error', async () => {
    let updatePayload: Record<string, unknown> | null = null
    const updateEqSpy = vi.fn()
    const rpcSpy = vi.fn(async () => ({ data: null, error: { message: 'rpc boom' } }))

    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      rpc: rpcSpy,
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return makeQuery({ id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' })
        if (table === 'astrology_settings') return makeQuery({ astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' })
        if (table === 'chart_calculations') {
          return {
            select: () => makeQuery(null),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'calc-1' }, error: null }),
              }),
            }),
            update: (payload: Record<string, unknown>) => {
              updatePayload = payload
              return { eq: updateEqSpy }
            },
          }
        }
        return makeQuery(null)
      }),
    } as never)

    const resp = await POST(makeReq())
    expect(resp.status).toBe(500)
    expect(await resp.json()).toEqual({ error: 'chart_version_save_failed' })
    expect(rpcSpy).toHaveBeenCalledWith('persist_and_promote_current_chart_version', expect.objectContaining({
      p_user_id: user.id,
      p_profile_id: profileId,
      p_calculation_id: 'calc-1',
    }))
    expect(updatePayload).toMatchObject({ status: 'failed' })
    expect(String((updatePayload as Record<string, unknown> | null)?.error_message)).toContain('persist_and_promote_current_chart_version_failed')
    expect(updateEqSpy).toHaveBeenCalledWith('id', 'calc-1')
  })

  it('fails closed when the atomic RPC omits chart_version_id', async () => {
    process.env.ASTRO_CALCULATE_DEBUG = 'true'
    const rpcSpy = vi.fn(async () => ({ data: [{}], error: null }))

    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      rpc: rpcSpy,
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return makeQuery({ id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' })
        if (table === 'astrology_settings') return makeQuery({ astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' })
        if (table === 'chart_calculations') {
          return {
            select: () => makeQuery(null),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'calc-1' }, error: null }),
              }),
            }),
            update: () => ({ eq: vi.fn() }),
          }
        }
        return makeQuery(null)
      }),
    } as never)

    const resp = await POST(makeReq())
    expect(resp.status).toBe(500)
    const body = await resp.json()
    expect(body.error).toBe('chart_version_save_failed')
    expect(JSON.stringify(body)).toContain('persist_and_promote_current_chart_version_failed')
    expect(JSON.stringify(body)).not.toContain('chart_json')
  })
})
