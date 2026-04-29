/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { BOUNDARY_THRESHOLD_DEGREES, NAKSHATRA_SPAN, PADA_SPAN, SIGN_SPAN_DEGREES } from './constants.ts'
import { normalize360 } from './math.ts'

export function nearSignBoundary(sidereal: number): boolean {
  const pos = normalize360(sidereal) % SIGN_SPAN_DEGREES
  return Math.min(pos, SIGN_SPAN_DEGREES - pos) <= BOUNDARY_THRESHOLD_DEGREES
}

export function nearNakshatraBoundary(sidereal: number): boolean {
  const pos = normalize360(sidereal) % NAKSHATRA_SPAN
  return Math.min(pos, NAKSHATRA_SPAN - pos) <= BOUNDARY_THRESHOLD_DEGREES
}

export function nearPadaBoundary(sidereal: number): boolean {
  const nPos = normalize360(sidereal) % NAKSHATRA_SPAN
  const pPos = nPos % PADA_SPAN
  return Math.min(pPos, PADA_SPAN - pPos) <= BOUNDARY_THRESHOLD_DEGREES
}

export function nearTithiBoundary(moonSunAngle: number): boolean {
  const pos = normalize360(moonSunAngle) % 12
  return Math.min(pos, 12 - pos) <= BOUNDARY_THRESHOLD_DEGREES
}

export function nearYogaBoundary(yogaAngle: number): boolean {
  const span = 360 / 27
  const pos = normalize360(yogaAngle) % span
  return Math.min(pos, span - pos) <= BOUNDARY_THRESHOLD_DEGREES
}

export function nearNavamsaBoundary(sidereal: number): boolean {
  const span = 30 / 9
  const pos = normalize360(sidereal) % span
  return Math.min(pos, span - pos) <= BOUNDARY_THRESHOLD_DEGREES
}
