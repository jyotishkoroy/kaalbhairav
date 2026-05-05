/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import type { EphemerisBody, EphemerisProvider, TropicalBodyPosition } from '@/lib/astro/calculations/ephemeris-provider';
import { assertProviderReturnedBodies, normalizeRahuKetuMeanNode } from '@/lib/astro/calculations/ephemeris-provider';

const fakeProvider: EphemerisProvider = {
  engineId: 'fake-ephemeris',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions(jdUtExact: number, bodies: EphemerisBody[]) {
    if (!Number.isFinite(jdUtExact)) {
      throw new Error('jdUtExact must be finite');
    }

    const fixtures: Record<EphemerisBody, TropicalBodyPosition> = {
      Sun: {
        body: 'Sun',
        tropicalLongitudeDeg: 10,
        retrograde: false,
        speedLongitudeDegPerDay: 1,
      },
      Moon: {
        body: 'Moon',
        tropicalLongitudeDeg: 45,
        retrograde: false,
        speedLongitudeDegPerDay: 13,
      },
      Mars: {
        body: 'Mars',
        tropicalLongitudeDeg: 120,
        retrograde: true,
        speedLongitudeDegPerDay: -0.2,
      },
      Mercury: {
        body: 'Mercury',
        tropicalLongitudeDeg: 80,
        retrograde: false,
        speedLongitudeDegPerDay: 1.2,
      },
      Jupiter: {
        body: 'Jupiter',
        tropicalLongitudeDeg: 200,
        retrograde: false,
        speedLongitudeDegPerDay: 0.08,
      },
      Venus: {
        body: 'Venus',
        tropicalLongitudeDeg: 300,
        retrograde: false,
        speedLongitudeDegPerDay: 1.1,
      },
      Saturn: {
        body: 'Saturn',
        tropicalLongitudeDeg: 330,
        retrograde: true,
        speedLongitudeDegPerDay: -0.04,
      },
      Rahu: {
        body: 'Rahu',
        tropicalLongitudeDeg: 350,
        retrograde: false,
        speedLongitudeDegPerDay: -0.05,
      },
      Ketu: {
        body: 'Ketu',
        tropicalLongitudeDeg: 123,
        retrograde: false,
        speedLongitudeDegPerDay: 0.1,
      },
      Uranus: {
        body: 'Uranus',
        tropicalLongitudeDeg: 15,
        retrograde: false,
      },
      Neptune: {
        body: 'Neptune',
        tropicalLongitudeDeg: 25,
        retrograde: false,
      },
      Pluto: {
        body: 'Pluto',
        tropicalLongitudeDeg: 35,
        retrograde: false,
      },
    };

    return bodies
      .filter((body) => body !== 'Ketu')
      .map((body) => fixtures[body]);
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

  it('derives Ketu exactly opposite mean Rahu and normalizes wraparound', () => {
    const normalized = normalizeRahuKetuMeanNode([
      { body: 'Rahu', tropicalLongitudeDeg: 350, retrograde: false, speedLongitudeDegPerDay: -0.05 },
      { body: 'Ketu', tropicalLongitudeDeg: 123, retrograde: false, speedLongitudeDegPerDay: 0.1 },
    ]);

    const rahu = normalized.find((position) => position.body === 'Rahu');
    const ketu = normalized.find((position) => position.body === 'Ketu');

    expect(rahu?.retrograde).toBe(true);
    expect(ketu?.tropicalLongitudeDeg).toBe(170);
    expect(ketu?.retrograde).toBe(true);
    expect(normalized.some((position) => position.body === 'Ketu' && position.tropicalLongitudeDeg === 123)).toBe(false);
    expect((ketu!.tropicalLongitudeDeg - rahu!.tropicalLongitudeDeg + 360) % 360).toBe(180);
  });

  it('detects provider missing required requested body', () => {
    expect(() => assertProviderReturnedBodies(['Sun', 'Moon'], [{ body: 'Sun', tropicalLongitudeDeg: 10, retrograde: false }])).toThrow(/Moon/);
  });

  it('propagates deterministic provider failure instead of guessing positions', async () => {
    await expect(fakeProvider.calculateTropicalPositions(Number.NaN, ['Sun'])).rejects.toThrow(/finite/);
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
