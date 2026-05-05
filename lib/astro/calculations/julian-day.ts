/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

export type JulianDayResult = {
  jd_ut: number
  calendar: 'gregorian'
  source: 'swiss_ephemeris' | 'formula_validated_against_swiss_ephemeris'
}

// Gregorian proleptic Julian Day formula, validated against swe_julday.
function julianDayFormula(
  year: number, month: number, day: number, hourDecimalUTC: number,
): number {
  let Y = year
  let M = month
  if (M <= 2) { Y -= 1; M += 12 }
  const A = Math.floor(Y / 100)
  const B = 2 - A + Math.floor(A / 4)
  const D = day + hourDecimalUTC / 24
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5
}

export function calculateJulianDay(
  birthUtcISO: string,
  sweJulday?: (year: number, month: number, day: number, hour: number, gregFlag: number) => number,
): JulianDayResult {
  const d = new Date(birthUtcISO)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const hourDecimal = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600

  if (sweJulday) {
    const jdSwiss = sweJulday(year, month, day, hourDecimal, 1) // 1 = SE_GREG_CAL
    const jdFormula = julianDayFormula(year, month, day, hourDecimal)
    if (Math.abs(jdSwiss - jdFormula) > 0.000001) {
      console.warn(`JD mismatch: swiss=${jdSwiss} formula=${jdFormula}`)
    }
    return { jd_ut: jdSwiss, calendar: 'gregorian', source: 'swiss_ephemeris' }
  }

  return {
    jd_ut: julianDayFormula(year, month, day, hourDecimal),
    calendar: 'gregorian',
    source: 'formula_validated_against_swiss_ephemeris',
  }
}

function parseGregorianDate(dateLocal: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateLocal)
  if (!match) {
    throw new Error('dateLocal must be in YYYY-MM-DD format.')
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utcCheck = new Date(Date.UTC(year, month - 1, day))
  if (
    utcCheck.getUTCFullYear() !== year ||
    utcCheck.getUTCMonth() !== month - 1 ||
    utcCheck.getUTCDate() !== day
  ) {
    throw new Error('dateLocal must be a valid Gregorian date.')
  }

  return { year, month, day }
}

export function calculateGregorianJdnForLocalDate(dateLocal: string): number {
  const { year, month, day } = parseGregorianDate(dateLocal)
  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)
  const jdAtNoon = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5
  return Math.floor(jdAtNoon + 0.5)
}

export function calculateAstronomicalJulianDateFromUtc(utcIso: string): number {
  const parsed = new Date(utcIso)
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error('utcIso must be a valid ISO datetime with timezone.')
  }

  let year = parsed.getUTCFullYear()
  let month = parsed.getUTCMonth() + 1
  const day = parsed.getUTCDate()
  const hours = parsed.getUTCHours()
  const minutes = parsed.getUTCMinutes()
  const seconds = parsed.getUTCSeconds()
  const milliseconds = parsed.getUTCMilliseconds()
  const fractionalDay = (hours + minutes / 60 + seconds / 3600 + milliseconds / 3600000) / 24

  if (month <= 2) {
    year -= 1
    month += 12
  }

  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + fractionalDay + B - 1524.5
}
