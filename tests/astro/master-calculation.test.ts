import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { calculateMasterAstroOutput } from '../../lib/astro/calculations/master'
import { normalizeBirthInput } from '../../lib/astro/normalize'
import type { BirthProfileInput } from '../../lib/astro/types'

const fixture: BirthProfileInput = {
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
}

describe('Master astro calculation output', () => {
  const originalMode = process.env.ASTRO_ENGINE_MODE

  beforeAll(() => { process.env.ASTRO_ENGINE_MODE = 'real' })
  afterAll(() => { process.env.ASTRO_ENGINE_MODE = originalMode })

  function findForbiddenKeyPath(value: unknown, forbidden: Set<string>, path: string[] = []): string | null {
    if (!value || typeof value !== 'object') return null
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        const found = findForbiddenKeyPath(value[i], forbidden, [...path, String(i)])
        if (found) return found
      }
      return null
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (forbidden.has(key)) return [...path, key].join('.')
      const found = findForbiddenKeyPath(nested, forbidden, [...path, key])
      if (found) return found
    }
    return null
  }

  it('returns the canonical calculation_status and major sections', async () => {
    const normalized = normalizeBirthInput(fixture)
    const output = await calculateMasterAstroOutput({
      input: fixture,
      normalized,
      settings: {
        astrology_system: 'parashari',
        zodiac_type: 'sidereal',
        ayanamsa: 'lahiri',
        house_system: 'whole_sign',
        node_type: 'mean_node',
        dasha_year_basis: 'traditional_360',
      },
      runtime: {
        user_id: 'user-test',
        profile_id: 'profile-test',
        current_utc: new Date().toISOString(),
        production: false,
      },
    })

    expect(['calculated', 'partial', 'rejected']).toContain(output.calculation_status)
    const typed = output as unknown as Record<string, unknown>
    const requiredTopLevel = [
      'schema_version',
      'calculation_status',
      'input_use',
      'birth_time_result',
      'julian_day',
      'ayanamsa',
      'external_engine_metadata',
      'constants_version',
      'planetary_positions',
      'sun_position',
      'moon_position',
      'mercury_position',
      'venus_position',
      'mars_position',
      'jupiter_position',
      'saturn_position',
      'rahu_position',
      'ketu_position',
      'sun_sign',
      'moon_sign',
      'nakshatra',
      'pada',
      'tithi',
      'lagna',
      'whole_sign_houses',
      'd1_rashi_chart',
      'navamsa_d9',
      'vimshottari_dasha',
      'planetary_aspects_drishti',
      'yogas',
      'doshas',
      'strength_weakness_indicators',
      'life_area_signatures',
      'prediction_ready_context',
      'core_natal_summary',
      'panchang',
      'daily_transits',
      'confidence',
      'warnings',
      'validation_results',
      'engine_boot_diagnostics',
      'ephemeris_range_metadata',
      'startup_validation_result',
      'openapi_schema_validation',
    ]

    for (const key of requiredTopLevel) {
      expect(typed).toHaveProperty(key)
    }

    const positions = typed.planetary_positions as Record<string, unknown>
    expect(positions.Sun).toBeTruthy()
    expect(positions.Moon).toBeTruthy()

    const yogas = typed.yogas as Array<Record<string, unknown>>
    const doshas = typed.doshas as Array<Record<string, unknown>>
    const strengths = typed.strength_weakness_indicators as Record<string, unknown> & { indicators?: Array<Record<string, unknown>> }
    expect(yogas.every((entry) => entry.status === 'unsupported' || entry.status === 'unavailable')).toBe(true)
    expect(yogas.every((entry) => entry.present === false)).toBe(true)
    expect(doshas.every((entry) => entry.status === 'unsupported' || entry.status === 'unavailable')).toBe(true)
    expect(doshas.every((entry) => entry.present === false)).toBe(true)
    expect((strengths.indicators ?? []).every((entry) => entry.status === 'unsupported' && entry.present === false)).toBe(true)

    const panchang = typed.panchang as Record<string, unknown> | null
    if (panchang) {
      expect(panchang.sunrise_convention).toMatchObject({
        convention: 'local_sunrise_to_local_sunrise',
        sunrise_basis: 'local_civil_date',
        evaluated_at_sunrise: true,
      })
      expect(panchang.status).toBeDefined()
      expect(panchang.sunrise_tithi).toBeTruthy()
    }

    const hit = findForbiddenKeyPath(typed.prediction_ready_context, new Set([
      'birth_date',
      'birth_time',
      'latitude',
      'longitude',
      'encrypted_birth_data',
      'data_consent_version',
      'profile_id',
      'user_id',
    ]))
    expect(hit).toBeNull()

    expect(Array.isArray(typed.validation_results)).toBe(true)
    expect((typed.validation_results as unknown[]).length).toBeGreaterThan(0)
  })
})
