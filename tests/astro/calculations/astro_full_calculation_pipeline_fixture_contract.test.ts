/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest'

import { normalizeBirthDateTime } from '@/lib/astro/calculations/time'
import { calculateJulianDay } from '@/lib/astro/calculations/julian-day'
import { calculatePlanetaryPositionsV2 } from '@/lib/astro/calculations/planets'
import { calculateAscendantV2 } from '@/lib/astro/calculations/lagna'
import { calculatePanchangaV2 } from '@/lib/astro/calculations/panchang'
import { calculateVimshottariDashaV2 } from '@/lib/astro/calculations/vimshottari'
import { calculateKpSection } from '@/lib/astro/calculations/kp'
import { buildShodashvargaSection } from '@/lib/astro/calculations/shodashvarga'
import { buildShodashvargaBhavSection } from '@/lib/astro/calculations/varga-bhav'
import { calculateDoshas } from '@/lib/astro/calculations/doshas'
import { makeAdvancedUnavailableSection } from '@/lib/astro/calculations/advanced-policy'
import type { AyanamshaProvider } from '@/lib/astro/calculations/ayanamsha-provider'
import type { EphemerisBody, EphemerisProvider, TropicalBodyPosition } from '@/lib/astro/calculations/ephemeris-provider'

const fakeEphemerisProvider: EphemerisProvider = {
  engineId: 'fake-ephemeris',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions(jdUtExact: number, bodies: EphemerisBody[]) {
    if (!Number.isFinite(jdUtExact)) {
      throw new Error('jdUtExact must be finite')
    }

    const fixtures: Record<EphemerisBody, TropicalBodyPosition> = {
      Sun: { body: 'Sun', tropicalLongitudeDeg: 34, retrograde: false, speedLongitudeDegPerDay: 1 },
      Moon: { body: 'Moon', tropicalLongitudeDeg: 84, retrograde: false, speedLongitudeDegPerDay: 13 },
      Mars: { body: 'Mars', tropicalLongitudeDeg: 121.5, retrograde: true, speedLongitudeDegPerDay: -0.2 },
      Mercury: { body: 'Mercury', tropicalLongitudeDeg: 54, retrograde: false, speedLongitudeDegPerDay: 1.1 },
      Jupiter: { body: 'Jupiter', tropicalLongitudeDeg: 204, retrograde: false, speedLongitudeDegPerDay: 0.08 },
      Venus: { body: 'Venus', tropicalLongitudeDeg: 304, retrograde: false, speedLongitudeDegPerDay: 1.2 },
      Saturn: { body: 'Saturn', tropicalLongitudeDeg: 334, retrograde: true, speedLongitudeDegPerDay: -0.03 },
      Rahu: { body: 'Rahu', tropicalLongitudeDeg: 350, retrograde: false, speedLongitudeDegPerDay: -0.05 },
      Ketu: { body: 'Ketu', tropicalLongitudeDeg: 170, retrograde: true, speedLongitudeDegPerDay: -0.05 },
      Uranus: { body: 'Uranus', tropicalLongitudeDeg: 44, retrograde: false },
      Neptune: { body: 'Neptune', tropicalLongitudeDeg: 64, retrograde: false },
      Pluto: { body: 'Pluto', tropicalLongitudeDeg: 74, retrograde: false },
    }

    return bodies.map((body) => fixtures[body])
  },
  async calculateAscendantMc(args) {
    if (!Number.isFinite(args.jdUtExact)) {
      throw new Error('jdUtExact must be finite')
    }
    return { ascendantTropicalDeg: 148, mcTropicalDeg: 278 }
  },
}

const fakeAyanamshaProvider: AyanamshaProvider = {
  engineId: 'fake-ayanamsha',
  async calculateAyanamshaDeg(jdUtExact: number, type) {
    if (!Number.isFinite(jdUtExact)) {
      throw new Error('jdUtExact must be finite')
    }
    if (type !== 'lahiri' && type !== 'kp_new') {
      throw new Error('unsupported ayanamsha')
    }
    return type === 'kp_new' ? 0.5 : 24
  },
}

const cases = [
  {
    name: 'normal india timezone',
    date_local: '2000-01-01',
    time_local: '06:30:00',
    latitude_deg: 13.0833,
    longitude_deg: 80.2707,
    timezone: 'Asia/Kolkata',
  },
  {
    name: 'leap date',
    date_local: '2000-02-29',
    time_local: '00:12:00',
    latitude_deg: 19.0667,
    longitude_deg: 72.8667,
    timezone: 5.5,
  },
  {
    name: 'western longitude and negative timezone',
    date_local: '1998-04-13',
    time_local: '19:42:00',
    latitude_deg: 40.7128,
    longitude_deg: -74.006,
    timezone: -4,
  },
  {
    name: 'southern hemisphere',
    date_local: '1979-06-27',
    time_local: '22:52:00',
    latitude_deg: -33.8688,
    longitude_deg: 151.2093,
    timezone: 10,
  },
  {
    name: 'high latitude near midnight',
    date_local: '2004-10-31',
    time_local: '23:58:00',
    latitude_deg: 67.01,
    longitude_deg: 18.96,
    timezone: 1,
  },
] as const

function assertComputedSection(section: { status: string; source: string }, label: string) {
  expect(['computed', 'partial']).toContain(section.status)
  expect(section.source, label).toBe('deterministic_calculation')
}

describe('astro full calculation pipeline fixture contract', () => {
  it.each(cases)('covers the deterministic pipeline for $name', async (fixture) => {
    const normalized = normalizeBirthDateTime({
      date_local: fixture.date_local,
      time_local: fixture.time_local,
      place_name: fixture.name,
      latitude_deg: fixture.latitude_deg,
      longitude_deg: fixture.longitude_deg,
      timezone: fixture.timezone,
      runtime_clock: '2026-05-05T00:00:00.000Z',
    })

    const jdUtExact = calculateJulianDay(normalized.utcDateTimeIso ?? '2000-01-01T00:00:00.000Z').jd_ut
    expect(normalized.runtimeClockIso).toBe('2026-05-05T00:00:00.000Z')

    const planetaryPositions = await calculatePlanetaryPositionsV2({
      jdUtExact,
      ephemerisProvider: fakeEphemerisProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
      ayanamshaType: 'lahiri',
    })
    const lagna = await calculateAscendantV2({
      jdUtExact,
      latitudeDeg: normalized.latitudeDeg,
      longitudeDeg: normalized.longitudeDeg,
      ephemerisProvider: fakeEphemerisProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    })
    const panchang = await calculatePanchangaV2({
      sunLongitudeDeg: 10,
      moonLongitudeDeg: 55,
      normalizedTime: normalized,
      sunriseSunsetProvider: fakeEphemerisProvider,
    })
    const vimshottari = calculateVimshottariDashaV2({
      moonLongitudeDeg: 84,
      birthUtcIso: normalized.utcDateTimeIso,
      runtimeClockIso: normalized.runtimeClockIso,
    })
    const kp = await calculateKpSection({
      jdUtExact,
      normalizedTime: normalized,
      ephemerisProvider: fakeEphemerisProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    })
    const shodashvarga = buildShodashvargaSection({
      planetaryPositions,
      lagna,
    })
    const shodashvargaBhav = buildShodashvargaBhavSection({ shodashvarga })
    const dosha = calculateDoshas(
      { lagna_sign_index: 5, planet_to_house: { Sun: 1, Moon: 2, Mars: 3, Mercury: 4, Jupiter: 5, Venus: 6, Saturn: 7, Rahu: 8, Ketu: 2 } } as never,
      [],
      { Sun: { sign: 'Aries' } as never },
    )
    const advanced = makeAdvancedUnavailableSection()

    assertComputedSection(planetaryPositions, fixture.name)
    assertComputedSection(lagna, fixture.name)
    assertComputedSection(panchang, fixture.name)
    assertComputedSection(kp, fixture.name)
    assertComputedSection(shodashvarga, fixture.name)
    assertComputedSection(shodashvargaBhav, fixture.name)

    const vimshottariFields = vimshottari.fields as {
      currentMahadasha?: unknown
      currentAntardasha?: unknown
    } | undefined
    const planetaryFields = planetaryPositions.fields as {
      byBody?: Record<string, { sign?: string; nakshatra?: string | null }>
    } | undefined
    const lagnaFields = lagna.fields as {
      ascendant?: { sign?: string }
    } | undefined
    const panchangFields = panchang.fields as {
      tithi?: unknown
      hinduWeekday?: unknown
    } | undefined
    const kpFields = kp.fields as {
      kpAyanamshaDeg?: unknown
      significators?: { status?: string }
    } | undefined
    const shodashvargaFields = shodashvarga.fields as {
      byBody?: Record<string, unknown>
    } | undefined
    const shodashvargaBhavFields = shodashvargaBhav.fields as {
      byBody?: Record<string, unknown>
    } | undefined

    expect(vimshottariFields?.currentMahadasha).not.toBeNull()
    expect(vimshottariFields?.currentAntardasha).not.toBeNull()
    expect(planetaryFields?.byBody?.Sun?.sign).toBeDefined()
    expect(planetaryFields?.byBody?.Moon?.nakshatra).toBeDefined()
    expect(lagnaFields?.ascendant?.sign).toBeDefined()
    expect(panchangFields?.tithi).toBeDefined()
    expect(panchangFields?.hinduWeekday).toBeDefined()
    expect(kpFields?.kpAyanamshaDeg).toBeDefined()
    expect(kpFields?.significators?.status).toBe('unavailable')
    expect(shodashvargaFields?.byBody).toBeDefined()
    expect(shodashvargaBhavFields?.byBody).toBeDefined()
    expect(dosha.every((entry) => entry.status === 'unavailable')).toBe(true)
    expect(advanced.status).toBe('unavailable')
    expect(advanced.fields?.modules).toBeDefined()
  })
})
