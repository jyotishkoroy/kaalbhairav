/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import type { AstroSectionContract } from '@/lib/astro/calculations/contracts';
import type { EphemerisProvider } from '@/lib/astro/calculations/ephemeris-provider';
import {
  buildHousesSectionV2,
  calculateWholeSignHouse,
  normalizeHouseCusps,
} from '@/lib/astro/calculations/houses';

function planetarySection(): AstroSectionContract {
  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      ayanamshaDeg: 24,
      byBody: {
        Sun: {
          body: 'Sun',
          sign: 'Aries',
          signNumber: 1,
          degreeInSign: 10,
          absoluteLongitude: 10,
          nakshatra: 'Ashwini',
          pada: 4,
          retrograde: false,
          speedDegPerDay: 1,
          source: 'deterministic_calculation',
        },
        Moon: {
          body: 'Moon',
          sign: 'Cancer',
          signNumber: 4,
          degreeInSign: 5,
          absoluteLongitude: 95,
          nakshatra: 'Pushya',
          pada: 1,
          retrograde: false,
          speedDegPerDay: 13,
          source: 'deterministic_calculation',
        },
        Mars: {
          body: 'Mars',
          sign: 'Libra',
          signNumber: 7,
          degreeInSign: 0,
          absoluteLongitude: 180,
          nakshatra: 'Chitra',
          pada: 3,
          retrograde: true,
          speedDegPerDay: -0.2,
          source: 'deterministic_calculation',
        },
      },
    },
  };
}

function lagnaSection(): AstroSectionContract {
  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      ascendant: {
        sign: 'Cancer',
        signNumber: 4,
        degreeInSign: 10,
        absoluteLongitude: 100,
        tropicalLongitude: 124,
        source: 'deterministic_calculation',
      },
      mc: {
        sign: 'Libra',
        signNumber: 7,
        degreeInSign: 10,
        absoluteLongitude: 190,
        tropicalLongitude: 214,
        source: 'deterministic_calculation',
      },
    },
  };
}

const fakeCuspProvider: EphemerisProvider = {
  engineId: 'fake-cusp-provider',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions() {
    return [];
  },
  async calculateAscendantMc() {
    return {
      ascendantTropicalDeg: 124,
      mcTropicalDeg: 214,
      cuspsTropicalDeg: [124, 154, 184, 214, 244, 274, 304, 334, 4, 34, 64, 94],
    };
  },
};

describe('astro house system fixture contract', () => {
  it('computes whole-sign house placement without cusp provider', async () => {
    const section = await buildHousesSectionV2({
      planetaryPositions: planetarySection(),
      lagna: lagnaSection(),
      houseSystem: 'whole_sign',
    });

    expect(section.status).toBe('computed');
    expect(section.fields?.houseSystem).toBe('whole_sign');
    expect(section.fields?.cusps).toBeNull();
    const placements = section.fields?.placements as Record<string, { wholeSignHouse: number; bhavaHouse: number | null }>;
    expect(placements.Sun.wholeSignHouse).toBe(10);
    expect(placements.Moon.wholeSignHouse).toBe(1);
    expect(placements.Mars.wholeSignHouse).toBe(4);
    expect(placements.Sun.bhavaHouse).toBeNull();
    expect(placements.Moon.bhavaHouse).toBeNull();
    expect(placements.Mars.bhavaHouse).toBeNull();
  });

  it('normalizes whole-sign house wraparound', () => {
    expect(calculateWholeSignHouse(1, 4)).toBe(10);
    expect(calculateWholeSignHouse(4, 4)).toBe(1);
    expect(calculateWholeSignHouse(12, 1)).toBe(12);
    expect(calculateWholeSignHouse(1, 12)).toBe(2);
  });

  it('rejects malformed cusp arrays', () => {
    expect(() => normalizeHouseCusps([1, 2, 3])).toThrow(/exactly 12/i);
    expect(() => normalizeHouseCusps([1, 2, 3, 4, 5, 6, 7, 8, 9, Number.NaN, 11, 12])).toThrow(/finite/i);
  });

  it('returns unavailable when Lagna is unavailable', async () => {
    const section = await buildHousesSectionV2({
      planetaryPositions: planetarySection(),
      lagna: {
        status: 'unavailable',
        source: 'none',
        reason: 'insufficient_birth_data',
        fields: {},
      },
      houseSystem: 'whole_sign',
    });

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
    expect(section.fields?.houses).toMatchObject({
      status: 'unavailable',
      source: 'none',
      reason: 'insufficient_birth_data',
    });
  });

  it('does not mix tropical cusps with sidereal planetary longitudes without ayanamsha', async () => {
    const section = await buildHousesSectionV2({
      planetaryPositions: planetarySection(),
      lagna: lagnaSection(),
      houseSystem: 'sripati',
      ephemerisProvider: fakeCuspProvider,
      jdUtExact: 2451545,
      latitudeDeg: 13.08,
      longitudeDeg: 80.27,
    });

    expect(section.status).toBe('partial');
    expect(section.reason).toBe('house_cusps_unavailable');
    const placements = section.fields?.placements as Record<string, { wholeSignHouse: number; bhavaHouse: number | null }>;
    expect(placements.Sun.wholeSignHouse).toBe(10);
    expect(placements.Moon.wholeSignHouse).toBe(1);
    expect(placements.Mars.wholeSignHouse).toBe(4);
    expect(placements.Sun.bhavaHouse).toBeNull();
    expect(placements.Moon.bhavaHouse).toBeNull();
    expect(placements.Mars.bhavaHouse).toBeNull();
    expect(String(section.warnings?.[0] ?? '')).toMatch(/whole-sign/i);
  });

  it('computes sidereal cusps and bhava placement when provider cusps and ayanamsha are available', async () => {
    const section = await buildHousesSectionV2({
      planetaryPositions: planetarySection(),
      lagna: lagnaSection(),
      houseSystem: 'sripati',
      ephemerisProvider: fakeCuspProvider,
      jdUtExact: 2451545,
      latitudeDeg: 13.08,
      longitudeDeg: 80.27,
      ayanamshaDeg: 24,
    });

    expect(section.status).toBe('computed');
    const cusps = section.fields?.cusps as Array<{ houseNumber: number; cuspLongitudeDeg: number }>;
    expect(cusps).toHaveLength(12);
    expect(cusps[0]?.cuspLongitudeDeg).toBe(100);
    const placements = section.fields?.placements as Record<string, { wholeSignHouse: number; bhavaHouse: number | null }>;
    expect(placements.Sun.wholeSignHouse).toBe(10);
    expect(placements.Moon.wholeSignHouse).toBe(1);
    expect(placements.Mars.wholeSignHouse).toBe(4);
    expect(placements.Sun.bhavaHouse).toBe(10);
    expect(placements.Moon.bhavaHouse).toBe(12);
    expect(placements.Mars.bhavaHouse).toBe(3);
  });
});
