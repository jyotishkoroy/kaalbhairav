/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { CurrentTimingContext } from '../engine/types.ts'
import { normalizeRuntimeClock, type AstroRuntimeClock } from './runtime-clock.ts'

export type TimingInput = {
  dasha_sequence: Array<{ lord: string; start_date: string; end_date: string }> | null
  now_utc: string
  observer_latitude: number
  observer_longitude: number
  ayanamsa: string
  engine_mode: string
  runtime_clock?: Partial<AstroRuntimeClock>
}

export type SadeSatiPhaseV2 =
  | 'not_active'
  | 'first_phase'
  | 'second_phase'
  | 'third_phase'
  | 'unavailable'

export type BasicSadeSatiPhaseArgs = {
  natalMoonSignNumber: number | null
  transitSaturnSignNumber: number | null
}

function assertSignNumberOrNull(value: number | null, label: string): number | null {
  if (value === null) {
    return null
  }

  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new Error(`${label} must be an integer sign number from 1 to 12.`)
  }

  return value
}

function relativeSignDistance(fromSign: number, toSign: number): number {
  return (((toSign - fromSign) % 12) + 12) % 12
}

export function calculateBasicSadeSatiPhaseV2(
  args: BasicSadeSatiPhaseArgs,
): {
  status: 'computed' | 'unavailable';
  phase: SadeSatiPhaseV2;
  source: 'deterministic_calculation' | 'none';
  warnings: string[];
} {
  const moon = assertSignNumberOrNull(args.natalMoonSignNumber, 'natalMoonSignNumber')
  const saturn = assertSignNumberOrNull(args.transitSaturnSignNumber, 'transitSaturnSignNumber')

  if (moon === null || saturn === null) {
    return {
      status: 'unavailable',
      phase: 'unavailable',
      source: 'none',
      warnings: ['Basic Sade Sati phase requires deterministic natal Moon sign and transit Saturn sign.'],
    }
  }

  const previousMoonSign = ((moon + 10) % 12) + 1
  const nextMoonSign = (moon % 12) + 1
  const distance = relativeSignDistance(moon, saturn)

  if (saturn === previousMoonSign || distance === 11) {
    return {
      status: 'computed',
      phase: 'first_phase',
      source: 'deterministic_calculation',
      warnings: ['Detailed Sade Sati start/end dates remain unavailable without deterministic ingress fixtures.'],
    }
  }

  if (saturn === moon || distance === 0) {
    return {
      status: 'computed',
      phase: 'second_phase',
      source: 'deterministic_calculation',
      warnings: ['Detailed Sade Sati start/end dates remain unavailable without deterministic ingress fixtures.'],
    }
  }

  if (saturn === nextMoonSign || distance === 1) {
    return {
      status: 'computed',
      phase: 'third_phase',
      source: 'deterministic_calculation',
      warnings: ['Detailed Sade Sati start/end dates remain unavailable without deterministic ingress fixtures.'],
    }
  }

  return {
    status: 'computed',
    phase: 'not_active',
    source: 'deterministic_calculation',
    warnings: ['Detailed Sade Sati date tables are unavailable without deterministic ingress fixtures.'],
  }
}

export async function calculateCurrentTiming(input: TimingInput): Promise<CurrentTimingContext> {
  const runtimeClock = normalizeRuntimeClock(input.runtime_clock ?? { currentUtc: input.now_utc })
  const now = runtimeClock.currentUtc

  if (input.engine_mode !== 'real') {
    return {
      status: 'stub',
      calculated_at: now,
      current_mahadasha: null,
      current_antardasha: null,
      current_pratyantardasha: null,
      transiting_lagna_sign: null,
      elapsed_dasha_percent: null,
      warnings: ['Engine is in stub mode. Current timing requires ASTRO_ENGINE_MODE=real.'],
    }
  }

  if (!input.dasha_sequence || input.dasha_sequence.length === 0) {
    return {
      status: 'not_available',
      calculated_at: now,
      current_mahadasha: null,
      current_antardasha: null,
      current_pratyantardasha: null,
      transiting_lagna_sign: null,
      elapsed_dasha_percent: null,
      warnings: ['Dasha sequence not available from chart calculation.'],
    }
  }

  // TODO (Phase 5): find current mahadasha/antardasha from dasha_sequence and now_utc.
  return {
    status: 'not_available',
    calculated_at: now,
    current_mahadasha: null,
    current_antardasha: null,
    current_pratyantardasha: null,
    transiting_lagna_sign: null,
    elapsed_dasha_percent: null,
    warnings: ['Timing context calculation module not yet implemented for real engine.'],
  }
}
