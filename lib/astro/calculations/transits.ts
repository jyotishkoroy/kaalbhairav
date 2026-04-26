import type { DailyTransits } from '../engine/types'

export type TransitInput = {
  natal_house_signs: string[]
  now_utc: string
  ayanamsa: string
  engine_mode: string
}

export async function calculateDailyTransits(input: TransitInput): Promise<DailyTransits> {
  const now = new Date().toISOString()

  if (input.engine_mode !== 'real') {
    return {
      status: 'stub',
      calculated_at: now,
      transits: [],
      warnings: ['Engine is in stub mode. Daily transits require ASTRO_ENGINE_MODE=real.'],
    }
  }

  if (!input.natal_house_signs || input.natal_house_signs.length !== 12) {
    return {
      status: 'not_available',
      calculated_at: now,
      transits: [],
      warnings: ['Natal house data required for transit calculation is missing.'],
    }
  }

  // TODO (Phase 5): implement real transit calculation using the chosen ephemeris package.
  return {
    status: 'not_available',
    calculated_at: now,
    transits: [],
    warnings: ['Transit calculation module not yet implemented for real engine.'],
  }
}
