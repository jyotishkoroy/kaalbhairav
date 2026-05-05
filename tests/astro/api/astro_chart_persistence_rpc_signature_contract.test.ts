/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { persistCanonicalChartJsonV2 } from '@/lib/astro/chart-json-persistence'
import { ASTRO_DETERMINISTIC_ENGINE_VERSION, ASTRO_DETERMINISTIC_EPHEMERIS_VERSION } from '@/lib/astro/engine/version'

const rpc = vi.fn()

function makeChartJson(metadata: Record<string, unknown> = {}) {
  return {
    schemaVersion: 'chart_json_v2',
    metadata: {
      profileId: 'profile-1',
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      runtimeClockIso: '2026-05-05T00:00:00.000Z',
      engineVersion: 'engine-1',
      ephemerisVersion: 'ephemeris-1',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      ...metadata,
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
      transits: { status: 'unavailable', source: 'none', fields: {} },
      advanced: { status: 'unavailable', source: 'none', fields: {} },
    },
  } as never
}

beforeEach(() => {
  rpc.mockReset()
})

describe('astro chart persistence rpc signature contract', () => {
  it('calls RPC with canonical args including audit payload and ephemeris metadata', async () => {
    rpc.mockResolvedValue({ data: [{ chart_version_id: 'chart-1', chart_version: 1 }], error: null })
    await persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      calculationId: 'calc-1',
      chartJson: makeChartJson({
        engineVersion: 'engine-1',
        ephemerisVersion: 'ephemeris-1',
        ayanamsha: 'lahiri',
        houseSystem: 'whole_sign',
      }),
      predictionSummary: { ready: true },
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine-1',
      auditPayload: { phase: 21 },
    })

    expect(rpc).toHaveBeenCalledWith('persist_and_promote_current_chart_version', expect.objectContaining({
      p_user_id: 'user-1',
      p_profile_id: 'profile-1',
      p_calculation_id: 'calc-1',
      p_ephemeris_version: 'ephemeris-1',
      p_ayanamsha: 'lahiri',
      p_house_system: 'whole_sign',
      p_audit_payload: { phase: 21 },
    }))
  })

  it('accepts camelCase metadata only and still emits snake_case rpc args', async () => {
    rpc.mockResolvedValue({ data: [{ chart_version_id: 'chart-1', chart_version: 1 }], error: null })
    await persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      chartJson: makeChartJson({
        engineVersion: 'engine-1',
        ephemerisVersion: 'ephemeris-1',
        houseSystem: 'whole_sign',
      }),
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine-1',
    })

    const [, payload] = rpc.mock.calls[0] ?? []
    expect(payload).toMatchObject({
      p_engine_version: 'engine-1',
      p_ephemeris_version: 'ephemeris-1',
      p_house_system: 'whole_sign',
      p_ayanamsha: 'lahiri',
    })
  })

  it('uses deterministic ephemeris fallback when metadata is missing', async () => {
    rpc.mockResolvedValue({ data: [{ chart_version_id: 'chart-1', chart_version: 1 }], error: null })
    await persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      chartJson: makeChartJson({ ephemerisVersion: '' }),
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine-1',
    })

    const [, payload] = rpc.mock.calls[0] ?? []
    expect(payload).toMatchObject({
      p_ephemeris_version: ASTRO_DETERMINISTIC_EPHEMERIS_VERSION,
    })
    expect(typeof payload?.p_ephemeris_version === 'string' && payload.p_ephemeris_version.trim().length > 0).toBe(true)
  })

  it('does not emit null payload values when metadata strings are empty', async () => {
    rpc.mockResolvedValue({ data: [{ chart_version_id: 'chart-1', chart_version: 1 }], error: null })
    await persistCanonicalChartJsonV2({
      supabase: { rpc },
      userId: 'user-1',
      profileId: 'profile-1',
      chartJson: makeChartJson({
        engineVersion: '',
        engine_version: '',
        ephemerisVersion: '',
        ephemeris_version: '',
        ayanamsha: '',
        houseSystem: '',
      }),
      inputHash: 'input-hash',
      settingsHash: 'settings-hash',
      engineVersion: 'engine-1',
    })

    const [, payload] = rpc.mock.calls[0] ?? []
    expect(payload).toMatchObject({
      p_engine_version: ASTRO_DETERMINISTIC_ENGINE_VERSION,
      p_ephemeris_version: ASTRO_DETERMINISTIC_EPHEMERIS_VERSION,
      p_ayanamsha: 'lahiri',
      p_house_system: 'whole_sign',
    })
    expect((payload as Record<string, unknown>).p_engine_version).not.toBeNull()
    expect((payload as Record<string, unknown>).p_ephemeris_version).not.toBeNull()
    expect((payload as Record<string, unknown>).p_ayanamsha).not.toBeNull()
    expect((payload as Record<string, unknown>).p_house_system).not.toBeNull()
  })

  it('pins the migration signature and schema reload directive', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260505123000_make_chart_json_versions_append_only_rpc.sql',
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('p_ephemeris_version text')
    expect(sql).toContain('p_ayanamsha text')
    expect(sql).toContain('p_house_system text')
    expect(sql).toContain("p_audit_payload jsonb")
    expect(sql).toContain("notify pgrst, 'reload schema';")
    expect(sql).toContain('insert into public.chart_json_versions')
    expect(sql).toContain('where profile_id = p_profile_id')
    expect(sql).not.toContain('update public.chart_json_versions set chart_json =')
    expect(sql).not.toContain('update public.chart_json_versions set input_hash =')
    expect(sql).not.toContain('update public.chart_json_versions set engine_version =')
  })

  it('keeps the full 13-argument function signature in order', () => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260505123000_make_chart_json_versions_append_only_rpc.sql',
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')
    expect(sql).toMatch(
      /public\.persist_and_promote_current_chart_version\(\s*uuid,\s*uuid,\s*uuid,\s*jsonb,\s*jsonb,\s*text,\s*text,\s*text,\s*text,\s*text,\s*text,\s*text,\s*jsonb\s*\)/i,
    )
  })
})
