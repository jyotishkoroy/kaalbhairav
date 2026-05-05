/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest'
import type { EphemerisProvider } from '@/lib/astro/calculations/ephemeris-provider'
import type { NormalizedBirthInputV2 } from '@/lib/astro/calculations/contracts'
import {
  calculateKaranaNumber,
  calculatePanchangaV2,
  calculatePaksha,
  calculateTithiNumber,
  calculateYogaNumber,
  getCivilWeekday,
  getKaranaName,
} from '@/lib/astro/calculations/panchang'
import { calculateSunriseSunsetV2 } from '@/lib/astro/calculations/sunrise-sunset'
import { isUnavailableValue } from '@/lib/astro/calculations/unavailable'

function normalizedTime(overrides: Partial<NormalizedBirthInputV2> = {}): NormalizedBirthInputV2 {
  return {
    dateLocal: '2026-05-05',
    timeLocal: '07:30:00',
    localDateTimeIso: '2026-05-05T07:30:00.000',
    utcDateTimeIso: '2026-05-05T02:00:00.000Z',
    placeName: 'Test Place',
    latitudeDeg: 13.0833,
    longitudeDeg: 80.2707,
    timezoneMode: 'fixed_offset_hours',
    timezone: null,
    timezoneHours: 5.5,
    warTimeCorrectionSeconds: 0,
    standardMeridianDeg: 82.5,
    localTimeCorrectionSeconds: -535.032,
    localMeanTimeIso: '2026-05-05T07:21:04.968',
    printedJulianDay: 2460796,
    jdUtExact: 2460795.5833333335,
    runtimeClockIso: '2026-05-05T00:00:00.000Z',
    warnings: [],
    ...overrides,
  }
}

const fakeSunriseProvider: EphemerisProvider = {
  engineId: 'fake-sunrise-provider',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions() {
    return []
  },
  async calculateSunriseSunset() {
    return {
      sunriseLocalIso: '2026-05-05T06:00:00.000',
      sunsetLocalIso: '2026-05-05T18:20:00.000',
    }
  },
}

const failingSunriseProvider: EphemerisProvider = {
  engineId: 'failing-sunrise-provider',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions() {
    return []
  },
  async calculateSunriseSunset() {
    throw new Error('sunrise unavailable')
  },
}

describe('astro panchanga fixture contract', () => {
  it('computes tithi paksha yoga and karana from Sun and Moon longitudes', async () => {
    const section = await calculatePanchangaV2({
      sunLongitudeDeg: 10,
      moonLongitudeDeg: 25,
      normalizedTime: normalizedTime(),
    })

    expect(section.status).toBe('computed')
    expect(section.source).toBe('deterministic_calculation')
    expect(section.fields?.tithi).toMatchObject({
      number: 2,
      paksha: 'Shukla',
    })
    expect((section.fields?.tithi as { name?: string } | undefined)?.name).toBe('Dwitiya')
    expect(section.fields?.yoga).toMatchObject({ number: 3 })
    expect(section.fields?.karana).toMatchObject({ number: 3, name: 'Balava' })
    expect(section.fields?.civilWeekday).toBe('Tuesday')
  })

  it('uses previous civil weekday when birth is before computed sunrise', async () => {
    const section = await calculatePanchangaV2({
      sunLongitudeDeg: 10,
      moonLongitudeDeg: 25,
      normalizedTime: normalizedTime({
        timeLocal: '05:30:00',
        localDateTimeIso: '2026-05-05T05:30:00.000',
      }),
      sunriseSunsetProvider: fakeSunriseProvider,
    })

    expect(section.status).toBe('computed')
    expect(section.fields?.hinduWeekday).toBe('Monday')
    expect(section.fields?.sunrise).toMatchObject({
      status: 'computed',
      sunriseLocalIso: '2026-05-05T06:00:00.000',
    })
  })

  it('keeps civil weekday when birth is at or after sunrise', async () => {
    const section = await calculatePanchangaV2({
      sunLongitudeDeg: 10,
      moonLongitudeDeg: 25,
      normalizedTime: normalizedTime(),
      sunriseSunsetProvider: fakeSunriseProvider,
    })

    expect(section.fields?.hinduWeekday).toBe('Tuesday')
  })

  it('returns error section for invalid longitudes', async () => {
    const section = await calculatePanchangaV2({
      sunLongitudeDeg: Number.NaN,
      moonLongitudeDeg: 25,
      normalizedTime: normalizedTime(),
    })

    expect(section.status).toBe('error')
    expect(section.source).toBe('none')
    expect(() => calculateTithiNumber(Number.NaN, 10)).toThrow(/finite/)
    expect(() => calculatePaksha(0)).toThrow(/1 to 30/)
  })

  it('computes panchanga basics but marks sunrise and Hindu weekday unavailable without provider', async () => {
    const section = await calculatePanchangaV2({
      sunLongitudeDeg: 10,
      moonLongitudeDeg: 25,
      normalizedTime: normalizedTime(),
    })

    expect(section.status).toBe('computed')
    expect(section.fields?.tithi).toMatchObject({ number: 2 })
    expect(isUnavailableValue(section.fields?.hinduWeekday)).toBe(true)
    expect(isUnavailableValue(section.fields?.sunrise)).toBe(true)
  })

  it('computes Krishna paksha after full moon boundary', async () => {
    const section = await calculatePanchangaV2({
      sunLongitudeDeg: 10,
      moonLongitudeDeg: 200,
      normalizedTime: normalizedTime(),
    })

    expect(section.fields?.tithi).toMatchObject({ number: 16, paksha: 'Krishna' })
    expect(calculateTithiNumber(200, 10)).toBe(16)
    expect(calculatePaksha(16)).toBe('Krishna')
  })

  it('maps fixed and movable karanas by half-tithi index', () => {
    expect(getKaranaName(1)).toBe('Kimstughna')
    expect(getKaranaName(2)).toBe('Bava')
    expect(getKaranaName(3)).toBe('Balava')
    expect(getKaranaName(57)).toBe('Vishti')
    expect(getKaranaName(58)).toBe('Shakuni')
    expect(getKaranaName(59)).toBe('Chatushpada')
    expect(getKaranaName(60)).toBe('Naga')
    expect(calculateKaranaNumber(25, 10)).toBe(3)
    expect(calculateYogaNumber(10, 25)).toBe(3)
    expect(getCivilWeekday('2026-05-05')).toBe('Tuesday')
  })

  it('sunrise wrapper returns unavailable when provider is absent or fails', async () => {
    const absent = await calculateSunriseSunsetV2({
      dateLocal: '2026-05-05',
      latitudeDeg: 13.0833,
      longitudeDeg: 80.2707,
      timezoneHours: 5.5,
    })

    expect(absent.status).toBe('unavailable')
    expect(absent.source).toBe('none')
    expect(isUnavailableValue(absent.fields?.sunrise)).toBe(true)

    const failed = await calculateSunriseSunsetV2({
      dateLocal: '2026-05-05',
      latitudeDeg: 13.0833,
      longitudeDeg: 80.2707,
      timezoneHours: 5.5,
      provider: failingSunriseProvider,
    })

    expect(failed.status).toBe('unavailable')
    expect(failed.reason).toBe('ephemeris_unavailable')
  })
})
