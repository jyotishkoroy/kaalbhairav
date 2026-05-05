/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from 'vitest'

import { persistCanonicalChartJsonV2 } from '@/lib/astro/chart-json-persistence'
import { validateCurrentChartJsonV2Metadata } from '@/lib/astro/current-chart-version'

const rpc = vi.fn()

function chartJson() {
  return {
    schemaVersion: 'chart_json_v2',
    metadata: {
      profileId: 'profile-1',
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine',
      ephemerisVersion: 'ephemeris',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: '2026-05-05T00:00:00.000Z',
    },
    sections: {
      timeFacts: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      planetaryPositions: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      lagna: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      houses: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      panchang: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      d1Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      d9Chart: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      shodashvarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      shodashvargaBhav: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      vimshottari: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      kp: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      dosha: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      ashtakavarga: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      transits: { status: 'computed', source: 'deterministic_calculation', fields: {} },
      advanced: { status: 'computed', source: 'deterministic_calculation', fields: {} },
    },
  } as const
}

describe('current chart pointer integrity helpers', () => {
  it('persists canonical chart JSON without prefilled version metadata and validates the returned pointer', async () => {
    rpc.mockResolvedValue({ data: [{ chart_version_id: 'chart-2', chart_version: 3 }], error: null })

    const persisted = await persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartJson: chartJson(),
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine',
    })

    expect(persisted).toEqual({ chartVersionId: 'chart-2', chartVersion: 3 })
    expect(rpc).toHaveBeenCalledWith('persist_and_promote_current_chart_version', expect.objectContaining({
      p_schema_version: 'chart_json_v2',
      p_user_id: 'user-1',
      p_profile_id: 'profile-1',
      p_calculation_id: 'calc-1',
    }))

    const validated = validateCurrentChartJsonV2Metadata({
      chartJson: {
        ...chartJson(),
        metadata: {
          ...chartJson().metadata,
          chartVersionId: 'chart-2',
          chartVersion: 3,
        },
      },
      userId: 'user-1',
      profileId: 'profile-1',
      chartVersionId: 'chart-2',
      chartVersion: 3,
    })
    expect(validated.metadata.chartVersionId).toBe('chart-2')
  })

  it('rejects metadata mismatches so the strict loader cannot fall back to a different row', () => {
    expect(() => validateCurrentChartJsonV2Metadata({
      chartJson: {
        ...chartJson(),
        metadata: {
          ...chartJson().metadata,
          chartVersionId: 'chart-1',
          chartVersion: 2,
        },
      },
      userId: 'user-1',
      profileId: 'profile-1',
      chartVersionId: 'chart-2',
      chartVersion: 3,
    })).toThrow('current_chart_metadata_version_id_mismatch')
  })
})

