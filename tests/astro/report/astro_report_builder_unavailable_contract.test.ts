/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildAstroReportContract } from '@/lib/astro/report/report-builder.ts'

describe('astro report builder unavailable contract', () => {
  it('returns unavailable fields for minimal malformed chart json', () => {
    const report = buildAstroReportContract({ chartJson: {}, profileId: 'profile-test', chartVersionId: 'chart-test', now: new Date('2026-05-04T00:00:00.000Z'), sourceMode: 'test_fixture' })
    expect(report.schemaVersion).toBe('astro_report_contract_v1')
    expect(report.unavailableCount).toBeGreaterThan(0)
    expect(report.resolvedCount).toBe(0)

    const lagna = report.groups.flatMap((group) => group.fields).find((field) => field.fieldKey === 'lagna_sign')
    expect(lagna).toMatchObject({ status: 'unavailable', source_type: 'unavailable' })
    expect(lagna && 'unavailable' in lagna ? lagna.unavailable.reason : undefined).toBe('missing_chart_path')
    const moonHouse = report.groups.flatMap((group) => group.fields).find((field) => field.fieldKey === 'moon_house')
    expect(moonHouse).toMatchObject({ status: 'unavailable' })
    expect(moonHouse && 'unavailable' in moonHouse ? moonHouse.unavailable.reason : undefined).toMatch(/missing_chart_path|incompatible_settings/)
    const outerPlanets = report.groups.flatMap((group) => group.fields).find((field) => field.fieldKey === 'outer_planets')
    expect(outerPlanets).toMatchObject({ status: 'unavailable' })
    expect(outerPlanets && 'unavailable' in outerPlanets ? outerPlanets.unavailable.reason : undefined).toMatch(/module_not_implemented|section_unavailable/)

    for (const field of report.groups.flatMap((group) => group.fields).filter((field) => field.status === 'unavailable')) {
      expect(field.unavailable.value).toBeNull()
      expect(field.unavailable.status).toBe('unavailable')
      expect(field.unavailable.reason).toBeTruthy()
      expect(field.unavailable.source_type).toBe('unavailable')
      expect(field.unavailable.message).toBeTruthy()
    }
  })

  it('does not read stale legacy lagna when canonical section is unavailable', () => {
    const report = buildAstroReportContract({
      chartJson: {
        lagna: { sign: 'Virgo' },
        canonical_chart_json_v2: {
          schemaVersion: 'chart_json_v2',
          metadata: { engine: 'test' },
          sections: {
            timeFacts: { status: 'computed', source: 'test', engine: 'test', fields: {} },
            planetaryPositions: { status: 'computed', source: 'test', engine: 'test', fields: {} },
            lagna: { status: 'unavailable', source: 'not_implemented', engine: 'test', reason: 'lagna_not_available' },
            houses: { status: 'computed', source: 'test', engine: 'test', fields: {} },
            panchang: { status: 'computed', source: 'test', engine: 'test', fields: {} },
            d1Chart: { status: 'computed', source: 'test', engine: 'test', fields: {} },
            d9Chart: { status: 'computed', source: 'test', engine: 'test', fields: {} },
            vimshottari: { status: 'computed', source: 'test', engine: 'test', fields: {} },
            advanced: { outerPlanets: { status: 'unavailable', source: 'not_implemented', engine: 'test', reason: 'outer_planets_not_enabled_for_all_engine_modes' } },
          },
        },
      },
      profileId: 'profile-test',
      chartVersionId: 'chart-test',
      now: new Date('2026-05-04T00:00:00.000Z'),
      sourceMode: 'test_fixture',
    })
    const lagna = report.groups.flatMap((group) => group.fields).find((field) => field.fieldKey === 'lagna_sign')
    expect(lagna).toMatchObject({ status: 'unavailable' })
  })
})
