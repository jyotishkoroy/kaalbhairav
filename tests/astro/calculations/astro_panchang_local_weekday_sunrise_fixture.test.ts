/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PANCHANG_CONVENTION,
  calculatePanchangResult,
  normalizePanchangConvention,
} from '@/lib/astro/calculations/panchang'

function loadFixture(name: string) {
  return JSON.parse(readFileSync(new URL(`../fixtures/panchang/${name}`, import.meta.url), 'utf8')) as {
    input: { dateOfBirth: string; timeOfBirth: string; timezone: string; latitude: number; longitude: number }
    expected: Record<string, string>
  }
}

describe('astro panchang local weekday and sunrise fixture', () => {
  it('records explicit convention metadata and derives weekday from the local date', () => {
    const fixture = loadFixture('india-standard-time.json')
    const result = calculatePanchangResult({
      calculationInstantUtc: '1999-06-14T04:28:00.000Z',
      localDate: fixture.input.dateOfBirth,
      timezone: fixture.input.timezone,
      latitude: fixture.input.latitude,
      longitude: fixture.input.longitude,
      convention: DEFAULT_PANCHANG_CONVENTION,
      runtimeClockInput: { currentUtc: '2026-05-04T12:00:00.000Z', asOfDate: '2026-05-04' },
    })

    expect(result.status).toBe('computed')
    expect(result.convention).toBe('at_birth_time')
    expect(result.local_date).toBe(fixture.expected.localDate)
    expect(result.timezone).toBe(fixture.expected.timezone)
    expect(result.source).toBe('sun_moon_sidereal_longitude')
    expect(result.fields.weekday).toBe(fixture.expected.weekday)
    expect(result.weekday).toBe(fixture.expected.weekday)
    expect(result.vara).toBe(fixture.expected.weekday)
    expect(result.fields.tithi).toEqual(result.tithi)
    expect(result.fields.yoga).toEqual(result.yoga)
    expect(result.fields.karana).toEqual(result.karana)

    const repeat = calculatePanchangResult({
      calculationInstantUtc: '1999-06-14T04:28:00.000Z',
      localDate: fixture.input.dateOfBirth,
      timezone: fixture.input.timezone,
      latitude: fixture.input.latitude,
      longitude: fixture.input.longitude,
      runtimeClockInput: { currentUtc: '2026-05-04T12:00:00.000Z', asOfDate: '2026-05-04' },
    })

    expect(repeat).toEqual(result)
  })

  it('marks sunrise convention unavailable instead of guessing', () => {
    const fixture = loadFixture('high-latitude-sunrise-edge.json')
    const result = calculatePanchangResult({
      calculationInstantUtc: '2024-06-21T10:00:00.000Z',
      localDate: fixture.input.dateOfBirth,
      timezone: fixture.input.timezone,
      latitude: fixture.input.latitude,
      longitude: fixture.input.longitude,
      convention: normalizePanchangConvention('at_local_sunrise'),
      runtimeClockInput: { currentUtc: '2026-05-04T12:00:00.000Z', asOfDate: '2026-05-04' },
    })

    expect(result.convention).toBe('at_local_sunrise')
    expect(result.status).toBe('unavailable')
    expect(result.source).toBe('not_implemented')
    expect(result.sunrise).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        reason: expect.stringMatching(/module_not_implemented|unsupported_convention/),
      }),
    )
    expect(result.sunrise_utc).toBeDefined()
    expect(result.fields.weekday).toBe('Friday')
  })

  it('normalizes unsupported convention values to the safe default', () => {
    expect(normalizePanchangConvention('invalid')).toBe('at_birth_time')
  })
})
