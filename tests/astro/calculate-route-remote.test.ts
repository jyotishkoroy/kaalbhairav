/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { remoteCall, supabaseState } = vi.hoisted(() => {
  const state = {
    chartVersionLookup: { data: null as null | { chart_version: number }, error: null as null | { message: string } },
    chartVersionInserts: [] as Array<Record<string, unknown>>,
  }

  return {
    remoteCall: vi.fn(async () => ({
      schema_version: '29.0.0',
      calculation_status: 'calculated',
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
    })),
    supabaseState: state,
  }
})

vi.mock('../../lib/astro/calculations/master', () => {
  throw new Error('local calculator should not be imported in remote mode')
})

vi.mock('../../lib/astro/engine/remote', () => ({
  calculateMasterAstroOutputRemote: remoteCall,
}))

vi.mock('../../lib/astro/current-chart-version', () => ({
  loadCurrentAstroChartForUser: vi.fn(async () => ({
    ok: true,
    profile: { id: 'profile-1', user_id: 'user-test', current_chart_version_id: 'remote-cv-1', status: 'active' },
    chartVersion: {
      id: 'remote-cv-1',
      profile_id: 'profile-1',
      user_id: 'user-test',
      status: 'completed',
      is_current: true,
      schema_version: 'chart_json_v2',
      chart_version: 1,
      chart_json: {
        schemaVersion: 'chart_json_v2',
        metadata: {
          profileId: 'profile-1',
          chartVersionId: 'remote-cv-1',
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
          transits: { status: 'computed', source: 'deterministic_calculation', fields: {} },
          advanced: { status: 'computed', source: 'deterministic_calculation', fields: {} },
        },
      },
    },
  })),
}))

vi.mock('../../lib/astro/encryption', () => ({
  decryptJson: vi.fn(() => ({
    display_name: 'Fixture',
    birth_date: '1990-06-14',
    birth_time: '09:58:00',
    birth_time_known: true,
    birth_time_precision: 'exact',
    birth_place_name: 'Kolkata',
    latitude: 22.5667,
    longitude: 88.3667,
    timezone: 'Asia/Kolkata',
    data_consent_version: '2026-04-25',
  })),
}))

vi.mock('../../lib/astro/normalize', () => ({
  normalizeBirthInput: vi.fn(() => ({
    birth_date_iso: '1990-06-14',
    birth_time_iso: '09:58:00',
    birth_time_known: true,
    birth_time_precision: 'exact',
    timezone: 'Asia/Kolkata',
    timezone_status: 'valid',
    coordinate_confidence: 0.95,
    latitude_full: 22.5667,
    longitude_full: 88.3667,
    latitude_rounded: 22.5667,
    longitude_rounded: 88.3667,
    input_hash_material_version: '2.0.0',
    warnings: [],
  })),
}))

vi.mock('../../lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-test' } } })) },
  })),
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: 'profile-1', user_id: 'user-test', encrypted_birth_data: '{}', pii_encryption_key_version: '1', status: 'active' },
                error: null,
              })),
              single: vi.fn(async () => ({
                data: { id: 'profile-1', user_id: 'user-test', encrypted_birth_data: '{}', pii_encryption_key_version: '1', status: 'active' },
                error: null,
              })),
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { id: 'profile-1', user_id: 'user-test', encrypted_birth_data: '{}', pii_encryption_key_version: '1', status: 'active' },
                  error: null,
                })),
                single: vi.fn(async () => ({
                  data: { id: 'profile-1', user_id: 'user-test', encrypted_birth_data: '{}', pii_encryption_key_version: '1', status: 'active' },
                  error: null,
                })),
              })),
            })),
          })),
        }
      }

      if (table === 'astrology_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'sidereal_365.25' },
                error: null,
              })),
              single: vi.fn(async () => ({
                data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'sidereal_365.25' },
                error: null,
              })),
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'sidereal_365.25' },
                  error: null,
                })),
                single: vi.fn(async () => ({
                  data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'sidereal_365.25' },
                  error: null,
                })),
              })),
            })),
          })),
        }
      }

      if (table === 'chart_calculations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                    })),
                  })),
                })),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'calc-row-1' }, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: null, error: null })),
          })),
        }
      }

      if (table === 'chart_json_versions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => supabaseState.chartVersionLookup),
                })),
              })),
            })),
          })),
          insert: vi.fn((payload: Record<string, unknown>) => {
            supabaseState.chartVersionInserts.push(payload)
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: 'chart-version-row-1' },
                  error: null,
                })),
              })),
            }
          }),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        }
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'unknown-row' }, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: null, error: null })),
        })),
      }
    }),
    rpc: vi.fn(async () => ({ data: [{ chart_version_id: 'remote-cv-1', chart_version: 1 }], error: null })),
  })),
}))

import { POST } from '../../app/api/astro/v1/calculate/route'

beforeEach(() => {
  process.env.ASTRO_V1_API_ENABLED = 'true'
  process.env.ASTRO_ENGINE_BACKEND = 'remote'
  process.env.ASTRO_ENGINE_SERVICE_URL = 'http://engine.test'
  supabaseState.chartVersionLookup = { data: null, error: null }
  supabaseState.chartVersionInserts = []
  remoteCall.mockResolvedValue({
    schema_version: '29.0.0',
    calculation_status: 'calculated',
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
  })
})

describe('calculate route remote mode', () => {
  it('uses remote adapter when service url is set', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ profile_id: '123e4567-e89b-12d3-a456-426614174000' }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)
    expect(remoteCall).toHaveBeenCalledTimes(1)
  })

  it('inserts chart_version 1 when no prior chart versions exist', async () => {
    supabaseState.chartVersionLookup = { data: null, error: null }

    const request = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ profile_id: '123e4567-e89b-12d3-a456-426614174000' }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)
    expect(supabaseState.chartVersionInserts).toHaveLength(0)

    const body = await response.json()
    expect(body.debug_saved_chart_json).toBeDefined()
  })

  it('inserts the next chart version when a prior version exists', async () => {
    supabaseState.chartVersionLookup = { data: { chart_version: 1 }, error: null }

    const request = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ profile_id: '123e4567-e89b-12d3-a456-426614174000' }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)
    expect(supabaseState.chartVersionInserts).toHaveLength(0)

    const body = await response.json()
    expect(body.debug_saved_chart_json).toBeDefined()
  })

  it('returns merged jyotish sections in the public response and persisted chart json', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ profile_id: '123e4567-e89b-12d3-a456-426614174000' }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.schema_version).toBe('29.0.0')
    expect(body.panchang?.status).toBe('available')
    expect(body.vimshottari_dasha?.status).toBe('available')
    expect(body.navamsa_d9?.status).toBe('available')
    expect(body.ashtakvarga?.status).toBe('available')
    expect(body.expanded_sections?.panchang?.status).toBe('available')
    expect(body.expanded_sections?.navamsa_d9?.status).toBe('available')
    expect(body.expanded_sections?.current_timing?.current_mahadasha?.lord).toBe('Jupiter')

    expect(supabaseState.chartVersionInserts).toHaveLength(0)
    expect(body.chart_version_id).toBe('remote-cv-1')
  })

  it('returns rejected output when chart version lookup fails', async () => {
    supabaseState.chartVersionLookup = { data: null, error: { message: 'lookup failed' } }

    const request = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ profile_id: '123e4567-e89b-12d3-a456-426614174000' }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toMatchObject({
      schema_version: '2.0.0',
      calculation_status: 'rejected',
    })
    expect(body.rejection_reason).toContain('chart_version_lookup_failed')
  })
})
