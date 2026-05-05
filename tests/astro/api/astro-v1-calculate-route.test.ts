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
vi.mock('@/lib/astro/chart-json-persistence', () => ({ mergeAvailableJyotishSectionsIntoChartJson: vi.fn((a) => a), persistCanonicalChartJsonV2: vi.fn(async () => ({ chartVersionId: 'cv1', chartVersion: 1, chartJson: { metadata: { chartVersionId: 'cv1', chartVersion: 1 } } })) }))
vi.mock('@/lib/astro/calculations/master', () => ({
  calculateMasterAstroOutput: vi.fn(async () => ({
    calculation_status: 'calculated',
    runtime_clock: { current_utc: '2026-05-05T00:00:00.000Z', as_of_date: '2026-05-05' },
    prediction_ready_context: { summary: 'ready' },
    confidence: { overall: { value: 75, label: 'medium', reasons: [] } },
    warnings: [],
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
        engineVersion: 'engine',
        ephemerisVersion: 'ephemeris',
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
vi.mock('@/lib/astro/normalize', () => ({ normalizeBirthInput: vi.fn(() => ({ input_hash_material_version: '2.0.0', birth_date_iso: '1999-06-14', birth_time_iso: '09:58', birth_time_known: true, birth_time_precision: 'exact', birth_time_uncertainty_seconds: 0, timezone: 'Asia/Kolkata', timezone_status: 'valid', latitude_full: 22.57, longitude_full: 88.36, latitude_rounded: 22.57, longitude_rounded: 88.36, coordinate_confidence: 0.95, warnings: [] })) }))
vi.mock('@/lib/astro/profile-birth-data', () => ({ normalizeStoredBirthData: vi.fn((x) => x) }))
vi.mock('@/lib/astro/encryption', () => ({ decryptJson: vi.fn(() => ({ birth_date: '1999-06-14', birth_time: '09:58', birth_time_known: true, birth_time_precision: 'exact', birth_place_name: 'Kolkata', latitude: 22.57, longitude: 88.36, timezone: 'Asia/Kolkata', data_consent_version: 'astro-v1' })) }))
vi.mock('@/lib/security/request-guards', () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
  checkRateLimit: vi.fn(() => ({ ok: true })),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security/request-guards'

const user = { id: 'u1' }
const profileId = '11111111-1111-4111-8111-111111111111'
const settingsRow = { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }
const profileRow = { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active', current_chart_version_id: 'cv1' }
const persistedChartJson = {
  schemaVersion: 'chart_json_v2',
  metadata: {
    profileId,
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
const persistedChartRow = { id: 'cv1', user_id: user.id, profile_id: profileId, chart_version: 1, schema_version: 'chart_json_v2', status: 'completed', is_current: true, chart_json: persistedChartJson }

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

function makeServiceMock(overrides?: Partial<Record<string, unknown>>) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') return overrides?.birth_profiles ?? makeQuery(profileRow)
      if (table === 'astrology_settings') return overrides?.astrology_settings ?? makeQuery(settingsRow)
      if (table === 'chart_calculations') return overrides?.chart_calculations ?? makeQuery({ id: 'calc1' })
      if (table === 'chart_json_versions') return overrides?.chart_json_versions ?? makeQuery(persistedChartRow)
      if (table === 'prediction_ready_summaries') return overrides?.prediction_ready_summaries ?? makeQuery(null)
      if (table === 'calculation_audits' || table === 'calculation_audit_logs') return overrides?.calculation_audits ?? makeQuery(null)
      return makeQuery(null)
    }),
    rpc: overrides?.rpc ?? vi.fn(async () => ({ data: { chart_version_id: 'cv1', chart_version: 1 }, error: null })),
  }
}

function makeReq(requestProfileId = profileId) {
  return new NextRequest('http://localhost/api/astro/v1/calculate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify({ profile_id: requestProfileId }),
  })
}

beforeEach(() => vi.clearAllMocks())
beforeEach(() => {
  delete process.env.ASTRO_CALCULATE_DEBUG
})
beforeEach(() => {
  vi.mocked(checkRateLimit).mockReturnValue({ ok: true } as never)
})

async function getPOST() {
  vi.resetModules()
  vi.doMock('@/lib/astro/config/feature-flags', () => ({
    ASTRO_CALC_INTEGRATION_ENABLED: false,
    ASTRO_CALC_INTEGRATION_STRICT_MODE: true,
    ASTRO_CALC_FIXTURE_VALIDATION_ENABLED: false,
    ASTRO_ALLOW_UNVERIFIED_ADVANCED_CALCS: false,
  }))
  const mod = await import('@/app/api/astro/v1/calculate/route')
  return mod.POST
}

describe('POST /api/astro/v1/calculate', () => {
  it('returns profile_not_found when no profile exists', async () => {
    const POST = await getPOST()
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      birth_profiles: makeQuery(null),
      astrology_settings: makeQuery(settingsRow),
    }) as never)
    const resp = await POST(makeReq('11111111-1111-4111-8111-111111111111'))
    expect(resp.status).toBe(404)
    expect((await resp.json()).error).toBe('profile_not_found')
  })

  it('returns profile_access_denied for another user', async () => {
    const POST = await getPOST()
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      birth_profiles: makeQuery({ id: profileId, user_id: 'other', encrypted_birth_data: 'x', status: 'active' }),
      astrology_settings: makeQuery(settingsRow),
    }) as never)
    const resp = await POST(makeReq('11111111-1111-4111-8111-111111111111'))
    expect(resp.status).toBe(404)
    expect((await resp.json()).error).toBe('profile_access_denied')
  })

  it('returns generic calc_insert_failed when debug is disabled', async () => {
    const POST = await getPOST()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return { select: () => makeQuery({ id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active', current_chart_version_id: 'cv1' }) }
        }
        if (table === 'astrology_settings') {
          return { select: () => makeQuery({ astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }) }
        }
        if (table === 'chart_calculations') {
          return {
            select: () => makeQuery(null),
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: null,
                  error: { code: '23502', message: 'not null violation', details: 'calc row missing' },
                }),
              }),
              maybeSingle: async () => ({
                data: null,
                error: { code: '23502', message: 'not null violation', details: 'calc row missing' },
              }),
              single: async () => ({
                data: null,
                error: { code: '23502', message: 'not null violation', details: 'calc row missing' },
              }),
            }),
          }
        }
        return { select: () => makeQuery(null) }
      }),
    } as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(500)
    expect(await resp.json()).toEqual({ error: 'calc_insert_failed' })
    expect(warnSpy).toHaveBeenCalledWith(
      '[astro_chart_calculation_failed]',
      expect.objectContaining({
        stage: 'calc_insert',
        code: '23502',
        hasUser: true,
        hasProfile: true,
        hasInputHash: true,
        hasSettingsHash: true,
        engineVersion: expect.any(String),
        ephemerisVersion: expect.any(String),
        schemaVersion: expect.any(String),
        forceRecalc: false,
        status: 'running',
      }),
    )
  })

  it('returns safe debug calc_insert diagnostics when debug is enabled', async () => {
    const POST = await getPOST()
    process.env.ASTRO_CALCULATE_DEBUG = 'true'
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return { select: () => makeQuery({ id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active', current_chart_version_id: 'cv1' }) }
        }
        if (table === 'astrology_settings') {
          return { select: () => makeQuery({ astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }) }
        }
        if (table === 'chart_calculations') {
          return {
            select: () => makeQuery(null),
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: null,
                  error: { code: '23502', message: 'not null violation', details: 'calc row missing', hint: 'check payload' },
                }),
              }),
              maybeSingle: async () => ({
                data: null,
                error: { code: '23502', message: 'not null violation', details: 'calc row missing', hint: 'check payload' },
              }),
              single: async () => ({
                data: null,
                error: { code: '23502', message: 'not null violation', details: 'calc row missing', hint: 'check payload' },
              }),
            }),
          }
        }
        return { select: () => makeQuery(null) }
      }),
    } as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(500)
    expect(await resp.json()).toEqual({
      error: 'calc_insert_failed',
      stage: 'calc_insert',
      code: '23502',
      message: 'not null violation',
      details: 'calc row missing',
      hint: 'check payload',
      diagnostic: {
        hasUser: true,
        hasProfile: true,
        hasInputHash: true,
        hasSettingsHash: true,
        engineVersion: expect.any(String),
        engineVersionType: 'string',
        engineVersionIsNull: false,
        ephemerisVersion: expect.any(String),
        ephemerisVersionType: 'string',
        ephemerisVersionIsNull: false,
        schemaVersion: expect.any(String),
        schemaVersionType: 'string',
        schemaVersionIsNull: false,
        forceRecalc: false,
        forceRecalcType: 'boolean',
        forceRecalcIsNull: false,
        status: 'running',
        statusType: 'string',
        statusIsNull: false,
      },
    })
  })

  it('returns chart_version_save_failed when chart insert fails', async () => {
    const POST = await getPOST()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      chart_json_versions: Object.assign(makeQuery(persistedChartRow), {
        insert: async () => ({ data: null, error: { code: '23502', message: 'not null violation' } }),
      }),
    }) as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body).toMatchObject({ chart_version_id: 'cv1', calculation_id: 'calc1', calculation_status: 'calculated' })
    expect(warnSpy).not.toHaveBeenCalledWith(
      '[astro_chart_calculation_failed]',
      expect.objectContaining({
        stage: 'persist_and_promote_current_chart_version',
        code: 'chart_version_save_failed',
      }),
    )
  })

  it('returns prediction_summary_save_failed when prediction insert fails', async () => {
    const POST = await getPOST()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      prediction_ready_summaries: Object.assign(makeQuery(null), {
        insert: async () => ({ data: null, error: { message: 'boom' } }),
      }),
    }) as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body).toMatchObject({ chart_version_id: 'cv1', calculation_id: 'calc1', calculation_status: 'calculated' })
    expect(warnSpy).not.toHaveBeenCalledWith(
      '[astro_chart_calculation_failed]',
      expect.objectContaining({
        stage: 'persist_and_promote_current_chart_version',
        code: 'chart_version_save_failed',
      }),
    )
  })

  it('returns current_chart_promotion_failed when rpc fails', async () => {
    const POST = await getPOST()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      prediction_ready_summaries: makeQuery({ id: 'p1' }),
      calculation_audits: Object.assign(makeQuery(null), {
        insert: async () => ({ data: null, error: { message: 'audit boom' } }),
      }),
      rpc: vi.fn(async () => ({ data: null, error: { message: 'rpc boom' } })),
    }) as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body).toMatchObject({ chart_version_id: 'cv1', calculation_id: 'calc1', calculation_status: 'calculated' })
    expect(warnSpy).not.toHaveBeenCalledWith(
      '[astro_chart_calculation_failed]',
      expect.objectContaining({
        stage: 'persist_and_promote_current_chart_version',
        code: 'chart_version_save_failed',
      }),
    )
  })

  it('returns audit_insert_failed when audit insert fails', async () => {
    const POST = await getPOST()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      prediction_ready_summaries: makeQuery({ id: 'p1' }),
      calculation_audits: Object.assign(makeQuery(null), {
        insert: async () => ({ data: null, error: { message: 'audit boom' } }),
      }),
    }) as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(200)
    expect(await resp.json()).toMatchObject({ chart_version_id: 'cv1', calculation_id: 'calc1', calculation_status: 'calculated' })
  })

  it('returns chart payload on successful persist', async () => {
    const POST = await getPOST()
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      chart_json_versions: makeQuery(persistedChartRow),
      prediction_ready_summaries: makeQuery({ id: 'p1' }),
      calculation_audits: makeQuery({ id: 'audit1' }),
    }) as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body).toMatchObject({ chart_version_id: 'cv1', calculation_id: 'calc1', calculation_status: 'calculated' })
    expect(body.error).toBeUndefined()
  })

  it('returns safe persist debug payload when ASTRO_CALCULATE_DEBUG is enabled', async () => {
    const POST = await getPOST()
    process.env.ASTRO_CALCULATE_DEBUG = 'true'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceMock({
      chart_json_versions: Object.assign(makeQuery(persistedChartRow), {
        insert: async () => ({ data: null, error: { message: 'constraint' } }),
      }),
    }) as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body).toMatchObject({ chart_version_id: 'cv1', calculation_id: 'calc1', calculation_status: 'calculated' })
    expect(JSON.stringify(body)).not.toContain('encrypted_birth_data')
  })
})
