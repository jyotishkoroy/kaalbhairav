/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { NAKSHATRA_MAP, NAKSHATRA_SPAN, PADA_SPAN } from './constants.ts'
import { normalize360 } from './math.ts'
import { nearNakshatraBoundary, nearPadaBoundary } from './boundary.ts'
import {
  NAKSHATRA_NAMES,
  NAKSHATRA_SPAN_DEG,
  PADA_SPAN_DEG,
  VIMSHOTTARI_SEQUENCE,
  type NakshatraName,
  type VimshottariLord,
} from './dasha-constants.ts'
import { normalizeDegrees360 } from './longitude.ts'

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

export type NakshatraPadaResult = {
  index: number
  name: NakshatraName
  pada: 1 | 2 | 3 | 4
  lord: VimshottariLord
  startLongitudeDeg: number
  endLongitudeDeg: number
  offsetWithinNakshatraDeg: number
}

export function calculateNakshatraPada(siderealLongitudeDeg: number): NakshatraPadaResult {
  if (!Number.isFinite(siderealLongitudeDeg)) {
    throw new Error('Sidereal longitude must be a finite number.')
  }

  const longitude = normalizeDegrees360(siderealLongitudeDeg)
  const rawIndex = Math.floor(longitude / NAKSHATRA_SPAN_DEG)
  const index = Math.min(rawIndex, 26)
  const startLongitudeDeg = index * NAKSHATRA_SPAN_DEG
  const offsetWithinNakshatraDeg = longitude - startLongitudeDeg
  const rawPada = Math.floor(offsetWithinNakshatraDeg / PADA_SPAN_DEG) + 1
  const pada = Math.min(rawPada, 4) as 1 | 2 | 3 | 4

  return {
    index,
    name: NAKSHATRA_NAMES[index],
    pada,
    lord: VIMSHOTTARI_SEQUENCE[index % VIMSHOTTARI_SEQUENCE.length],
    startLongitudeDeg,
    endLongitudeDeg: startLongitudeDeg + NAKSHATRA_SPAN_DEG,
    offsetWithinNakshatraDeg,
  }
}
