/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import {
  VARGA_TYPES,
  calculateAllShodashvarga,
  calculateAllShodashvargaForLongitude,
  calculateVargaSign,
} from '@/lib/astro/calculations/shodashvarga';

describe('astro shodashvarga fixture contract', () => {
  it('computes all 16 vargas for Aries 10 degrees', () => {
    const all = calculateAllShodashvargaForLongitude(10);
    expect(Object.keys(all)).toEqual(VARGA_TYPES);
    expect(all.D1).toBe(1);
    expect(all.D2).toBe(5);
    expect(all.D3).toBe(5);
    expect(all.D4).toBe(4);
    expect(all.D7).toBe(3);
    expect(all.D9).toBe(4);
    expect(all.D10).toBe(4);
    expect(all.D12).toBe(5);
    expect(all.D16).toBe(6);
    expect(all.D20).toBe(7);
    expect(all.D24).toBe(1);
    expect(all.D27).toBe(10);
    expect(all.D30).toBe(9);
    expect(all.D40).toBe(2);
    expect(all.D45).toBe(4);
    expect(all.D60).toBe(9);
  });

  it('handles exact sign and segment boundaries with floor arithmetic', () => {
    expect(calculateVargaSign(30, 'D1').signNumber).toBe(2);
    expect(calculateVargaSign(3 + 20 / 60, 'D9').signNumber).toBe(2);
    expect(calculateVargaSign(6 + 40 / 60, 'D9').signNumber).toBe(3);
    expect(calculateVargaSign(5, 'D30').signNumber).toBe(11);
  });

  it('rejects malformed longitudes and unknown varga types', () => {
    expect(() => calculateVargaSign(Number.NaN, 'D1')).toThrow('Invalid longitude for varga calculation');
    expect(() => calculateVargaSign(Number.POSITIVE_INFINITY, 'D2')).toThrow('Invalid longitude for varga calculation');
    expect(() => calculateVargaSign(Number.NEGATIVE_INFINITY, 'D3')).toThrow('Invalid longitude for varga calculation');
    expect(() => calculateVargaSign(10, 'D99' as never)).toThrow('Unsupported varga type: D99');
  });

  it('skips missing longitudes without emitting NaN signs', () => {
    const byBody = calculateAllShodashvarga({
      byBody: {
        Sun: { siderealLongitudeDeg: 10 },
        Moon: { absoluteLongitude: Number.NaN },
        Mars: {},
        Mercury: { longitude: 40 },
      },
    });

    expect(byBody.Sun?.D1?.signNumber).toBe(1);
    expect(byBody.Mercury?.D1?.signNumber).toBe(2);
    expect(byBody.Moon).toBeUndefined();
    expect(byBody.Mars).toBeUndefined();
    expect(JSON.stringify(byBody)).not.toContain('NaN');
  });

  it('uses AstroSage compatible integer-degree D7 behavior', () => {
    expect(calculateVargaSign(35.9, 'D7').signNumber).toBe(9);
    expect(calculateVargaSign(34.1, 'D7').signNumber).toBe(8);
  });
});
