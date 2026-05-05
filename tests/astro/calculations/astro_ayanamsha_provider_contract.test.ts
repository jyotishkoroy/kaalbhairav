/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import type { AyanamshaProvider } from '@/lib/astro/calculations/ayanamsha-provider';
import { normalizeAyanamshaType, tropicalToSidereal } from '@/lib/astro/calculations/ayanamsha-provider';

const fakeAyanamshaProvider: AyanamshaProvider = {
  engineId: 'fake-ayanamsha-provider-v1',
  calculateAyanamshaDeg(jdUtExact, type) {
    if (!Number.isFinite(jdUtExact)) {
      throw new Error('bad JD');
    }

    if (type === 'lahiri') {
      return 24.1;
    }

    if (type === 'kp_new') {
      return 23.95;
    }

    throw new Error('unsupported type');
  },
};

describe('astro ayanamsha provider contract', () => {
  it('returns distinct Lahiri and KP New ayanamsha values from a versioned provider', () => {
    const lahiri = fakeAyanamshaProvider.calculateAyanamshaDeg(2451545.0, 'lahiri');
    const kpNew = fakeAyanamshaProvider.calculateAyanamshaDeg(2451545.0, 'kp_new');

    expect(fakeAyanamshaProvider.engineId).toBeTruthy();
    expect(lahiri).toBe(24.1);
    expect(kpNew).toBe(23.95);
    expect(lahiri).not.toBe(kpNew);
  });

  it('normalizes sidereal subtraction across zero degrees', () => {
    expect(tropicalToSidereal(1, 24.1)).toBeCloseTo(336.9);
    expect(tropicalToSidereal(359, 24.1)).toBeCloseTo(334.9);
    expect(tropicalToSidereal(24.1, 24.1)).toBe(0);
  });

  it('rejects unsupported ayanamsha labels', () => {
    expect(() => normalizeAyanamshaType('Raman')).toThrow(/Unsupported ayanamsha type/);
    expect(() => normalizeAyanamshaType(null)).toThrow(/Ayanamsha type must be a string/);
  });

  it('rejects non-finite tropical longitude or ayanamsha', () => {
    expect(() => tropicalToSidereal(Number.NaN, 24)).toThrow(/finite number/);
    expect(() => tropicalToSidereal(100, Number.POSITIVE_INFINITY)).toThrow(/finite number/);
  });

  it('accepts report-style Lahiri and KP New labels without treating KP New as Lahiri', () => {
    expect(normalizeAyanamshaType('Lahiri')).toBe('lahiri');
    expect(normalizeAyanamshaType('lahiri')).toBe('lahiri');
    expect(normalizeAyanamshaType('K. P. New')).toBe('kp_new');
    expect(normalizeAyanamshaType('kp_new')).toBe('kp_new');
  });
});
