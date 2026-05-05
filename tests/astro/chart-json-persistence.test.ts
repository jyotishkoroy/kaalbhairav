/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { persistCanonicalChartJsonV2 } from '@/lib/astro/chart-json-persistence'

const rpc = vi.fn()

function makeChartJson(overrides: Record<string, unknown> = {}) {
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
      ...overrides,
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
  } as never
}

beforeEach(() => {
  rpc.mockReset()
})

describe('persistCanonicalChartJsonV2', () => {
  it('calls the atomic RPC and returns chartVersionId/chartVersion', async () => {
    rpc.mockResolvedValue({ data: [{ chart_version_id: 'chart-1', chart_version: 3 }], error: null })
    const result = await persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartJson: makeChartJson(),
      predictionSummary: { ready: true },
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine',
      auditPayload: { phase: 15 },
    })

    expect(rpc).toHaveBeenCalledWith('persist_and_promote_current_chart_version', expect.objectContaining({
      p_user_id: 'user-1',
      p_profile_id: 'profile-1',
      p_calculation_id: 'calc-1',
      p_schema_version: 'chart_json_v2',
      p_input_hash: 'input-hash',
      p_settings_hash: 'settings-hash',
      p_engine_version: 'engine',
      p_ephemeris_version: 'ephemeris',
      p_ayanamsha: 'lahiri',
      p_house_system: 'whole_sign',
    }))
    expect(result).toEqual({ chartVersionId: 'chart-1', chartVersion: 3 })
  })

  it('backfills required metadata from deterministic defaults before RPC', async () => {
    rpc.mockResolvedValue({ data: [{ chart_version_id: 'chart-1', chart_version: 3 }], error: null })
    const chartJson = makeChartJson({
      engineVersion: '',
      ephemerisVersion: '',
      ayanamsha: '',
      houseSystem: '',
    })
    await persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      chartJson,
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine',
    })

    const [, payload] = rpc.mock.calls[0] ?? []
    expect(payload).toMatchObject({
      p_ephemeris_version: 'stub',
      p_ayanamsha: 'lahiri',
      p_house_system: 'whole_sign',
      p_chart_json: {
        metadata: {
          engineVersion: 'v2.0.0-stub',
          ephemerisVersion: 'stub',
          ayanamsha: 'lahiri',
          houseSystem: 'whole_sign',
        },
      },
    })
  })


  it('parses object-shaped RPC data', async () => {
    rpc.mockResolvedValue({ data: { chart_version_id: 'chart-2', chart_version: 7 }, error: null })
    await expect(persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      chartJson: makeChartJson(),
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine',
    })).resolves.toEqual({ chartVersionId: 'chart-2', chartVersion: 7 })
  })

  it('rejects chart JSON that already has persistence metadata', async () => {
    await expect(persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      chartJson: makeChartJson({ chartVersionId: 'prefilled', chartVersion: 1 }),
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine',
    })).rejects.toThrow('chartVersionId/chartVersion must be assigned by persistence RPC, not prefilled.')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects missing RPC data', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      chartJson: makeChartJson(),
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine',
    })).rejects.toThrow('Persistence RPC returned no result.')
  })

  it('surfaces RPC errors verbatim', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'persist failed' } })
    await expect(persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      chartJson: makeChartJson(),
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine',
    })).rejects.toThrow('persist failed')
  })
})
