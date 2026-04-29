/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

// Julian Day UT calculation from UTC instant.

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
