/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadCurrentAstroChartForUser, validateCurrentChartJsonV2Metadata } from '@/lib/astro/current-chart-version'

function makeQuery(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
  }
}

function makeServiceMock(profile: Record<string, unknown> | null, chartRow: Record<string, unknown> | null, summary: Record<string, unknown> | null = null) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
        }
      }

      if (table === 'chart_json_versions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: chartRow, error: null }),
        }
      }

      if (table === 'prediction_ready_summaries') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: summary, error: null }),
        }
      }

      return makeQuery(null)
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadCurrentAstroChartForUser', () => {
  it('loads the chart pointed to by birth_profiles.current_chart_version_id and validates v2 metadata', async () => {
    const service = makeServiceMock(
      { id: 'profile-1', user_id: 'user-1', status: 'active', current_chart_version_id: 'chart-2' },
      {
        id: 'chart-2',
        profile_id: 'profile-1',
        user_id: 'user-1',
        status: 'completed',
        is_current: true,
        schema_version: 'chart_json_v2',
        chart_version: 2,
        chart_json: {
          schemaVersion: 'chart_json_v2',
          metadata: {
            profileId: 'profile-1',
            chartVersionId: 'chart-2',
            chartVersion: 2,
            inputHash: 'input',
            settingsHash: 'settings',
            engineVersion: 'engine',
            ephemerisVersion: 'eph',
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
        },
      },
      { id: 'summary-1', chart_version_id: 'chart-2', prediction_context: { ok: true } },
    ) as never

    const result = await loadCurrentAstroChartForUser({ service, userId: 'user-1' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.chartVersion.id).toBe('chart-2')
      expect(validateCurrentChartJsonV2Metadata({
        chartJson: result.chartVersion.chart_json,
        userId: 'user-1',
        profileId: 'profile-1',
        chartVersionId: 'chart-2',
        chartVersion: 2,
      }).metadata.chartVersionId).toBe('chart-2')
    }
  })

  it('rejects missing current chart pointer without falling back to latest rows', async () => {
    const service = makeServiceMock(
      { id: 'profile-1', user_id: 'user-1', status: 'active', current_chart_version_id: null },
      { id: 'chart-latest', profile_id: 'profile-1', user_id: 'user-1', status: 'completed', is_current: true },
    ) as never

    const result = await loadCurrentAstroChartForUser({ service, userId: 'user-1' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('chart_not_ready')
    }
  })

  it('rejects metadata mismatches and wrong ownership', async () => {
    const service = makeServiceMock(
      { id: 'profile-1', user_id: 'user-1', status: 'active', current_chart_version_id: 'chart-2' },
      {
        id: 'chart-2',
        profile_id: 'profile-1',
        user_id: 'user-1',
        status: 'completed',
        is_current: true,
        schema_version: 'chart_json_v2',
        chart_version: 2,
        chart_json: {
          schemaVersion: 'chart_json_v2',
          metadata: {
            profileId: 'profile-1',
            chartVersionId: 'wrong-id',
            chartVersion: 2,
            inputHash: 'input',
            settingsHash: 'settings',
            engineVersion: 'engine',
            ephemerisVersion: 'eph',
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
        },
      },
    ) as never

    const result = await loadCurrentAstroChartForUser({ service, userId: 'user-1' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('chart_not_ready')
    }
  })
})

