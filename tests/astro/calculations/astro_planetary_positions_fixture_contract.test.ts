/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import type { AyanamshaProvider } from '@/lib/astro/calculations/ayanamsha-provider';
import type { EphemerisBody, EphemerisProvider, TropicalBodyPosition } from '@/lib/astro/calculations/ephemeris-provider';
import { assertProviderReturnedBodies, normalizeRahuKetuMeanNode } from '@/lib/astro/calculations/ephemeris-provider';
import { calculatePlanetaryPositionsV2 } from '@/lib/astro/calculations/planets';
import { longitudeToSignDegree, normalizeDegrees360 } from '@/lib/astro/calculations/longitude';

const fakeProvider: EphemerisProvider = {
  engineId: 'fake-ephemeris',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions(jdUtExact: number, bodies: EphemerisBody[]) {
    if (!Number.isFinite(jdUtExact)) {
      throw new Error('jdUtExact must be finite');
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
      Ketu: { body: 'Ketu', tropicalLongitudeDeg: 123, retrograde: false, speedLongitudeDegPerDay: 0.1 },
      Uranus: { body: 'Uranus', tropicalLongitudeDeg: 44, retrograde: false },
      Neptune: { body: 'Neptune', tropicalLongitudeDeg: 64, retrograde: false },
      Pluto: { body: 'Pluto', tropicalLongitudeDeg: 74, retrograde: false },
    };

    return bodies.map((body) => fixtures[body]);
  },
};

const fakeAyanamshaProvider: AyanamshaProvider = {
  engineId: 'fake-ayanamsha',
  async calculateAyanamshaDeg(jdUtExact: number, type) {
    if (!Number.isFinite(jdUtExact)) {
      throw new Error('jdUtExact must be finite');
    }

    if (type !== 'lahiri') {
      throw new Error('Only Lahiri is supported in this fake provider.');
    }

    return 24;
  },
};

describe('astro planetary positions fixture contract', () => {
  it('fake provider returns requested Sun Moon Mars positions with version metadata', async () => {
    const positions = await fakeProvider.calculateTropicalPositions(2451545.0, ['Sun', 'Moon', 'Mars']);

    expect(fakeProvider.engineId).toBe('fake-ephemeris');
    expect(fakeProvider.engineVersion).toBe('fake-engine-v1');
    expect(fakeProvider.ephemerisVersion).toBe('fake-ephemeris-v1');
    expect(positions).toHaveLength(3);
    expect(positions.map((position) => position.body)).toEqual(['Sun', 'Moon', 'Mars']);
    expect(positions[2]?.retrograde).toBe(true);
    expect(positions[0]?.retrograde).toBe(false);
    expect(positions[1]?.retrograde).toBe(false);
  });

  it('calculates deterministic sidereal signs and degrees from fake tropical positions', async () => {
    const section = await calculatePlanetaryPositionsV2({
      jdUtExact: 2451545,
      ephemerisProvider: fakeProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
      ayanamshaType: 'lahiri',
    });

    expect(section.status).toBe('computed');
    expect(section.source).toBe('deterministic_calculation');
    expect(section.fields?.ayanamshaDeg).toBe(24);

    const byBody = section.fields?.byBody as Record<string, { sign: string; signNumber: number; degreeInSign: number; retrograde: boolean; absoluteLongitude: number }>;
    expect(byBody.Sun.signNumber).toBe(1);
    expect(byBody.Sun.sign).toBe('Aries');
    expect(byBody.Sun.degreeInSign).toBeCloseTo(10, 10);
    expect(byBody.Moon.signNumber).toBe(3);
    expect(byBody.Moon.sign).toBe('Gemini');
    expect(byBody.Moon.degreeInSign).toBeCloseTo(0, 10);
    expect(byBody.Mars.signNumber).toBe(4);
    expect(byBody.Mars.sign).toBe('Cancer');
    expect(byBody.Mars.degreeInSign).toBeCloseTo(7.5, 10);
    expect(byBody.Rahu.sign).toBe('Aquarius');
    expect(byBody.Ketu.sign).toBe('Leo');
  });

  it('longitudeToSignDegree puts exact sign boundaries in the next sign', () => {
    expect(longitudeToSignDegree(0)).toEqual({ signNumber: 1, signName: 'Aries', degreeInSign: 0 });
    expect(longitudeToSignDegree(30)).toEqual({ signNumber: 2, signName: 'Taurus', degreeInSign: 0 });
    expect(longitudeToSignDegree(60)).toEqual({ signNumber: 3, signName: 'Gemini', degreeInSign: 0 });
    expect(longitudeToSignDegree(360)).toEqual({ signNumber: 1, signName: 'Aries', degreeInSign: 0 });
    expect(longitudeToSignDegree(-1)).toEqual({ signNumber: 12, signName: 'Pisces', degreeInSign: 29 });
  });

  it('returns error section when jdUtExact is not finite', async () => {
    const section = await calculatePlanetaryPositionsV2({
      jdUtExact: Number.NaN,
      ephemerisProvider: fakeProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
      ayanamshaType: 'lahiri',
    });

    expect(section.status).toBe('error');
    expect(section.source).toBe('none');
  });

  it('returns error section when provider omits a required body', async () => {
    const brokenProvider: EphemerisProvider = {
      ...fakeProvider,
      async calculateTropicalPositions(jdUtExact: number, bodies: EphemerisBody[]) {
        void jdUtExact;
        return bodies.filter((body) => body !== 'Moon').map((body) => ({
          body,
          tropicalLongitudeDeg: 10,
          retrograde: false,
        }));
      },
    };

    const section = await calculatePlanetaryPositionsV2({
      jdUtExact: 2451545,
      ephemerisProvider: brokenProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
      ayanamshaType: 'lahiri',
    });

    expect(section.status).toBe('error');
    expect(section.reason).toMatch(/Moon|missing/i);
  });

  it('keeps Rahu and Ketu exactly opposite after sidereal conversion', async () => {
    const section = await calculatePlanetaryPositionsV2({
      jdUtExact: 2451545,
      ephemerisProvider: fakeProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
      ayanamshaType: 'lahiri',
    });

    const byBody = section.fields?.byBody as Record<string, { absoluteLongitude: number; retrograde: boolean }>;
    const rahu = byBody.Rahu.absoluteLongitude;
    const ketu = byBody.Ketu.absoluteLongitude;
    expect(normalizeDegrees360(ketu - rahu)).toBe(180);
    expect(byBody.Rahu.retrograde).toBe(true);
    expect(byBody.Ketu.retrograde).toBe(true);
  });

  it('retrograde comes from negative speed except Rahu and Ketu are always retrograde', async () => {
    const section = await calculatePlanetaryPositionsV2({
      jdUtExact: 2451545,
      ephemerisProvider: fakeProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
      ayanamshaType: 'lahiri',
    });

    const byBody = section.fields?.byBody as Record<string, { retrograde: boolean }>;
    expect(byBody.Mars.retrograde).toBe(true);
    expect(byBody.Sun.retrograde).toBe(false);
    expect(byBody.Rahu.retrograde).toBe(true);
    expect(byBody.Ketu.retrograde).toBe(true);
  });

  it('requested Ketu is satisfied by mean Rahu derivation, not separate true-node body', () => {
    const normalized = normalizeRahuKetuMeanNode([
      { body: 'Rahu', tropicalLongitudeDeg: 350, retrograde: false, speedLongitudeDegPerDay: -0.05 },
    ]);

    expect(() => assertProviderReturnedBodies(['Rahu', 'Ketu'], normalized)).not.toThrow();

    const ketu = normalized.find((position) => position.body === 'Ketu');
    expect(ketu?.tropicalLongitudeDeg).toBe(170);
  });

  it('rejects malformed NaN longitude in a position', () => {
    expect(() =>
      normalizeRahuKetuMeanNode([
        { body: 'Sun', tropicalLongitudeDeg: Number.NaN, retrograde: false },
      ]),
    ).toThrow(/finite number/);
  });
});
