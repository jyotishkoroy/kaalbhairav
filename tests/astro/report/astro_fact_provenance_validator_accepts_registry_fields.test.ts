/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildAstroReportContract } from '@/lib/astro/report/report-builder.ts'
import { validateReportContractProvenance, validateReportFieldProvenance } from '@/lib/astro/report/fact-provenance-validator.ts'
import type { ResolvedAstroReportField } from '@/lib/astro/report/report-contract.ts'

function makeResolvedField(
  fieldKey: string,
  value: unknown,
  sourceType: 'astronomical_calculation' | 'deterministic_derived' | 'input_display' | 'static_lookup' | 'static_template',
  sourcePath: string,
  chartVersionId = 'chart-test',
  profileId = 'profile-test',
): ResolvedAstroReportField {
  return {
    fieldKey,
    groupId: 'group',
    displayLabel: fieldKey,
    status: 'resolved',
    value: value as never,
    source_type: sourceType as never,
    source_path: sourcePath,
    source_section_status: 'computed',
    provenance: {
      chartVersionId,
      profileId,
      sourcePath,
      sourceType: sourceType as never,
      registryFieldKey: fieldKey,
      computedAt: '2026-05-04T00:00:00.000Z',
    },
    riskLevel: 'SAFE',
    warnings: [],
  }
}

describe('astro fact provenance validator accepts registry fields', () => {
  it('accepts canonical deterministic fields and report provenance', () => {
    const cases: ResolvedAstroReportField[] = [
      makeResolvedField('lagna_sign', 'Leo', 'astronomical_calculation', 'canonical_chart_json_v2.sections.lagna.fields.sign'),
      makeResolvedField('moon_sign', 'Gemini', 'astronomical_calculation', 'canonical_chart_json_v2.sections.planetaryPositions.fields.Moon.sign'),
      makeResolvedField('moon_house', 11, 'deterministic_derived', 'canonical_chart_json_v2.sections.planetaryPositions.fields.Moon.house'),
      makeResolvedField('weekday', 'Monday', 'deterministic_derived', 'canonical_chart_json_v2.sections.panchang.fields.weekday'),
      makeResolvedField('current_mahadasha', 'Jupiter', 'astronomical_calculation', 'canonical_chart_json_v2.sections.vimshottari.fields.current_mahadasha'),
    ]

    for (const field of cases) {
      expect(validateReportFieldProvenance(field, { requireChartVersionId: true, requireProfileId: true }).ok).toBe(true)
    }

    const report = buildAstroReportContract({
      chartJson: {
        canonical_chart_json_v2: {
          schemaVersion: 'chart_json_v2',
          metadata: { profileId: 'profile-test', chartVersionId: 'chart-test', engine: 'local_ts_swiss' },
          sections: {
            timeFacts: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
            planetaryPositions: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { Moon: { sign: 'Gemini', house: 11 }, Sun: { sign: 'Taurus', house: 10 } } },
            lagna: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { sign: 'Leo' } },
            houses: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { moon_house: 11, sun_house: 10 } },
            panchang: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { weekday: 'Monday', convention: 'at_birth_time', tithi: 'tithi', paksha: 'shukla', yoga: 'yoga', karana: 'karana' } },
            d1Chart: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
            d9Chart: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
            vimshottari: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { current_mahadasha: 'Jupiter', current_antardasha: 'Saturn', timeline: [] } },
            advanced: { outerPlanets: { status: 'unavailable', source: 'not_implemented', engine: 'local_ts_swiss', reason: 'outer_planets_not_enabled_for_all_engine_modes' } },
          },
        },
      },
      profileId: 'profile-test',
      chartVersionId: 'chart-test',
      now: new Date('2026-05-04T00:00:00.000Z'),
      sourceMode: 'test_fixture',
    })

    expect(validateReportContractProvenance(report, { requireChartVersionId: true, requireProfileId: true }).ok).toBe(true)
    expect(report.warnings.every((warning) => !warning.startsWith('fact_provenance_invalid:'))).toBe(true)
  })
})
