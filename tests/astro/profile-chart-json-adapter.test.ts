/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, it, expect } from 'vitest'

import {
  buildProfileChartJsonFromMasterOutput,
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
          nakshatra: 'Mrigasira',
          pada: 1,
          house_transited: 1,
          retrograde: false,
        },
      ],
      current_moon_rashi: { sign: 'Aries' },
      current_moon_nakshatra: { nakshatra: 'Mrigasira' },
      current_tithi: { number: 1, name: 'Pratipad', paksha: 'shukla', completion_percent: 50 },
      transit_relation_to_natal: [],
      warnings: [],
    },
    panchang: {
      status: 'available',
      source: 'reference_report_seed',
      rows: [
        { label: 'Tithi', value: 'Pratipad' },
        { label: 'Hindu Week Day', value: 'Monday' },
        { label: 'Paksha', value: 'Shukla' },
        { label: 'Yoga', value: 'Ganda' },
        { label: 'Karan', value: 'Kintudhhana' },
        { label: 'Sunrise', value: '04.51.27' },
        { label: 'Sunset', value: '18.21.49' },
        { label: 'Day Duration', value: '13.30.22' },
      ],
      warnings: [],
      data: {
        rows: [
          { label: 'Tithi', value: 'Pratipad' },
          { label: 'Hindu Week Day', value: 'Monday' },
          { label: 'Paksha', value: 'Shukla' },
          { label: 'Yoga', value: 'Ganda' },
          { label: 'Karan', value: 'Kintudhhana' },
          { label: 'Sunrise', value: '04.51.27' },
          { label: 'Sunset', value: '18.21.49' },
          { label: 'Day Duration', value: '13.30.22' },
        ],
      },
    },
    navamsa_d9: {
      status: 'available',
      source: 'reference_report_seed',
      rows: [
        { body: 'Lagna', sign_number: 2 },
        { body: 'Sun', sign_number: 6 },
        { body: 'Moon', sign_number: 8 },
        { body: 'Mars', sign_number: 7 },
      ],
      warnings: [],
      data: {
        placements: [
          { body: 'Lagna', sign_number: 2 },
          { body: 'Sun', sign_number: 6 },
          { body: 'Moon', sign_number: 8 },
          { body: 'Mars', sign_number: 7 },
        ],
      },
    },
    ashtakvarga: {
      status: 'available',
      source: 'reference_report_seed',
      rows: [
        { sign: 1, Sun: 4, Moon: 4, Mars: 4, Mercury: 5, Jupiter: 6, Venus: 5, Saturn: 2, Total: 30 },
        { sign: 2, Sun: 5, Moon: 2, Mars: 3, Mercury: 5, Jupiter: 5, Venus: 2, Saturn: 4, Total: 26 },
        { sign: 3, Sun: 4, Moon: 5, Mars: 2, Mercury: 3, Jupiter: 5, Venus: 4, Saturn: 4, Total: 27 },
        { sign: 4, Sun: 3, Moon: 3, Mars: 3, Mercury: 4, Jupiter: 5, Venus: 3, Saturn: 1, Total: 22 },
        { sign: 5, Sun: 5, Moon: 4, Mars: 4, Mercury: 4, Jupiter: 5, Venus: 7, Saturn: 6, Total: 35 },
        { sign: 6, Sun: 1, Moon: 3, Mars: 2, Mercury: 5, Jupiter: 3, Venus: 4, Saturn: 3, Total: 21 },
        { sign: 7, Sun: 4, Moon: 5, Mars: 5, Mercury: 5, Jupiter: 4, Venus: 4, Saturn: 1, Total: 28 },
        { sign: 8, Sun: 6, Moon: 5, Mars: 4, Mercury: 7, Jupiter: 6, Venus: 5, Saturn: 4, Total: 37 },
        { sign: 9, Sun: 4, Moon: 4, Mars: 2, Mercury: 1, Jupiter: 4, Venus: 5, Saturn: 3, Total: 23 },
        { sign: 10, Sun: 5, Moon: 4, Mars: 4, Mercury: 5, Jupiter: 4, Venus: 3, Saturn: 2, Total: 27 },
        { sign: 11, Sun: 4, Moon: 4, Mars: 4, Mercury: 4, Jupiter: 5, Venus: 6, Saturn: 5, Total: 32 },
        { sign: 12, Sun: 3, Moon: 6, Mars: 2, Mercury: 6, Jupiter: 4, Venus: 4, Saturn: 4, Total: 29 },
      ],
      warnings: [],
      data: {
        rows: [
          { sign: 1, Sun: 4, Moon: 4, Mars: 4, Mercury: 5, Jupiter: 6, Venus: 5, Saturn: 2, Total: 30 },
          { sign: 2, Sun: 5, Moon: 2, Mars: 3, Mercury: 5, Jupiter: 5, Venus: 2, Saturn: 4, Total: 26 },
          { sign: 3, Sun: 4, Moon: 5, Mars: 2, Mercury: 3, Jupiter: 5, Venus: 4, Saturn: 4, Total: 27 },
          { sign: 4, Sun: 3, Moon: 3, Mars: 3, Mercury: 4, Jupiter: 5, Venus: 3, Saturn: 1, Total: 22 },
          { sign: 5, Sun: 5, Moon: 4, Mars: 4, Mercury: 4, Jupiter: 5, Venus: 7, Saturn: 6, Total: 35 },
          { sign: 6, Sun: 1, Moon: 3, Mars: 2, Mercury: 5, Jupiter: 3, Venus: 4, Saturn: 3, Total: 21 },
          { sign: 7, Sun: 4, Moon: 5, Mars: 5, Mercury: 5, Jupiter: 4, Venus: 4, Saturn: 1, Total: 28 },
          { sign: 8, Sun: 6, Moon: 5, Mars: 4, Mercury: 7, Jupiter: 6, Venus: 5, Saturn: 4, Total: 37 },
          { sign: 9, Sun: 4, Moon: 4, Mars: 2, Mercury: 1, Jupiter: 4, Venus: 5, Saturn: 3, Total: 23 },
          { sign: 10, Sun: 5, Moon: 4, Mars: 4, Mercury: 5, Jupiter: 4, Venus: 3, Saturn: 2, Total: 27 },
          { sign: 11, Sun: 4, Moon: 4, Mars: 4, Mercury: 4, Jupiter: 5, Venus: 6, Saturn: 5, Total: 32 },
          { sign: 12, Sun: 3, Moon: 6, Mars: 2, Mercury: 6, Jupiter: 4, Venus: 4, Saturn: 4, Total: 29 },
        ],
      },
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
      status: 'available',
      source: 'reference_report_seed',
      items: [
        { mahadasha: 'Mars', from: '1999-06-14', to: '2000-08-22', summary: 'Mars balance at birth' },
        { mahadasha: 'Rahu', from: '2000-08-22', to: '2018-08-22' },
        { mahadasha: 'Jupiter', from: '2018-08-22', to: '2034-08-22' },
      ],
      warnings: [],
      data: {
        birth_dasha_lord: 'Mars',
        dasha_balance: 'Mars 1 Y 2 M 7 D',
        current_reference_mahadasha: 'Jupiter',
        current_reference_from: '2018-08-22',
        current_reference_to: '2034-08-22',
        mahadasha_sequence: [
          { mahadasha: 'Mars', from: '1999-06-14', to: '2000-08-22' },
          { mahadasha: 'Rahu', from: '2000-08-22', to: '2018-08-22' },
          { mahadasha: 'Jupiter', from: '2018-08-22', to: '2034-08-22' },
        ],
        current_dasha: {
          mahadasha: {
            level: 'mahadasha',
            lord: 'Jupiter',
            start_utc: '2018-08-22T00:00:00.000Z',
            end_utc: '2034-08-22T00:00:00.000Z',
            parent_lords: [],
          },
          antardasha: null,
          pratyantardasha: null,
        },
        boundary_warnings: [],
      },
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
    expect(expanded.panchang?.status).toBe('available')
    expect(rowsOf(expanded.panchang).map((row) => row.label)).toEqual(expect.arrayContaining(['Tithi', 'Yoga', 'Karan']))
    expect(expanded.current_timing?.status).toBe('real')
    expect(expanded.vimshottari_dasha?.status).toBe('available')
    expect(expanded.navamsa_d9?.status).toBe('available')
    expect(rowsOf(expanded.navamsa_d9)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ body: 'Sun', sign_number: 6 }),
        expect.objectContaining({ body: 'Moon', sign_number: 8 }),
      ]),
    )
    expect(expanded.planetary_aspects?.status).toBe('real')
    expect(rowsOf(expanded.planetary_aspects)[0]?.summary).toBe('Sun → Moon: graha drishti 7th')
    expect(expanded.life_area_signatures?.status).toBe('real')
    expect(rowsOf(expanded.life_area_signatures)[0]?.summary).toBe('self: H1 Aries, lord Mars in H1')
    expect(expanded.ashtakvarga?.status).toBe('available')
    expect(rowsOf(expanded.ashtakvarga)).toHaveLength(12)
    expect(rowsOf(expanded.ashtakvarga)[7]).toEqual(expect.objectContaining({ sign: 8, Total: 37 }))
    const currentMahadasha = expanded.current_timing?.current_mahadasha as Record<string, unknown> | null
    expect(currentMahadasha?.lord).toBe('Jupiter')
    expect(currentMahadasha?.start_date).toBe('2018-08-22T00:00:00.000Z')
    expect(currentMahadasha?.end_date).toBe('2034-08-22T00:00:00.000Z')
  })

  it('keeps available section rows and items usable when the new shape arrives from storage', () => {
    const expanded = buildProfileExpandedSectionsFromStoredChartJson({
      expanded_sections: {
        panchang: {
          status: 'available',
          source: 'reference_report_seed',
          data: {
            rows: [
              { label: 'Tithi', value: 'Pratipad' },
              { label: 'Yoga', value: 'Ganda' },
              { label: 'Karan', value: 'Kintudhhana' },
              { label: 'Sunrise', value: '04.51.27' },
              { label: 'Sunset', value: '18.21.49' },
            ],
          },
        },
        navamsa_d9: {
          status: 'available',
          source: 'reference_report_seed',
          data: {
            placements: [
              { body: 'Sun', sign_number: 6 },
              { body: 'Moon', sign_number: 8 },
            ],
          },
        },
        vimshottari_dasha: {
          status: 'available',
          source: 'reference_report_seed',
          data: {
            current_reference_mahadasha: 'Jupiter',
            current_reference_from: '2018-08-22',
            current_reference_to: '2034-08-22',
            mahadasha_sequence: [
              { mahadasha: 'Mars', from: '1999-06-14', to: '2000-08-22' },
              { mahadasha: 'Rahu', from: '2000-08-22', to: '2018-08-22' },
              { mahadasha: 'Jupiter', from: '2018-08-22', to: '2034-08-22' },
            ],
          },
        },
        ashtakvarga: {
          status: 'available',
          source: 'reference_report_seed',
          data: {
            rows: [
              { sign: 8, Total: 37 },
            ],
          },
        },
      },
    })

    expect(expanded?.panchang?.status).toBe('available')
    expect(((expanded?.panchang as unknown as { data?: { rows?: Array<Record<string, unknown>> } })?.data?.rows ?? []).map((row) => `${row.label}: ${row.value}`)).toEqual(
      expect.arrayContaining([
        'Tithi: Pratipad',
        'Yoga: Ganda',
        'Karan: Kintudhhana',
        'Sunrise: 04.51.27',
        'Sunset: 18.21.49',
      ]),
    )
    expect(expanded?.navamsa_d9?.status).toBe('available')
    expect(((expanded?.navamsa_d9 as unknown as { data?: { placements?: Array<Record<string, unknown>> } })?.data?.placements ?? [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ body: 'Sun', sign_number: 6 }),
        expect.objectContaining({ body: 'Moon', sign_number: 8 }),
      ]),
    )
    expect(expanded?.vimshottari_dasha?.status).toBe('available')
    expect((expanded?.vimshottari_dasha?.data as Record<string, unknown> | undefined)?.current_reference_mahadasha).toBe('Jupiter')
    expect(((expanded?.ashtakvarga?.data as { rows?: Array<Record<string, unknown>> } | undefined)?.rows ?? [])).toEqual(expect.arrayContaining([expect.objectContaining({ sign: 8, Total: 37 })]))
  })

  it('repairs stale stored expanded sections from available astronomical data', () => {
    const expanded = buildProfileExpandedSectionsFromStoredChartJson({
      expanded_sections: {
        daily_transits: {
          status: 'partial',
          rows: [],
          warnings: ['stale storage'],
        },
        panchang: {
          status: 'partial',
          rows: [],
          warnings: ['stale storage'],
        },
        current_timing: {
          status: 'not_available',
          warnings: ['stale storage'],
        },
        navamsa_d9: {
          status: 'partial',
          rows: [],
          warnings: ['stale storage'],
        },
        planetary_aspects: {
          status: 'partial',
          rows: [],
          warnings: ['stale storage'],
        },
        life_area_signatures: {
          status: 'partial',
          rows: [],
          warnings: ['stale storage'],
        },
        vimshottari_dasha: {
          status: 'partial',
          items: [],
          warnings: ['stale storage'],
        },
      },
      astronomical_data: makeMasterOutput({
        panchang: {
          status: 'available',
          source: 'reference_report_seed',
          rows: [
            { label: 'Tithi', value: 'Pratipad' },
            { label: 'Yoga', value: 'Ganda' },
            { label: 'Karan', value: 'Kintudhhana' },
          ],
          data: {
            rows: [
              { label: 'Tithi', value: 'Pratipad' },
              { label: 'Yoga', value: 'Ganda' },
              { label: 'Karan', value: 'Kintudhhana' },
            ],
          },
        },
        navamsa_d9: {
          status: 'available',
          source: 'reference_report_seed',
          rows: [
            { body: 'Sun', sign_number: 6 },
            { body: 'Moon', sign_number: 8 },
          ],
          data: {
            placements: [
              { body: 'Sun', sign_number: 6 },
              { body: 'Moon', sign_number: 8 },
            ],
          },
        },
        vimshottari_dasha: {
          status: 'available',
          source: 'reference_report_seed',
          items: [
            { mahadasha: 'Jupiter', from: '2018-08-22', to: '2034-08-22' },
          ],
          data: {
            current_reference_mahadasha: 'Jupiter',
            current_reference_from: '2018-08-22',
            current_reference_to: '2034-08-22',
            current_dasha: {
              mahadasha: {
                lord: 'Jupiter',
                start_utc: '2018-08-22T00:00:00.000Z',
                end_utc: '2034-08-22T00:00:00.000Z',
              },
            },
          },
        },
      }),
    })

    expect(expanded?.daily_transits?.status).toBe('real')
    expect(rowsOf(expanded?.daily_transits)[0]?.summary).toBe('Sun in Aries, House 1')
    expect(expanded?.panchang?.status).toBe('available')
    expect(rowsOf(expanded?.panchang).map((row) => `${row.label}: ${row.value}`)).toEqual(
      expect.arrayContaining(['Tithi: Pratipad', 'Yoga: Ganda', 'Karan: Kintudhhana']),
    )
    expect(expanded?.current_timing?.status).toBe('real')
    expect(expanded?.navamsa_d9?.status).toBe('available')
    expect(rowsOf(expanded?.navamsa_d9)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ body: 'Sun', sign_number: 6 }),
        expect.objectContaining({ body: 'Moon', sign_number: 8 }),
      ]),
    )
    expect(expanded?.planetary_aspects?.status).toBe('real')
    expect(rowsOf(expanded?.planetary_aspects)[0]?.summary).toBe('Sun → Moon: graha drishti 7th')
    expect(expanded?.life_area_signatures?.status).toBe('real')
    expect(rowsOf(expanded?.life_area_signatures)[0]?.summary).toBe('self: H1 Aries, lord Mars in H1')
    expect(expanded?.current_timing?.current_mahadasha?.lord).toBe('Jupiter')
    expect(expanded?.vimshottari_dasha?.status).toBe('available')
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
    expect(expanded.current_timing?.status).toBe('real')
    expect(expanded.current_timing?.elapsed_dasha_percent).toBeNull()
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
    expect(expanded?.panchang?.status).toBe('available')
    expect(expanded?.current_timing?.status).toBe('real')
    expect(expanded?.vimshottari_dasha?.status).toBe('available')
    expect(expanded?.navamsa_d9?.status).toBe('available')
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

  it('marks daily transits real when at least one row has planet and sign', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      daily_transits: {
        current_utc: '2026-04-27T00:00:00.000Z',
        transit_planets: [
          {
            name: 'Sun',
            sign: 'Aries',
            nakshatra: 'Mrigasira',
            is_retrograde: false,
          },
        ],
        warnings: [],
      },
    } as never)

    expect(expanded.daily_transits?.status).toBe('real')
    expect(rowsOf(expanded.daily_transits)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          planet: 'Sun',
          sign: 'Aries',
          summary: 'Sun in Aries',
        }),
      ]),
    )
  })

  it('preserves old fallback behavior when available sections are empty', () => {
    const expanded = buildProfileExpandedSectionsFromStoredChartJson({
      expanded_sections: {
        panchang: {
          status: 'available',
          source: 'reference_report_seed',
          rows: [],
          warnings: ['reference-only'],
        },
        navamsa_d9: {
          status: 'available',
          source: 'reference_report_seed',
          rows: [],
          warnings: ['reference-only'],
        },
        vimshottari_dasha: {
          status: 'available',
          source: 'reference_report_seed',
          items: [],
          warnings: ['reference-only'],
        },
      },
    })

    expect(expanded?.panchang?.status).toBe('available')
    expect(rowsOf(expanded?.panchang)).toEqual([])
    expect(expanded?.navamsa_d9?.status).toBe('available')
    expect(rowsOf(expanded?.navamsa_d9)).toEqual([])
    expect(expanded?.vimshottari_dasha?.status).toBe('available')
    expect(Array.isArray(expanded?.vimshottari_dasha?.items)).toBe(true)
    expect((expanded?.vimshottari_dasha?.items ?? [])).toHaveLength(0)
  })

  it('keeps daily transits partial when rows lack planet names', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      daily_transits: {
        current_utc: '2026-04-27T00:00:00.000Z',
        transit_planets: [
          {
            sign: 'Aries',
            nakshatra: 'Mrigasira',
          },
        ],
        warnings: [],
      },
    } as never)

    expect(expanded.daily_transits?.status).toBe('partial')
  })

  it('keeps daily transits not_available when no transit source exists', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({} as never)

    expect(expanded.daily_transits?.status).toBe('not_available')
  })

  it('maps daily transit rows with planet sign and house into useful summaries', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      daily_transits: {
        current_utc: '2026-01-01T00:00:00.000Z',
        transit_planets: [{ planet: 'Moon', sign: 'Gemini', house_transited: 1, nakshatra: 'Mrigasira', retrograde: false }],
      },
    } as never)

    expect(expanded.daily_transits?.status).toBe('real')
    expect(rowsOf(expanded.daily_transits)[0]).toMatchObject({ summary: 'Moon in Gemini, House 1', planet: 'Moon', sign: 'Gemini', house: '1' })
  })

  it('supports raw panchang rows and not_available fallback', () => {
    const expanded = buildProfileExpandedSectionsFromMasterOutput({
      calculation_status: 'calculated',
      panchang: {
        calculation_instant_utc: '2026-01-01T00:00:00.000Z',
        panchang_local_date: '2026-01-01',
        vara: 'Thursday',
        tithi: { tithi_name: 'Pratipad' },
        nakshatra: 'Mrigasira',
        yoga: 'Ganda',
        karana: 'Kintudhhana',
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
        tithi: { tithi_name: 'Pratipad' },
        nakshatra: 'Mrigasira',
        yoga: 'Ganda',
        karana: 'Kintudhhana',
      },
      navamsa: { status: 'real', planets: [], warnings: [] },
      aspects: { status: 'real', aspects: [], warnings: [] },
      life_areas: { status: 'real', signatures: [], warnings: [] },
      vimshottari_dasha: {
        current_dasha: { mahadasha: { lord: 'Jupiter', start_date: '2018-08-22', end_date: '2034-08-22' } },
      },
    } as never)

    expect(expanded.daily_transits?.status).toBe('real')
    expect(expanded.panchang?.status).toBe('real')
    expect(expanded.navamsa_d9?.status).toBe('partial')
    expect(expanded.planetary_aspects?.status).toBe('partial')
    expect(expanded.life_area_signatures?.status).toBe('partial')
  })

  it('keeps canonical chart json v2 sections attached for UI compatibility', () => {
    const chart = buildProfileChartJsonFromMasterOutput({
      output: makeMasterOutput() as never,
      userId: 'user-test',
      profileId: 'profile-test',
      calculationId: 'calc-test',
      chartVersionId: 'chart-test',
      chartVersion: 1,
      inputHash: 'input-test',
      settingsHash: 'settings-test',
      settingsForHash: {
        zodiac_type: 'sidereal',
        ayanamsa: 'lahiri',
        house_system: 'whole_sign',
      } as never,
      normalized: {} as never,
      engineVersion: 'engine-test',
      ephemerisVersion: 'ephemeris-test',
      schemaVersion: 'schema-test',
    })
    expect(chart?.canonical_chart_json_v2?.schemaVersion).toBe('chart_json_v2')
    expect(chart?.chart_json_v2?.schemaVersion).toBe('chart_json_v2')
  })
})
