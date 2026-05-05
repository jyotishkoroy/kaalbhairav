/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import type { AyanamshaProvider } from '@/lib/astro/calculations/ayanamsha-provider';
import type { EphemerisProvider } from '@/lib/astro/calculations/ephemeris-provider';
import { calculateAscendantV2 } from '@/lib/astro/calculations/lagna';
import { buildD1ChartSection } from '@/lib/astro/calculations/d1';
import { calculatePlanetaryPositionsV2 } from '@/lib/astro/calculations/planets';

const fakeAyanamshaProvider: AyanamshaProvider = {
  engineId: 'fake-ayanamsha',
  async calculateAyanamshaDeg(jdUtExact, type) {
    if (!Number.isFinite(jdUtExact)) {
      throw new Error('bad JD');
    }
    if (type !== 'lahiri') {
      throw new Error('unsupported ayanamsha');
    }
    return 24;
  },
};

const fakeAscMcProvider: EphemerisProvider = {
  engineId: 'fake-asc-mc-provider',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions() {
    return [
      { body: 'Sun', tropicalLongitudeDeg: 34, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Moon', tropicalLongitudeDeg: 84, retrograde: false, speedLongitudeDegPerDay: 13 },
      { body: 'Mars', tropicalLongitudeDeg: 121.5, retrograde: true, speedLongitudeDegPerDay: -0.2 },
      { body: 'Mercury', tropicalLongitudeDeg: 54, retrograde: false, speedLongitudeDegPerDay: 1.1 },
      { body: 'Jupiter', tropicalLongitudeDeg: 204, retrograde: false, speedLongitudeDegPerDay: 0.08 },
      { body: 'Venus', tropicalLongitudeDeg: 304, retrograde: false, speedLongitudeDegPerDay: 1.2 },
      { body: 'Saturn', tropicalLongitudeDeg: 334, retrograde: true, speedLongitudeDegPerDay: -0.03 },
      { body: 'Uranus', tropicalLongitudeDeg: 44, retrograde: false },
      { body: 'Neptune', tropicalLongitudeDeg: 64, retrograde: false },
      { body: 'Pluto', tropicalLongitudeDeg: 74, retrograde: false },
      { body: 'Rahu', tropicalLongitudeDeg: 350, retrograde: true, speedLongitudeDegPerDay: -0.05 },
    ];
  },
  async calculateAscendantMc() {
    return {
      ascendantTropicalDeg: 124,
      mcTropicalDeg: 214,
      cuspsTropicalDeg: [124, 154, 184, 214, 244, 274, 304, 334, 4, 34, 64, 94],
    };
  },
};

const fakeFallbackProvider: EphemerisProvider = {
  ...fakeAscMcProvider,
  async calculateAscendantMc() {
    return undefined as never;
  },
};

describe('astro lagna fixture contract', () => {
  it('computes Lagna and MC from provider ascendant/MC with Lahiri subtraction', async () => {
    const section = await calculateAscendantV2({
      jdUtExact: 2451545,
      latitudeDeg: 13.08,
      longitudeDeg: 80.27,
      ephemerisProvider: fakeAscMcProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });

    expect(section.status).toBe('computed');
    expect(section.source).toBe('deterministic_calculation');
    expect(section.engine).toBe('fake-asc-mc-provider');
    const ascendant = section.fields?.ascendant as { sign?: string; signNumber?: number; degreeInSign?: number } | undefined;
    const mc = section.fields?.mc as { sign?: string; signNumber?: number; degreeInSign?: number } | undefined;
    expect(ascendant?.sign).toBe('Cancer');
    expect(ascendant?.signNumber).toBe(4);
    expect(ascendant?.degreeInSign).toBeCloseTo(10, 10);
    expect(mc?.sign).toBe('Libra');
    expect(mc?.signNumber).toBe(7);
    expect(mc?.degreeInSign).toBeCloseTo(10, 10);
  });

  it('falls back to deterministic formula when provider has no ascendant method', async () => {
    const section = await calculateAscendantV2({
      jdUtExact: 2451545,
      latitudeDeg: 13.08,
      longitudeDeg: 80.27,
      ephemerisProvider: fakeFallbackProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });

    expect(section.status).toBe('computed');
    expect(Number.isFinite((section.fields?.ascendant as { absoluteLongitude?: number } | undefined)?.absoluteLongitude ?? Number.NaN)).toBe(true);
    expect(Number.isFinite((section.fields?.mc as { absoluteLongitude?: number } | undefined)?.absoluteLongitude ?? Number.NaN)).toBe(true);
  });

  it('returns unavailable when latitude is missing', async () => {
    const section = await calculateAscendantV2({
      jdUtExact: 2451545,
      latitudeDeg: null,
      longitudeDeg: 80.27,
      ephemerisProvider: fakeAscMcProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
    expect(section.reason).toBe('insufficient_birth_data');
    expect(section.warnings?.join(' ')).toMatch(/Latitude/);
  });

  it('returns unavailable when exact birth time is missing', async () => {
    const section = await calculateAscendantV2({
      jdUtExact: null,
      latitudeDeg: 13.08,
      longitudeDeg: 80.27,
      ephemerisProvider: fakeAscMcProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });

    expect(section.status).toBe('unavailable');
    expect(section.reason).toBe('insufficient_birth_data');
  });

  it('builds D1 whole-sign placements without overwriting sign placement', async () => {
    const planetaryPositions = await calculatePlanetaryPositionsV2({
      jdUtExact: 2451545,
      ephemerisProvider: fakeAscMcProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
      ayanamshaType: 'lahiri',
    });
    const lagna = await calculateAscendantV2({
      jdUtExact: 2451545,
      latitudeDeg: 13.08,
      longitudeDeg: 80.27,
      ephemerisProvider: fakeAscMcProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });
    const d1 = buildD1ChartSection({
      planetaryPositions,
      lagna,
      houseSystem: 'whole_sign',
    });

    expect(d1.status).toBe('computed');
    const placements = d1.fields?.placements as Record<string, { sign: string; signNumber: number; wholeSignHouse: number }> | undefined;
    expect(placements?.Sun.sign).toBe('Aries');
    expect(placements?.Sun.signNumber).toBe(1);
    expect(placements?.Sun.wholeSignHouse).toBe(10);
    expect(d1.fields?.lagnaSignNumber).toBe(4);
  });

  it('returns error when provider ascendant lookup fails', async () => {
    const failingProvider: EphemerisProvider = {
      ...fakeAscMcProvider,
      async calculateAscendantMc() {
        throw new Error('provider failed');
      },
    };

    const section = await calculateAscendantV2({
      jdUtExact: 2451545,
      latitudeDeg: 13.08,
      longitudeDeg: 80.27,
      ephemerisProvider: failingProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });

    expect(section.status).toBe('error');
    expect(section.source).toBe('none');
  });

  it('ignores provider cusp metadata and preserves ascendant and MC calculations', async () => {
    const section = await calculateAscendantV2({
      jdUtExact: 2451545,
      latitudeDeg: 13.08,
      longitudeDeg: 80.27,
      ephemerisProvider: fakeAscMcProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });

    expect(section.status).toBe('computed');
    expect(section.fields?.ascendant).toMatchObject({
      sign: 'Cancer',
      signNumber: 4,
    });
    expect(section.fields?.mc).toMatchObject({
      sign: 'Libra',
      signNumber: 7,
    });
    expect(section.fields).not.toHaveProperty('cuspsTropicalDeg');
  });
});
