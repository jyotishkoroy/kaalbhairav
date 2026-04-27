import { describe, it, expect } from 'vitest'

import {
  buildProfileExpandedSectionsFromMasterOutput,
  buildProfileExpandedSectionsFromStoredChartJson,
  formatProfileChartStatus,
} from '@/lib/astro/profile-chart-json-adapter'

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
    navamsa_d9: {
      status: 'real',
      calculated_at: '2026-01-01T00:00:00.000Z',
      navamsa_lagna: 'Aries',
      planets: [
        { planet: 'Sun', navamsa_sign: 'Aries', navamsa_house: 1 },
      ],
      warnings: [],
    },
    planetary_aspects_drishti: {
      status: 'real',
      calculated_at: '2026-01-01T00:00:00.000Z',
      aspects: [
        { aspecting_planet: 'Sun', aspected_planet: 'Moon', aspected_house: null, aspect_type: 'graha_drishti_7th', strength: 'full' },
      ],
      warnings: [],
    },
    life_area_signatures: {
      status: 'real',
      calculated_at: '2026-01-01T00:00:00.000Z',
      signatures: [
        { area: 'self', house_number: 1, house_sign: 'Aries', lord: 'Mars', lord_placement_house: 1, lord_placement_sign: 'Aries', occupying_planets: ['Sun'], strength_note: 'lord in own sign' },
      ],
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
  function rowsOf(section: unknown): Array<Record<string, unknown>> {
    return Array.isArray((section as { rows?: Array<Record<string, unknown>> } | undefined)?.rows)
      ? ((section as { rows: Array<Record<string, unknown>> }).rows)
      : []
  }

  it('maps calculated daily transits, panchang, and current timing into real expanded sections', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput(makeMasterOutput() as never)

    expect(expanded.daily_transits?.status).toBe('real')
    expect(rowsOf(expanded.daily_transits)[0]?.summary).toBe('Sun in Aries, House 1')
    expect(expanded.panchang?.status).toBe('real')
    expect(rowsOf(expanded.panchang).map((row) => row.label)).toEqual(expect.arrayContaining(['Vara', 'Tithi', 'Nakshatra', 'Yoga', 'Karana']))
    expect(expanded.current_timing?.status).toBe('real')
    expect(expanded.navamsa_d9?.status).toBe('real')
    expect(rowsOf(expanded.navamsa_d9)[0]?.summary).toBe('Sun: Aries (H1)')
    expect(expanded.planetary_aspects?.status).toBe('real')
    expect(rowsOf(expanded.planetary_aspects)[0]?.summary).toBe('Sun → Moon: graha drishti 7th')
    expect(expanded.life_area_signatures?.status).toBe('real')
    expect(rowsOf(expanded.life_area_signatures)[0]?.summary).toBe('self: H1 Aries, lord Mars in H1')
  })

  it('marks missing calculated sections as not available', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput(
      makeMasterOutput({ daily_transits: null, panchang: null, navamsa_d9: null, planetary_aspects_drishti: null, life_area_signatures: null, vimshottari_dasha: null }) as never,
    )

    expect(expanded.daily_transits?.status).toBe('not_available')
    expect(expanded.panchang?.status).toBe('not_available')
    expect(expanded.current_timing?.status).toBe('not_available')
    expect(expanded.navamsa_d9?.status).toBe('not_available')
    expect(expanded.planetary_aspects?.status).toBe('not_available')
    expect(expanded.life_area_signatures?.status).toBe('not_available')
  })

  it('maps calculated panchang status to real and computes dasha percent', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput(makeMasterOutput() as never)
    expect(expanded.current_timing?.elapsed_dasha_percent).toBe(25)
  })

  it('formats calculated chart status as Real', () => {
    expect(formatProfileChartStatus('calculated')).toBe('Real')
    expect(formatProfileChartStatus('real')).toBe('Real')
    expect(formatProfileChartStatus('failed')).toBe('Failed')
  })

  it('derives expanded sections from stored astronomical data when expanded_sections is missing', () => {
    const chartJson = {
      astronomical_data: makeMasterOutput(),
    }

    const expanded = buildProfileExpandedSectionsFromStoredChartJson(chartJson)

    expect(expanded?.daily_transits?.status).toBe('real')
    expect(expanded?.panchang?.status).toBe('real')
    expect(expanded?.current_timing?.status).toBe('real')
    expect(expanded?.navamsa_d9?.status).toBe('real')
    expect(expanded?.planetary_aspects?.status).toBe('real')
    expect(expanded?.life_area_signatures?.status).toBe('real')
  })

  it('does not create fake daily transit rows when only sign data is present', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      transits: {
        current_utc: '2026-01-01T00:00:00.000Z',
        transit_planets: [{ sign: 'Aries' }],
        current_moon_rashi: { sign: 'Aries' },
      },
    } as never)

    expect(expanded.daily_transits?.status).toBe('partial')
    expect(rowsOf(expanded.daily_transits)[0]?.summary).toBe('Transit in Aries')
  })

  it('maps daily transit rows with planet sign and house into useful summaries', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      daily_transits: {
        current_utc: '2026-01-01T00:00:00.000Z',
        transit_planets: [{ planet: 'Moon', sign: 'Aries', house_transited: 1, nakshatra: 'Ashwini', retrograde: false }],
      },
    } as never)

    expect(expanded.daily_transits?.status).toBe('real')
    expect(rowsOf(expanded.daily_transits)[0]).toMatchObject({ summary: 'Moon in Aries, House 1', planet: 'Moon', sign: 'Aries', house: '1' })
  })

  it('supports raw panchang rows and not_available fallback', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      panchang: {
        calculation_instant_utc: '2026-01-01T00:00:00.000Z',
        panchang_local_date: '2026-01-01',
        vara: 'Thursday',
        tithi: { tithi_name: 'Pratipada' },
        nakshatra: 'Ashwini',
        yoga: 'Vishkambha',
        karana: 'Bava',
      },
    } as never)

    expect(expanded.panchang?.status).toBe('real')
    expect(rowsOf(expanded.panchang)).toHaveLength(5)

    const missing = buildProfileExpandedSectionsFromMasterOutput({ calculation_status: 'calculated' } as never)
    expect(missing.panchang?.status).toBe('not_available')
  })

  it('normalizes navamsa placements from object-shaped data and downgrades empty sources', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      navamsa_d9: {
        calculated_at: '2026-01-01T00:00:00.000Z',
        placements: {
          Sun: { body: 'Sun', navamsa_sign: 'Virgo', navamsa_house: 5 },
        },
      },
    } as never)

    expect(expanded.navamsa_d9?.status).toBe('real')
    expect(rowsOf(expanded.navamsa_d9)[0]?.summary).toBe('Sun: Virgo (H5)')

    const empty = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      navamsa_d9: { placements: [] },
    } as never)
    expect(empty.navamsa_d9?.status).toBe('partial')
  })

  it('filters invalid aspect rows and keeps valid aspect summaries', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      planetary_aspects_drishti: {
        aspects: [
          { source_planet: 'Sun' },
          { aspecting_planet: 'Sun', aspected_planet: 'Moon', aspect_type: 'graha_drishti_7th', strength: 'full' },
        ],
      },
    } as never)

    expect(expanded.planetary_aspects?.status).toBe('real')
    expect(rowsOf(expanded.planetary_aspects)).toHaveLength(1)
    expect(rowsOf(expanded.planetary_aspects)[0]?.summary).toBe('Sun → Moon: graha drishti 7th')
  })

  it('maps the v2 planetary_aspects_drishti shape into house summaries', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      planetary_aspects_drishti: {
        status: 'real',
        calculated_at: '2026-01-01T00:00:00.000Z',
        aspects: [
          {
            source_planet: 'Sun',
            source_house: 10,
            aspect_offset: 7,
            target_house: 4,
            target_sign_index: 7,
            tradition: 'classical_default',
            reliability: 'high',
          },
        ],
      },
      d1_rashi_chart: {
        houses: [
          { house_number: 4, sign: 'Scorpio', sign_index: 7 },
        ],
        occupying_planets_by_house: {
          '4': [],
        },
      },
    } as never)

    expect(expanded.planetary_aspects?.status).toBe('real')
    expect(rowsOf(expanded.planetary_aspects)).toHaveLength(1)
    expect(rowsOf(expanded.planetary_aspects)[0]).toMatchObject({
      from: 'Sun',
      to: 'House 4',
      type: '7th drishti',
      source_house: 10,
      target_house: 4,
      target_sign: 'Scorpio',
      strength: 'high',
      tradition: 'classical default',
      summary: 'Sun aspects House 4 (Scorpio) — 7th drishti',
    })
  })

  it('expands v2 aspects into one row per occupied target planet', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      planetary_aspects_drishti: {
        status: 'real',
        calculated_at: '2026-01-01T00:00:00.000Z',
        aspects: [
          {
            source_planet: 'Saturn',
            source_house: 9,
            aspect_offset: 3,
            target_house: 11,
            target_sign_index: 2,
            tradition: 'classical_default',
            reliability: 'high',
          },
        ],
      },
      d1_rashi_chart: {
        houses: [
          { house_number: 11, sign: 'Gemini', sign_index: 2 },
        ],
        occupying_planets_by_house: {
          '11': ['Moon', 'Mercury'],
        },
      },
    } as never)

    expect(expanded.planetary_aspects?.status).toBe('real')
    expect(rowsOf(expanded.planetary_aspects)).toHaveLength(2)
    expect(rowsOf(expanded.planetary_aspects).map((row) => row.summary)).toEqual([
      'Saturn aspects Moon in House 11 (Gemini) — Saturn 3rd drishti',
      'Saturn aspects Mercury in House 11 (Gemini) — Saturn 3rd drishti',
    ])
  })

  it('normalizes life area signatures into useful summaries', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      life_area_signatures: {
        signatures: [
          { house_number: 2, house_sign: 'Taurus' },
          { area: 'career_status', house_number: 10, house_sign: 'Taurus', house_lord: 'Venus', lord_placement_house: 7 },
        ],
      },
    } as never)

    expect(expanded.life_area_signatures?.status).toBe('real')
    expect(rowsOf(expanded.life_area_signatures)[0]?.summary).toBe('House 2: Taurus')
    expect(rowsOf(expanded.life_area_signatures)[1]?.summary).toBe('career status: H10 Taurus, lord Venus in H7')
  })

  it('supports alternate source field names for derived sections', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      planets: { Sun: { sidereal_longitude: 10 } },
      lagna: { sign: 'Aries' },
      houses: { house_1: { sign: 'Aries' } },
      d1_chart: { placements: { sun: { house: 1, sign: 'Aries' } } },
      transits: { calculated_at: '2026-01-01T00:00:00.000Z', transits: [{ planet: 'Sun', sign: 'Aries', house_transited: 1 }] },
      panchang: {
        status: 'real',
        calculation_instant_utc: '2026-01-01T00:00:00.000Z',
        panchang_local_date: '2026-01-01',
        vara: 'Thursday',
        tithi: { tithi_name: 'Pratipada' },
        nakshatra: 'Ashwini',
        yoga: 'Vishkambha',
        karana: 'Bava',
      },
      navamsa: { status: 'real', planets: [], warnings: [] },
      aspects: { status: 'real', aspects: [], warnings: [] },
      life_areas: { status: 'real', signatures: [], warnings: [] },
      vimshottari_dasha: {
        current_dasha: { mahadasha: { lord: 'Ketu', start_date: '2025-01-01', end_date: '2032-01-01' } },
      },
    } as never)

    expect(expanded.daily_transits?.status).toBe('real')
    expect(expanded.panchang?.status).toBe('real')
    expect(expanded.navamsa_d9?.status).toBe('partial')
    expect(expanded.planetary_aspects?.status).toBe('partial')
    expect(expanded.life_area_signatures?.status).toBe('partial')
  })
})
