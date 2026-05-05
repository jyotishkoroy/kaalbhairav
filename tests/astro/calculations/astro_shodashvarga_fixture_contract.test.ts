/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import fs from 'node:fs'
import path from 'node:path'
import type { AstroSectionContract } from '@/lib/astro/calculations/contracts';
import type { PlanetaryPositionV2 } from '@/lib/astro/calculations/contracts';
import {
  VARGA_TYPES,
  buildD9ChartSectionFromShodashvarga,
  buildShodashvargaSection,
  calculateAllShodashvarga,
  calculateVargaSign,
} from '@/lib/astro/calculations/shodashvarga';

function planetarySection(): AstroSectionContract {
  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
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
          sign: 'Taurus',
          signNumber: 2,
          degreeInSign: 15,
          absoluteLongitude: 45,
          nakshatra: 'Rohini',
          pada: 2,
          retrograde: false,
          speedDegPerDay: 13,
          source: 'deterministic_calculation',
        },
        Rahu: {
          body: 'Rahu',
          sign: 'Aquarius',
          signNumber: 11,
          degreeInSign: 26,
          absoluteLongitude: 326,
          nakshatra: 'Purva Bhadrapada',
          pada: 2,
          retrograde: true,
          speedDegPerDay: -0.05,
          source: 'deterministic_calculation',
        },
        Ketu: {
          body: 'Ketu',
          sign: 'Leo',
          signNumber: 5,
          degreeInSign: 26,
          absoluteLongitude: 146,
          nakshatra: 'Purva Phalguni',
          pada: 4,
          retrograde: true,
          speedDegPerDay: -0.05,
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
    },
  };
}

function loadVedicEvidenceFixture<T>(fileName: string): T[] {
  const fixturePath = path.join(process.cwd(), 'tests/astro/fixtures/vedic-calculation-evidence', fileName)
  if (!fs.existsSync(fixturePath)) return []
  const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as { cases?: T[] }
  return Array.isArray(parsed.cases) ? parsed.cases : []
}

describe('astro shodashvarga fixture contract', () => {
  it('loads sanitized evidence fixtures when present', () => {
    const cases = loadVedicEvidenceFixture<Record<string, unknown>>('varga_cases.json')
    expect(Array.isArray(cases)).toBe(true)
  })

  it('computes all 16 vargas for each deterministic body and Asc', () => {
    const section = buildShodashvargaSection({
      planetaryPositions: planetarySection(),
      lagna: lagnaSection(),
    });

    expect(section.status).toBe('computed');
    expect(section.fields?.vargaTypes).toEqual(VARGA_TYPES);

    const byBody = section.fields?.byBody as Record<string, Record<string, { source: string }>> | undefined;
    for (const body of ['Sun', 'Moon', 'Rahu', 'Ketu', 'Asc']) {
      expect(Object.keys(byBody?.[body] ?? {})).toHaveLength(16);
      for (const vargaType of VARGA_TYPES) {
        expect(byBody?.[body]?.[vargaType]?.source).toBe('deterministic_calculation');
      }
    }
  });

  it('computes expected core vargas for simple Aries 10 degrees', () => {
    expect(calculateVargaSign(10, 'D1')).toMatchObject({ signNumber: 1, signName: 'Aries' });
    expect(calculateVargaSign(10, 'D2')).toMatchObject({ signNumber: 5, signName: 'Leo' });
    expect(calculateVargaSign(5, 'D3')).toMatchObject({ signNumber: 1, signName: 'Aries' });
    expect(calculateVargaSign(10, 'D4')).toMatchObject({ signNumber: 4, signName: 'Cancer' });
    expect(calculateVargaSign(10, 'D9')).toMatchObject({ signNumber: 4, signName: 'Cancer' });
    expect(calculateVargaSign(10, 'D12')).toMatchObject({ signNumber: 5, signName: 'Leo' });
  });

  it('exact boundaries go to next segment through floor arithmetic', () => {
    expect(calculateVargaSign(30, 'D1')).toMatchObject({ signNumber: 2, signName: 'Taurus' });
    expect(calculateVargaSign(3 + 20 / 60, 'D9')).toMatchObject({ signNumber: 2, signName: 'Taurus' });
    expect(calculateVargaSign(360, 'D1')).toMatchObject({ signNumber: 1, signName: 'Aries' });
    expect(calculateVargaSign(-1, 'D1')).toMatchObject({ signNumber: 12, signName: 'Pisces' });
  });

  it('D7 uses integer-degree segmentation behavior', () => {
    expect(calculateVargaSign(4.9, 'D7')).toMatchObject({ signNumber: 1, signName: 'Aries' });
    expect(calculateVargaSign(5, 'D7')).toMatchObject({ signNumber: 2, signName: 'Taurus' });
    expect(calculateVargaSign(35, 'D7')).toMatchObject({ signNumber: 9, signName: 'Sagittarius' });
  });

  it('rejects invalid longitudes and unsupported varga types', () => {
    expect(() => calculateVargaSign(Number.NaN, 'D1')).toThrow();
    expect(() => calculateVargaSign(Number.POSITIVE_INFINITY, 'D9')).toThrow();
    expect(() => calculateVargaSign(10, 'D99' as never)).toThrow();
  });

  it('Rahu and Ketu use normal sidereal longitude and not reverse logic', () => {
    const section = buildShodashvargaSection({
      planetaryPositions: planetarySection(),
      lagna: lagnaSection(),
    });

    const byBody = section.fields?.byBody as Record<string, Record<string, { signNumber: number }>> | undefined;
    expect(byBody?.Rahu?.D1?.signNumber).toBe(11);
    expect(byBody?.Ketu?.D1?.signNumber).toBe(5);
    expect(byBody?.Rahu?.D1?.signNumber).not.toBe(byBody?.Ketu?.D1?.signNumber);
  });

  it('builds d9Chart section from shodashvarga without losing other vargas', () => {
    const shodashvarga = buildShodashvargaSection({
      planetaryPositions: planetarySection(),
      lagna: lagnaSection(),
    });
    const d9Chart = buildD9ChartSectionFromShodashvarga(shodashvarga);

    expect(d9Chart.status).toBe('computed');
    const byBody = d9Chart.fields?.byBody as Record<string, { vargaType: string; signNumber: number }> | undefined;
    expect(byBody?.Sun?.vargaType).toBe('D9');
    expect(byBody?.Moon?.vargaType).toBe('D9');
  });

  it('calculateAllShodashvarga includes Asc when lagna longitude is available', () => {
    const planetaryByBody = planetarySection().fields?.byBody as Record<string, PlanetaryPositionV2> | undefined;
    const sunPosition = planetaryByBody?.Sun;
    const calculated = calculateAllShodashvarga({
      byBody: {
        Sun: sunPosition,
      },
      ascendantLongitudeDeg: 100,
    }) as Record<string, Record<string, unknown>>;

    expect(calculated.Asc).toBeTruthy();
    expect(Object.keys(calculated.Asc ?? {})).toHaveLength(16);
  });
});
