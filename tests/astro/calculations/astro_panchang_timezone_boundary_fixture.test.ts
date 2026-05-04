/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { calculatePanchangResult, normalizePanchangConvention } from '@/lib/astro/calculations/panchang'

function loadFixture(name: string) {
  return JSON.parse(readFileSync(new URL(`../fixtures/panchang/${name}`, import.meta.url), 'utf8')) as {
    input: { dateOfBirth: string; timeOfBirth: string; timezone: string; latitude: number; longitude: number }
    expected: Record<string, string>
  }
}

describe('astro panchang timezone boundary fixture', () => {
  it('preserves the local date and weekday across a UTC boundary', () => {
    const fixture = loadFixture('timezone-boundary-west-longitude.json')
    const result = calculatePanchangResult({
      calculationInstantUtc: '2024-01-01T05:30:00.000Z',
      localDate: fixture.input.dateOfBirth,
      timezone: fixture.input.timezone,
      latitude: fixture.input.latitude,
      longitude: fixture.input.longitude,
      convention: normalizePanchangConvention(fixture.expected.convention),
      runtimeClockInput: { currentUtc: '2026-05-04T12:00:00.000Z', asOfDate: '2026-05-04' },
    })

    expect(result.status).toBe('computed')
    expect(result.local_date).toBe('2024-01-01')
    expect(result.timezone).toBe('America/New_York')
    expect(result.convention).toBe('at_birth_time')
    expect(result.fields.weekday).toBe('Monday')
    expect(result.vara).toBe('Monday')
    expect(result.fields.weekday).not.toBe('Sunday')
    expect(fixture.input.longitude).toBeLessThan(0)
  })

  it('stays deterministic for repeated runs with the same inputs and runtime clock', () => {
    const fixture = loadFixture('timezone-boundary-west-longitude.json')
    const input = {
      calculationInstantUtc: '2024-01-01T05:30:00.000Z',
      localDate: fixture.input.dateOfBirth,
      timezone: fixture.input.timezone,
      latitude: fixture.input.latitude,
      longitude: fixture.input.longitude,
      runtimeClockInput: { currentUtc: '2026-05-04T12:00:00.000Z', asOfDate: '2026-05-04' },
    }
    expect(calculatePanchangResult({ ...input })).toEqual(calculatePanchangResult({ ...input }))
  })

  it('marks sunrise convention unavailable on the high latitude fixture', () => {
    const fixture = loadFixture('high-latitude-sunrise-edge.json')
    const result = calculatePanchangResult({
      calculationInstantUtc: '2024-06-21T10:00:00.000Z',
      localDate: fixture.input.dateOfBirth,
      timezone: fixture.input.timezone,
      latitude: fixture.input.latitude,
      longitude: fixture.input.longitude,
      convention: 'at_local_sunrise',
      runtimeClockInput: { currentUtc: '2026-05-04T12:00:00.000Z', asOfDate: '2026-05-04' },
    })

    expect(result.status).toBe('unavailable')
    expect(result.sunrise).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        reason: 'module_not_implemented',
      }),
    )
    expect(result.fields.weekday).toBe('Friday')
  })
})
