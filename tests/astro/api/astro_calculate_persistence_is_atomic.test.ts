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
  persistCanonicalChartJsonV2: vi.fn(),
}))
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
          engineVersion: 'engine-1',
          ephemerisVersion: 'ephemeris-1',
          ayanamsha: 'lahiri',
          houseSystem: 'whole_sign',
          runtimeClockIso: '2026-05-05T00:00:00.000Z',
          },
          sections: {
          timeFacts: { status: 'computed', source: 'deterministic_calculation', fields: { utcDateTimeIso: '2026-05-05T02:00:00.000Z' } },
          planetaryPositions: { status: 'computed', source: 'deterministic_calculation', fields: { byBody: { Sun: { sign: 'Taurus' }, Moon: { sign: 'Gemini' } } } },
          lagna: { status: 'computed', source: 'deterministic_calculation', fields: { ascendant: { sign: 'Leo' } } },
          houses: { status: 'computed', source: 'deterministic_calculation', fields: { placements: { Sun: 10, Moon: 11 } } },
          panchang: { status: 'computed', source: 'deterministic_calculation', fields: { tithi: 'Pratipad' } },
          d1Chart: { status: 'computed', source: 'deterministic_calculation', fields: { lagnaSign: 'Leo', moonSign: 'Gemini', sunSign: 'Taurus', moonHouse: 11, sunHouse: 10 } },
          d9Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          shodashvarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          shodashvargaBhav: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: { currentMahadasha: { lord: 'Saturn' } } },
          kp: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          dosha: { status: 'computed', source: 'deterministic_calculation', fields: { manglik: { isManglik: false } } },
          ashtakavarga: { status: 'computed', source: 'deterministic_calculation', fields: { sarvashtakavargaTotal: { grandTotal: 292 } } },
          transits: { status: 'unavailable', source: 'none', fields: {} },
          advanced: { status: 'unavailable', source: 'none', fields: {} },
          },
      },
    },
  })),
}))
vi.mock('@/lib/astro/profile-chart-json-adapter', () => ({
  buildProfileChartJsonFromMasterOutput: vi.fn(() => {
    const chartJsonV2 = {
      schemaVersion: 'chart_json_v2',
      metadata: {
      profileId: 'profile-1',
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine-1',
      ephemerisVersion: 'ephemeris-1',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: '2026-05-05T00:00:00.000Z',
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
      vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: { currentMahadasha: { lord: 'Saturn' } } },
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
    runtime_clock: { current_utc: '2026-05-05T00:00:00.000Z', as_of_date: '2026-05-05' },
    prediction_ready_context: { summary: 'ready' },
    confidence: { overall: { value: 75, label: 'medium', reasons: [] } },
    warnings: [],
  })),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/astro/v1/calculate/route'

const user = { id: 'u1' }
const profileId = '11111111-1111-4111-8111-111111111111'
function makeCanonicalChartJsonV2() {
  return {
    schemaVersion: 'chart_json_v2',
    metadata: {
      profileId,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine-1',
      ephemerisVersion: 'ephemeris-1',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: '2026-05-05T00:00:00.000Z',
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
      vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: { currentMahadasha: { lord: 'Saturn' } } },
      kp: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      dosha: { status: 'computed', source: 'deterministic_calculation', fields: { manglik: { isManglik: false } } },
      ashtakavarga: { status: 'computed', source: 'deterministic_calculation', fields: { sarvashtakavargaTotal: { grandTotal: 292 } } },
      transits: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: { value: { status: 'unavailable', value: null, reason: 'insufficient_birth_data', source: 'none', requiredModule: 'transits', fieldKey: 'transits' } } },
      advanced: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: { value: { status: 'unavailable', value: null, reason: 'insufficient_birth_data', source: 'none', requiredModule: 'advanced', fieldKey: 'advanced' } } },
    },
  }
}

function makeReq() {
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
    }),
  })
}

function makeQuery<T>(data: T, error: unknown = null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
    single: vi.fn(async () => ({ data, error })),
  }
  return query
}

function makeInsertFailure(error: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    insert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => ({ data: null, error })),
    maybeSingle: vi.fn(async () => ({ data: null, error })),
  }
  return query
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
    vi.mocked((await import('@/lib/astro/chart-json-persistence')).persistCanonicalChartJsonV2).mockRejectedValueOnce(new Error('persist_and_promote_current_chart_version_failed: rpc boom'))

    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      rpc: rpcSpy,
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return makeQuery({ id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active', current_chart_version_id: 'cv1' })
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
    expect(resp.status).toBe(422)
    const body = await resp.json()
    expect(body.error).toBe('Deterministic calculation failed.')
    expect(rpcSpy).not.toHaveBeenCalled()
  })

  it('fails closed when the atomic RPC omits chart_version_id', async () => {
    process.env.ASTRO_CALCULATE_DEBUG = 'true'
    const rpcSpy = vi.fn(async () => ({ data: [{}], error: null }))
    vi.mocked((await import('@/lib/astro/chart-json-persistence')).persistCanonicalChartJsonV2).mockRejectedValueOnce(new Error('Persistence RPC did not return chart_version_id.'))

    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      rpc: rpcSpy,
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return makeQuery({ id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active', current_chart_version_id: 'cv1' })
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
    expect(resp.status).toBe(422)
    const body = await resp.json()
    expect(body.error).toBe('Deterministic calculation failed.')
  })
})
