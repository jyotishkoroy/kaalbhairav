/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import { calculateNakshatraPada } from '@/lib/astro/calculations/nakshatra';
import { calculatePlanetaryPositionsV2 } from '@/lib/astro/calculations/planets';
import type { AyanamshaProvider } from '@/lib/astro/calculations/ayanamsha-provider';
import type { EphemerisProvider } from '@/lib/astro/calculations/ephemeris-provider';

const fakeAyanamshaProvider: AyanamshaProvider = {
  engineId: 'fake-ayanamsha',
  async calculateAyanamshaDeg() {
    return 0;
  },
};

const fakeEphemerisProvider: EphemerisProvider = {
  engineId: 'fake-ephemeris',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions() {
    return [
      { body: 'Sun', tropicalLongitudeDeg: 0, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Moon', tropicalLongitudeDeg: 13 + 20 / 60, retrograde: false, speedLongitudeDegPerDay: 13 },
      { body: 'Mars', tropicalLongitudeDeg: 3 + 20 / 60, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Mercury', tropicalLongitudeDeg: 26 + 40 / 60, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Jupiter', tropicalLongitudeDeg: 40, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Venus', tropicalLongitudeDeg: 53 + 20 / 60, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Saturn', tropicalLongitudeDeg: 120, retrograde: true, speedLongitudeDegPerDay: -0.03 },
      { body: 'Uranus', tropicalLongitudeDeg: 180, retrograde: false },
      { body: 'Neptune', tropicalLongitudeDeg: 240, retrograde: false },
      { body: 'Pluto', tropicalLongitudeDeg: 300, retrograde: false },
      { body: 'Rahu', tropicalLongitudeDeg: 350, retrograde: true, speedLongitudeDegPerDay: -0.05 },
    ];
  },
};

describe('astro nakshatra pada fixture contract', () => {
  it('calculates Ashwini pada 1 at zero Aries', () => {
    const result = calculateNakshatraPada(0);

    expect(result.name).toBe('Ashwini');
    expect(result.index).toBe(0);
    expect(result.pada).toBe(1);
    expect(result.lord).toBe('Ketu');
  });

  it('exact nakshatra and pada boundaries go to the next interval', () => {
    expect(calculateNakshatraPada(3 + 20 / 60)).toMatchObject({ name: 'Ashwini', pada: 2 });
    expect(calculateNakshatraPada(13 + 20 / 60)).toMatchObject({ name: 'Bharani', pada: 1 });
    expect(calculateNakshatraPada(26 + 40 / 60)).toMatchObject({ name: 'Krittika', pada: 1 });
    expect(calculateNakshatraPada(360)).toMatchObject({ name: 'Ashwini', pada: 1 });
  });

  it('rejects non-finite longitudes', () => {
    expect(() => calculateNakshatraPada(Number.NaN)).toThrow(/finite/);
    expect(() => calculateNakshatraPada(Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });

  it('normalizes negative longitudes before nakshatra calculation', () => {
    const result = calculateNakshatraPada(-1);

    expect(result.name).toBe('Revati');
    expect(result.pada).toBe(4);
  });

  it('planetary positions include nakshatra and pada from sidereal longitude', async () => {
    const section = await calculatePlanetaryPositionsV2({
      jdUtExact: 2451545,
      ephemerisProvider: fakeEphemerisProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
      ayanamshaType: 'lahiri',
    });

    const byBody = section.fields?.byBody as Record<string, { nakshatra: string | null; pada: 1 | 2 | 3 | 4 | null }>;
    expect(byBody.Sun.nakshatra).toBe('Ashwini');
    expect(byBody.Sun.pada).toBe(1);
    expect(byBody.Moon.nakshatra).toBe('Bharani');
    expect(byBody.Moon.pada).toBe(1);
    expect(byBody.Mars.nakshatra).toBe('Ashwini');
    expect(byBody.Mars.pada).toBe(2);
  });

  it('assigns nakshatra lords through Vimshottari sequence', () => {
    expect(calculateNakshatraPada(0).lord).toBe('Ketu');
    expect(calculateNakshatraPada(13 + 20 / 60).lord).toBe('Venus');
    expect(calculateNakshatraPada(26 + 40 / 60).lord).toBe('Sun');
    expect(calculateNakshatraPada(40).lord).toBe('Moon');
  });
});
