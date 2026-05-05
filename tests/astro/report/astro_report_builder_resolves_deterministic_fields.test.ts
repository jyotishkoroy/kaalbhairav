/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildAstroReportContract } from '@/lib/astro/report/report-builder.ts'

describe('astro report builder resolves deterministic fields', () => {
  it('resolves canonical deterministic fields and preserves provenance', () => {
    const chartJson = {
      metadata: {
        profile_id: 'profile-test',
        chart_version_id: 'chart-test',
        calculation_settings: {
          zodiac_type: 'sidereal',
          ayanamsa: 'lahiri',
          house_system: 'whole_sign',
        },
      },
      canonical_chart_json_v2: {
        schemaVersion: 'chart_json_v2',
        metadata: {
          profileId: 'profile-test',
          chartVersionId: 'chart-test',
          engine: 'local_ts_swiss',
          settingsHash: 'settings-test',
        },
        sections: {
          timeFacts: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { currentUtc: '2026-05-04T00:00:00.000Z' } },
          planetaryPositions: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { Sun: { sign: 'Taurus', house: 10 }, Moon: { sign: 'Gemini', house: 11, nakshatra: 'Mrigashira', nakshatra_pada: 4 } } },
          lagna: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { sign: 'Leo' } },
          houses: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { moon_house: 11, sun_house: 10 } },
          panchang: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { convention: 'at_birth_time', tithi: 'fixture_tithi', paksha: 'shukla', yoga: 'fixture_yoga', karana: 'fixture_karana', weekday: 'Monday' } },
          d1Chart: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
          d9Chart: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
          vimshottari: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { current_mahadasha: 'Jupiter', current_antardasha: 'Saturn', timeline: [] } },
          transits: { status: 'unavailable', source: 'not_implemented', engine: 'local_ts_swiss', reason: 'transits_not_available' },
          advanced: { outerPlanets: { status: 'unavailable', source: 'not_implemented', engine: 'local_ts_swiss', reason: 'outer_planets_not_enabled_for_all_engine_modes' } },
        },
      },
    }
    const report = buildAstroReportContract({ chartJson, profileId: 'profile-test', chartVersionId: 'chart-test', now: new Date('2026-05-04T00:00:00.000Z'), sourceMode: 'test_fixture' })
    const fields = report.groups.flatMap((group) => group.fields)
    expect(fields.find((field) => field.fieldKey === 'lagna_sign')).toMatchObject({ status: 'resolved', value: 'Leo', provenance: { chartVersionId: 'chart-test', profileId: 'profile-test', registryFieldKey: 'lagna_sign', sourceType: 'astronomical_calculation' } })
    expect(fields.find((field) => field.fieldKey === 'moon_sign')).toMatchObject({ status: 'resolved', value: 'Gemini' })
    expect(fields.find((field) => field.fieldKey === 'sun_sign')).toMatchObject({ status: 'resolved', value: 'Taurus' })
    expect(fields.find((field) => field.fieldKey === 'moon_house')).toMatchObject({ status: 'resolved', value: 11 })
    expect(fields.find((field) => field.fieldKey === 'sun_house')).toMatchObject({ status: 'resolved', value: 10 })
    expect(fields.find((field) => field.fieldKey === 'moon_nakshatra')).toMatchObject({ status: 'resolved', value: 'Mrigashira' })
    expect(fields.find((field) => field.fieldKey === 'moon_nakshatra_pada')).toMatchObject({ status: 'resolved', value: 4 })
    expect(fields.find((field) => field.fieldKey === 'current_mahadasha')).toMatchObject({ status: 'resolved', value: 'Jupiter' })
    expect(fields.find((field) => field.fieldKey === 'panchang_convention')).toMatchObject({ status: 'resolved', value: 'at_birth_time' })
    expect(fields.find((field) => field.fieldKey === 'weekday')).toMatchObject({ status: 'resolved', value: 'Monday' })
    expect(fields.find((field) => field.fieldKey === 'outer_planets')).toMatchObject({ status: 'unavailable' })
  })

  it('keeps unavailable canonical sections unavailable instead of inventing resolved values', () => {
    const report = buildAstroReportContract({
      chartJson: {
        canonical_chart_json_v2: {
          schemaVersion: 'chart_json_v2',
          metadata: {
            profileId: 'profile-test',
            inputHash: 'input-test',
            settingsHash: 'settings-test',
            engineVersion: 'engine-test',
            ephemerisVersion: 'ephemeris-test',
            ayanamsha: 'lahiri',
            houseSystem: 'whole_sign',
            runtimeClockIso: '2026-05-04T00:00:00.000Z',
          },
          sections: {
            timeFacts: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
            planetaryPositions: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
            lagna: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
            houses: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
            panchang: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
            d1Chart: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
            d9Chart: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
            vimshottari: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
            advanced: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
          },
        },
      },
      profileId: 'profile-test',
      chartVersionId: 'chart-test',
      now: new Date('2026-05-04T00:00:00.000Z'),
      sourceMode: 'test_fixture',
    })
    expect(report.groups.flatMap((group) => group.fields).find((field) => field.fieldKey === 'lagna_sign')).toMatchObject({ status: 'unavailable' })
  })
})
