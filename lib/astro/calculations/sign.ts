/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { RASHI_MAP } from './constants.ts'
import { normalize360 } from './math.ts'
import { nearSignBoundary } from './boundary.ts'
export {
  ZODIAC_SIGN_NAMES,
  longitudeToSignDegree,
  normalizeDegrees360,
  type SignDegree,
  type SignNumber,
} from './longitude.ts'

export type SignPlacement = {
  sign: string
  sign_index: number
  degrees_in_sign: number
  near_sign_boundary: boolean
}

export function calculateSign(sidereal: number): SignPlacement {
  const normalized = normalize360(sidereal)
  let sign_index = Math.floor(normalized / 30)
  if (sign_index >= 12) sign_index = 11 // floating-point safety
  const degrees_in_sign = normalized - sign_index * 30
  const sign = RASHI_MAP[sign_index].english_name
  return {
    sign,
    sign_index,
    degrees_in_sign,
    near_sign_boundary: nearSignBoundary(sidereal),
  }
}
