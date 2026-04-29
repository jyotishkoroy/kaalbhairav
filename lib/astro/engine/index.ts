/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { AstrologySettings, AstroWarning, CalculationStatus } from '../types.ts'
import type { NormalizedBirthInput } from '../normalize.ts'
import { getRuntimeEngineVersion, getRuntimeEphemerisVersion } from './version.ts'
import { runEngineReal } from './real.ts'

export type EngineResult = {
  calculation_status: CalculationStatus
  astronomical_data: Record<string, unknown>
  panchang: Record<string, unknown>
  avkahada: Record<string, unknown>
  planets: Record<string, unknown>
  lagna: Record<string, unknown>
  houses: Record<string, unknown>
  d1_chart: Record<string, unknown>
  divisional_charts: Record<string, unknown>
  dashas: Record<string, unknown>
  doshas: Record<string, unknown>
  transits: Record<string, unknown>
  aspects: Record<string, unknown>
  ashtakavarga: Record<string, unknown>
  jaimini: Record<string, unknown>
  life_area_signatures: Record<string, unknown>
  timing_signatures: Record<string, unknown>
  warnings: AstroWarning[]
  audit: { sources: string[]; engine_modules: string[]; notes: string[] }
}

export function runEngine(
  normalized: NormalizedBirthInput,
  settings: AstrologySettings,
): EngineResult {
  const mode = process.env.ASTRO_ENGINE_MODE ?? 'stub'

  if (mode === 'real') {
    return runEngineReal(normalized, settings)
  }

  // ── Stub mode ──────────────────────────────────────────────────────────────
  const engineVersion = getRuntimeEngineVersion()
  const ephemerisVersion = getRuntimeEphemerisVersion()

  const stubWarning: AstroWarning = {
    warning_code: 'ENGINE_STUB_MODE',
    severity: 'high',
    affected_calculations: ['planets', 'lagna', 'houses', 'dashas', 'doshas', 'transits'],
    explanation: 'V1 engine is in stub mode. Real planetary positions are not yet calculated.',
    suggested_action: 'Set ASTRO_ENGINE_MODE=real to activate the ephemeris engine.',
    confidence_impact: -60,
  }
  return {
    calculation_status: 'stub',
    astronomical_data: { engine_version: engineVersion, ephemeris_version: ephemerisVersion },
    panchang: {}, avkahada: {}, planets: {}, lagna: {}, houses: {},
    d1_chart: {}, divisional_charts: {}, dashas: {}, doshas: {},
    transits: {}, aspects: {}, ashtakavarga: {}, jaimini: {},
    life_area_signatures: {
      career: { available: false, reason: 'stub' },
      relationships: { available: false, reason: 'stub' },
      wealth: { available: false, reason: 'stub' },
      health: { available: false, reason: 'stub' },
      spirituality: { available: false, reason: 'stub' },
    },
    timing_signatures: {},
    warnings: [...normalized.warnings, stubWarning],
    audit: {
      sources: ['stub'],
      engine_modules: ['stub'],
      notes: [`V1 engine running in stub mode. Engine version ${engineVersion}.`],
    },
  }
}
