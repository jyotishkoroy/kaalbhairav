/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { DateTime } from 'luxon'
import { getSunriseOrSet, SE_CALC_RISE, SE_CALC_SET } from '../engine/swiss.ts'
import { calculateJulianDay } from './julian-day.ts'
import { sweJulday } from '../engine/swiss.ts'
import { calculateSign } from './sign.ts'
import { calculateNakshatra } from './nakshatra.ts'
import { normalize360 } from './math.ts'
import { nearYogaBoundary } from './boundary.ts'
import { YOGA_NAMES, VARA_NAMES, karanaNameByHalfTithiIndex, BOUNDARY_THRESHOLD_DEGREES } from './constants.ts'
import { calculateTithi, type TithiResult } from './tithi.ts'
import { calculateAyanamsa } from './ayanamsa.ts'
import { calculateAllPlanets } from './planets.ts'
import { assertEphemerisRange } from '../engine/diagnostics.ts'
import type { NakshatraPlacement } from './nakshatra.ts'
import type { SignPlacement } from './sign.ts'

export type PanchangResult = {
  panchang_local_date: string
  calculation_instant_utc: string
  sunrise_convention: {
    convention: 'local_sunrise_to_local_sunrise'
    sunrise_basis: 'local_civil_date'
    evaluated_at_sunrise: boolean
  }
  sunrise_utc: string | null
  sunset_utc: string | null
  sunrise_local: string | null
  sunset_local: string | null
  tithi: TithiResult | null
  nakshatra: NakshatraPlacement | null
  yoga: {
    yoga_index: number
    yoga_name: string
    yoga_fraction_elapsed: number
    near_yoga_boundary: boolean
  } | null
  karana: {
    karana_half_tithi_index: number
    karana_name: string
    karana_fraction_elapsed: number
    near_karana_boundary: boolean
  } | null
  vara: string | null
  moon_rashi: SignPlacement | null
  sunrise_moon_rashi: SignPlacement | null
  sunrise_sun_position: { sidereal_longitude: number } | null
  sunrise_moon_position: { sidereal_longitude: number } | null
  sunrise_tithi: TithiResult | null
  sunrise_nakshatra: NakshatraPlacement | null
  sunrise_yoga: {
    yoga_index: number
    yoga_name: string
    yoga_fraction_elapsed: number
    near_yoga_boundary: boolean
  } | null
  sunrise_karana: {
    karana_half_tithi_index: number
    karana_name: string
    karana_fraction_elapsed: number
    near_karana_boundary: boolean
  } | null
  status: 'calculated' | 'partial' | 'unavailable'
  warnings: string[]
}

function jdToISO(jd: number): string {
  const unixMs = (jd - 2440587.5) * 86400000
  return new Date(unixMs).toISOString()
}

export function calculatePanchangResult(params: {
  calculationInstantUtc: string
  localDate: string
  timezone: string
  latitude: number
  longitude: number
  altitude?: number
}): PanchangResult {
  const { calculationInstantUtc, localDate, timezone, latitude, longitude, altitude = 0 } = params
  const warnings: string[] = []
  const jdStart = calculateJulianDay(calculationInstantUtc, sweJulday).jd_ut
  assertEphemerisRange(jdStart)

  // Sunrise / sunset via Swiss Ephemeris
  let sunrise_utc: string | null = null
  let sunset_utc: string | null = null

  try {
    const sunriseResult = getSunriseOrSet(jdStart, latitude, longitude, altitude, SE_CALC_RISE)
    if (!sunriseResult.error || sunriseResult.error.length === 0) {
      sunrise_utc = jdToISO(sunriseResult.data[0])
    } else {
      warnings.push(`Sunrise calculation warning: ${sunriseResult.error}`)
    }
  } catch (e) {
    warnings.push(`Sunrise unavailable: ${String(e)}`)
  }

  try {
    const sunsetResult = getSunriseOrSet(jdStart, latitude, longitude, altitude, SE_CALC_SET)
    if (!sunsetResult.error || sunsetResult.error.length === 0) {
      sunset_utc = jdToISO(sunsetResult.data[0])
    } else {
      warnings.push(`Sunset calculation warning: ${sunsetResult.error}`)
    }
  } catch (e) {
    warnings.push(`Sunset unavailable: ${String(e)}`)
  }

  const currentAyanamsa = calculateAyanamsa(jdStart).value_degrees
  const currentPlanets = calculateAllPlanets(jdStart, currentAyanamsa, 'mean_node')
  const moonSidereal = currentPlanets.Moon?.sidereal_longitude ?? 0
  const sunSidereal = currentPlanets.Sun?.sidereal_longitude ?? 0

  let sunriseMoonSidereal = moonSidereal
  let sunriseSunSidereal = sunSidereal
  let sunriseMoonPosition: { sidereal_longitude: number } | null = null
  let sunriseSunPosition: { sidereal_longitude: number } | null = null
  if (sunrise_utc) {
    try {
      const sunriseJd = calculateJulianDay(sunrise_utc, sweJulday).jd_ut
      assertEphemerisRange(sunriseJd)
      const sunriseAyanamsa = calculateAyanamsa(sunriseJd).value_degrees
      const sunrisePlanets = calculateAllPlanets(sunriseJd, sunriseAyanamsa, 'mean_node')
      sunriseMoonSidereal = sunrisePlanets.Moon?.sidereal_longitude ?? sunriseMoonSidereal
      sunriseSunSidereal = sunrisePlanets.Sun?.sidereal_longitude ?? sunriseSunSidereal
      sunriseMoonPosition = sunrisePlanets.Moon ? { sidereal_longitude: sunrisePlanets.Moon.sidereal_longitude } : null
      sunriseSunPosition = sunrisePlanets.Sun ? { sidereal_longitude: sunrisePlanets.Sun.sidereal_longitude } : null
    } catch (e) {
      warnings.push(`Sunrise planetary positions unavailable: ${String(e)}`)
    }
  }

  const sunrise_tithi = calculateTithi(sunriseMoonSidereal, sunriseSunSidereal)
  const nakshatra = calculateNakshatra(sunriseMoonSidereal)

  const yoga_angle = normalize360(sunriseSunSidereal + sunriseMoonSidereal)
  const yoga_span = 360 / 27
  const yoga_index = Math.floor(yoga_angle / yoga_span)
  const yoga_fraction_elapsed = (yoga_angle % yoga_span) / yoga_span
  const near_yoga_boundary = nearYogaBoundary(yoga_angle)
  const yoga = {
    yoga_index,
    yoga_name: YOGA_NAMES[yoga_index] ?? 'Unknown',
    yoga_fraction_elapsed,
    near_yoga_boundary,
  }

  const moon_sun_angle = normalize360(sunriseMoonSidereal - sunriseSunSidereal)
  const karana_half_tithi_index = Math.floor(moon_sun_angle / 6)
  const karana_fraction_elapsed = (moon_sun_angle % 6) / 6
  const near_karana_boundary = Math.min(moon_sun_angle % 6, 6 - (moon_sun_angle % 6)) <= BOUNDARY_THRESHOLD_DEGREES
  let karana_name = 'Unknown'
  try { karana_name = karanaNameByHalfTithiIndex(karana_half_tithi_index) } catch { /* */ }
  const karana = { karana_half_tithi_index, karana_name, karana_fraction_elapsed, near_karana_boundary }

  const moon_rashi = calculateSign(sunriseMoonSidereal)

  const sunrise_nakshatra = calculateNakshatra(sunriseMoonSidereal)
  const sunrise_yoga = yoga
  const sunrise_karana = karana
  let vara: string | null = null
  if (sunrise_utc) {
    const sunriseDate = new Date(sunrise_utc)
    vara = VARA_NAMES[sunriseDate.getUTCDay()] ?? null
  }

  let sunrise_local: string | null = null
  let sunset_local: string | null = null
  try {
    if (sunrise_utc) {
      sunrise_local = DateTime.fromISO(sunrise_utc, { zone: 'UTC' }).setZone(timezone).toISO()
    }
    if (sunset_utc) {
      sunset_local = DateTime.fromISO(sunset_utc, { zone: 'UTC' }).setZone(timezone).toISO()
    }
  } catch {
    warnings.push('Local time conversion for sunrise/sunset unavailable')
  }

  return {
    panchang_local_date: localDate,
    calculation_instant_utc: calculationInstantUtc,
    sunrise_convention: {
      convention: 'local_sunrise_to_local_sunrise',
      sunrise_basis: 'local_civil_date',
      evaluated_at_sunrise: true,
    },
    sunrise_utc,
    sunset_utc,
    sunrise_local,
    sunset_local,
    tithi: sunrise_tithi,
    nakshatra,
    yoga,
    karana,
    vara,
    moon_rashi,
    sunrise_moon_rashi: calculateSign(sunriseMoonSidereal),
    sunrise_sun_position: sunriseSunPosition,
    sunrise_moon_position: sunriseMoonPosition,
    sunrise_tithi,
    sunrise_nakshatra,
    sunrise_yoga,
    sunrise_karana,
    status: sunrise_utc && sunrise_local && sunriseSunPosition && sunriseMoonPosition ? 'calculated' : sunrise_utc || sunset_utc ? 'partial' : 'unavailable',
    warnings,
  }
}

// Legacy adapter
export type PanchangInput = {
  now_utc: string
  observer_timezone: string
  observer_latitude: number
  observer_longitude: number
  ayanamsa: string
  engine_mode: string
}

export type PanchangInputLegacy = PanchangInput

import type { Panchang, Vara as VaraType } from '../engine/types.ts'

const VARA_MAP_LEGACY: Record<number, VaraType> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
}

export async function calculatePanchang(input: PanchangInput): Promise<Panchang> {
  const now = new Date().toISOString()
  if (input.engine_mode !== 'real') {
    return {
      status: 'stub', calculated_at: now, date_local: '',
      vara: VARA_MAP_LEGACY[new Date().getDay()] ?? 'Sunday',
      tithi: null, nakshatra: null, yoga: null, karana: null,
      sunrise_utc: null, sunset_utc: null,
      warnings: ['Engine is in stub mode. Panchang requires ASTRO_ENGINE_MODE=real.'],
    }
  }
  return {
    status: 'not_available', calculated_at: now, date_local: now.split('T')[0],
    vara: VARA_MAP_LEGACY[new Date().getDay()] ?? 'Sunday',
    tithi: null, nakshatra: null, yoga: null, karana: null,
    sunrise_utc: null, sunset_utc: null,
    warnings: ['Use calculatePanchangResult() for real panchang data.'],
  }
}
