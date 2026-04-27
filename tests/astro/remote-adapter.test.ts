import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/astro/calculations/master', () => ({
  masterAstroOutputSchema: {
    parse: (value: unknown) => value,
    safeParse: (value: unknown) => ({ success: true, data: value }),
  },
}))

import { calculateMasterAstroOutputRemote } from '../../lib/astro/engine/remote'
import type { RemoteAstroCalculationArgs } from '../../lib/astro/engine/remote'

const baseArgs: RemoteAstroCalculationArgs = {
  input: {
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
  },
  normalized: {
    birth_date_iso: '1990-06-14',
    birth_time_iso: '09:58:00',
    birth_time_known: true,
    birth_time_precision: 'exact',
    birth_time_uncertainty_seconds: 0,
    timezone: 'Asia/Kolkata',
    timezone_status: 'valid',
    coordinate_confidence: 0.95,
    latitude_full: 22.5667,
    longitude_full: 88.3667,
    latitude_rounded: 22.5667,
    longitude_rounded: 88.3667,
    input_hash_material_version: '2.0.0',
    warnings: [],
  },
  settings: {
    astrology_system: 'parashari',
    zodiac_type: 'sidereal',
    ayanamsa: 'lahiri',
    house_system: 'whole_sign',
    node_type: 'mean_node',
    dasha_year_basis: 'sidereal_365.25',
  },
  runtime: {
    user_id: 'user-test',
    profile_id: 'profile-test',
    current_utc: '2026-04-27T00:00:00.000Z',
    production: false,
  },
}

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.ASTRO_ENGINE_BACKEND
  delete process.env.ASTRO_ENGINE_SERVICE_URL
  delete process.env.ASTRO_ENGINE_SERVICE_API_KEY
})

describe('remote astro adapter', () => {
  it('returns remote success payload', async () => {
    process.env.ASTRO_ENGINE_SERVICE_URL = 'http://engine.test'
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      schema_version: '29.0.0',
      calculation_status: 'calculated',
    }), { status: 200 })) as never

    const result = await calculateMasterAstroOutputRemote(baseArgs)
    expect(result.calculation_status).toBe('calculated')
  })

  it('passes through remote 422 rejected output', async () => {
    process.env.ASTRO_ENGINE_SERVICE_URL = 'http://engine.test'
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      schema_version: '29.0.0',
      calculation_status: 'rejected',
      rejection_reason: 'timezone_invalid',
    }), { status: 422 })) as never

    const result = await calculateMasterAstroOutputRemote(baseArgs)
    expect(result.calculation_status).toBe('rejected')
    expect(result.rejection_reason).toBe('timezone_invalid')
  })

  it('returns structured rejected output when unavailable', async () => {
    process.env.ASTRO_ENGINE_SERVICE_URL = 'http://engine.test'
    globalThis.fetch = vi.fn(async () => { throw new Error('offline') }) as never

    const result = await calculateMasterAstroOutputRemote(baseArgs)
    expect(result.calculation_status).toBe('rejected')
    expect(result.rejection_reason).toBe('remote_astro_engine_unavailable')
  })

  it('preserves sanitized validation detail for remote 400 responses', async () => {
    process.env.ASTRO_ENGINE_SERVICE_URL = 'http://engine.test'
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      error: 'invalid_input',
      issues: [
        {
          path: ['input', 'birth_date'],
          message: 'Required',
          input: '1990-06-14',
        },
        {
          path: ['runtime', 'user_id'],
          message: 'Required',
          input: 'user-test',
        },
      ],
    }), { status: 400 })) as never

    const result = await calculateMasterAstroOutputRemote(baseArgs)

    expect(result.calculation_status).toBe('rejected')
    expect(result.rejection_reason).toBe('remote_astro_engine_http_400')
    expect(JSON.stringify(result)).not.toContain('1990-06-14')
    expect(JSON.stringify(result)).not.toContain('user-test')
    const warning = (result.warnings ?? []) as Array<Record<string, unknown>>
    expect(warning[0]).toMatchObject({
      warning_code: 'REMOTE_ENGINE_HTTP_400',
      severity: 'high',
      evidence: {
        status: 400,
        issues: [
          { path: ['input', 'birth_date'], message: 'Required' },
          { path: ['runtime', 'user_id'], message: 'Required' },
        ],
      },
    })
  })
})
