/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest'

import { buildProfileChartJsonFromMasterOutput } from '@/lib/astro/profile-chart-json-adapter'

describe('profile chart json adapter d1 regression', () => {
  it('synthesizes deterministic d1Chart when raw d1_chart is missing', () => {
    const result = buildProfileChartJsonFromMasterOutput({
      output: {
        schema_version: '29.0.0',
        calculation_status: 'calculated',
        engine: 'deterministic_calculation',
        runtime_clock: { current_utc: '2026-05-05T00:00:00.000Z' },
        lagna: {
          sign: 'Virgo',
          sign_index: 5,
          degrees_in_sign: 0.1324563727,
          sidereal_longitude: 150.1324563727,
          tropical_longitude: 174.1324563727,
        },
        d1_rashi_chart: {
          lagna_sign_index: 5,
          houses: [
            { house_number: 1, sign: 'Virgo' },
            { house_number: 10, sign: 'Gemini' },
          ],
          planet_to_sign: {
            Sun: { sign: 'Taurus', sign_index: 1, degrees_in_sign: 12.5, absoluteLongitude: 42.5 },
            Moon: { sign: 'Gemini', sign_index: 2, degrees_in_sign: 8.2, absoluteLongitude: 68.2 },
          },
          planet_to_house: {
            Sun: 10,
            Moon: 11,
          },
          occupying_planets_by_house: {
            10: ['Sun'],
            11: ['Moon'],
          },
        },
        planetary_positions: {
          Sun: { sign: 'Taurus', sign_index: 1, degrees_in_sign: 12.5, absoluteLongitude: 42.5 },
          Moon: { sign: 'Gemini', sign_index: 2, degrees_in_sign: 8.2, absoluteLongitude: 68.2 },
        },
      } as never,
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartVersionId: 'cv-1',
      chartVersion: 1,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      settingsForHash: { ayanamsa: 'lahiri', house_system: 'whole_sign', zodiac_type: 'sidereal', astrology_system: 'parashari', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' } as never,
      normalized: {},
      engineVersion: 'engine-v1',
      ephemerisVersion: 'ephemeris-v1',
      schemaVersion: '29.0.0',
    })

    expect(result.chart_json_v2).toBeDefined()
    expect(result.chart_json_v2?.sections.lagna.status).toBe('computed')
    expect(result.chart_json_v2?.sections.lagna.fields).toMatchObject({
      sign: 'Virgo',
    })
    expect(result.chart_json_v2?.sections.d1Chart.status).toBe('computed')
    expect((result.chart_json_v2?.sections.d1Chart as never as { fields?: Record<string, unknown> }).fields?.lagnaSign).toBe('Virgo')
    expect((result.chart_json_v2?.sections.d1Chart as never as { fields?: Record<string, unknown> }).fields?.sunSign).toBe('Taurus')
    expect((result.chart_json_v2?.sections.d1Chart as never as { fields?: Record<string, unknown> }).fields?.moonSign).toBe('Gemini')
    expect((result.chart_json_v2?.sections.d1Chart as never as { fields?: Record<string, unknown> }).fields?.sunHouse).toBe(10)
    expect((result.chart_json_v2?.sections.d1Chart as never as { fields?: Record<string, unknown> }).fields?.moonHouse).toBe(11)
    expect(result.chart_json_v2?.sections.d1Chart.reason).toBeUndefined()
  })
})
