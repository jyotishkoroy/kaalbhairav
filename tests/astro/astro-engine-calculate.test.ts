/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { calculateMasterAstroOutputMock, calculateWithPythonEngineMock } = vi.hoisted(() => ({
  calculateMasterAstroOutputMock: vi.fn(),
  calculateWithPythonEngineMock: vi.fn(),
}))

vi.mock('../../lib/astro/calculations/master.ts', () => ({
  calculateMasterAstroOutput: calculateMasterAstroOutputMock,
}))

vi.mock('../../services/astro-engine/src/python-engine.ts', () => ({
  calculateWithPythonEngine: calculateWithPythonEngineMock,
  summarizePythonError: vi.fn(() => 'python_unknown_error'),
  withPythonFallbackWarning: vi.fn((output) => output),
}))

import { calculateAstroEngine } from '../../services/astro-engine/src/calculate.ts'

describe('astro engine calculate selector', () => {
  const originalImpl = process.env.ASTRO_ENGINE_IMPL

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.ASTRO_ENGINE_IMPL = originalImpl
  })

  it('merges TS derived sections into python mode output', async () => {
    process.env.ASTRO_ENGINE_IMPL = 'python'

    calculateWithPythonEngineMock.mockResolvedValue({
      schema_version: '29.0.0',
      calculation_status: 'calculated',
      planetary_positions: { Sun: { sign: 'Taurus' } },
      panchang: { status: 'not_available', rows: [] },
      daily_transits: { status: 'not_available', rows: [] },
      navamsa_d9: { status: 'not_available', rows: [] },
      vimshottari_dasha: { status: 'not_available', items: [] },
      life_area_signatures: { status: 'not_available', rows: [] },
      warnings: [{ warning_code: 'PY_ONLY' }],
      prediction_ready_context: { source: 'python' },
      core_natal_summary: { source: 'python' },
      confidence: { value: 40, label: 'low', reasons: ['python only'] },
    })

    calculateMasterAstroOutputMock.mockResolvedValue({
      schema_version: '29.0.0',
      calculation_status: 'calculated',
      panchang: { status: 'real', rows: [{ label: 'Tithi', value: 'Pratipad' }] },
      daily_transits: { status: 'real', rows: [{ summary: 'Sun in Aries' }] },
      navamsa_d9: { status: 'real', rows: [{ planet: 'Sun', sign: 'Virgo' }] },
      vimshottari_dasha: { status: 'available', items: [{ mahadasha: 'Jupiter' }] },
      yogas: [{ name: 'Gajakesari' }],
      doshas: [{ name: 'Manglik' }],
      strength_weakness_indicators: { indicators: [{ planet: 'Sun' }] },
      life_area_signatures: { status: 'real', rows: [{ summary: 'self: H1 Aries' }] },
      prediction_ready_context: { source: 'ts' },
      core_natal_summary: { source: 'ts' },
      confidence: { value: 85, label: 'high', reasons: ['ts derived'] },
      warnings: [{ warning_code: 'TS_DERIVED' }],
    })

    const result = await calculateAstroEngine({
      input: {} as never,
      normalized: {} as never,
      settings: {} as never,
      runtime: {} as never,
    })

    expect(calculateWithPythonEngineMock).toHaveBeenCalledTimes(1)
    expect(calculateMasterAstroOutputMock).toHaveBeenCalledTimes(1)
    expect(result.planetary_positions).toEqual({ Sun: { sign: 'Taurus' } })
    expect(result.panchang).toEqual({ status: 'real', rows: [{ label: 'Tithi', value: 'Pratipad' }] })
    expect(result.daily_transits).toEqual({ status: 'real', rows: [{ summary: 'Sun in Aries' }] })
    expect(result.navamsa_d9).toEqual({ status: 'real', rows: [{ planet: 'Sun', sign: 'Virgo' }] })
    expect(result.vimshottari_dasha).toEqual({ status: 'available', items: [{ mahadasha: 'Jupiter' }] })
    expect(result.life_area_signatures).toEqual({ status: 'real', rows: [{ summary: 'self: H1 Aries' }] })
    expect(result.prediction_ready_context).toEqual({ source: 'ts' })
    expect(result.core_natal_summary).toEqual({ source: 'ts' })
    expect(result.confidence).toEqual({ value: 85, label: 'high', reasons: ['ts derived'] })
    expect(result.warnings).toEqual([{ warning_code: 'TS_DERIVED' }])
  })
})
