/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import type { AstroSectionContract } from '@/lib/astro/calculations/contracts.ts';
import {
  buildYogaSectionV2,
  calculateBudhaAdityaYoga,
  calculateChandraMangalYoga,
  calculateGajakesariYoga,
} from '@/lib/astro/calculations/yoga-v2.ts';
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

describe('yoga-v2 fixture contract', () => {
  it('detects Gajakesari when Jupiter is in kendra from Moon', () => {
    const result = calculateGajakesariYoga(planetarySection());

    expect(result.status).toBe('present');
    expect([1, 4, 7, 10]).toContain(result.evidence.jupiterHouseFromMoon as number);
  });

  it('marks Gajakesari absent when Jupiter is not in kendra from Moon', () => {
    const result = calculateGajakesariYoga(planetarySection({
      Jupiter: { body: 'Jupiter', sign: 'Leo', signNumber: 5, degreeInSign: 0, absoluteLongitude: 130, nakshatra: 'Magha', pada: 1, retrograde: false, speedDegPerDay: 0.1, source: 'deterministic_calculation' },
    }));

    expect(result.status).toBe('absent');
  });

  it('detects Chandra-Mangal when Mars is same sign or 7th from Moon', () => {
    const result = calculateChandraMangalYoga(planetarySection({
      Mars: { body: 'Mars', sign: 'Capricorn', signNumber: 10, degreeInSign: 0, absoluteLongitude: 270, nakshatra: 'Uttara Ashadha', pada: 1, retrograde: true, speedDegPerDay: -0.2, source: 'deterministic_calculation' },
    }));

    expect(result.status).toBe('present');
  });

  it('detects Budha-Aditya when Sun and Mercury share sign', () => {
    const result = calculateBudhaAdityaYoga(planetarySection());

    expect(result.status).toBe('present');
  });

  it('returns unavailable for missing required planet', () => {
    const result = calculateBudhaAdityaYoga(planetarySection({ Mercury: undefined }));

    expect(isUnavailableValue(result)).toBe(false);
    expect(result.status).toBe('unavailable');
    expect(result.source).toBe('none');
  });

  it('buildYogaSectionV2 returns deterministic rules and unsupported complex yogas unavailable', () => {
    const section = buildYogaSectionV2({ planetaryPositions: planetarySection() });

    expect(section.status).toBe('computed');
    const fields = section.fields as Record<string, unknown>;
    expect(fields.rules).toBeTruthy();
    const unsupported = fields.unsupported as Record<string, unknown>;
    expect(isUnavailableValue(unsupported.rajYogaDetailed)).toBe(true);
  });

  it('buildYogaSectionV2 returns unavailable when planetary positions unavailable', () => {
    const section = buildYogaSectionV2({
      planetaryPositions: { status: 'unavailable', source: 'none', reason: 'insufficient_birth_data', fields: {} },
    });

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
    expect(isUnavailableValue(section.fields?.yoga)).toBe(true);
  });
});
