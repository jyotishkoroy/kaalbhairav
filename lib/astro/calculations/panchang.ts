/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { DateTime } from 'luxon'
import type { AstroSectionContract, AstroUnavailableValue, NormalizedBirthInputV2 } from './contracts.ts'
import type { EphemerisProvider } from './ephemeris-provider.ts'
import { normalizeDegrees360 } from './longitude.ts'
import { makeUnavailableValue } from './unavailable.ts'
import { getSunriseOrSet, SE_CALC_RISE, SE_CALC_SET } from '../engine/swiss.ts'
import { calculateJulianDay } from './julian-day.ts'
import { sweJulday } from '../engine/swiss.ts'
import { calculateSign } from './sign.ts'
import { calculateNakshatra } from './nakshatra.ts'
import { normalize360 } from './math.ts'
import { nearYogaBoundary } from './boundary.ts'
import { YOGA_NAMES as LEGACY_YOGA_NAMES, karanaNameByHalfTithiIndex, BOUNDARY_THRESHOLD_DEGREES } from './constants.ts'
import { calculateTithi, type TithiResult } from './tithi.ts'
import { calculateAyanamsa } from './ayanamsa.ts'
import { calculateAllPlanets } from './planets.ts'
import { assertEphemerisRange } from '../engine/diagnostics.ts'
import type { NakshatraPlacement } from './nakshatra.ts'
import type { SignPlacement } from './sign.ts'
import { normalizeRuntimeClock, type AstroRuntimeClock } from './runtime-clock.ts'

export const TITHI_NAMES = [
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
  'Purnima',
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
  'Amavasya',
] as const

export const YOGA_NAMES = [
  'Vishkambha',
  'Priti',
  'Ayushman',
  'Saubhagya',
  'Shobhana',
  'Atiganda',
  'Sukarma',
  'Dhriti',
  'Shoola',
  'Ganda',
  'Vriddhi',
  'Dhruva',
  'Vyaghata',
  'Harshana',
  'Vajra',
  'Siddhi',
  'Vyatipata',
  'Variyana',
  'Parigha',
  'Shiva',
  'Siddha',
  'Sadhya',
  'Shubha',
  'Shukla',
  'Brahma',
  'Indra',
  'Vaidhriti',
] as const

export const MOVABLE_KARANA_NAMES = [
  'Bava',
  'Balava',
  'Kaulava',
  'Taitila',
  'Gara',
  'Vanija',
  'Vishti',
] as const

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export type PanchangaV2Args = {
  sunLongitudeDeg: number
  moonLongitudeDeg: number
  normalizedTime: NormalizedBirthInputV2
  sunriseSunsetProvider?: EphemerisProvider
}

export type PanchangaV2Fields = {
  tithi: {
    number: number
    name: string
    paksha: 'Shukla' | 'Krishna'
    elongationDeg: number
  }
  yoga: {
    number: number
    name: string
    sumLongitudeDeg: number
  }
  karana: {
    number: number
    name: string
    halfTithiIndex: number
  }
  civilWeekday: string
  hinduWeekday: string | AstroUnavailableValue
  sunrise?: {
    status: 'computed'
    sunriseLocalIso: string
    sunsetLocalIso: string
  } | AstroUnavailableValue
}

function assertFiniteLongitude(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`)
  }
  return normalizeDegrees360(value)
}

export function calculateTithiNumber(moonLongitudeDeg: number, sunLongitudeDeg: number): number {
  const delta = normalizeDegrees360(
    assertFiniteLongitude(moonLongitudeDeg, 'Moon longitude') -
      assertFiniteLongitude(sunLongitudeDeg, 'Sun longitude'),
  )
  return Math.floor(delta / 12) + 1
}

export function calculatePaksha(tithiNumber: number): 'Shukla' | 'Krishna' {
  if (!Number.isInteger(tithiNumber) || tithiNumber < 1 || tithiNumber > 30) {
    throw new Error('Tithi number must be an integer from 1 to 30.')
  }

  return tithiNumber <= 15 ? 'Shukla' : 'Krishna'
}

export function calculateYogaNumber(sunLongitudeDeg: number, moonLongitudeDeg: number): number {
  const sum = normalizeDegrees360(
    assertFiniteLongitude(sunLongitudeDeg, 'Sun longitude') +
      assertFiniteLongitude(moonLongitudeDeg, 'Moon longitude'),
  )
  const yogaSpanDeg = 13 + 20 / 60
  return Math.floor(sum / yogaSpanDeg) + 1
}

export function calculateKaranaNumber(moonLongitudeDeg: number, sunLongitudeDeg: number): number {
  const delta = normalizeDegrees360(
    assertFiniteLongitude(moonLongitudeDeg, 'Moon longitude') -
      assertFiniteLongitude(sunLongitudeDeg, 'Sun longitude'),
  )
  return Math.floor(delta / 6) + 1
}

export function getKaranaName(halfTithiIndex: number): string {
  if (!Number.isInteger(halfTithiIndex) || halfTithiIndex < 1 || halfTithiIndex > 60) {
    throw new Error('Karana half-tithi index must be an integer from 1 to 60.')
  }

  if (halfTithiIndex === 1) {
    return 'Kimstughna'
  }

  if (halfTithiIndex >= 2 && halfTithiIndex <= 57) {
    return MOVABLE_KARANA_NAMES[(halfTithiIndex - 2) % MOVABLE_KARANA_NAMES.length]
  }

  if (halfTithiIndex === 58) {
    return 'Shakuni'
  }

  if (halfTithiIndex === 59) {
    return 'Chatushpada'
  }

  return 'Naga'
}

export function getCivilWeekday(dateLocal: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateLocal)
  if (!match) {
    throw new Error('dateLocal must be in YYYY-MM-DD format.')
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('dateLocal must be a valid Gregorian date.')
  }

  return WEEKDAY_NAMES[date.getUTCDay()]
}

function getPreviousCivilWeekday(dateLocal: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateLocal)
  if (!match) {
    throw new Error('dateLocal must be in YYYY-MM-DD format.')
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() - 1)

  return WEEKDAY_NAMES[date.getUTCDay()]
}

function localTimeIsBefore(localTimeIso: string | null, sunriseLocalIso: string): boolean {
  if (!localTimeIso) {
    return false
  }

  const timeMatch = /T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(localTimeIso)
  const sunriseMatch = /T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(sunriseLocalIso)

  if (!timeMatch || !sunriseMatch) {
    return false
  }

  const toSeconds = (match: RegExpExecArray) =>
    Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0)

  return toSeconds(timeMatch) < toSeconds(sunriseMatch)
}

export async function calculatePanchangaV2(
  args: PanchangaV2Args,
): Promise<AstroSectionContract> {
  try {
    const sunLongitudeDeg = assertFiniteLongitude(args.sunLongitudeDeg, 'Sun longitude')
    const moonLongitudeDeg = assertFiniteLongitude(args.moonLongitudeDeg, 'Moon longitude')

    const elongationDeg = normalizeDegrees360(moonLongitudeDeg - sunLongitudeDeg)
    const tithiNumber = Math.floor(elongationDeg / 12) + 1
    const paksha = calculatePaksha(tithiNumber)

    const sumLongitudeDeg = normalizeDegrees360(sunLongitudeDeg + moonLongitudeDeg)
    const yogaSpanDeg = 13 + 20 / 60
    const yogaNumber = Math.floor(sumLongitudeDeg / yogaSpanDeg) + 1

    const karanaNumber = Math.floor(elongationDeg / 6) + 1
    const civilWeekday = getCivilWeekday(args.normalizedTime.dateLocal)

    let sunrise:
      | { status: 'computed'; sunriseLocalIso: string; sunsetLocalIso: string }
      | AstroUnavailableValue = makeUnavailableValue({
        requiredModule: 'sunrise_sunset',
        fieldKey: 'panchang.sunrise',
        reason: 'module_not_implemented',
      })

    let hinduWeekday: string | AstroUnavailableValue = makeUnavailableValue({
      requiredModule: 'sunrise_sunset',
      fieldKey: 'panchang.hinduWeekday',
      reason: 'module_not_implemented',
    })

    if (
      args.sunriseSunsetProvider?.calculateSunriseSunset &&
      args.normalizedTime.latitudeDeg !== null &&
      args.normalizedTime.longitudeDeg !== null &&
      args.normalizedTime.timezoneHours !== null
    ) {
      try {
        const computed = await args.sunriseSunsetProvider.calculateSunriseSunset({
          dateLocal: args.normalizedTime.dateLocal,
          latitudeDeg: args.normalizedTime.latitudeDeg,
          longitudeDeg: args.normalizedTime.longitudeDeg,
          timezoneHours: args.normalizedTime.timezoneHours,
        })

        sunrise = {
          status: 'computed',
          sunriseLocalIso: computed.sunriseLocalIso,
          sunsetLocalIso: computed.sunsetLocalIso,
        }

        hinduWeekday = localTimeIsBefore(
          args.normalizedTime.localDateTimeIso,
          computed.sunriseLocalIso,
        )
          ? getPreviousCivilWeekday(args.normalizedTime.dateLocal)
          : civilWeekday
      } catch {
        sunrise = makeUnavailableValue({
          requiredModule: 'sunrise_sunset',
          fieldKey: 'panchang.sunrise',
          reason: 'ephemeris_unavailable',
        })
        hinduWeekday = makeUnavailableValue({
          requiredModule: 'sunrise_sunset',
          fieldKey: 'panchang.hinduWeekday',
          reason: 'ephemeris_unavailable',
        })
      }
    }

    return {
      status: 'computed',
      source: 'deterministic_calculation',
      fields: {
        tithi: {
          number: tithiNumber,
          name: TITHI_NAMES[tithiNumber - 1],
          paksha,
          elongationDeg,
        },
        yoga: {
          number: yogaNumber,
          name: YOGA_NAMES[yogaNumber - 1],
          sumLongitudeDeg,
        },
        karana: {
          number: karanaNumber,
          name: getKaranaName(karanaNumber),
          halfTithiIndex: karanaNumber,
        },
        civilWeekday,
        hinduWeekday,
        sunrise,
      } satisfies PanchangaV2Fields,
    }
  } catch (error) {
    return {
      status: 'error',
      source: 'none',
      reason: error instanceof Error ? error.message : 'Panchanga calculation failed.',
      fields: {},
    }
  }
}

export type PanchangConvention = 'at_birth_time' | 'at_local_sunrise'

export type PanchangUnavailableValue = {
  status: 'unavailable'
  reason: 'module_not_implemented' | 'missing_golden_fixture' | 'unsupported_convention' | 'insufficient_input'
  message: string
}

export const DEFAULT_PANCHANG_CONVENTION: PanchangConvention = 'at_birth_time'

export function normalizePanchangConvention(input?: string | null): PanchangConvention {
  return input === 'at_local_sunrise' ? 'at_local_sunrise' : 'at_birth_time'
}

export function weekdayFromLocalDate(localDate: string, timezone: string): string {
  const dt = DateTime.fromISO(localDate, { zone: timezone })
  return dt.isValid ? dt.toFormat('cccc') : 'unavailable'
}

export type PanchangResult = {
  panchang_local_date: string
  calculation_instant_utc: string
  status: 'computed' | 'unavailable'
  convention: PanchangConvention
  source: 'sun_moon_sidereal_longitude' | 'not_implemented'
  local_date: string
  timezone: string
  fields: {
    tithi: TithiResult | null
    paksha: string | null
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
    weekday: string | null
  }
  as_of_date?: string
  sunrise_convention: {
    convention: 'local_sunrise_to_local_sunrise'
    sunrise_basis: 'local_civil_date'
    evaluated_at_sunrise: boolean
  }
  sunrise?: PanchangUnavailableValue
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
  weekday?: string | null
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
  convention?: PanchangConvention
  runtimeClockInput?: Partial<AstroRuntimeClock>
}): PanchangResult {
  const { calculationInstantUtc, localDate, timezone, latitude, longitude, altitude = 0 } = params
  const convention = normalizePanchangConvention(params.convention)
  const runtimeClock = normalizeRuntimeClock(params.runtimeClockInput)
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
    yoga_name: LEGACY_YOGA_NAMES[yoga_index] ?? 'Unknown',
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

  const weekday = weekdayFromLocalDate(localDate, timezone)
  const sunriseUnavailable: PanchangUnavailableValue | undefined = convention === 'at_local_sunrise'
    ? {
        status: 'unavailable',
        reason: 'module_not_implemented',
        message: 'Sunrise-convention panchang is not implemented in this module.',
      }
    : undefined

  return {
    panchang_local_date: localDate,
    calculation_instant_utc: calculationInstantUtc,
    status: sunriseUnavailable ? 'unavailable' : 'computed',
    convention,
    source: sunriseUnavailable ? 'not_implemented' : 'sun_moon_sidereal_longitude',
    local_date: localDate,
    timezone,
    fields: {
      tithi: sunriseUnavailable ? null : sunrise_tithi,
      paksha: sunriseUnavailable ? null : (sunrise_tithi?.paksha ?? null),
      yoga: sunriseUnavailable ? null : yoga,
      karana: sunriseUnavailable ? null : karana,
      weekday,
    },
    as_of_date: runtimeClock.asOfDate,
    sunrise_convention: {
      convention: 'local_sunrise_to_local_sunrise',
      sunrise_basis: 'local_civil_date',
      evaluated_at_sunrise: true,
    },
    sunrise: sunriseUnavailable,
    sunrise_utc,
    sunset_utc,
    sunrise_local,
    sunset_local,
    tithi: sunriseUnavailable ? null : sunrise_tithi,
    nakshatra,
    yoga: sunriseUnavailable ? null : yoga,
    karana: sunriseUnavailable ? null : karana,
    vara: weekday === 'unavailable' ? null : weekday,
    moon_rashi,
    sunrise_moon_rashi: calculateSign(sunriseMoonSidereal),
    sunrise_sun_position: sunriseSunPosition,
    sunrise_moon_position: sunriseMoonPosition,
    sunrise_tithi: sunriseUnavailable ? null : sunrise_tithi,
    sunrise_nakshatra,
    sunrise_yoga: sunriseUnavailable ? null : sunrise_yoga,
    sunrise_karana: sunriseUnavailable ? null : sunrise_karana,
    weekday,
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
  const now = input.now_utc
  const nowDate = new Date(input.now_utc)
  if (input.engine_mode !== 'real') {
    return {
      status: 'stub', calculated_at: now, date_local: '',
      vara: VARA_MAP_LEGACY[nowDate.getUTCDay()] ?? 'Sunday',
      tithi: null, nakshatra: null, yoga: null, karana: null,
      sunrise_utc: null, sunset_utc: null,
      warnings: ['Engine is in stub mode. Panchang requires ASTRO_ENGINE_MODE=real.'],
    }
  }
  return {
    status: 'not_available', calculated_at: now, date_local: now.split('T')[0],
    vara: VARA_MAP_LEGACY[nowDate.getUTCDay()] ?? 'Sunday',
    tithi: null, nakshatra: null, yoga: null, karana: null,
    sunrise_utc: null, sunset_utc: null,
    warnings: ['Use calculatePanchangResult() for real panchang data.'],
  }
}
