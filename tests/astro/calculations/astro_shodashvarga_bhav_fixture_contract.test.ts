/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import type { AstroSectionContract, PlanetaryPositionV2 } from '@/lib/astro/calculations/contracts';
import {
  buildShodashvargaSection,
  calculateAllShodashvarga,
} from '@/lib/astro/calculations/shodashvarga';
import {
  buildShodashvargaBhavSection,
  calculateVargaBhav,
} from '@/lib/astro/calculations/varga-bhav';

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
        Mars: {
          body: 'Mars',
          sign: 'Libra',
          signNumber: 7,
          degreeInSign: 0,
          absoluteLongitude: 180,
          nakshatra: 'Swati',
          pada: 1,
          retrograde: false,
          speedDegPerDay: 1,
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

describe('astro shodashvarga bhav fixture contract', () => {
  it('calculates Varga Bhav with 1-based house-relative formula', () => {
    expect(calculateVargaBhav(1, 4)).toBe(10);
    expect(calculateVargaBhav(4, 4)).toBe(1);
    expect(calculateVargaBhav(7, 4)).toBe(4);
    expect(calculateVargaBhav(12, 1)).toBe(12);
    expect(calculateVargaBhav(1, 12)).toBe(2);
  });

  it('computes Shodashvarga Bhav for all bodies when Asc vargas exist', () => {
    const shodashvarga = buildShodashvargaSection({
      planetaryPositions: planetarySection(),
      lagna: lagnaSection(),
    });
    const section = buildShodashvargaBhavSection({ shodashvarga });

    expect(section.status).toBe('computed');
    const byBody = section.fields?.byBody as Record<string, Record<string, { bhavNumber: number; source: string }>> | undefined;
    expect(byBody?.Sun?.D1?.bhavNumber).toBe(10);
    expect(byBody?.Asc?.D1?.bhavNumber).toBe(1);
    expect(byBody?.Moon?.D1?.bhavNumber).toBe(11);
    expect(byBody?.Sun?.D1?.source).toBe('deterministic_calculation');
    expect(byBody?.Moon?.D1?.source).toBe('deterministic_calculation');
    expect(byBody?.Asc?.D1?.source).toBe('deterministic_calculation');
  });

  it('handles wraparound from Pisces Lagna to Aries planet', () => {
    expect(calculateVargaBhav(1, 12)).toBe(2);
    expect(calculateVargaBhav(12, 12)).toBe(1);
    expect(calculateVargaBhav(11, 12)).toBe(12);
  });

  it('rejects invalid sign numbers', () => {
    expect(() => calculateVargaBhav(0, 1)).toThrow();
    expect(() => calculateVargaBhav(13, 1)).toThrow();
    expect(() => calculateVargaBhav(1, 0)).toThrow();
    expect(() => calculateVargaBhav(1.5, 1)).toThrow();
  });

  it('returns unavailable when Asc varga signs are missing', () => {
    const shodashvarga = buildShodashvargaSection({
      planetaryPositions: planetarySection(),
      lagna: {
        status: 'unavailable',
        source: 'none',
        reason: 'insufficient_birth_data',
        fields: {},
      },
    } as { planetaryPositions: AstroSectionContract; lagna: AstroSectionContract });
    const section = buildShodashvargaBhavSection({ shodashvarga });

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
    expect(['lagna_varga_unavailable', 'shodashvarga_unavailable']).toContain(section.reason);
    expect(section.fields?.shodashvargaBhav).toMatchObject({
      status: 'unavailable',
      source: 'none',
    });
  });

  it('sign table is computed even when Bhav table is unavailable', () => {
    const shodashvarga = buildShodashvargaSection({
      planetaryPositions: planetarySection(),
      lagna: {
        status: 'unavailable',
        source: 'none',
        reason: 'insufficient_birth_data',
        fields: {},
      },
    } as { planetaryPositions: AstroSectionContract; lagna: AstroSectionContract });

    expect(shodashvarga.status).toBe('computed');
    expect((shodashvarga.fields?.byBody as Record<string, Record<string, unknown>> | undefined)?.Sun?.D1).toBeTruthy();

    const bhav = buildShodashvargaBhavSection({ shodashvarga });
    expect(bhav.status).toBe('unavailable');
  });

  it('Varga Bhav formula matches all Varga rows for a body', () => {
    const shodashvarga = buildShodashvargaSection({
      planetaryPositions: planetarySection(),
      lagna: lagnaSection(),
    });
    const bhav = buildShodashvargaBhavSection({ shodashvarga });

    expect(bhav.status).toBe('computed');
    const shodashvargaByBody = shodashvarga.fields?.byBody as Record<string, Record<string, { signNumber: number }>> | undefined;
    const bhavByBody = bhav.fields?.byBody as Record<string, Record<string, { bhavNumber: number }>> | undefined;

    const planetaryByBody = planetarySection().fields?.byBody as Record<string, PlanetaryPositionV2> | undefined;
    const sunPosition = planetaryByBody?.Sun;
    const calculated = calculateAllShodashvarga({
      byBody: { Sun: sunPosition },
      ascendantLongitudeDeg: 100,
    }) as Record<string, Record<string, { signNumber: number }>>;

    for (const vargaType of Object.keys(calculated.Sun ?? {})) {
      const expected = calculateVargaBhav(
        shodashvargaByBody?.Sun?.[vargaType as keyof typeof shodashvargaByBody.Sun]?.signNumber ?? 1,
        shodashvargaByBody?.Asc?.[vargaType as keyof typeof shodashvargaByBody.Asc]?.signNumber ?? 4,
      );
      expect(bhavByBody?.Sun?.[vargaType]?.bhavNumber).toBe(expected);
    }
  });
});
