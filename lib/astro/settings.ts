import type { AstrologySettings } from './types'
import { sha256Canonical } from './hashing'

export function getDefaultAstrologySettings(): AstrologySettings {
  return {
    astrology_system: 'parashari',
    zodiac_type: 'sidereal',
    ayanamsa: 'lahiri',
    house_system: 'whole_sign',
    node_type: 'mean_node',
    dasha_year_basis: 'sidereal_365.25',
  }
}

export function getSettingsHash(settings: AstrologySettings): string {
  return sha256Canonical(settings)
}
