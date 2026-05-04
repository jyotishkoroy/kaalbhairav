/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildAstroReportContract } from '@/lib/astro/report/report-builder.ts'
import { validateReportFieldProvenance } from '@/lib/astro/report/fact-provenance-validator.ts'
import type { ResolvedAstroReportField } from '@/lib/astro/report/report-contract.ts'

function llmField(fieldKey: string, value: string, sourcePath: string): ResolvedAstroReportField {
  return {
    fieldKey,
    groupId: 'group',
    displayLabel: fieldKey,
    status: 'resolved',
    value,
    source_type: 'llm_grounded_text',
    source_path: sourcePath,
    source_section_status: 'computed',
    provenance: {
      chartVersionId: 'chart-test',
      profileId: 'profile-test',
      sourcePath,
      sourceType: 'llm_grounded_text',
      registryFieldKey: fieldKey,
      computedAt: '2026-05-04T00:00:00.000Z',
    },
    riskLevel: 'HIGH',
    warnings: [],
  }
}

describe('astro fact provenance validator rejects llm exact fields', () => {
  it('fails exact chart facts from llm or rag sources', () => {
    const lagna = llmField('lagna_sign', 'Virgo', 'llm.lagna_sign')
    const moonHouse = llmField('moon_house', '5', 'rag.moon_house')
    const remedy = llmField('remedy_guidance', 'Buy an expensive gemstone immediately.', 'llm.remedy_guidance')
    const timing = llmField('timing_guidance', 'It will happen on 2026-05-04.', 'llm.timing_guidance')
    const clientLagna = llmField('lagna_sign', 'Virgo', 'llm.lagna_sign')
    expect(validateReportFieldProvenance(lagna).failureCode).toBe('llm_exact_fact_not_allowed')
    expect(validateReportFieldProvenance({ ...(moonHouse as ResolvedAstroReportField), source_type: 'rag_grounded_text', provenance: { ...moonHouse.provenance, sourceType: 'rag_grounded_text' } } as ResolvedAstroReportField).failureCode).toBe('source_type_not_allowed')
    expect(validateReportFieldProvenance(remedy).ok).toBe(false)
    expect(validateReportFieldProvenance(timing).ok).toBe(false)
    expect(validateReportFieldProvenance({ ...(clientLagna as ResolvedAstroReportField), source_type: 'astronomical_calculation', provenance: { ...clientLagna.provenance, sourceType: 'astronomical_calculation' } } as ResolvedAstroReportField).failureCode).toBe('client_context_not_allowed')
  })

  it('converts unsafe provenance to unavailable in the builder', () => {
    const report = buildAstroReportContract({
      chartJson: {
        canonical_chart_json_v2: {
          schemaVersion: 'chart_json_v2',
          metadata: { engine: 'local_ts_swiss', profileId: 'profile-test', chartVersionId: 'chart-test' },
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
        llm: { remedy_guidance: 'Buy an expensive gemstone immediately.', timing_guidance: 'It will happen on 2026-05-04.' },
      },
      profileId: 'profile-test',
      chartVersionId: 'chart-test',
      now: new Date('2026-05-04T00:00:00.000Z'),
      sourceMode: 'test_fixture',
    })
    const fields = report.groups.flatMap((group) => group.fields)
    expect(fields.find((field) => field.fieldKey === 'remedy_guidance')).toMatchObject({ status: 'unavailable' })
    expect(fields.find((field) => field.fieldKey === 'timing_guidance')).toMatchObject({ status: 'unavailable' })
    expect(JSON.stringify(report)).not.toContain('expensive gemstone immediately')
    expect(report.warnings.some((warning) => warning.startsWith('field_unavailable:remedy_guidance'))).toBe(true)
  })
})
