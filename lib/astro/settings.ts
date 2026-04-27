import type { AstrologySettings } from './types.ts'
import { sha256Canonical } from './hashing.ts'

export const DEFAULT_SETTINGS: AstrologySettings = {
  astrology_system: 'parashari',
  zodiac_type: 'sidereal',
  ayanamsa: 'lahiri',
  house_system: 'whole_sign',
  node_type: 'mean_node',
  dasha_year_basis: 'sidereal_365.25',
}

export function hashSettings(settings: AstrologySettings): string {
  return sha256Canonical(settings)
}
