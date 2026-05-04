/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { calculateTransits } from '@/lib/astro/calculations/transits'
import { normalizeRuntimeClock } from '@/lib/astro/calculations/runtime-clock'
import type { LagnaResult } from '@/lib/astro/calculations/lagna'

describe('calculateTransits fixed date', () => {
  const natalMoonSignIndex = 4
  const natalLagna = {
    sign_index: 10,
    reliability: 'high',
    sidereal_longitude: 300,
    tropical_longitude: 300,
    sign: 'Capricorn',
    degrees_in_sign: 0,
    nakshatra_index: 0,
    nakshatra_pada: 1,
    house_number: 1,
    near_sign_boundary: false,
    high_latitude_flag: false,
    warnings: [],
  } as unknown as LagnaResult

  it('uses the injected asOfDate for today transit metadata', () => {
    const resultA = calculateTransits(natalMoonSignIndex, natalLagna, { currentUtc: '2026-05-04T06:00:00Z', asOfDate: '2026-05-04' })
    const resultB = calculateTransits(natalMoonSignIndex, natalLagna, { currentUtc: '2026-05-05T06:00:00Z', asOfDate: '2026-05-05' })

    expect(resultA.as_of_date).toBe('2026-05-04')
    expect(resultB.as_of_date).toBe('2026-05-05')
    expect(resultA.current_utc).toBe('2026-05-04T06:00:00.000Z')
    expect(resultB.current_utc).toBe('2026-05-05T06:00:00.000Z')
  })

  it('keeps immutable natal inputs unchanged across dates', () => {
    const natalMoon = natalMoonSignIndex
    const natal = { ...natalLagna }
    const resultA = calculateTransits(natalMoon, natal, normalizeRuntimeClock({ currentUtc: '2026-05-04T06:00:00Z' }))
    const resultB = calculateTransits(natalMoon, natal, normalizeRuntimeClock({ currentUtc: '2026-05-05T06:00:00Z' }))

    expect(natalMoon).toBe(4)
    expect(natal).toEqual(natalLagna)
    expect(resultA.transit_relation_to_natal.map((item) => item.house_from_natal_moon)).toEqual(resultA.transit_relation_to_natal.map((item) => item.house_from_natal_moon))
    expect(resultA.transit_planets.length).toBe(resultB.transit_planets.length)
  })

  it('throws on invalid asOfDate', () => {
    expect(() => normalizeRuntimeClock({ currentUtc: '2026-05-04T00:00:00Z', asOfDate: '2026/05/04' })).toThrow('Invalid asOfDate: 2026/05/04')
  })

  it('is stable for repeated runs with the same clock', () => {
    const clock = { currentUtc: '2026-05-04T06:00:00Z', asOfDate: '2026-05-04' }
    const first = calculateTransits(natalMoonSignIndex, natalLagna, clock)
    const second = calculateTransits(natalMoonSignIndex, natalLagna, clock)

    expect(second).toEqual(first)
  })
})
