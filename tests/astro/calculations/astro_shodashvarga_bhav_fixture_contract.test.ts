/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import {
  calculateAllShodashvargaBhav,
  calculateAllShodashvargaBhavFromSection,
  calculateVargaBhav,
} from '@/lib/astro/calculations/varga-bhav';

describe('astro shodashvarga bhav fixture contract', () => {
  it('computes bhav with 1-based wraparound formula', () => {
    expect(calculateVargaBhav(5, 1)).toBe(5);
    expect(calculateVargaBhav(1, 1)).toBe(1);
  });

  it('handles wraparound edges', () => {
    expect(calculateVargaBhav(12, 1)).toBe(12);
    expect(calculateVargaBhav(1, 12)).toBe(2);
  });

  it('rejects malformed signs', () => {
    expect(() => calculateVargaBhav(0, 1)).toThrow('Invalid sign for varga bhav calculation');
    expect(() => calculateVargaBhav(13, 1)).toThrow('Invalid sign for varga bhav calculation');
    expect(() => calculateVargaBhav(Number.NaN, 1)).toThrow('Invalid sign for varga bhav calculation');
    expect(() => calculateVargaBhav(1.2, 1)).toThrow('Invalid sign for varga bhav calculation');
  });

  it('returns empty bhav output when lagna varga signs are missing', () => {
    expect(
      calculateAllShodashvargaBhav({
        vargaSignsByBody: {
          Sun: { D1: 9 },
        },
      }),
    ).toEqual({});
    expect(
      calculateAllShodashvargaBhav({
        vargaSignsByBody: {
          Asc: { D1: 6 },
          Moon: { D1: 7 },
        },
        lagnaBodyKey: 'Lagna',
      }),
    ).toEqual({});
  });

  it('computes bhav for multiple vargas against Asc', () => {
    const result = calculateAllShodashvargaBhav({
      vargaSignsByBody: {
        Asc: { D1: 6, D9: 3 },
        Sun: { D1: 9, D9: 5 },
        Moon: { D1: 7, D9: 3 },
      },
    });

    expect(result.Sun?.D1).toBe(4);
    expect(result.Sun?.D9).toBe(3);
    expect(result.Moon?.D1).toBe(2);
    expect(result.Moon?.D9).toBe(1);
    expect(result.Asc?.D1).toBe(1);
  });

  it('matches the stated regression formula exactly', () => {
    const result = calculateAllShodashvargaBhav({
      vargaSignsByBody: {
        Asc: { D1: 6 },
        Moon: { D1: 7 },
      },
    });

    expect(result.Moon?.D1).toBe(((7 - 6) % 12 + 12) % 12 + 1);
  });

  it('section helper preserves computed bhav output when shodashvarga is available', () => {
    const section = calculateAllShodashvargaBhavFromSection({
      status: 'computed',
      source: 'deterministic_calculation',
      fields: {
        byBody: {
          Asc: { D1: 6 },
          Sun: { D1: 9 },
        },
      },
    });

    expect(section.status).toBe('computed');
    expect(section.fields?.byBody).toBeTruthy();
  });
});
