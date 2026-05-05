/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from 'vitest'
import { buildProfileChartJsonFromMasterOutput } from '@/lib/astro/profile-chart-json-adapter'
import { persistCanonicalChartJsonV2 } from '@/lib/astro/chart-json-persistence'
import { assertCanonicalChartJsonV2 } from '@/lib/astro/chart-json-v2'
import type { MasterAstroCalculationOutput } from '@/lib/astro/schemas/master.ts'

function makeMasterOutput(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: '29.0.0',
    calculation_status: 'calculated',
    engine: 'v2.0.0-real-sweph',
    engine_version: 'v2.0.0-real-sweph',
    runtime_clock: { current_utc: '2026-05-05T00:00:00.000Z' },
    planetary_positions: {
      Sun: { siderealLongitudeDeg: 40, absoluteLongitude: 40, sign: 'Taurus' },
      Moon: { siderealLongitudeDeg: 70, absoluteLongitude: 70, sign: 'Gemini' },
      Asc: { siderealLongitudeDeg: 120, absoluteLongitude: 120, sign: 'Leo' },
      Mars: { siderealLongitudeDeg: 10, absoluteLongitude: 10, sign: 'Aries' },
    },
    lagna: {
      status: 'computed',
      source: 'deterministic_calculation',
      fields: { ascendant: { sign: 'Leo', absoluteLongitude: 120 } },
    },
    d1_rashi_chart: {
      houses: [
        { house_number: 1, sign: 'Leo' },
        { house_number: 10, sign: 'Taurus' },
        { house_number: 11, sign: 'Gemini' },
      ],
      planet_to_sign: {
        Sun: { sign: 'Taurus', signNumber: 2, degreeInSign: 10, absoluteLongitude: 40 },
        Moon: { sign: 'Gemini', signNumber: 3, degreeInSign: 10, absoluteLongitude: 70 },
      },
      planet_to_house: { Sun: 10, Moon: 11, Asc: 1 },
      occupying_planets_by_house: { '10': ['Sun'], '11': ['Moon'] },
    },
    sections: {
      shodashvarga: {
        status: 'computed',
        source: 'python_astro_calculation_engine',
        fields: {
          status: 'not_available',
          source: 'python_astro_calculation_engine',
          warnings: [{ warning_code: 'SHODASHVARGA_NOT_IMPLEMENTED_IN_PYTHON_ADAPTER' }],
        },
      },
      shodashvargaBhav: {
        status: 'unavailable',
        source: 'none',
        reason: 'shodashvarga_bhav_not_available',
      },
      d9Chart: {
        status: 'computed',
        source: 'deterministic_calculation',
        fields: {},
      },
    },
    ...overrides,
  } as MasterAstroCalculationOutput
}

describe('astro chart_json_v2 shodashvarga persistence contract', () => {
  it('builds deterministic shodashvarga, bhav, and d9 data through the real adapter path', () => {
    const chart = buildProfileChartJsonFromMasterOutput({
      output: makeMasterOutput(),
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartVersionId: 'chart-1',
      chartVersion: 12,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      settingsForHash: { ayanamsa: 'lahiri', house_system: 'whole_sign', zodiac_type: 'sidereal', astrology_system: 'parashari', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' } as never,
      normalized: { birth_date_iso: '2026-05-05', birth_time_known: true } as never,
      engineVersion: 'v2.0.0-real-sweph',
      ephemerisVersion: 'sweph@unknown',
      schemaVersion: 'chart_json_v2',
    })

    const canonical = assertCanonicalChartJsonV2(chart.chart_json_v2 ?? chart.chartJsonV2)
    const shodashvarga = canonical.sections.shodashvarga
    const shodashvargaBhav = canonical.sections.shodashvargaBhav
    const d9Chart = canonical.sections.d9Chart

    expect(shodashvarga.status).toBe('computed')
    expect(shodashvarga.source).toBe('deterministic_calculation')
    expect(shodashvarga.fields?.source).not.toBe('python_astro_calculation_engine')
    expect(JSON.stringify(canonical)).not.toContain('SHODASHVARGA_NOT_IMPLEMENTED_IN_PYTHON_ADAPTER')
    expect(JSON.stringify(canonical)).not.toContain('python_astro_calculation_engine')
    expect((shodashvarga.fields as Record<string, unknown>)?.vargaTypes).toEqual(expect.arrayContaining(['D2', 'D9']))
    expect((shodashvarga.fields as Record<string, unknown>)?.byBody && typeof (shodashvarga.fields as Record<string, unknown>)?.byBody === 'object').toBe(true)
    expect(shodashvargaBhav.status).toBe('computed')
    expect(d9Chart.status).toBe('computed')
    expect((d9Chart.fields as Record<string, unknown>)?.byBody).toBeDefined()
  })

  it('overwrites placeholder adapter payloads with deterministic Phase 9 sections', () => {
    const chart = buildProfileChartJsonFromMasterOutput({
      output: makeMasterOutput(),
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartVersionId: 'chart-1',
      chartVersion: 12,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      settingsForHash: { ayanamsa: 'lahiri', house_system: 'whole_sign', zodiac_type: 'sidereal', astrology_system: 'parashari', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' } as never,
      normalized: { birth_date_iso: '2026-05-05', birth_time_known: true } as never,
      engineVersion: 'v2.0.0-real-sweph',
      ephemerisVersion: 'sweph@unknown',
      schemaVersion: 'chart_json_v2',
    })
    const canonical = assertCanonicalChartJsonV2(chart.chart_json_v2 ?? chart.chartJsonV2)
    expect(canonical.sections.shodashvarga.fields?.source).not.toBe('python_astro_calculation_engine')
    expect(canonical.sections.shodashvarga.fields?.warnings).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ warning_code: 'SHODASHVARGA_NOT_IMPLEMENTED_IN_PYTHON_ADAPTER' })]),
    )
  })

  it('marks shodashvarga unavailable when deterministic prerequisites are missing', () => {
    const chart = buildProfileChartJsonFromMasterOutput({
      output: makeMasterOutput({
        planetary_positions: null,
        lagna: null,
      }),
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartVersionId: 'chart-1',
      chartVersion: 12,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      settingsForHash: { ayanamsa: 'lahiri', house_system: 'whole_sign', zodiac_type: 'sidereal', astrology_system: 'parashari', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' } as never,
      normalized: { birth_date_iso: '2026-05-05', birth_time_known: false } as never,
      engineVersion: 'v2.0.0-real-sweph',
      ephemerisVersion: 'sweph@unknown',
      schemaVersion: 'chart_json_v2',
    })
    const canonical = assertCanonicalChartJsonV2(chart.chart_json_v2 ?? chart.chartJsonV2)
    expect(canonical.sections.shodashvarga.status).toBe('unavailable')
    expect(canonical.sections.shodashvarga.source).not.toBe('python_astro_calculation_engine')
    expect(canonical.sections.shodashvarga.reason).toBeTruthy()
    expect(canonical.sections.shodashvarga.fields?.source).not.toBe('python_astro_calculation_engine')
  })

  it('does not crash on malformed adapter section payloads and keeps deterministic data', () => {
    const chart = buildProfileChartJsonFromMasterOutput({
      output: makeMasterOutput({
        sections: {
          shodashvarga: 'malformed',
          shodashvargaBhav: 42,
          d9Chart: null,
        },
      }),
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartVersionId: 'chart-1',
      chartVersion: 12,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      settingsForHash: { ayanamsa: 'lahiri', house_system: 'whole_sign', zodiac_type: 'sidereal', astrology_system: 'parashari', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' } as never,
      normalized: { birth_date_iso: '2026-05-05', birth_time_known: true } as never,
      engineVersion: 'v2.0.0-real-sweph',
      ephemerisVersion: 'sweph@unknown',
      schemaVersion: 'chart_json_v2',
    })
    const canonical = assertCanonicalChartJsonV2(chart.chart_json_v2 ?? chart.chartJsonV2)
    expect(canonical.sections.shodashvarga.status).toBe('computed')
    expect(JSON.stringify(canonical)).not.toContain('SHODASHVARGA_NOT_IMPLEMENTED_IN_PYTHON_ADAPTER')
  })

  it('keeps D9 consistent with shodashvarga D9 rows for the available bodies', async () => {
    const chart = buildProfileChartJsonFromMasterOutput({
      output: makeMasterOutput(),
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartVersionId: 'chart-1',
      chartVersion: 12,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      settingsForHash: { ayanamsa: 'lahiri', house_system: 'whole_sign', zodiac_type: 'sidereal', astrology_system: 'parashari', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' } as never,
      normalized: { birth_date_iso: '2026-05-05', birth_time_known: true } as never,
      engineVersion: 'v2.0.0-real-sweph',
      ephemerisVersion: 'sweph@unknown',
      schemaVersion: 'chart_json_v2',
    })
    const canonical = assertCanonicalChartJsonV2(chart.chart_json_v2 ?? chart.chartJsonV2)
    const shodashvarga = canonical.sections.shodashvarga.fields as Record<string, unknown>
    const d9ByBody = (canonical.sections.d9Chart.fields as Record<string, unknown>).byBody as Record<string, unknown>
    expect((shodashvarga.byBody as Record<string, unknown>).Sun && (shodashvarga.byBody as Record<string, unknown>).Moon).toBeTruthy()
    expect(d9ByBody.Sun).toBeDefined()
    expect(d9ByBody.Moon).toBeDefined()
  })

  it('passes deterministic chart JSON into persistence RPC without legacy Python placeholder strings', async () => {
    const rpc = vi.fn(async (_fn: string, args: Record<string, unknown>) => ({
      data: [{ chart_version_id: 'chart-2', chart_version: 13, p_chart_json: args.p_chart_json }],
      error: null,
    }))

    const chart = buildProfileChartJsonFromMasterOutput({
      output: makeMasterOutput(),
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartVersionId: 'chart-1',
      chartVersion: 12,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      settingsForHash: { ayanamsa: 'lahiri', house_system: 'whole_sign', zodiac_type: 'sidereal', astrology_system: 'parashari', node_type: 'mean_node', dasha_year_basis: 'civil_365.2425' } as never,
      normalized: { birth_date_iso: '2026-05-05', birth_time_known: true } as never,
      engineVersion: 'v2.0.0-real-sweph',
      ephemerisVersion: 'sweph@unknown',
      schemaVersion: 'chart_json_v2',
    })

    await persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartJson: assertCanonicalChartJsonV2(chart.chart_json_v2 ?? chart.chartJsonV2),
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'v2.0.0-real-sweph',
      predictionSummary: null,
      auditPayload: {},
    })

    const persisted = rpc.mock.calls[0]?.[1]?.p_chart_json as Record<string, unknown>
    expect(JSON.stringify(persisted)).not.toContain('SHODASHVARGA_NOT_IMPLEMENTED_IN_PYTHON_ADAPTER')
    expect(JSON.stringify(persisted)).not.toContain('python_astro_calculation_engine')
  })
})
