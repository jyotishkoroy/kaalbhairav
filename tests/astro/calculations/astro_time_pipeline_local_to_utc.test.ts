/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest'
import { normalizeBirthDateTime } from '../../../lib/astro/calculations/time'

describe('normalizeBirthDateTime local-to-UTC pipeline', () => {
  it('normalizes a fixed-offset India birth time deterministically', () => {
    const result = normalizeBirthDateTime({
      date_local: '2000-01-01',
      time_local: '06:30',
      place_name: 'Test Place',
      latitude_deg: 13.0833,
      longitude_deg: 80.2707,
      timezone: 5.5,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.timeLocal).toBe('06:30:00')
    expect(result.timezoneMode).toBe('fixed_offset_hours')
    expect(result.timezoneHours).toBe(5.5)
    expect(result.utcDateTimeIso).toBe('2000-01-01T01:00:00.000Z')
    expect(result.jdUtExact).toBeCloseTo(2451544.5416666665)
    expect(result.runtimeClockIso).toBe('2026-01-01T00:00:00.000Z')
  })

  it('rejects a nonexistent DST local time in Europe/London', () => {
    expect(() =>
      normalizeBirthDateTime({
        date_local: '2024-03-31',
        time_local: '01:30',
        place_name: 'London',
        latitude_deg: 51.5074,
        longitude_deg: -0.1278,
        timezone: 'Europe/London',
        runtime_clock: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(/invalid|nonexistent|DST/i)
  })

  it('normalizes an IANA Asia/Kolkata birth time deterministically', () => {
    const result = normalizeBirthDateTime({
      date_local: '2000-01-01',
      time_local: '06:30:00',
      place_name: 'Kolkata',
      latitude_deg: 22.5726,
      longitude_deg: 88.3639,
      timezone: 'Asia/Kolkata',
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.timezoneMode).toBe('iana')
    expect(result.timezone).toBe('Asia/Kolkata')
    expect(result.timezoneHours).toBeCloseTo(5.5)
    expect(result.utcDateTimeIso).toBe('2000-01-01T01:00:00.000Z')
  })

  it('rejects an invalid Gregorian date', () => {
    expect(() =>
      normalizeBirthDateTime({
        date_local: '2026-02-30',
        time_local: '12:00',
        place_name: 'Invalid',
        latitude_deg: 0,
        longitude_deg: 0,
        timezone: 5.5,
        runtime_clock: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(/valid Gregorian date/i)
  })

  it('does not guess noon when the birth time is missing', () => {
    const result = normalizeBirthDateTime({
      date_local: '2000-02-29',
      time_local: null,
      place_name: 'Missing Time',
      latitude_deg: null,
      longitude_deg: null,
      timezone: 5.5,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.localDateTimeIso).toBeNull()
    expect(result.utcDateTimeIso).toBeNull()
    expect(result.jdUtExact).toBeNull()
    expect(result.printedJulianDay).toBe(2451604)
    expect(result.warnings.some((warning) => /birth time is missing/i.test(warning))).toBe(true)
  })

  it('applies war time correction before UTC conversion', () => {
    const result = normalizeBirthDateTime({
      date_local: '1942-08-01',
      time_local: '12:00',
      place_name: 'War time',
      latitude_deg: 0,
      longitude_deg: 0,
      timezone: 5.5,
      war_time_correction_seconds: 3600,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.utcDateTimeIso).toBe('1942-08-01T05:30:00.000Z')
  })
})
