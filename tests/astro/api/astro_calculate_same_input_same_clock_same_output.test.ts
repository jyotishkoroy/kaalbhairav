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
vi.mock('@/lib/astro/config/feature-flags', () => ({
  ASTRO_CALC_INTEGRATION_ENABLED: true,
  ASTRO_CALC_INTEGRATION_STRICT_MODE: true,
  ASTRO_CALC_FIXTURE_VALIDATION_ENABLED: false,
  ASTRO_ALLOW_UNVERIFIED_ADVANCED_CALCS: false,
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
vi.mock('@/lib/astro/chart-json-persistence', () => ({ mergeAvailableJyotishSectionsIntoChartJson: vi.fn((a) => a), persistCanonicalChartJsonV2: vi.fn(async (args) => ({ chartVersionId: 'cv1', chartVersion: 1, chartJson: args.chartJson })) }))
vi.mock('@/lib/astro/current-chart-version', () => ({
  loadCurrentAstroChartForUser: vi.fn(async () => ({
    ok: true,
    profile: { id: '11111111-1111-4111-8111-111111111111', user_id: 'u1', status: 'active', current_chart_version_id: 'cv1' },
    chartVersion: {
      id: 'cv1',
      profile_id: '11111111-1111-4111-8111-111111111111',
      user_id: 'u1',
      chart_version: 1,
      schema_version: 'chart_json_v2',
      status: 'completed',
      is_current: true,
      chart_json: {
        schemaVersion: 'chart_json_v2',
        metadata: {
          profileId: '11111111-1111-4111-8111-111111111111',
          chartVersionId: 'cv1',
          chartVersion: 1,
          inputHash: 'input-hash',
          settingsHash: 'settings-hash',
          engineVersion: 'engine',
          ephemerisVersion: 'ephemeris',
          ayanamsha: 'lahiri',
          houseSystem: 'whole_sign',
          runtimeClockIso: '2026-05-05T00:00:00.000Z',
        },
        sections: {
          timeFacts: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          planetaryPositions: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          lagna: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          houses: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          panchang: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          d1Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          d9Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          shodashvarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          shodashvargaBhav: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          kp: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          dosha: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          ashtakavarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          transits: { status: 'unavailable', source: 'none', fields: {} },
          advanced: { status: 'unavailable', source: 'none', fields: {} },
        },
      },
    },
  })),
}))
vi.mock('@/lib/astro/calculate-route-v2', () => ({
  calculateRouteV2ResponsePayload: vi.fn(async () => ({
    ok: true,
    success: true,
    metadata: { chart_version_id: 'cv1' },
    chart_json_v2: {
      schemaVersion: 'chart_json_v2',
      metadata: {
        profileId: 'profile-1',
        inputHash: 'input_hash',
        settingsHash: 'settings_hash',
        engineVersion: 'engine',
        ephemerisVersion: 'ephemeris',
        ayanamsha: 'lahiri',
        houseSystem: 'whole_sign',
        runtimeClockIso: '2026-05-05T00:00:00.000Z',
      },
      sections: {
        timeFacts: { status: 'computed', source: 'deterministic_calculation', fields: { utcDateTimeIso: '2026-05-05T00:00:00.000Z' } },
        planetaryPositions: { status: 'computed', source: 'deterministic_calculation', fields: { byBody: { Sun: { sign: 'Taurus' } } } },
        lagna: { status: 'computed', source: 'deterministic_calculation', fields: { ascendant: { sign: 'Leo' } } },
        houses: { status: 'computed', source: 'deterministic_calculation', fields: { placements: { Sun: 10, Moon: 11 } } },
        panchang: { status: 'computed', source: 'deterministic_calculation', fields: { tithi: 'Pratipad' } },
        d1Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        d9Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        shodashvarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        shodashvargaBhav: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: { currentMahadasha: { lord: 'Jupiter' } } },
        kp: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        dosha: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
        ashtakavarga: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
        transits: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
        advanced: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
      },
    },
    chartJsonV2: {
      schemaVersion: 'chart_json_v2',
      metadata: {
        profileId: 'profile-1',
        inputHash: 'input_hash',
        settingsHash: 'settings_hash',
        engineVersion: 'engine',
        ephemerisVersion: 'ephemeris',
        ayanamsha: 'lahiri',
        houseSystem: 'whole_sign',
        runtimeClockIso: '2026-05-05T00:00:00.000Z',
      },
      sections: {
        timeFacts: { status: 'computed', source: 'deterministic_calculation', fields: { utcDateTimeIso: '2026-05-05T00:00:00.000Z' } },
        planetaryPositions: { status: 'computed', source: 'deterministic_calculation', fields: { byBody: { Sun: { sign: 'Taurus' } } } },
        lagna: { status: 'computed', source: 'deterministic_calculation', fields: { ascendant: { sign: 'Leo' } } },
        houses: { status: 'computed', source: 'deterministic_calculation', fields: { placements: { Sun: 10, Moon: 11 } } },
        panchang: { status: 'computed', source: 'deterministic_calculation', fields: { tithi: 'Pratipad' } },
        d1Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        d9Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        shodashvarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        shodashvargaBhav: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: { currentMahadasha: { lord: 'Jupiter' } } },
        kp: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        dosha: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
        ashtakavarga: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
        transits: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
        advanced: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: {} },
      },
    },
    meta: { persisted: false, currentChartPromoted: false, ignoredClientContext: false, calcIntegrationEnabled: true },
  })),
  sanitizeCalculateBodyForDeterministicInput: vi.fn((body) => body),
  hasIgnoredClientContext: vi.fn(() => false),
}))
vi.mock('@/lib/astro/profile-chart-json-adapter', () => ({
  buildProfileChartJsonFromMasterOutput: vi.fn((args) => {
    const chartJsonV2 = {
      schemaVersion: 'chart_json_v2',
      metadata: {
      profileId: 'profile-1',
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine',
      ephemerisVersion: 'ephemeris',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: args.output.runtime_clock.current_utc ?? '2026-05-05T00:00:00.000Z',
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
    }
    return { ...chartJsonV2, chart_json_v2: chartJsonV2, chartJsonV2 }
  }),
}))
vi.mock('@/lib/astro/normalize', () => ({ normalizeBirthInput: vi.fn(() => ({ input_hash_material_version: '2.0.0', birth_date_iso: '1999-06-14', birth_time_iso: '09:58', birth_time_known: true, birth_time_precision: 'exact', birth_time_uncertainty_seconds: 0, timezone: 'Asia/Kolkata', timezone_status: 'valid', latitude_full: 22.57, longitude_full: 88.36, latitude_rounded: 22.57, longitude_rounded: 88.36, coordinate_confidence: 0.95, warnings: [] })) }))
vi.mock('@/lib/astro/profile-birth-data', () => ({ normalizeStoredBirthData: vi.fn((x) => x) }))
vi.mock('@/lib/astro/encryption', () => ({ decryptJson: vi.fn(() => ({ birth_date: '1999-06-14', birth_time: '09:58', birth_time_known: true, birth_time_precision: 'exact', birth_place_name: 'Kolkata', latitude: 22.57, longitude: 88.36, timezone: 'Asia/Kolkata', data_consent_version: 'astro-v1' })) }))
vi.mock('@/lib/security/request-guards', () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
  checkRateLimit: vi.fn(() => ({ ok: true })),
}))
vi.mock('@/lib/astro/calculations/master', () => ({
  calculateMasterAstroOutput: vi.fn(async () => ({
    calculation_status: 'calculated',
    runtime_clock: { current_utc: '2026-05-05T00:00:00.000Z', as_of_date: '2026-05-05' },
    prediction_ready_context: { summary: 'ready' },
    confidence: { overall: { value: 75, label: 'medium', reasons: [] } },
    warnings: [],
  })),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRouteV2ResponsePayload } from '@/lib/astro/calculate-route-v2'
import { persistCanonicalChartJsonV2 } from '@/lib/astro/chart-json-persistence'
import { POST } from '@/app/api/astro/v1/calculate/route'

const user = { id: 'u1' }
const profileId = '11111111-1111-4111-8111-111111111111'
let persistedChartJson: Record<string, unknown> | null = null

function chain<T extends Record<string, unknown>>(terminal: T) {
  const node: Record<string, unknown> = {
    eq: () => node,
    neq: () => node,
    is: () => node,
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
    body: JSON.stringify({
      profile_id: profileId,
      date_local: '2026-05-05',
      time_local: '07:30:00',
      place_name: 'Test Place',
      latitude_deg: 13.0833,
      longitude_deg: 80.2707,
      timezone: 5.5,
      house_system: 'whole_sign',
      ayanamsha_main: 'lahiri',
      ...(body ?? {}),
    }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

function mockSuccessfulDb() {
  persistedChartJson = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(persistCanonicalChartJsonV2).mockImplementation(async (args: any) => {
    persistedChartJson = args.chartJson
    return { chartVersionId: 'cv1', chartVersion: 1, chartJson: args.chartJson }
  })
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') return chain({ select: () => chain({ maybeSingle: async () => ({ data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active', current_chart_version_id: 'cv1' }, error: null }) }) })
      if (table === 'astrology_settings') return chain({ select: () => chain({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) })
      if (table === 'chart_calculations') return chain({ insert: () => chain({ select: () => chain({ single: async () => ({ data: { id: 'calc1' }, error: null }) }) }), select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }), update: () => chain({}) })
      if (table === 'chart_json_versions') return chain({ insert: async () => ({ data: { id: 'cv1' }, error: null }), select: () => chain({ maybeSingle: async () => ({ data: { id: 'cv1', profile_id: profileId, user_id: user.id, chart_version: 1, schema_version: 'chart_json_v2', status: 'completed', is_current: true, chart_json: persistedChartJson ?? { schemaVersion: 'chart_json_v2', metadata: { profileId, chartVersionId: 'cv1', chartVersion: 1, inputHash: 'input-hash', settingsHash: 'settings-hash', engineVersion: 'engine', ephemerisVersion: 'ephemeris', ayanamsha: 'lahiri', houseSystem: 'whole_sign', runtimeClockIso: '2026-05-04T12:00:00.000Z' }, sections: {} } }, error: null }) }) })
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
    const resp = await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-04T12:00:00Z', asOfDate: '2026-05-04' } }))
    expect(resp.status).toBe(200)
    expect(vi.mocked(calculateRouteV2ResponsePayload).mock.calls[0]?.[0]).toMatchObject({
      birthInput: expect.objectContaining({ runtimeClock: { currentUtc: '2026-05-04T12:00:00Z', asOfDate: '2026-05-04' } }),
    })
  })

  it('accepts snake_case runtime_clock in test mode', async () => {
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'test')
    await POST(makeReq({ runtime_clock: { current_utc: '2026-05-04T12:00:00Z', as_of_date: '2026-05-04' } }))
    expect(vi.mocked(calculateRouteV2ResponsePayload).mock.calls[0]?.[0]).toMatchObject({
      birthInput: expect.objectContaining({ runtime_clock: { current_utc: '2026-05-04T12:00:00Z', as_of_date: '2026-05-04' } }),
    })
  })

  it('ignores client runtimeClock in production unless explicitly enabled', async () => {
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'production')
    await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-01T00:00:00Z', asOfDate: '2026-05-01' } }))
    const call = vi.mocked(calculateRouteV2ResponsePayload).mock.calls[0]?.[0] as Record<string, unknown>
    expect(call).toMatchObject({
      birthInput: expect.objectContaining({
        runtimeClock: {
          currentUtc: '2026-05-01T00:00:00Z',
          asOfDate: '2026-05-01',
        },
      }),
    })

    vi.clearAllMocks()
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ASTRO_ALLOW_CLIENT_RUNTIME_CLOCK', 'true')
    await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-01T00:00:00Z', asOfDate: '2026-05-01' } }))
    expect(vi.mocked(calculateRouteV2ResponsePayload).mock.calls.at(-1)?.[0]).toMatchObject({
      birthInput: expect.objectContaining({ runtimeClock: { currentUtc: '2026-05-01T00:00:00Z', asOfDate: '2026-05-01' } }),
    })
  })

  it('returns chart metadata with runtime_clock', async () => {
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'test')
    const resp = await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-04T12:00:00Z', asOfDate: '2026-05-04' } }))
    await resp.json()
    expect(persistedChartJson?.metadata).toMatchObject({ runtimeClockIso: '2026-05-05T00:00:00.000Z' })
  })

  it('is deterministic for same input/settings/clock', async () => {
    mockSuccessfulDb()
    vi.stubEnv('NODE_ENV', 'test')
    const first = await (await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-04T12:00:00Z', asOfDate: '2026-05-04' } }))).json()
    vi.clearAllMocks()
    mockSuccessfulDb()
    const second = await (await POST(makeReq({ runtimeClock: { currentUtc: '2026-05-04T12:00:00Z', asOfDate: '2026-05-04' } }))).json()

    const normalize = (value: Record<string, unknown>) => {
      const { calculation_id: _calculationId, chart_version_id: _chartVersionId, chart_version: _chartVersion, created_at: _createdAt, ...rest } = JSON.parse(JSON.stringify(value)) as Record<string, unknown>
      return rest
    }

    expect(normalize(first)).toEqual(normalize(second))
  })
})
