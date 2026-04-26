import { DateTime } from 'luxon'
import { getSunriseOrSet, SE_CALC_RISE, SE_CALC_SET } from '../engine/swiss'
import { calculateJulianDay } from './julian-day'
import { sweJulday } from '../engine/swiss'
import { calculateSign } from './sign'
import { calculateNakshatra } from './nakshatra'
import { normalize360 } from './math'
import { nearTithiBoundary, nearYogaBoundary } from './boundary'
import { YOGA_NAMES, TITHI_NAMES, VARA_NAMES, karanaNameByHalfTithiIndex, BOUNDARY_THRESHOLD_DEGREES } from './constants'
import type { NakshatraPlacement } from './nakshatra'
import type { SignPlacement } from './sign'

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

export type PanchangResult = {
  panchang_local_date: string
  calculation_instant_utc: string
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
  warnings: string[]
}

export function calculateTithi(moonSidereal: number, sunSidereal: number): TithiResult {
  const moon_sun_angle = normalize360(moonSidereal - sunSidereal)
  const tithi_index = Math.floor(moon_sun_angle / 12)
  const tithi_number = tithi_index + 1
  const position_in_tithi = moon_sun_angle % 12
  const tithi_fraction_elapsed = position_in_tithi / 12
  const tithi_fraction_remaining = 1 - tithi_fraction_elapsed
  const paksha: 'Shukla' | 'Krishna' = tithi_number <= 15 ? 'Shukla' : 'Krishna'
  return {
    moon_sun_angle,
    tithi_index,
    tithi_number: Math.min(tithi_number, 30),
    paksha,
    tithi_name: TITHI_NAMES[tithi_number] ?? 'Unknown',
    tithi_fraction_elapsed,
    tithi_fraction_remaining,
    near_tithi_boundary: nearTithiBoundary(moon_sun_angle),
    convention: 'sidereal_lahiri',
  }
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
  moonSidereal: number
  sunSidereal: number
  altitude?: number
}): PanchangResult {
  const { calculationInstantUtc, localDate, timezone, latitude, longitude, moonSidereal, sunSidereal, altitude = 0 } = params
  const warnings: string[] = []

  // Tithi
  const tithi = calculateTithi(moonSidereal, sunSidereal)

  // Nakshatra (Moon)
  const nakshatra = calculateNakshatra(moonSidereal)

  // Yoga = (sun + moon) / (360/27)
  const yoga_angle = normalize360(sunSidereal + moonSidereal)
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

  // Karana
  const moon_sun_angle = normalize360(moonSidereal - sunSidereal)
  const karana_half_tithi_index = Math.floor(moon_sun_angle / 6)
  const karana_fraction_elapsed = (moon_sun_angle % 6) / 6
  const near_karana_boundary = Math.min(moon_sun_angle % 6, 6 - (moon_sun_angle % 6)) <= BOUNDARY_THRESHOLD_DEGREES
  let karana_name = 'Unknown'
  try { karana_name = karanaNameByHalfTithiIndex(karana_half_tithi_index) } catch { /* */ }
  const karana = { karana_half_tithi_index, karana_name, karana_fraction_elapsed, near_karana_boundary }

  // Vara (weekday at local sunrise)
  const localDate_ = new Date(calculationInstantUtc)
  const vara = VARA_NAMES[localDate_.getUTCDay()] ?? null

  // Moon rashi
  const moon_rashi = calculateSign(moonSidereal)

  // Sunrise / sunset via Swiss Ephemeris
  const jdStart = calculateJulianDay(calculationInstantUtc, sweJulday).jd_ut
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
    sunrise_utc,
    sunset_utc,
    sunrise_local,
    sunset_local,
    tithi,
    nakshatra,
    yoga,
    karana,
    vara,
    moon_rashi,
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

import type { Panchang, Vara as VaraType } from '../engine/types'

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
