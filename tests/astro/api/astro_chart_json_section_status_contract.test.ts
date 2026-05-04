/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildProfileChartJsonFromMasterOutput } from '@/lib/astro/profile-chart-json-adapter.ts'

describe('astro chart json section status contract', () => {
  const output = {
    schema_version: '29.0.0' as const,
    calculation_status: 'calculated' as const,
    engine: 'engine-test',
    engine_mode: 'local_ts_swiss',
    engine_version: 'engine-version-test',
    settings_hash: 'settings-test',
    computed_at: '2026-05-04T00:00:00.000Z',
    runtime_clock: { current_utc: '2026-05-04T00:00:00.000Z', as_of_date: '2026-05-04' },
    prediction_ready_context: { panchang_convention: 'at_birth_time' },
    planetary_positions: { Sun: { sign: 'Aries' } },
    lagna: { sign: 'Leo' },
    houses: { one: { sign: 'Leo' } },
    panchang: { status: 'real', convention: 'at_birth_time', source: 'sun_moon_sidereal_longitude', local_date: '2026-05-04', timezone: 'Asia/Kolkata', fields: { weekday: 'Monday' } },
    d1_chart: { status: 'real', planets: { Sun: { sign: 'Aries' } } },
    navamsa_d9: { status: 'real', rows: [{ planet: 'Sun', sign: 'Virgo' }] },
    vimshottari_dasha: { status: 'available', items: [{ mahadasha: 'Jupiter' }] },
    daily_transits: { status: 'real', rows: [{ summary: 'Sun transit' }] },
  }

  const chartJson = buildProfileChartJsonFromMasterOutput({
    output,
    userId: 'user-test',
    profileId: 'profile-test',
    calculationId: 'calc-test',
    chartVersionId: 'chart-test',
    chartVersion: 7,
    inputHash: 'input-test',
    settingsHash: 'settings-test',
    settingsForHash: { astrology_system: 'parashari', zodiac_type: 'sidereal', ayanamsa: 'lahiri', house_system: 'whole_sign', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' },
    normalized: { birth_date_iso: '1999-06-14' },
    engineVersion: 'engine-version-test',
    ephemerisVersion: 'ephemeris-version-test',
    schemaVersion: '29.0.0',
  })

  it('includes canonical_chart_json_v2', () => {
    expect(chartJson).toHaveProperty('canonical_chart_json_v2')
    expect((chartJson as Record<string, unknown>).canonical_chart_json_v2).toBeDefined()
  })

  it('keeps required canonical section status fields', () => {
    const canonical = (chartJson as Record<string, unknown>).canonical_chart_json_v2 as Record<string, unknown>
    expect(canonical.sections).toMatchObject({
      timeFacts: expect.objectContaining({ status: expect.any(String) }),
      planetaryPositions: expect.objectContaining({ status: expect.any(String) }),
      lagna: expect.objectContaining({ status: expect.any(String) }),
      houses: expect.objectContaining({ status: expect.any(String) }),
      panchang: expect.objectContaining({ status: expect.any(String) }),
      d1Chart: expect.objectContaining({ status: expect.any(String) }),
      d9Chart: expect.objectContaining({ status: expect.any(String) }),
      vimshottari: expect.objectContaining({ status: expect.any(String) }),
    })
  })

  it('preserves legacy chart fields', () => {
    expect(chartJson.metadata).toMatchObject({ chart_version_id: 'chart-test', schema_version: '29.0.0' })
    expect(chartJson.panchang).toBeDefined()
    expect(chartJson.planets).toBeDefined()
    expect(chartJson.lagna).toBeDefined()
  })

  it('marks missing advanced module unavailable', () => {
    const canonical = (chartJson as Record<string, unknown>).canonical_chart_json_v2 as Record<string, unknown>
    expect((canonical.sections as Record<string, unknown>).advanced).toMatchObject({
      outerPlanets: expect.objectContaining({
        status: 'unavailable',
        reason: 'outer_planets_not_enabled_for_all_engine_modes',
      }),
    })
  })

  it('preserves panchang convention metadata', () => {
    const canonical = (chartJson as Record<string, unknown>).canonical_chart_json_v2 as Record<string, unknown>
    expect((canonical.metadata as Record<string, unknown>).calculationSettings).toMatchObject({
      panchangConvention: 'at_birth_time',
    })
    expect((canonical.sections as Record<string, unknown>).panchang).toMatchObject({
      status: expect.any(String),
    })
  })

  it('preserves settings and runtime clock metadata', () => {
    const canonical = (chartJson as Record<string, unknown>).canonical_chart_json_v2 as Record<string, unknown>
    expect(canonical.metadata).toMatchObject({
      settingsHash: 'settings-test',
      runtimeClock: { currentUtc: '2026-05-04T00:00:00.000Z', asOfDate: '2026-05-04' },
    })
  })
})
