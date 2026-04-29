/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { getAscendant } from '../engine/swiss.ts'
import { normalize360 } from './math.ts'
import { calculateSign } from './sign.ts'
import { calculateNakshatra } from './nakshatra.ts'
import { nearSignBoundary } from './boundary.ts'

export type LagnaReliability = 'high' | 'medium' | 'low' | 'not_available'

export type LagnaResult = {
  sidereal_longitude: number
  tropical_longitude: number
  sign: string
  sign_index: number
  degrees_in_sign: number
  nakshatra: string
  nakshatra_index: number
  pada: number
  uncertainty_flag: boolean
  reliability: LagnaReliability
  near_sign_boundary: boolean
  high_latitude_flag: boolean
}

export function calculateLagna(
  jd_ut: number,
  latitude: number,
  longitude: number,
  ayanamsa: number,
  birth_time_known: boolean,
  birth_time_precision: string,
): LagnaResult | null {
  if (!birth_time_known || birth_time_precision === 'unknown') return null

  const reliability: LagnaReliability =
    birth_time_precision === 'exact' || birth_time_precision === 'minute' ? 'high'
    : birth_time_precision === 'hour' ? 'medium'
    : 'low'

  const high_latitude_flag = Math.abs(latitude) >= 66.0

  try {
    const housesResult = getAscendant(jd_ut, latitude, longitude)
    if (housesResult.error && housesResult.error.length > 0) {
      return null
    }
    // ascendant is data.points[0] (verified against sweph@2.10.3-5 runtime API)
    const tropicalLong = normalize360(housesResult.data.points[0])
    const siderealLong = normalize360(tropicalLong - ayanamsa)
    const sign = calculateSign(siderealLong)
    const nak = calculateNakshatra(siderealLong)
    const uncertainty_flag = reliability !== 'high' || sign.near_sign_boundary || high_latitude_flag

    return {
      sidereal_longitude: siderealLong,
      tropical_longitude: tropicalLong,
      sign: sign.sign,
      sign_index: sign.sign_index,
      degrees_in_sign: sign.degrees_in_sign,
      nakshatra: nak.nakshatra,
      nakshatra_index: nak.nakshatra_index,
      pada: nak.pada,
      uncertainty_flag,
      reliability,
      near_sign_boundary: nearSignBoundary(siderealLong),
      high_latitude_flag,
    }
  } catch {
    return null
  }
}
