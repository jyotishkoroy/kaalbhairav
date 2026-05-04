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
vi.mock('@/lib/astro/profile-chart-json-adapter', () => ({
  buildProfileChartJsonFromMasterOutput: vi.fn((args) => ({
    metadata: {
      chart_version_id: args.chartVersionId,
      runtime_clock: args.output.runtime_clock,
    },
    astronomical_data: args.output,
  })),
}))
vi.mock('@/lib/astro/normalize', () => ({ normalizeBirthInput: vi.fn(() => ({ input_hash_material_version: '2.0.0', birth_date_iso: '1999-06-14', birth_time_iso: '09:58', birth_time_known: true, birth_time_precision: 'exact', birth_time_uncertainty_seconds: 0, timezone: 'Asia/Kolkata', timezone_status: 'valid', latitude_full: 22.57, longitude_full: 88.36, latitude_rounded: 22.57, longitude_rounded: 88.36, coordinate_confidence: 0.95, warnings: [] })) }))
vi.mock('@/lib/astro/profile-birth-data', () => ({ normalizeStoredBirthData: vi.fn((x) => x) }))
vi.mock('@/lib/astro/encryption', () => ({ decryptJson: vi.fn(() => ({ birth_date: '1999-06-14', birth_time: '09:58', birth_time_known: true, birth_time_precision: 'exact', birth_place_name: 'Kolkata', latitude: 22.57, longitude: 88.36, timezone: 'Asia/Kolkata', data_consent_version: 'astro-v1' })) }))
vi.mock('@/lib/security/request-guards', () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
  checkRateLimit: vi.fn(() => ({ ok: true })),
}))
vi.mock('@/lib/astro/calculations/master', () => ({
  calculateMasterAstroOutput: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateMasterAstroOutput } from '@/lib/astro/calculations/master'
import { POST } from '@/app/api/astro/v1/calculate/route'

const user = { id: 'u1' }
const profileId = '11111111-1111-4111-8111-111111111111'
let persistedChartJson: Record<string, unknown> | null = null

function chain<T extends Record<string, unknown>>(terminal: T) {
  const node: Record<string, unknown> = {
    eq: () => node,
    insert: () => node,
    update: () => node,
    order: () => node,
    limit: () => node,
    rpc: () => node,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    select: () => node,
  }
  return Object.assign(node, terminal)
}

function makeReq(body?: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/astro/v1/calculate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify({ profile_id: profileId, ...(body ?? {}) }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

function mockSuccessfulDb() {
  persistedChartJson = null
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') return chain({ select: () => chain({ maybeSingle: async () => ({ data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' }, error: null }) }) })
      if (table === 'astrology_settings') return chain({ select: () => chain({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) })
      if (table === 'chart_calculations') return chain({ insert: () => chain({ select: () => chain({ single: async () => ({ data: { id: 'calc1' }, error: null }) }) }), select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }), update: () => chain({}) })
      if (table === 'chart_json_versions') return chain({ insert: async () => ({ data: { id: 'cv1' }, error: null }), select: () => chain({ maybeSingle: async () => ({ data: { chart_json: persistedChartJson ?? { metadata: { chart_version_id: 'cv1' } } }, error: null }) }) })
      if (table === 'prediction_ready_summaries') return chain({ insert: async () => ({ data: { id: 'p1' }, error: null }) })
      if (table === 'calculation_audit_logs') return chain({ insert: async () => ({ data: { id: 'audit1' }, error: null }) })
      if (table === 'persist_and_promote_current_chart_version') return chain({})
      return chain({ select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }) })
    }),
    rpc: vi.fn(async (_name: string, payload: Record<string, unknown>) => {
      if (_name === 'persist_and_promote_current_chart_version') {
        persistedChartJson = payload.p_chart_json as Record<string, unknown>
      }
      return { data: { chart_version_id: 'cv1', chart_version: 1 }, error: null }
    }),
  } as never)
}

describe('POST /api/astro/v1/calculate runtime clock', () => {
  it('passes normalized runtimeClock in test mode', async () => {
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'test')
    vi.mocked(calculateMasterAstroOutput).mockResolvedValue({
      calculation_status: 'calculated',
      schema_version: '1',
      runtime_clock: { current_utc: '2026-05-04T12:00:00.000Z', as_of_date: '2026-05-04' },
    })

    const resp = await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-04T12:00:00Z', asOfDate: '2026-05-04' } }))
    expect(resp.status).toBe(200)
    expect(vi.mocked(calculateMasterAstroOutput).mock.calls[0]?.[0]).toMatchObject({
      runtimeClock: { currentUtc: '2026-05-04T12:00:00.000Z', asOfDate: '2026-05-04' },
    })
  })

  it('accepts snake_case runtime_clock in test mode', async () => {
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'test')
    vi.mocked(calculateMasterAstroOutput).mockResolvedValue({
      calculation_status: 'calculated',
      schema_version: '1',
      runtime_clock: { current_utc: '2026-05-04T12:00:00.000Z', as_of_date: '2026-05-04' },
    })

    await POST(makeReq({ runtime_clock: { current_utc: '2026-05-04T12:00:00Z', as_of_date: '2026-05-04' } }))
    expect(vi.mocked(calculateMasterAstroOutput).mock.calls[0]?.[0]).toMatchObject({
      runtimeClock: { currentUtc: '2026-05-04T12:00:00.000Z', asOfDate: '2026-05-04' },
    })
  })

  it('ignores client runtimeClock in production unless explicitly enabled', async () => {
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'production')
    vi.mocked(calculateMasterAstroOutput).mockResolvedValue({
      calculation_status: 'calculated',
      schema_version: '1',
      runtime_clock: { current_utc: '2026-05-04T12:00:00.000Z', as_of_date: '2026-05-04' },
    })

    await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-01T00:00:00Z', asOfDate: '2026-05-01' } }))
    const call = vi.mocked(calculateMasterAstroOutput).mock.calls[0]?.[0] as Record<string, unknown>
    expect((call.runtimeClock as Record<string, unknown>).currentUtc).not.toBe('2026-05-01T00:00:00.000Z')

    vi.clearAllMocks()
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ASTRO_ALLOW_CLIENT_RUNTIME_CLOCK', 'true')
    vi.mocked(calculateMasterAstroOutput).mockResolvedValue({
      calculation_status: 'calculated',
      schema_version: '1',
      runtime_clock: { current_utc: '2026-05-04T12:00:00.000Z', as_of_date: '2026-05-04' },
    })

    await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-01T00:00:00Z', asOfDate: '2026-05-01' } }))
    expect(vi.mocked(calculateMasterAstroOutput).mock.calls.at(-1)?.[0]).toMatchObject({
      runtimeClock: { currentUtc: '2026-05-01T00:00:00.000Z', asOfDate: '2026-05-01' },
    })
  })

  it('returns chart metadata with runtime_clock', async () => {
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'test')
    vi.mocked(calculateMasterAstroOutput).mockResolvedValue({
      calculation_status: 'calculated',
      schema_version: '1',
      runtime_clock: { current_utc: '2026-05-04T12:00:00.000Z', as_of_date: '2026-05-04' },
    })

    const resp = await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-04T12:00:00Z', asOfDate: '2026-05-04' } }))
    await resp.json()
    expect(persistedChartJson?.metadata).toMatchObject({
      runtime_clock: { current_utc: '2026-05-04T12:00:00.000Z', as_of_date: '2026-05-04' },
    })
  })

  it('is deterministic for same input/settings/clock', async () => {
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'test')
    vi.mocked(calculateMasterAstroOutput).mockResolvedValue({
      calculation_status: 'calculated',
      schema_version: '1',
      runtime_clock: { current_utc: '2026-05-04T12:00:00.000Z', as_of_date: '2026-05-04' },
      calculation_id: 'volatile',
      created_at: 'volatile',
    })

    const first = await (await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-04T12:00:00Z', asOfDate: '2026-05-04' } }))).json()
    vi.clearAllMocks()
    mockSuccessfulDb()
    vi.mocked(calculateMasterAstroOutput).mockResolvedValue({
      calculation_status: 'calculated',
      schema_version: '1',
      runtime_clock: { current_utc: '2026-05-04T12:00:00.000Z', as_of_date: '2026-05-04' },
      calculation_id: 'volatile-2',
      created_at: 'volatile-2',
    })
    const second = await (await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-04T12:00:00Z', asOfDate: '2026-05-04' } }))).json()

    const normalize = (value: Record<string, unknown>) => {
      const { calculation_id: _calculationId, chart_version_id: _chartVersionId, chart_version: _chartVersion, created_at: _createdAt, ...rest } = JSON.parse(JSON.stringify(value)) as Record<string, unknown>
      return rest
    }

    expect(normalize(first)).toEqual(normalize(second))
  })
})
