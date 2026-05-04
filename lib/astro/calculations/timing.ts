/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
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
