/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { calculateAllPlanets } from './planets.ts'
import { calculateSign } from './sign.ts'
import { calculateNakshatra } from './nakshatra.ts'
import { calculateTithi } from './tithi.ts'
import { calculateAyanamsa } from './ayanamsa.ts'
import { calculateJulianDay } from './julian-day.ts'
import { sweJulday } from '../engine/swiss.ts'
import type { PlanetPosition } from './planets.ts'
import type { SignPlacement } from './sign.ts'
import type { NakshatraPlacement } from './nakshatra.ts'
import type { TithiResult } from './tithi.ts'
import type { LagnaResult } from './lagna.ts'
import type { DailyTransits } from '../engine/types.ts'

// ─── Master-spec Daily Transit Result ─────────────────────────────────────

export type DailyTransitResult = {
  current_utc: string
  transit_planets: PlanetPosition[]
  current_moon_rashi: SignPlacement
  current_moon_nakshatra: NakshatraPlacement
  current_tithi: TithiResult
  transit_relation_to_natal: Array<{
    planet: string
    transit_sign_index: number
    house_from_natal_moon: number
    house_from_natal_lagna: number | null
    lagna_relation_reliability: 'high' | 'medium' | 'low' | 'not_available'
  }>
  warnings: string[]
}

export function calculateTransits(
  natalMoonSignIndex: number,
  natalLagna: LagnaResult | null,
): DailyTransitResult {
  const current_utc = new Date().toISOString()
  const warnings: string[] = []

  const jdResult = calculateJulianDay(current_utc, sweJulday)
  const ayanamsa = calculateAyanamsa(jdResult.jd_ut)
  const planets = calculateAllPlanets(jdResult.jd_ut, ayanamsa.value_degrees)
  const moonPos = planets['Moon']
  const sunPos = planets['Sun']

  const current_moon_rashi = calculateSign(moonPos.sidereal_longitude)
  const current_moon_nakshatra = calculateNakshatra(moonPos.sidereal_longitude)
  const current_tithi = calculateTithi(moonPos.sidereal_longitude, sunPos.sidereal_longitude)

  const lagnaSignIdx = natalLagna?.sign_index ?? null
  const lagnaReliability = natalLagna?.reliability ?? 'not_available'

  const transit_relation_to_natal = Object.values(planets).map(p => ({
    planet: p.name,
    transit_sign_index: p.sign_index,
    house_from_natal_moon: ((p.sign_index - natalMoonSignIndex + 12) % 12) + 1,
    house_from_natal_lagna: lagnaSignIdx !== null ? ((p.sign_index - lagnaSignIdx + 12) % 12) + 1 : null,
    lagna_relation_reliability: lagnaReliability,
  }))

  if (moonPos.boundary_warnings.length > 0) warnings.push(...moonPos.boundary_warnings)

  return {
    current_utc,
    transit_planets: Object.values(planets),
    current_moon_rashi,
    current_moon_nakshatra,
    current_tithi,
    transit_relation_to_natal,
    warnings,
  }
}

// ─── Legacy adapter ────────────────────────────────────────────────────────

export type TransitInput = {
  natal_house_signs: string[]
  now_utc: string
  ayanamsa: string
  engine_mode: string
}

export async function calculateDailyTransits(input: TransitInput): Promise<DailyTransits> {
  const now = new Date().toISOString()
  if (input.engine_mode !== 'real') {
    return { status: 'stub', calculated_at: now, transits: [], warnings: ['Engine is in stub mode.'] }
  }
  return { status: 'not_available', calculated_at: now, transits: [], warnings: ['Use calculateTransits() for real transit data.'] }
}
