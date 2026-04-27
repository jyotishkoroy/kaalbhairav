import { NAKSHATRA_MAP, NAKSHATRA_SPAN, PADA_SPAN } from './constants.ts'
import { normalize360 } from './math.ts'
import { nearNakshatraBoundary, nearPadaBoundary } from './boundary.ts'

export type NakshatraPlacement = {
  nakshatra: string
  nakshatra_index: number
  nakshatra_lord: string
  degrees_inside_nakshatra: number
  pada: number
  near_nakshatra_boundary: boolean
  near_pada_boundary: boolean
}

export function calculateNakshatra(sidereal: number): NakshatraPlacement {
  const normalized = normalize360(sidereal)
  let nakshatra_index = Math.floor(normalized / NAKSHATRA_SPAN)
  if (nakshatra_index >= 27) nakshatra_index = 26 // floating-point safety
  const degrees_inside_nakshatra = normalized - nakshatra_index * NAKSHATRA_SPAN
  let pada = Math.floor(degrees_inside_nakshatra / PADA_SPAN) + 1
  if (pada > 4) pada = 4 // floating-point safety
  const nak = NAKSHATRA_MAP[nakshatra_index]
  return {
    nakshatra: nak.name,
    nakshatra_index,
    nakshatra_lord: nak.lord,
    degrees_inside_nakshatra,
    pada,
    near_nakshatra_boundary: nearNakshatraBoundary(sidereal),
    near_pada_boundary: nearPadaBoundary(sidereal),
  }
}
