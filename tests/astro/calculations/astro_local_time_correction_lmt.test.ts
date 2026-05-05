/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest'
import { normalizeBirthDateTime } from '../../../lib/astro/calculations/time'

describe('normalizeBirthDateTime local time correction and LMT', () => {
  it('computes a signed negative correction for Chennai-ish longitude', () => {
    const result = normalizeBirthDateTime({
      date_local: '2000-01-01',
      time_local: '06:30',
      place_name: 'Chennai',
      latitude_deg: 13.0833,
      longitude_deg: 80.2707,
      timezone: 5.5,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.standardMeridianDeg).toBe(82.5)
    expect(result.localTimeCorrectionSeconds).toBeCloseTo(-535.032, 3)
    expect(result.localMeanTimeIso).toBe('2000-01-01T06:21:04.968')
  })

  it('computes a positive correction east of the standard meridian', () => {
    const result = normalizeBirthDateTime({
      date_local: '2000-01-01',
      time_local: '06:30',
      place_name: 'Guwahati',
      latitude_deg: 26.1445,
      longitude_deg: 91.7362,
      timezone: 5.5,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.localTimeCorrectionSeconds).toBeGreaterThan(0)
    expect(result.localMeanTimeIso).toBe('2000-01-01T07:06:56.688')
  })

  it('computes a negative correction west of the standard meridian', () => {
    const result = normalizeBirthDateTime({
      date_local: '2000-01-01',
      time_local: '06:30',
      place_name: 'Mumbai',
      latitude_deg: 19.076,
      longitude_deg: 72.8777,
      timezone: 5.5,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.localTimeCorrectionSeconds).toBeLessThan(0)
    expect(result.localTimeCorrectionSeconds).not.toBe(Math.abs(-2309.352))
  })

  it('rejects an invalid longitude', () => {
    expect(() =>
      normalizeBirthDateTime({
        date_local: '2000-01-01',
        time_local: '06:30',
        place_name: 'Invalid',
        latitude_deg: 0,
        longitude_deg: 181,
        timezone: 5.5,
        runtime_clock: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(/Longitude/i)
  })

  it('returns null correction when longitude is missing', () => {
    const result = normalizeBirthDateTime({
      date_local: '2000-01-01',
      time_local: '06:30',
      place_name: 'Missing lon',
      latitude_deg: 13,
      longitude_deg: null,
      timezone: 5.5,
      runtime_clock: '2026-01-01T00:00:00.000Z',
    })

    expect(result.localTimeCorrectionSeconds).toBeNull()
    expect(result.localMeanTimeIso).toBeNull()
    expect(result.warnings.join(' ')).toMatch(/longitude/i)
  })
})
