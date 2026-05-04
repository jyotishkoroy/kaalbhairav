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
vi.mock('@/lib/security/request-guards', () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
  checkRateLimit: vi.fn(() => ({ ok: true })),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security/request-guards'
import { POST } from '@/app/api/astro/v1/calculate/route'

const user = { id: 'u1' }
const profileId = '11111111-1111-4111-8111-111111111111'

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

function makeReq(profileId = 'p1') {
  return new NextRequest('http://localhost/api/astro/v1/calculate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify({ profile_id: profileId }),
  })
}

beforeEach(() => vi.clearAllMocks())
beforeEach(() => {
  delete process.env.ASTRO_CALCULATE_DEBUG
})
beforeEach(() => {
  vi.mocked(checkRateLimit).mockReturnValue({ ok: true } as never)
})

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

  it('returns generic calc_insert_failed when debug is disabled', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return {
            select: () => chain({
              maybeSingle: async () => ({
                data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' },
                error: null,
              }),
            }),
          }
        }
        if (table === 'astrology_settings') {
          return {
            select: () => chain({
              maybeSingle: async () => ({
                data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' },
                error: null,
              }),
            }),
          }
        }
        if (table === 'chart_calculations') {
          return {
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
            insert: () => chain({
              single: async () => ({
                data: null,
                error: { code: '23502', message: 'not null violation', details: 'calc row missing' },
              }),
            }),
          }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
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
    process.env.ASTRO_CALCULATE_DEBUG = 'true'
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return {
            select: () => chain({
              maybeSingle: async () => ({
                data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' },
                error: null,
              }),
            }),
          }
        }
        if (table === 'astrology_settings') {
          return {
            select: () => chain({
              maybeSingle: async () => ({
                data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' },
                error: null,
              }),
            }),
          }
        }
        if (table === 'chart_calculations') {
          return {
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
            insert: () => chain({
              single: async () => ({
                data: null,
                error: { code: '23502', message: 'not null violation', details: 'calc row missing', hint: 'check payload' },
              }),
            }),
          }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
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
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return chain({
            select: () => chain({
              maybeSingle: async () => ({
                data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' },
                error: null,
              }),
            }),
          })
        }
        if (table === 'astrology_settings') {
          return chain({
            select: () => chain({
              maybeSingle: async () => ({
                data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' },
                error: null,
              }),
            }),
          })
        }
        if (table === 'chart_calculations') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'calc1' }, error: null }),
              }),
            }),
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
            update: () => chain({}),
          }
        }
        if (table === 'chart_json_versions') {
          return chain({
            insert: async () => ({ data: null, error: { code: '23502', message: 'not null violation' } }),
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
          })
        }
        return chain({ select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }) })
      }),
    } as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(500)
    expect(await resp.json()).toEqual({ error: 'chart_version_save_failed' })
    expect(warnSpy.mock.calls.some(([label, payload]) => label === '[astro_chart_calculation_failed]' && (payload as Record<string, unknown>).stage === 'persist_and_promote_current_chart_version' && (payload as Record<string, unknown>).code === 'chart_version_save_failed')).toBe(true)
  })

  it('returns prediction_summary_save_failed when prediction insert fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return chain({
            select: () => chain({
              maybeSingle: async () => ({
                data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' },
                error: null,
              }),
            }),
          })
        }
        if (table === 'astrology_settings') {
          return chain({
            select: () => chain({
              maybeSingle: async () => ({
                data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' },
                error: null,
              }),
            }),
          })
        }
        if (table === 'chart_calculations') {
          return chain({
            insert: () => chain({ select: () => chain({ single: async () => ({ data: { id: 'calc1' }, error: null }) }) }),
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
            update: () => chain({}),
          })
        }
        if (table === 'chart_json_versions') {
          return chain({
            insert: async () => ({ data: { id: 'cv1' }, error: null }),
            select: () => chain({ maybeSingle: async () => ({ data: { chart_json: { metadata: { chart_version_id: 'cv1' } } }, error: null }) }),
          })
        }
        if (table === 'prediction_ready_summaries') {
          return chain({
            insert: async () => ({ data: null, error: { message: 'boom' } }),
          })
        }
        return chain({ select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }) })
      }),
    } as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(500)
    expect(await resp.json()).toEqual({ error: 'chart_version_save_failed' })
    expect(warnSpy.mock.calls.some(([label, payload]) => label === '[astro_chart_calculation_failed]' && (payload as Record<string, unknown>).stage === 'persist_and_promote_current_chart_version' && (payload as Record<string, unknown>).code === 'chart_version_save_failed')).toBe(true)
  })

  it('returns current_chart_promotion_failed when rpc fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return chain({ select: () => chain({ maybeSingle: async () => ({ data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' }, error: null }) }) })
        }
        if (table === 'astrology_settings') {
          return chain({ select: () => chain({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) })
        }
        if (table === 'chart_calculations') {
          return chain({
            insert: () => chain({ select: () => chain({ single: async () => ({ data: { id: 'calc1' }, error: null }) }) }),
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
            update: () => chain({}),
          })
        }
        if (table === 'chart_json_versions') {
          return chain({
            insert: async () => ({ data: { id: 'cv1' }, error: null }),
            select: () => chain({ maybeSingle: async () => ({ data: { chart_json: { metadata: { chart_version_id: 'cv1' } } }, error: null }) }),
          })
        }
        if (table === 'prediction_ready_summaries') {
          return chain({ insert: async () => ({ data: { id: 'p1' }, error: null }) })
        }
        if (table === 'calculation_audit_logs') {
          return chain({ insert: async () => ({ data: null, error: { message: 'audit boom' } }) })
        }
        return chain({ select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }) })
      }),
      rpc: vi.fn(async () => ({ data: null, error: { message: 'rpc boom' } })),
    } as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(500)
    expect(await resp.json()).toEqual({ error: 'chart_version_save_failed' })
    expect(warnSpy.mock.calls.some(([label, payload]) => label === '[astro_chart_calculation_failed]' && (payload as Record<string, unknown>).stage === 'persist_and_promote_current_chart_version' && (payload as Record<string, unknown>).code === 'chart_version_save_failed')).toBe(true)
  })

  it('returns audit_insert_failed when audit insert fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return { select: () => chain({ maybeSingle: async () => ({ data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' }, error: null }) }) }
        }
        if (table === 'astrology_settings') {
          return { select: () => chain({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) }
        }
        if (table === 'chart_calculations') {
          return {
            insert: () => chain({ single: async () => ({ data: { id: 'calc1' }, error: null }) }),
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
            update: () => chain({}),
          }
        }
        if (table === 'chart_json_versions') {
          return {
            insert: async () => ({ data: { id: 'cv1' }, error: null }),
            select: () => chain({ maybeSingle: async () => ({ data: { chart_json: { metadata: { chart_version_id: 'cv1' } } }, error: null }) }),
          }
        }
        if (table === 'prediction_ready_summaries') {
          return { insert: async () => ({ data: { id: 'p1' }, error: null }) }
        }
        if (table === 'calculation_audit_logs') {
          return { insert: async () => ({ data: null, error: { message: 'audit boom' } }) }
        }
        return { select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }) }
      }),
      rpc: vi.fn(async () => ({ data: { chart_version_id: 'cv1', chart_version: 1 }, error: null })),
    } as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(200)
    expect(await resp.json()).toMatchObject({ chart_version_id: 'cv1', calculation_id: 'calc1', reused_cache: false })
  })

  it('returns chart payload on successful persist', async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return chain({ select: () => chain({ maybeSingle: async () => ({ data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' }, error: null }) }) })
        }
        if (table === 'astrology_settings') {
          return chain({ select: () => chain({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) })
        }
        if (table === 'chart_calculations') {
          return chain({
            insert: () => chain({ select: () => chain({ single: async () => ({ data: { id: 'calc1' }, error: null }) }) }),
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
            update: () => chain({}),
          })
        }
        if (table === 'chart_json_versions') {
          return chain({
            insert: async () => ({ data: { id: 'cv1' }, error: null }),
            select: () => chain({
              maybeSingle: async () => ({ data: { chart_json: { metadata: { chart_version_id: 'cv1' }, root: true } }, error: null }),
            }),
          })
        }
        if (table === 'prediction_ready_summaries') {
          return chain({ insert: async () => ({ data: { id: 'p1' }, error: null }) })
        }
        if (table === 'calculation_audit_logs') {
          return chain({ insert: async () => ({ data: { id: 'audit1' }, error: null }) })
        }
        return chain({ select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }) })
      }),
      rpc: vi.fn(async () => ({ data: { chart_version_id: 'cv1', chart_version: 1 }, error: null })),
    } as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body).toMatchObject({ chart_version_id: 'cv1', calculation_id: 'calc1', calculation_status: 'calculated' })
    expect(body.error).toBeUndefined()
  })

  it('returns safe persist debug payload when ASTRO_CALCULATE_DEBUG is enabled', async () => {
    process.env.ASTRO_CALCULATE_DEBUG = 'true'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } } as never)
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'birth_profiles') {
          return chain({ select: () => chain({ maybeSingle: async () => ({ data: { id: profileId, user_id: user.id, encrypted_birth_data: 'x', status: 'active' }, error: null }) }) })
        }
        if (table === 'astrology_settings') {
          return chain({ select: () => chain({ maybeSingle: async () => ({ data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' }, error: null }) }) })
        }
        if (table === 'chart_calculations') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'calc1' }, error: null }),
              }),
            }),
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
            update: () => chain({}),
          }
        }
        if (table === 'chart_json_versions') {
          return {
            insert: async () => ({ data: null, error: { message: 'constraint' } }),
            select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }),
          }
        }
        return chain({ select: () => chain({ maybeSingle: async () => ({ data: null, error: null }) }) })
      }),
    } as never)

    const resp = await POST(makeReq(profileId))
    expect(resp.status).toBe(500)
    const body = await resp.json()
    expect(body).toMatchObject({
      error: 'chart_version_save_failed',
      stage: 'persist_and_promote_current_chart_version',
      diagnostic: {
        hasUser: true,
        hasProfile: true,
        hasInputHash: true,
        hasSettingsHash: true,
        calcIdPresent: true,
        profileIdPresent: true,
        userIdPresent: true,
        chartVersion: 1,
        chartVersionType: 'number',
      },
    })
    expect(JSON.stringify(body)).not.toContain('encrypted_birth_data')
    expect(JSON.stringify(body)).not.toContain('chart_json')
    expect(JSON.stringify(body)).not.toContain('birth_date')
    expect(JSON.stringify(body)).not.toContain('birth_time')
    expect(JSON.stringify(body)).not.toContain('place_of_birth')
    expect(JSON.stringify(body)).not.toContain('email')
    expect(JSON.stringify(body)).not.toContain('token')
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(warnSpy).toHaveBeenCalled()
  })
})
