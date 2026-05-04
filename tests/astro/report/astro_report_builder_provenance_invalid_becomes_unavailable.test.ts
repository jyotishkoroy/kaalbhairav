/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildAstroReportContract } from '@/lib/astro/report/report-builder.ts'
import type { AstroReportFieldRegistryEntry } from '@/lib/astro/report/field-registry.ts'

describe('astro report builder provenance invalid becomes unavailable', () => {
  it('converts unverifiable fields into unavailable values', () => {
    const registry: readonly AstroReportFieldRegistryEntry[] = [
      {
        groupId: 'core_chart',
        groupName: 'Core Chart',
        fieldKey: 'lagna_sign',
        displayLabel: 'Lagna Sign',
        sourceType: 'astronomical_calculation',
        requiredChartPaths: ['canonical_chart_json_v2.sections.lagna.fields.sign'],
        calculationModule: 'lagna',
        testIds: ['custom-lagna'],
        unavailablePolicy: { reason: 'missing_chart_path', requiredModule: 'lagna' },
        riskLevel: 'MEDIUM',
        versionedSettingsRequired: [],
        enabled: true,
      },
      {
        groupId: 'interpretive_text',
        groupName: 'Interpretive Text',
        fieldKey: 'career_summary',
        displayLabel: 'Career Summary',
        sourceType: 'llm_grounded_text',
        requiredChartPaths: ['canonical_chart_json_v2.sections.lagna.fields.sign'],
        calculationModule: 'llm',
        testIds: ['custom-career'],
        unavailablePolicy: { reason: 'unsafe_to_answer' },
        riskLevel: 'HIGH',
        versionedSettingsRequired: [],
        enabled: true,
      },
      {
        groupId: 'advanced',
        groupName: 'Advanced',
        fieldKey: 'outer_planets',
        displayLabel: 'Outer Planets',
        sourceType: 'unavailable',
        requiredChartPaths: ['canonical_chart_json_v2.sections.advanced.outerPlanets'],
        calculationModule: 'advanced',
        testIds: ['custom-outer'],
        unavailablePolicy: { reason: 'module_not_implemented', requiredModule: 'advanced' },
        riskLevel: 'HIGH',
        versionedSettingsRequired: [],
        enabled: true,
      },
    ]

    const report = buildAstroReportContract({
      chartJson: {
        canonical_chart_json_v2: {
          schemaVersion: 'chart_json_v2',
          metadata: { engine: 'local_ts_swiss', profileId: 'profile-test', chartVersionId: 'chart-test' },
          sections: {
            timeFacts: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
            planetaryPositions: { status: 'unavailable', source: 'not_implemented', engine: 'local_ts_swiss', reason: 'planetary_positions_not_available' },
            lagna: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: { sign: 'Leo' } },
            houses: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
            panchang: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
            d1Chart: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
            d9Chart: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
            vimshottari: { status: 'computed', source: 'local_ts_swiss', engine: 'local_ts_swiss', fields: {} },
            advanced: { outerPlanets: { status: 'unavailable', source: 'not_implemented', engine: 'local_ts_swiss', reason: 'outer_planets_not_enabled_for_all_engine_modes' } },
          },
        },
      },
      profileId: 'profile-test',
      chartVersionId: 'chart-test',
      now: new Date('2026-05-04T00:00:00.000Z'),
      sourceMode: 'test_fixture',
      registry,
    })

    const fields = report.groups.flatMap((group) => group.fields)
    expect(fields.find((field) => field.fieldKey === 'lagna_sign')).toMatchObject({ status: 'resolved', value: 'Leo' })
    expect(fields.find((field) => field.fieldKey === 'career_summary')).toMatchObject({ status: 'unavailable' })
    expect(fields.find((field) => field.fieldKey === 'outer_planets')).toMatchObject({ status: 'unavailable' })
    expect(report.unavailableCount).toBeGreaterThanOrEqual(2)
    expect(report.resolvedCount).toBeGreaterThanOrEqual(1)
    expect(report.warnings.some((warning) => warning.startsWith('field_unavailable:career_summary'))).toBe(true)
    expect(JSON.stringify(report)).not.toContain('Buy an expensive gemstone immediately.')
  })
})
