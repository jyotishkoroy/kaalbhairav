/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import type { AstroSectionContract } from '@/lib/astro/calculations/contracts.ts';
import {
  buildDoshaSectionV2,
  calculateKalsarpaBoundary,
  calculateManglikDosha,
} from '@/lib/astro/calculations/dosha-v2.ts';
import { isUnavailableValue } from '@/lib/astro/calculations/unavailable.ts';

function planetarySection(overrides: Record<string, unknown> = {}): AstroSectionContract {
  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      byBody: {
        Sun: { body: 'Sun', sign: 'Aries', signNumber: 1, degreeInSign: 10, absoluteLongitude: 10, nakshatra: 'Ashwini', pada: 4, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Moon: { body: 'Moon', sign: 'Cancer', signNumber: 4, degreeInSign: 5, absoluteLongitude: 95, nakshatra: 'Pushya', pada: 1, retrograde: false, speedDegPerDay: 13, source: 'deterministic_calculation' },
        Mars: { body: 'Mars', sign: 'Libra', signNumber: 7, degreeInSign: 0, absoluteLongitude: 180, nakshatra: 'Chitra', pada: 3, retrograde: true, speedDegPerDay: -0.2, source: 'deterministic_calculation' },
        Mercury: { body: 'Mercury', sign: 'Aries', signNumber: 1, degreeInSign: 12, absoluteLongitude: 12, nakshatra: 'Ashwini', pada: 4, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Jupiter: { body: 'Jupiter', sign: 'Cancer', signNumber: 4, degreeInSign: 9, absoluteLongitude: 99, nakshatra: 'Pushya', pada: 2, retrograde: false, speedDegPerDay: 0.1, source: 'deterministic_calculation' },
        Venus: { body: 'Venus', sign: 'Virgo', signNumber: 6, degreeInSign: 11, absoluteLongitude: 161, nakshatra: 'Hasta', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Saturn: { body: 'Saturn', sign: 'Taurus', signNumber: 2, degreeInSign: 20, absoluteLongitude: 50, nakshatra: 'Rohini', pada: 4, retrograde: true, speedDegPerDay: -0.03, source: 'deterministic_calculation' },
        Rahu: { body: 'Rahu', sign: 'Gemini', signNumber: 3, degreeInSign: 0, absoluteLongitude: 60, nakshatra: 'Mrigashira', pada: 3, retrograde: true, speedDegPerDay: -0.05, source: 'deterministic_calculation' },
        Ketu: { body: 'Ketu', sign: 'Sagittarius', signNumber: 9, degreeInSign: 0, absoluteLongitude: 240, nakshatra: 'Mula', pada: 1, retrograde: true, speedDegPerDay: -0.05, source: 'deterministic_calculation' },
        ...overrides,
      },
    },
  };
}

function housesSection(marsHouse = 4): AstroSectionContract {
  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      placements: {
        Mars: { body: 'Mars', sign: 'Libra', signNumber: 7, degreeInSign: 0, absoluteLongitude: 180, wholeSignHouse: marsHouse, bhavaHouse: null, source: 'deterministic_calculation' },
      },
    },
  };
}

describe('dosha-v2 fixture contract', () => {
  it('computes Manglik when Mars is in configured whole-sign dosha house', () => {
    const result = calculateManglikDosha({ planetaryPositions: planetarySection(), houses: housesSection(4) });

    expect(isUnavailableValue(result)).toBe(false);
    const manglik = result as {
      status: 'computed';
      isManglik: boolean;
      triggeringHouses: number[];
      basis: Array<'lagna' | 'moon' | 'venus'>;
    };
    expect(manglik.status).toBe('computed');
    expect(manglik.isManglik).toBe(true);
    expect(manglik.triggeringHouses).toContain(4);
    expect(manglik.basis).toContain('lagna');
  });

  it('does not treat non-dosha Mars houses as Manglik from Lagna', () => {
    const result = calculateManglikDosha({ planetaryPositions: planetarySection(), houses: housesSection(3) });

    expect(isUnavailableValue(result)).toBe(false);
    const manglik = result as {
      status: 'computed';
      isManglik: boolean;
      triggeringHouses: number[];
      basis: Array<'lagna' | 'moon' | 'venus'>;
    };
    expect(manglik.status).toBe('computed');
    expect(manglik.basis).not.toContain('lagna');
    expect(manglik.triggeringHouses).not.toContain(3);
  });

  it('returns unavailable when Mars position is missing', () => {
    const result = calculateManglikDosha({
      planetaryPositions: planetarySection({ Mars: undefined }),
      houses: housesSection(),
    });

    expect(isUnavailableValue(result)).toBe(true);
  });

  it('detects Kalsarpa boundary when all classical planets are on one Rahu-Ketu arc', () => {
    const result = calculateKalsarpaBoundary({
      planetaryPositions: planetarySection({
        Sun: { body: 'Sun', sign: 'Cancer', signNumber: 4, degreeInSign: 0, absoluteLongitude: 90, nakshatra: 'Pushya', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Moon: { body: 'Moon', sign: 'Leo', signNumber: 5, degreeInSign: 0, absoluteLongitude: 120, nakshatra: 'Magha', pada: 1, retrograde: false, speedDegPerDay: 13, source: 'deterministic_calculation' },
        Mars: { body: 'Mars', sign: 'Virgo', signNumber: 6, degreeInSign: 0, absoluteLongitude: 150, nakshatra: 'Hasta', pada: 1, retrograde: true, speedDegPerDay: -0.2, source: 'deterministic_calculation' },
        Mercury: { body: 'Mercury', sign: 'Libra', signNumber: 7, degreeInSign: 0, absoluteLongitude: 180, nakshatra: 'Chitra', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Jupiter: { body: 'Jupiter', sign: 'Scorpio', signNumber: 8, degreeInSign: 0, absoluteLongitude: 200, nakshatra: 'Anuradha', pada: 1, retrograde: false, speedDegPerDay: 0.1, source: 'deterministic_calculation' },
        Venus: { body: 'Venus', sign: 'Sagittarius', signNumber: 9, degreeInSign: 0, absoluteLongitude: 220, nakshatra: 'Mula', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Saturn: { body: 'Saturn', sign: 'Capricorn', signNumber: 10, degreeInSign: 0, absoluteLongitude: 230, nakshatra: 'Uttara Ashadha', pada: 1, retrograde: true, speedDegPerDay: -0.03, source: 'deterministic_calculation' },
      }),
    });

    expect(isUnavailableValue(result)).toBe(false);
    const kalsarpa = result as {
      status: 'computed' | 'unavailable';
      isKalsarpa: boolean | null;
      classification: 'none' | 'all_planets_between_rahu_ketu' | 'unavailable';
    };
    expect(kalsarpa.status).toBe('computed');
    expect(kalsarpa.isKalsarpa).toBe(true);
    expect(kalsarpa.classification).toBe('all_planets_between_rahu_ketu');
  });

  it('returns none when classical planets are split across both node arcs', () => {
    const result = calculateKalsarpaBoundary({
      planetaryPositions: planetarySection({
        Sun: { body: 'Sun', sign: 'Cancer', signNumber: 4, degreeInSign: 0, absoluteLongitude: 90, nakshatra: 'Pushya', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Moon: { body: 'Moon', sign: 'Leo', signNumber: 5, degreeInSign: 0, absoluteLongitude: 120, nakshatra: 'Magha', pada: 1, retrograde: false, speedDegPerDay: 13, source: 'deterministic_calculation' },
        Mars: { body: 'Mars', sign: 'Virgo', signNumber: 6, degreeInSign: 0, absoluteLongitude: 150, nakshatra: 'Hasta', pada: 1, retrograde: true, speedDegPerDay: -0.2, source: 'deterministic_calculation' },
        Mercury: { body: 'Mercury', sign: 'Libra', signNumber: 7, degreeInSign: 0, absoluteLongitude: 180, nakshatra: 'Chitra', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Jupiter: { body: 'Jupiter', sign: 'Scorpio', signNumber: 8, degreeInSign: 0, absoluteLongitude: 200, nakshatra: 'Anuradha', pada: 1, retrograde: false, speedDegPerDay: 0.1, source: 'deterministic_calculation' },
        Venus: { body: 'Venus', sign: 'Sagittarius', signNumber: 9, degreeInSign: 0, absoluteLongitude: 220, nakshatra: 'Mula', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Saturn: { body: 'Saturn', sign: 'Aquarius', signNumber: 11, degreeInSign: 0, absoluteLongitude: 300, nakshatra: 'Dhanishta', pada: 1, retrograde: true, speedDegPerDay: -0.03, source: 'deterministic_calculation' },
      }),
    });

    expect(isUnavailableValue(result)).toBe(false);
    const kalsarpa = result as {
      status: 'computed' | 'unavailable';
      isKalsarpa: boolean | null;
      classification: 'none' | 'all_planets_between_rahu_ketu' | 'unavailable';
    };
    expect(kalsarpa.status).toBe('computed');
    expect(kalsarpa.isKalsarpa).toBe(false);
    expect(kalsarpa.classification).toBe('none');
  });

  it('planets exactly on Rahu or Ketu are not considered inside strict arc', () => {
    const result = calculateKalsarpaBoundary({
      planetaryPositions: planetarySection({
        Sun: { body: 'Sun', sign: 'Gemini', signNumber: 3, degreeInSign: 0, absoluteLongitude: 60, nakshatra: 'Mrigashira', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Moon: { body: 'Moon', sign: 'Leo', signNumber: 5, degreeInSign: 0, absoluteLongitude: 120, nakshatra: 'Magha', pada: 1, retrograde: false, speedDegPerDay: 13, source: 'deterministic_calculation' },
        Mars: { body: 'Mars', sign: 'Virgo', signNumber: 6, degreeInSign: 0, absoluteLongitude: 150, nakshatra: 'Hasta', pada: 1, retrograde: true, speedDegPerDay: -0.2, source: 'deterministic_calculation' },
        Mercury: { body: 'Mercury', sign: 'Libra', signNumber: 7, degreeInSign: 0, absoluteLongitude: 180, nakshatra: 'Chitra', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Jupiter: { body: 'Jupiter', sign: 'Scorpio', signNumber: 8, degreeInSign: 0, absoluteLongitude: 200, nakshatra: 'Anuradha', pada: 1, retrograde: false, speedDegPerDay: 0.1, source: 'deterministic_calculation' },
        Venus: { body: 'Venus', sign: 'Sagittarius', signNumber: 9, degreeInSign: 0, absoluteLongitude: 220, nakshatra: 'Mula', pada: 1, retrograde: false, speedDegPerDay: 1, source: 'deterministic_calculation' },
        Saturn: { body: 'Saturn', sign: 'Capricorn', signNumber: 10, degreeInSign: 0, absoluteLongitude: 230, nakshatra: 'Uttara Ashadha', pada: 1, retrograde: true, speedDegPerDay: -0.03, source: 'deterministic_calculation' },
      }),
    });

    const kalsarpa = result as {
      status: 'computed' | 'unavailable';
      isKalsarpa: boolean | null;
      classification: 'none' | 'all_planets_between_rahu_ketu' | 'unavailable';
    };
    expect(kalsarpa.status).toBe('computed');
    expect(kalsarpa.isKalsarpa).toBe(false);
  });

  it('buildDoshaSectionV2 includes safe remedies and unsupported modules as unavailable', () => {
    const section = buildDoshaSectionV2({
      planetaryPositions: planetarySection(),
      houses: housesSection(4),
    });

    expect(section.status).toBe('computed');
    expect(Array.isArray(section.fields?.safeRemedies)).toBe(true);
    for (const remedy of section.fields?.safeRemedies as string[]) {
      expect(remedy).not.toMatch(/must.*gemstone|guaranteed.*gemstone|puja pressure/i);
    }
    const unsupported = (section.fields as Record<string, unknown>).unsupported as Record<string, unknown>;
    expect(isUnavailableValue(unsupported?.shadbala)).toBe(true);
  });

  it('buildDoshaSectionV2 returns unavailable when planetary positions are unavailable', () => {
    const section = buildDoshaSectionV2({
      planetaryPositions: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
      houses: housesSection(),
    });

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
  });
});
