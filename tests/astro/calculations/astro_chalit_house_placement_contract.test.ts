/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import {
  applyBhavaHousesToPlacements,
  calculateBhavaHouseFromCusps,
  normalizeHouseCusps,
} from '@/lib/astro/calculations/houses';

const cusps = normalizeHouseCusps([
  100,
  130,
  160,
  190,
  220,
  250,
  280,
  310,
  340,
  10,
  40,
  70,
]);

describe('astro chalit house placement contract', () => {
  it('places planets into bhava intervals using sidereal cusps', () => {
    expect(calculateBhavaHouseFromCusps(105, cusps)).toBe(1);
    expect(calculateBhavaHouseFromCusps(145, cusps)).toBe(2);
    expect(calculateBhavaHouseFromCusps(200, cusps)).toBe(4);
  });

  it('handles wraparound interval across Aries zero', () => {
    expect(calculateBhavaHouseFromCusps(350, cusps)).toBe(9);
    expect(calculateBhavaHouseFromCusps(5, cusps)).toBe(9);
    expect(calculateBhavaHouseFromCusps(10, cusps)).toBe(10);
  });

  it('exact cusp belongs to starting house', () => {
    expect(calculateBhavaHouseFromCusps(100, cusps)).toBe(1);
    expect(calculateBhavaHouseFromCusps(130, cusps)).toBe(2);
    expect(calculateBhavaHouseFromCusps(70, cusps)).toBe(12);
  });

  it('rejects non-finite planet longitude', () => {
    expect(() => calculateBhavaHouseFromCusps(Number.NaN, cusps)).toThrow(/finite/i);
    expect(() => calculateBhavaHouseFromCusps(Number.POSITIVE_INFINITY, cusps)).toThrow(/finite/i);
  });

  it('returns null when cusp intervals are degenerate', () => {
    const degenerate = normalizeHouseCusps([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(calculateBhavaHouseFromCusps(10, degenerate)).toBeNull();
  });

  it('applying bhava houses preserves original sign and whole-sign house fields', () => {
    const placements = {
      Sun: {
        body: 'Sun',
        sign: 'Aries',
        signNumber: 1,
        degreeInSign: 10,
        absoluteLongitude: 10,
        wholeSignHouse: 10,
        bhavaHouse: null,
        source: 'deterministic_calculation',
      },
      Moon: {
        body: 'Moon',
        sign: 'Cancer',
        signNumber: 4,
        degreeInSign: 5,
        absoluteLongitude: 95,
        wholeSignHouse: 1,
        bhavaHouse: null,
        source: 'deterministic_calculation',
      },
    } as const;

    const next = applyBhavaHousesToPlacements({
      placements: placements as unknown as Record<string, (typeof placements)[keyof typeof placements]>,
      cusps,
    });

    expect(next.Sun.sign).toBe('Aries');
    expect(next.Sun.signNumber).toBe(1);
    expect(next.Sun.wholeSignHouse).toBe(10);
    expect(next.Sun.bhavaHouse).toBe(10);
    expect(next.Moon.wholeSignHouse).toBe(1);
    expect(next.Moon.bhavaHouse).toBe(12);
  });
});
