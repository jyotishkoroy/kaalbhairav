/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const calculateRouteV2ResponsePayloadMock = vi.hoisted(() => vi.fn())
const persistCanonicalChartJsonV2Mock = vi.hoisted(() => vi.fn())
const loadCurrentAstroChartForUserMock = vi.hoisted(() => vi.fn())
const sanitizeCalculateBodyForDeterministicInputMock = vi.hoisted(() => vi.fn((body) => body))
const hasIgnoredClientContextMock = vi.hoisted(() => vi.fn((body) => Boolean(body?.chart || body?.context || body?.dasha || body?.transits || body?.publicFacts || body?.profileId || body?.userId || body?.chartVersionId)))

vi.mock('@/lib/astro/calculate-route-v2', () => ({
  calculateRouteV2ResponsePayload: calculateRouteV2ResponsePayloadMock,
  sanitizeCalculateBodyForDeterministicInput: sanitizeCalculateBodyForDeterministicInputMock,
  hasIgnoredClientContext: hasIgnoredClientContextMock,
}))
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
vi.mock('@/lib/astro/chart-json-persistence', () => ({
  mergeAvailableJyotishSectionsIntoChartJson: vi.fn((value) => value),
  persistCanonicalChartJsonV2: persistCanonicalChartJsonV2Mock,
}))
vi.mock('@/lib/astro/current-chart-version', () => ({
  loadCurrentAstroChartForUser: loadCurrentAstroChartForUserMock,
}))
vi.mock('@/lib/astro/profile-chart-json-adapter', () => ({
  buildProfileChartJsonFromMasterOutput: vi.fn(() => ({
    metadata: { chart_version_id: 'cv1', schema_version: 'chart_json_v2' },
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
        transits: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        advanced: { status: 'computed', source: 'deterministic_calculation', fields: {} },
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
        transits: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        advanced: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      },
    },
  })),
}))
vi.mock('@/lib/astro/normalize', () => ({ normalizeBirthInput: vi.fn(() => ({ input_hash_material_version: '2.0.0', birth_date_iso: '2026-05-05', birth_time_iso: '07:30:00', birth_time_known: true, birth_time_precision: 'exact', birth_time_uncertainty_seconds: 0, timezone: 'Asia/Kolkata', timezone_status: 'valid', latitude_full: 13.0833, longitude_full: 80.2707, latitude_rounded: 13.0833, longitude_rounded: 80.2707, coordinate_confidence: 0.95, warnings: [] })) }))
vi.mock('@/lib/astro/profile-birth-data', () => ({ normalizeStoredBirthData: vi.fn((value) => value) }))
vi.mock('@/lib/astro/encryption', () => ({ decryptJson: vi.fn(() => ({ birth_date: '2026-05-05', birth_time: '07:30:00', birth_time_known: true, birth_time_precision: 'exact', birth_place_name: 'Test Place', latitude: 13.0833, longitude: 80.2707, timezone: 'Asia/Kolkata', data_consent_version: 'astro-v1' })) }))
vi.mock('@/lib/security/request-guards', () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
  checkRateLimit: vi.fn(() => ({ ok: true })),
}))
vi.mock('@/lib/astro/calculations/master', () => ({
  calculateMasterAstroOutput: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateMasterAstroOutput } from '@/lib/astro/calculations/master'
import { assertCanonicalChartJsonV2 } from '@/lib/astro/chart-json-v2'
import { isUnavailableValue } from '@/lib/astro/calculations/unavailable'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/astro/v1/calculate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify(body),
  })
}

function validBirthBody(overrides: Record<string, unknown> = {}) {
  return {
    profile_id: 'profile-1',
    date_local: '2026-05-05',
    time_local: '07:30:00',
    place_name: 'Test Place',
    latitude_deg: 13.0833,
    longitude_deg: 80.2707,
    timezone: 5.5,
    runtime_clock: '2026-05-05T00:00:00.000Z',
    ayanamsha_main: 'lahiri',
    ayanamsha_kp: 'kp_new',
    house_system: 'whole_sign',
    ...overrides,
  }
}

function canonicalPayload(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    success: true,
    metadata: { chart_version_id: 'cv1' },
    chart_json_v2: {
      schemaVersion: 'chart_json_v2',
      metadata: {
        profileId: 'integration-profile',
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
        houses: { status: 'computed', source: 'deterministic_calculation', fields: { placements: {} } },
        panchang: { status: 'computed', source: 'deterministic_calculation', fields: { tithi: 'Pratipad' } },
        d1Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        d9Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        shodashvarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        shodashvargaBhav: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: { currentMahadasha: { lord: 'Jupiter' } } },
        kp: { status: 'partial', source: 'deterministic_calculation', fields: { significators: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'kp_significators', fieldKey: 'sections.kp.fields.significators' } } },
        dosha: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: { manglik: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'dosha', fieldKey: 'sections.dosha.fields.manglik' } } },
        ashtakavarga: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: { binduMatrix: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'ashtakavarga_bindu_matrix', fieldKey: 'sections.ashtakavarga.fields.binduMatrix' } } },
        transits: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: { predictionTiming: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'transit_prediction_timing', fieldKey: 'sections.transits.fields.predictionTiming' } } },
        advanced: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: { shadbala: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'shadbala', fieldKey: 'sections.advanced.shadbala' } } },
      },
    },
    chartJsonV2: {
      schemaVersion: 'chart_json_v2',
      metadata: {
        profileId: 'integration-profile',
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
        houses: { status: 'computed', source: 'deterministic_calculation', fields: { placements: {} } },
        panchang: { status: 'computed', source: 'deterministic_calculation', fields: { tithi: 'Pratipad' } },
        d1Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        d9Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        shodashvarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        shodashvargaBhav: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: { currentMahadasha: { lord: 'Jupiter' } } },
        kp: { status: 'partial', source: 'deterministic_calculation', fields: { significators: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'kp_significators', fieldKey: 'sections.kp.fields.significators' } } },
        dosha: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: { manglik: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'dosha', fieldKey: 'sections.dosha.fields.manglik' } } },
        ashtakavarga: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: { binduMatrix: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'ashtakavarga_bindu_matrix', fieldKey: 'sections.ashtakavarga.fields.binduMatrix' } } },
        transits: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: { predictionTiming: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'transit_prediction_timing', fieldKey: 'sections.transits.fields.predictionTiming' } } },
        advanced: { status: 'unavailable', source: 'none', reason: 'module_not_implemented', fields: { shadbala: { status: 'unavailable', value: null, reason: 'module_not_implemented', source: 'none', requiredModule: 'shadbala', fieldKey: 'sections.advanced.shadbala' } } },
      },
      meta: { persisted: false, currentChartPromoted: false, ignoredClientContext: false, calcIntegrationEnabled: true },
    },
    ...overrides,
  }
}

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  process.env.ASTRO_CALC_INTEGRATION_ENABLED = 'true'
  process.env.ASTRO_CALC_INTEGRATION_STRICT_MODE = 'true'
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } } as never)
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'profile-1', user_id: 'u1', status: 'active', current_chart_version_id: 'cv1' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'chart_calculations') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'calc-1' }, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ data: null, error: null }),
          }),
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'chart_json_versions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'cv1' }, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          }),
        }
      }

      if (table === 'prediction_ready_summaries') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }
    }),
  } as never)
  persistCanonicalChartJsonV2Mock.mockResolvedValue({ chartVersionId: 'cv1', chartVersion: 1 })
  loadCurrentAstroChartForUserMock.mockResolvedValue({
    ok: true,
    profile: { id: 'profile-1' },
    chartVersion: { id: 'cv1', chart_json: canonicalPayload().chart_json_v2 },
  })
})

afterEach(() => {
  delete process.env.ASTRO_CALC_INTEGRATION_ENABLED
  delete process.env.ASTRO_CALC_INTEGRATION_STRICT_MODE
})

describe('POST /api/astro/v1/calculate phase 14 contract', () => {
  it('feature-flagged calculate route returns chart_json_v2 and old-compatible response fields', async () => {
    calculateRouteV2ResponsePayloadMock.mockResolvedValue(canonicalPayload())
    const { POST } = await import('@/app/api/astro/v1/calculate/route')
    const response = await POST(makeRequest(validBirthBody()))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.ok).toBe(true)
    expect(json.success).toBe(true)
    expect(json.chart_json_v2).toBeDefined()
    expect(json.chartJsonV2).toBeDefined()
    expect(() => assertCanonicalChartJsonV2(json.chart_json_v2)).not.toThrow()
    expect(json.chart_json_v2.schemaVersion).toBe('chart_json_v2')
    expect(calculateRouteV2ResponsePayloadMock).toHaveBeenCalledTimes(1)
  })

  it('route ignores client-supplied chart/context/current-chart fields', async () => {
    calculateRouteV2ResponsePayloadMock.mockResolvedValue(canonicalPayload({ meta: { ignoredClientContext: true } }))
    const { POST } = await import('@/app/api/astro/v1/calculate/route')
    const response = await POST(makeRequest(validBirthBody({
      chart: { lagna: 'Leo' },
      context: { moon: 'Gemini' },
      dasha: { current: 'fake' },
      transits: { today: 'fake' },
      publicFacts: { sun: 'fake' },
      profileId: 'attacker-profile',
      userId: 'attacker-user',
      chartVersionId: 'attacker-version',
    })))

    const json = await response.json()
    expect(json.meta.ignoredClientContext).toBe(true)
    expect(JSON.stringify(json.chart_json_v2)).not.toContain('attacker-profile')
    expect(JSON.stringify(json.chart_json_v2)).not.toContain('attacker-user')
    expect(JSON.stringify(json.chart_json_v2)).not.toContain('attacker-version')
    expect(JSON.stringify(json.chart_json_v2)).not.toContain('fake')
  })

  it('malformed JSON or missing required birth date fails closed', async () => {
    const { POST } = await import('@/app/api/astro/v1/calculate/route')
    const malformed = new Request('http://localhost/api/astro/v1/calculate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: '{',
    })
    const malformedResponse = await POST(malformed as never)
    expect(malformedResponse.status).toBe(400)
    const malformedJson = await malformedResponse.json()
    expect(malformedJson.error).toBe('invalid_input')

    const missingDateResponse = await POST(makeRequest(validBirthBody({ date_local: '' })))
    expect(missingDateResponse.status).toBe(400)
    const missingDateJson = await missingDateResponse.json()
    expect(missingDateJson.error).toBe('invalid_input')
    expect(calculateRouteV2ResponsePayloadMock).not.toHaveBeenCalled()
  })

  it('strict mode returns error rather than deterministic-looking facts when calculation provider fails', async () => {
    calculateRouteV2ResponsePayloadMock.mockRejectedValue(new Error('ephemeris_unavailable'))
    const { POST } = await import('@/app/api/astro/v1/calculate/route')
    const response = await POST(makeRequest(validBirthBody()))

    expect(response.status).toBe(422)
    const json = await response.json()
    expect(json.ok).toBe(false)
    expect(JSON.stringify(json)).not.toContain('computed')
    expect(JSON.stringify(json)).not.toContain('Leo')
    expect(JSON.stringify(json)).not.toContain('Gemini')
    expect(JSON.stringify(json)).not.toContain('Taurus')
  })

  it('persists and promotes current chart before returning success', async () => {
    calculateRouteV2ResponsePayloadMock.mockResolvedValue(canonicalPayload())
    const { POST } = await import('@/app/api/astro/v1/calculate/route')
    const response = await POST(makeRequest(validBirthBody()))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(calculateRouteV2ResponsePayloadMock).toHaveBeenCalledTimes(1)
    expect(persistCanonicalChartJsonV2Mock).toHaveBeenCalledTimes(1)
    expect(loadCurrentAstroChartForUserMock).toHaveBeenCalledTimes(1)
    expect(vi.mocked(createClient)).toHaveBeenCalledTimes(1)
    expect(json.meta.persisted).toBe(true)
    expect(json.meta.currentChartPromoted).toBe(true)
  })

  it('feature flag disabled preserves legacy route path', async () => {
    process.env.ASTRO_CALC_INTEGRATION_ENABLED = 'false'
    vi.mocked(calculateMasterAstroOutput).mockResolvedValue({
      calculation_status: 'calculated',
      schema_version: '29.0.0',
      runtime_clock: { current_utc: '2026-05-05T00:00:00.000Z' },
      panchang: {
        status: 'available',
        rows: [
          { label: 'Tithi', value: 'Pratipad' },
          { label: 'Yoga', value: 'Ganda' },
          { label: 'Karan', value: 'Kintudhhana' },
        ],
      },
      vimshottari_dasha: {
        status: 'available',
        items: [{ mahadasha: 'Jupiter', from: '2018-08-22', to: '2034-08-22' }],
      },
      navamsa_d9: {
        status: 'available',
        rows: [
          { body: 'Sun', sign_number: 6 },
          { body: 'Moon', sign_number: 8 },
        ],
      },
      ashtakvarga: {
        status: 'available',
        rows: [{ sign: 8, Total: 37 }],
      },
      current_timing: {
        status: 'real',
        current_mahadasha: {
          lord: 'Jupiter',
          start_date: '2018-08-22T00:00:00.000Z',
          end_date: '2034-08-22T00:00:00.000Z',
        },
      },
      expanded_sections: {
        panchang: { status: 'partial', rows: [] },
        navamsa_d9: { status: 'partial', rows: [] },
        current_timing: { status: 'not_available' },
      },
    } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') return chain({ select: () => chain({ maybeSingle: async () => ({ data: { id: 'profile-1', user_id: 'u1', encrypted_birth_data: 'x', status: 'active' }, error: null }) }) })
        if (table === 'astrology_settings') return chain({ select: () => chain({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) })
        if (table === 'chart_calculations') return chain({ select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }), insert: () => chain({ select: () => chain({ single: async () => ({ data: { id: 'calc-1' }, error: null }) }) }) })
        if (table === 'chart_json_versions') return chain({ select: () => chain({ maybeSingle: async () => ({ data: { chart_json: { metadata: { chart_version_id: 'cv1' } } }, error: null }) }) })
        return chain({ select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }) })
      }),
      rpc: vi.fn(async () => ({ data: { chart_version_id: 'cv1', chart_version: 1 }, error: null })),
    } as never)

    const { POST } = await import('@/app/api/astro/v1/calculate/route')
    const response = await POST(new NextRequest('http://localhost/api/astro/v1/calculate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ profile_id: '11111111-1111-4111-8111-111111111111' }),
    }))

    expect(response.status).toBe(200)
    expect(calculateRouteV2ResponsePayloadMock).not.toHaveBeenCalled()
  })

  it('does not leak unavailable values into exact chart facts', async () => {
    calculateRouteV2ResponsePayloadMock.mockResolvedValue(canonicalPayload())
    const { POST } = await import('@/app/api/astro/v1/calculate/route')
    const response = await POST(makeRequest(validBirthBody()))
    const json = await response.json()

    expect(isUnavailableValue(json.chart_json_v2.sections.kp.fields.significators)).toBe(true)
    expect(isUnavailableValue(json.chart_json_v2.sections.advanced.fields.shadbala)).toBe(true)
  })
})
