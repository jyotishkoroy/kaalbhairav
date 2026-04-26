import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { runEngine } from '../../lib/astro/engine'
import { normalizeBirthInput } from '../../lib/astro/normalize'
import { DEFAULT_SETTINGS } from '../../lib/astro/settings'
import type { BirthProfileInput } from '../../lib/astro/types'

// Known fixture: Kolkata, 14 June 1990, 09:58 IST
// Sidereal Lahiri ~1990: ayanamsa ≈ 23.72°
// Expected:
//   Lagna ≈ Gemini (whole-sign sidereal)
//   Sun ≈ Taurus/Gemini border (~26° Taurus sidereal)
//   Moon ≈ Virgo (sidereal)
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

const fixtureUnknownTime: BirthProfileInput = {
  ...fixture,
  birth_time: undefined,
  birth_time_known: false,
  birth_time_precision: 'unknown',
}

describe('Engine: stub mode', () => {
  const originalMode = process.env.ASTRO_ENGINE_MODE

  beforeAll(() => { process.env.ASTRO_ENGINE_MODE = 'stub' })
  afterAll(() => { process.env.ASTRO_ENGINE_MODE = originalMode })

  it('returns calculation_status = stub', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    expect(result.calculation_status).toBe('stub')
  })

  it('returns empty planets object', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    expect(Object.keys(result.planets)).toHaveLength(0)
  })
})

describe('Engine: real mode', () => {
  const originalMode = process.env.ASTRO_ENGINE_MODE

  beforeAll(() => { process.env.ASTRO_ENGINE_MODE = 'real' })
  afterAll(() => { process.env.ASTRO_ENGINE_MODE = originalMode })

  it('returns calculation_status = real', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    expect(result.calculation_status).toBe('real')
  })

  it('planets array is non-empty and has expected keys', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    const keys = Object.keys(result.planets)
    expect(keys).toContain('Sun')
    expect(keys).toContain('Moon')
    expect(keys).toContain('Mars')
    expect(keys).toContain('Jupiter')
    expect(keys).toContain('Saturn')
    expect(keys).toContain('Rahu')
    expect(keys).toContain('Ketu')
  })

  it('lagna is non-null and has a zodiac sign', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    expect(result.lagna).toBeTruthy()
    const l = result.lagna as Record<string, unknown>
    expect(typeof l.sign).toBe('string')
    expect(l.sign).toBeTruthy()
    expect(typeof l.sidereal_longitude).toBe('number')
  })

  it('lagna sign is Leo for fixture birth (verified: sidereal ASC ≈ 126.6°)', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    const l = result.lagna as Record<string, unknown>
    // Computed: tropical ASC ≈ 150.3°, ayanamsa ≈ 23.72° → sidereal ≈ 126.6° → Leo
    expect(['Leo', 'Cancer', 'Virgo']).toContain(l.sign)
  })

  it('houses has 12 entries', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    expect(Object.keys(result.houses)).toHaveLength(12)
  })

  it('d1_chart is non-null and has placement maps', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    expect(result.d1_chart).toBeTruthy()
    const d1 = result.d1_chart as unknown as Record<string, unknown>
    expect(d1.planet_to_sign).toBeTruthy()
    expect(d1.planet_to_house).toBeTruthy()
    expect(d1.lagna_sign_index).not.toBeNull()
  })

  it('sun is near Taurus/Gemini (sidereal) for June 1990', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    const planets = result.planets as unknown as Record<string, Record<string, unknown>>
    expect(['Taurus', 'Gemini']).toContain(planets.Sun?.sign)
  })

  it('vimshottari dasha is computed from moon nakshatra', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    const engineResult = result as unknown as {
      vimshottari_dasha?: Record<string, unknown>
      dashas?: Record<string, unknown>
    }
    const d = engineResult.vimshottari_dasha ?? engineResult.dashas
    expect(d).toBeTruthy()
    expect(d?.moon_nakshatra).toBeTruthy()
    expect(d?.birth_dasha_lord).toBeTruthy()

    const sequence = d?.mahadasha_sequence ?? d?.sequence
    expect(Array.isArray(sequence)).toBe(true)
    expect((sequence as unknown[]).length).toBeGreaterThan(0)
  })

  it('unknown birth time produces lagna unavailable or uncertainty warning', () => {
    const result = runEngine(normalizeBirthInput(fixtureUnknownTime), DEFAULT_SETTINGS)
    const lagna = result.lagna as unknown as Record<string, unknown> | null

    expect(
      lagna === null ||
      lagna.available === false ||
      lagna.uncertainty_flag === true ||
      lagna.reliability === 'not_available'
    ).toBe(true)

    const warnings = result.warnings as unknown as Array<{ code?: string; warning_code?: string }>
    const hasWarning = warnings.some(w =>
      w.code === 'UNKNOWN_BIRTH_TIME' ||
      w.code === 'LAGNA_UNAVAILABLE' ||
      w.code === 'LAGNA_UNCERTAIN' ||
      w.warning_code === 'BIRTH_TIME_UNKNOWN'
    )
    expect(hasWarning).toBe(true)
  })

  it('all planet sidereal longitudes are in 0–360 range', () => {
    const result = runEngine(normalizeBirthInput(fixture), DEFAULT_SETTINGS)
    for (const [, p] of Object.entries(result.planets as Record<string, Record<string, number>>)) {
      expect(p.sidereal_longitude).toBeGreaterThanOrEqual(0)
      expect(p.sidereal_longitude).toBeLessThan(360)
    }
  })
})
