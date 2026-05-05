/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest'
import { calculateAstronomicalJulianDateFromUtc, calculateGregorianJdnForLocalDate } from '../../../lib/astro/calculations/julian-day'
import { normalizeBirthDateTime } from '../../../lib/astro/calculations/time'
import { calculateGmstHours, calculateLocalSiderealTimeHours } from '../../../lib/astro/calculations/sidereal-time'
import { calculateMeanObliquityDeg, formatObliquityDms } from '../../../lib/astro/calculations/obliquity'

describe('Julian day and time pipeline helpers', () => {
  it('handles the J2000 reference instant', () => {
    expect(calculateGregorianJdnForLocalDate('2000-01-01')).toBe(2451545)
    expect(calculateAstronomicalJulianDateFromUtc('2000-01-01T12:00:00.000Z')).toBeCloseTo(2451545.0)
    expect(calculateAstronomicalJulianDateFromUtc('2000-01-01T00:00:00.000Z')).toBeCloseTo(2451544.5)
  })

  it('handles leap-day civil dates', () => {
    expect(calculateGregorianJdnForLocalDate('2000-02-29')).toBe(2451604)

    const result = normalizeBirthDateTime({
      date_local: '2000-02-29',
      time_local: null,
      place_name: 'Leap',
      latitude_deg: null,
      longitude_deg: null,
      timezone: 5.5,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.printedJulianDay).toBe(2451604)
  })

  it('keeps the printed local JDN separate from exact UT JD', () => {
    const result = normalizeBirthDateTime({
      date_local: '2000-01-01',
      time_local: '00:15',
      place_name: 'Offset',
      latitude_deg: 0,
      longitude_deg: 0,
      timezone: 5.5,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.utcDateTimeIso).toBe('1999-12-31T18:45:00.000Z')
    expect(result.printedJulianDay).toBe(2451545)
    expect(result.jdUtExact).toBeCloseTo(calculateAstronomicalJulianDateFromUtc('1999-12-31T18:45:00.000Z'))
    expect(result.printedJulianDay).not.toBe(Math.floor((result.jdUtExact ?? 0) + 0.5))
  })

  it('rejects invalid Gregorian dates', () => {
    expect(() => calculateGregorianJdnForLocalDate('2001-02-29')).toThrow(/valid Gregorian date/i)
  })

  it('keeps JD UT null when birth time is missing', () => {
    const result = normalizeBirthDateTime({
      date_local: '2000-01-01',
      time_local: null,
      place_name: 'Missing',
      latitude_deg: 0,
      longitude_deg: 0,
      timezone: 5.5,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.printedJulianDay).toBe(2451545)
    expect(result.jdUtExact).toBeNull()
  })

  it('preserves fractional JD UT precision', () => {
    expect(calculateAstronomicalJulianDateFromUtc('2000-01-01T06:00:00.000Z')).toBeCloseTo(2451544.75)
    expect(calculateGmstHours(2451545.0)).toBeCloseTo(18.697374558, 6)
    expect(calculateLocalSiderealTimeHours(2451545.0, 82.5).hours).toBeCloseTo((18.697374558 + 5.5) % 24, 6)
    expect(calculateMeanObliquityDeg(2451545.0)).toBeCloseTo(23.439291, 6)
    expect(formatObliquityDms(calculateMeanObliquityDeg(2451545.0))).toMatch(/^\d+°\d{2}'\d{2}"$/)
  })
})
