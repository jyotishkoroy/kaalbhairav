import { normalize360 } from './math.ts'
import { TITHI_NAMES, BOUNDARY_THRESHOLD_DEGREES } from './constants.ts'

export type TithiResult = {
  moon_sun_angle: number
  tithi_index: number
  tithi_number: number
  paksha: 'Shukla' | 'Krishna'
  tithi_name: string
  tithi_fraction_elapsed: number
  tithi_fraction_remaining: number
  near_tithi_boundary: boolean
  convention: 'sidereal_lahiri'
}

export function calculateTithi(moonSidereal: number, sunSidereal: number): TithiResult {
  const moon_sun_angle = normalize360(moonSidereal - sunSidereal)
  const tithi_index = Math.floor(moon_sun_angle / 12)
  const tithi_number = Math.min(tithi_index + 1, 30)
  const position_in_tithi = moon_sun_angle % 12
  const tithi_fraction_elapsed = position_in_tithi / 12
  const tithi_fraction_remaining = 1 - tithi_fraction_elapsed
  const paksha: 'Shukla' | 'Krishna' = tithi_number <= 15 ? 'Shukla' : 'Krishna'
  return {
    moon_sun_angle,
    tithi_index,
    tithi_number,
    paksha,
    tithi_name: TITHI_NAMES[tithi_number] ?? 'Unknown',
    tithi_fraction_elapsed,
    tithi_fraction_remaining,
    near_tithi_boundary: Math.min(position_in_tithi, 12 - position_in_tithi) <= BOUNDARY_THRESHOLD_DEGREES,
    convention: 'sidereal_lahiri',
  }
}
