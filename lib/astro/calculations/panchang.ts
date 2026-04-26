import type { Panchang, Vara } from '../engine/types'

export type PanchangInput = {
  now_utc: string
  observer_timezone: string
  observer_latitude: number
  observer_longitude: number
  ayanamsa: string
  engine_mode: string
}

const VARA_MAP: Record<number, Vara> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
}

export async function calculatePanchang(input: PanchangInput): Promise<Panchang> {
  const now = new Date().toISOString()

  if (input.engine_mode !== 'real') {
    return {
      status: 'stub',
      calculated_at: now,
      date_local: '',
      vara: VARA_MAP[new Date().getDay()] ?? 'Sunday',
      tithi: null,
      nakshatra: null,
      yoga: null,
      karana: null,
      sunrise_utc: null,
      sunset_utc: null,
      warnings: ['Engine is in stub mode. Panchang requires ASTRO_ENGINE_MODE=real.'],
    }
  }

  if (!input.observer_latitude || !input.observer_longitude) {
    return {
      status: 'not_available',
      calculated_at: now,
      date_local: '',
      vara: VARA_MAP[new Date().getDay()] ?? 'Sunday',
      tithi: null,
      nakshatra: null,
      yoga: null,
      karana: null,
      sunrise_utc: null,
      sunset_utc: null,
      warnings: ['Observer location required for panchang calculation is missing.'],
    }
  }

  // TODO (Phase 5): implement real panchang calculation.
  return {
    status: 'not_available',
    calculated_at: now,
    date_local: new Date().toISOString().split('T')[0],
    vara: VARA_MAP[new Date().getDay()] ?? 'Sunday',
    tithi: null,
    nakshatra: null,
    yoga: null,
    karana: null,
    sunrise_utc: null,
    sunset_utc: null,
    warnings: ['Panchang calculation module not yet implemented for real engine.'],
  }
}
