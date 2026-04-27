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
              single: vi.fn(async () => ({
                data: { id: 'profile-1', user_id: 'user-test', encrypted_birth_data: '{}', pii_encryption_key_version: '1' },
                error: null,
              })),
            })),
          })),
        }
      }

      if (table === 'astrology_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'sidereal_365.25' },
                error: null,
              })),
            })),
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
        }
      }

      if (table === 'chart_calculations') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'calc-row-1' }, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: null, error: null })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
    expect(supabaseState.chartVersionInserts[0]).toMatchObject({
      chart_version: 1,
    })

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
    expect(supabaseState.chartVersionInserts[0]).toMatchObject({
      chart_version: 2,
    })

    const body = await response.json()
    expect(body.debug_saved_chart_json).toBeDefined()
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
