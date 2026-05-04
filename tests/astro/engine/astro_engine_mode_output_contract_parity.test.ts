/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildCanonicalChartJsonV2, REQUIRED_CANONICAL_SECTION_KEYS } from '@/lib/astro/schemas/canonical-chart-json.ts'
import { computedAstroSection, unavailableAstroSection } from '@/lib/astro/schemas/astro-section-contract.ts'

function buildSection(status: 'computed' | 'unavailable', engine: string, reason: string) {
  return status === 'computed'
    ? computedAstroSection({ source: 'local_ts_swiss', engine, fields: { ok: true } })
    : unavailableAstroSection({ source: 'not_implemented', engine, reason })
}

function buildCanonical(engine: string, sections: Partial<Record<string, unknown>>) {
  return buildCanonicalChartJsonV2({
    metadata: { engine, profileId: 'profile-test', chartVersionId: 'chart-test', calculationId: 'calc-test', inputHash: 'input-test', settingsHash: 'settings-test' },
    sections: {
      timeFacts: (sections.timeFacts as never) ?? unavailableAstroSection({ reason: 'time_facts_not_available', engine }),
      planetaryPositions: (sections.planetaryPositions as never) ?? unavailableAstroSection({ reason: 'planetary_positions_not_available', engine }),
      lagna: (sections.lagna as never) ?? unavailableAstroSection({ reason: 'lagna_not_available', engine }),
      houses: (sections.houses as never) ?? unavailableAstroSection({ reason: 'houses_not_available', engine }),
      panchang: (sections.panchang as never) ?? unavailableAstroSection({ reason: 'panchang_not_available', engine }),
      d1Chart: (sections.d1Chart as never) ?? unavailableAstroSection({ reason: 'd1_chart_not_available', engine }),
      d9Chart: (sections.d9Chart as never) ?? unavailableAstroSection({ reason: 'd9_chart_not_available', engine }),
      vimshottari: (sections.vimshottari as never) ?? unavailableAstroSection({ reason: 'vimshottari_not_available', engine }),
      transits: sections.transits as never,
      advanced: (sections.advanced as never) ?? { outerPlanets: unavailableAstroSection({ reason: 'outer_planets_not_enabled_for_all_engine_modes', engine }) },
    },
  })
}

describe('astro engine mode output contract parity', () => {
  const requiredKeys = ['timeFacts', 'planetaryPositions', 'lagna', 'houses', 'panchang', 'd1Chart', 'd9Chart', 'vimshottari', 'transits', 'advanced']

  it('local_ts_swiss output has the required section keys', () => {
    const canonical = buildCanonical('local_ts_swiss', {
      timeFacts: buildSection('computed', 'local_ts_swiss', 'ok'),
      planetaryPositions: buildSection('computed', 'local_ts_swiss', 'ok'),
      lagna: buildSection('computed', 'local_ts_swiss', 'ok'),
      houses: buildSection('computed', 'local_ts_swiss', 'ok'),
      panchang: buildSection('computed', 'local_ts_swiss', 'ok'),
      d1Chart: buildSection('computed', 'local_ts_swiss', 'ok'),
      d9Chart: buildSection('computed', 'local_ts_swiss', 'ok'),
      vimshottari: buildSection('computed', 'local_ts_swiss', 'ok'),
    })
    expect(Object.keys(canonical.sections)).toEqual(requiredKeys)
  })

  it('remote_oracle_vm output normalizes to the same required keys', () => {
    const canonical = buildCanonical('remote_oracle_vm', {
      timeFacts: buildSection('computed', 'remote_oracle_vm', 'ok'),
      planetaryPositions: buildSection('computed', 'remote_oracle_vm', 'ok'),
      lagna: buildSection('computed', 'remote_oracle_vm', 'ok'),
      houses: buildSection('computed', 'remote_oracle_vm', 'ok'),
      panchang: buildSection('computed', 'remote_oracle_vm', 'ok'),
      d1Chart: buildSection('computed', 'remote_oracle_vm', 'ok'),
      d9Chart: buildSection('computed', 'remote_oracle_vm', 'ok'),
      vimshottari: buildSection('computed', 'remote_oracle_vm', 'ok'),
    })
    expect(Object.keys(canonical.sections)).toEqual(requiredKeys)
  })

  it('python_swiss output normalizes to the same required keys', () => {
    const canonical = buildCanonical('python_swiss', {
      timeFacts: buildSection('computed', 'python_swiss', 'ok'),
      planetaryPositions: buildSection('computed', 'python_swiss', 'ok'),
      lagna: buildSection('computed', 'python_swiss', 'ok'),
      houses: buildSection('computed', 'python_swiss', 'ok'),
      panchang: buildSection('computed', 'python_swiss', 'ok'),
      d1Chart: buildSection('computed', 'python_swiss', 'ok'),
      d9Chart: buildSection('computed', 'python_swiss', 'ok'),
      vimshottari: buildSection('computed', 'python_swiss', 'ok'),
    })
    expect(Object.keys(canonical.sections)).toEqual(requiredKeys)
  })

  it('missing remote section becomes unavailable instead of omitted', () => {
    const canonical = buildCanonical('remote_oracle_vm', {
      timeFacts: buildSection('computed', 'remote_oracle_vm', 'ok'),
      planetaryPositions: buildSection('computed', 'remote_oracle_vm', 'ok'),
      lagna: buildSection('computed', 'remote_oracle_vm', 'ok'),
      houses: buildSection('unavailable', 'remote_oracle_vm', 'houses missing'),
      panchang: buildSection('computed', 'remote_oracle_vm', 'ok'),
      d1Chart: buildSection('computed', 'remote_oracle_vm', 'ok'),
      d9Chart: buildSection('computed', 'remote_oracle_vm', 'ok'),
      vimshottari: buildSection('computed', 'remote_oracle_vm', 'ok'),
    })
    expect(canonical.sections.houses.status).toBe('unavailable')
    expect(canonical.sections.houses.source).toBe('not_implemented')
  })

  it('every section has status and source', () => {
    const canonical = buildCanonical('python_swiss', {
      timeFacts: buildSection('computed', 'python_swiss', 'ok'),
      planetaryPositions: buildSection('computed', 'python_swiss', 'ok'),
      lagna: buildSection('computed', 'python_swiss', 'ok'),
      houses: buildSection('computed', 'python_swiss', 'ok'),
      panchang: buildSection('computed', 'python_swiss', 'ok'),
      d1Chart: buildSection('computed', 'python_swiss', 'ok'),
      d9Chart: buildSection('computed', 'python_swiss', 'ok'),
      vimshottari: buildSection('computed', 'python_swiss', 'ok'),
    })
    for (const key of ['timeFacts', 'planetaryPositions', 'lagna', 'houses', 'panchang', 'd1Chart', 'd9Chart', 'vimshottari']) {
      expect(canonical.sections[key as keyof typeof canonical.sections]).toMatchObject({ status: expect.any(String), source: expect.any(String) })
    }
  })
})
