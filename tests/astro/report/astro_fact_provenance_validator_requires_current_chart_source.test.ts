/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { validateReportFieldProvenance } from '@/lib/astro/report/fact-provenance-validator.ts'
import type { ResolvedAstroReportField } from '@/lib/astro/report/report-contract.ts'

function makeField(overrides: Partial<ResolvedAstroReportField> = {}): ResolvedAstroReportField {
  return {
    fieldKey: 'lagna_sign',
    groupId: 'core_chart',
    displayLabel: 'Lagna Sign',
    status: 'resolved',
    value: 'Leo',
    source_type: 'astronomical_calculation',
    source_path: 'canonical_chart_json_v2.sections.lagna.fields.sign',
    source_section_status: 'computed',
    provenance: {
      chartVersionId: 'chart-test',
      profileId: 'profile-test',
      sourcePath: 'canonical_chart_json_v2.sections.lagna.fields.sign',
      sourceType: 'astronomical_calculation',
      registryFieldKey: 'lagna_sign',
      computedAt: '2026-05-04T00:00:00.000Z',
    },
    riskLevel: 'MEDIUM',
    warnings: [],
    ...overrides,
    } as ResolvedAstroReportField
}

describe('astro fact provenance validator requires current chart source', () => {
  it('fails closed on missing ids and bad section status', () => {
    const base = makeField()
    expect(validateReportFieldProvenance(makeField({ provenance: { ...base.provenance, chartVersionId: undefined } }), { requireChartVersionId: true }).failureCode).toBe('missing_chart_version_id')
    expect(validateReportFieldProvenance(makeField({ provenance: { ...base.provenance, profileId: undefined } }), { requireProfileId: true }).failureCode).toBe('missing_profile_id')
    expect(validateReportFieldProvenance(makeField({ source_section_status: 'unavailable' }), {}).failureCode).toBe('section_not_computed')
    expect(validateReportFieldProvenance(makeField({ source_section_status: 'partial' }), {}).failureCode).toBe('section_not_computed')
    expect(validateReportFieldProvenance(makeField({ provenance: { ...base.provenance, sourceType: 'deterministic_derived' } }), {}).failureCode).toBe('source_type_not_allowed')
    expect(validateReportFieldProvenance(makeField({ source_path: 'canonical_chart_json_v2.sections.unknown.fields.sign' }), {}).failureCode).toBe('source_path_not_allowed')
  })

  it('keeps unavailable fields valid when reason is explicit', () => {
    const unavailableField = {
      fieldKey: 'outer_planets',
      groupId: 'advanced',
      displayLabel: 'Outer Planets',
      status: 'unavailable',
      unavailable: {
        value: null,
        status: 'unavailable',
        reason: 'module_not_implemented',
        source_type: 'unavailable',
        required_module: 'advanced',
        required_chart_path: 'canonical_chart_json_v2.sections.advanced.outerPlanets',
        message: 'This field is unavailable because the required calculation module is not implemented.',
      },
      source_type: 'unavailable',
      provenance: {
        chartVersionId: 'chart-test',
        profileId: 'profile-test',
        sourcePath: 'canonical_chart_json_v2.sections.advanced.outerPlanets',
        sourceType: 'unavailable',
        registryFieldKey: 'outer_planets',
        computedAt: '2026-05-04T00:00:00.000Z',
      },
      riskLevel: 'HIGH',
      warnings: [],
    } as ResolvedAstroReportField

    expect(validateReportFieldProvenance(unavailableField).ok).toBe(true)
  })
})
