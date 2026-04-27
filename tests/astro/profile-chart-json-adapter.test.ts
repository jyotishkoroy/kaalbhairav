import { describe, it, expect } from 'vitest'

import { buildProfileExpandedSectionsFromMasterOutput } from '@/lib/astro/profile-chart-json-adapter'

function makeMasterOutput(overrides: Record<string, unknown> = {}) {
  return {
    calculation_status: 'calculated',
    planetary_positions: {
      Sun: { sidereal_longitude: 10 },
    },
    lagna: { sign: 'Aries' },
    whole_sign_houses: { house_1: { sign: 'Aries' } },
    d1_rashi_chart: { placements: { sun: { house: 1, sign: 'Aries' } } },
    daily_transits: {
      current_utc: '2026-01-01T00:00:00.000Z',
      status: 'calculated',
      transit_planets: [
        {
          planet: 'Sun',
          longitude_deg: 10,
          sidereal_longitude_deg: 5,
          sign: 'Aries',
          nakshatra: 'Ashwini',
          pada: 1,
          house_transited: 1,
          retrograde: false,
        },
      ],
      current_moon_rashi: { sign: 'Aries' },
      current_moon_nakshatra: { nakshatra: 'Ashwini' },
      current_tithi: { number: 1, name: 'Pratipada', paksha: 'shukla', completion_percent: 50 },
      transit_relation_to_natal: [],
      warnings: [],
    },
    panchang: {
      status: 'calculated',
      calculation_instant_utc: '2026-01-01T00:00:00.000Z',
      panchang_local_date: '2026-01-01',
      vara: 'Thursday',
      tithi: { number: 1, name: 'Pratipada', paksha: 'shukla', completion_percent: 50 },
      nakshatra: 'Ashwini',
      yoga: 'Vishkambha',
      karana: 'Bava',
      sunrise_utc: '2026-01-01T01:00:00.000Z',
      sunset_utc: '2026-01-01T13:00:00.000Z',
      sunrise_local: null,
      sunset_local: null,
      moon_rashi: 'Aries',
      sunrise_moon_rashi: 'Aries',
      warnings: [],
    },
    vimshottari_dasha: {
      moon_nakshatra_index: 0,
      moon_nakshatra: 'Ashwini',
      birth_dasha_lord: 'Ketu',
      dasha_total_years: 7,
      dasha_elapsed_years: 1.75,
      dasha_remaining_years: 5.25,
      dasha_year_basis: '365.25_days',
      mahadasha_sequence: [],
      antardasha_sequence: [],
      pratyantardasha_sequence: [],
      current_dasha: {
        mahadasha: { level: 'mahadasha', lord: 'Ketu', start_utc: '2025-01-01T00:00:00.000Z', end_utc: '2032-01-01T00:00:00.000Z', duration_years: 7, duration_days: 2556.75, parent_lords: [] },
        antardasha: null,
        pratyantardasha: null,
      },
      boundary_warnings: [],
    },
    confidence: { value: 80, label: 'high', reasons: [] },
    warnings: [],
    audit: { sources: ['swiss_ephemeris'], engine_modules: ['master_calculator'], notes: [] },
    prediction_ready_context: { foo: 'bar' },
    ...overrides,
  }
}

describe('profile chart json adapter', () => {
  it('maps calculated daily transits, panchang, and current timing into real expanded sections', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput(makeMasterOutput() as never)

    expect(expanded.daily_transits?.status).toBe('real')
    expect(expanded.panchang?.status).toBe('real')
    expect(expanded.current_timing?.status).toBe('real')
  })

  it('marks missing calculated sections as not available', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput(
      makeMasterOutput({ daily_transits: null, panchang: null, vimshottari_dasha: null }) as never,
    )

    expect(expanded.daily_transits?.status).toBe('not_available')
    expect(expanded.panchang?.status).toBe('not_available')
    expect(expanded.current_timing?.status).toBe('not_available')
  })

  it('maps calculated panchang status to real and computes dasha percent', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput(makeMasterOutput() as never)
    expect(expanded.current_timing?.elapsed_dasha_percent).toBe(25)
  })
})
