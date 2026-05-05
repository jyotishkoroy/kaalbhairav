/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import { calculateVimshottariDashaV2 } from '@/lib/astro/calculations/vimshottari';
import {
  NAKSHATRA_SPAN_DEG,
  VIMSHOTTARI_YEAR_DAYS,
  VIMSHOTTARI_YEARS,
} from '@/lib/astro/calculations/dasha-constants';
import { isUnavailableValue } from '@/lib/astro/calculations/unavailable';

const birthUtcIso = '2000-01-01T00:00:00.000Z';

describe('astro vimshottari balance fixture contract', () => {
  it('computes birth lord and full balance in middle of Ashwini', () => {
    const section = calculateVimshottariDashaV2({
      moonLongitudeDeg: NAKSHATRA_SPAN_DEG / 2,
      birthUtcIso,
      runtimeClockIso: '2001-01-01T00:00:00.000Z',
    });
    const fields = section.fields as {
      birthNakshatra?: string;
      birthNakshatraPada?: 1 | 2 | 3 | 4;
      birthNakshatraLord?: string;
      dashaBalanceYears?: number;
      dashaBalanceDays?: number;
      currentMahadasha?: { lord?: string } | null;
      currentAntardasha?: { lord?: string } | null;
    } | undefined;

    expect(section.status).toBe('computed');
    expect(fields?.birthNakshatra).toBe('Ashwini');
    expect(fields?.birthNakshatraPada).toBe(3);
    expect(fields?.birthNakshatraLord).toBe('Ketu');
    expect(fields?.dashaBalanceYears).toBeCloseTo(3.5, 10);
    expect(fields?.dashaBalanceDays).toBeCloseTo(3.5 * VIMSHOTTARI_YEAR_DAYS, 10);
    expect(fields?.currentMahadasha?.lord).toBe('Ketu');
  });

  it('near nakshatra boundary gives very small balance', () => {
    const section = calculateVimshottariDashaV2({
      moonLongitudeDeg: NAKSHATRA_SPAN_DEG - 0.001,
      birthUtcIso,
      runtimeClockIso: '2000-01-02T00:00:00.000Z',
    });

    expect(section.status).toBe('computed');
    expect(section.fields?.birthNakshatraLord).toBe('Ketu');
    expect(section.fields?.dashaBalanceYears ?? 0).toBeGreaterThanOrEqual(0);
    expect(section.fields?.dashaBalanceYears ?? 0).toBeLessThan(0.001);
  });

  it('returns error section for malformed runtime clock', () => {
    const section = calculateVimshottariDashaV2({
      moonLongitudeDeg: 0,
      birthUtcIso,
      runtimeClockIso: 'not-a-date',
    });

    expect(section.status).toBe('error');
    expect(section.source).toBe('none');
  });

  it('returns unavailable when Moon longitude is missing', () => {
    const section = calculateVimshottariDashaV2({
      moonLongitudeDeg: null,
      birthUtcIso,
      runtimeClockIso: '2000-01-01T00:00:00.000Z',
    });

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
    expect(isUnavailableValue(section.fields?.vimshottari)).toBe(true);
  });

  it('returns unavailable when birth UTC is missing', () => {
    const section = calculateVimshottariDashaV2({
      moonLongitudeDeg: 0,
      birthUtcIso: null,
      runtimeClockIso: '2000-01-01T00:00:00.000Z',
    });

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
  });

  it('uses 365.25-day year, not 360-day year', () => {
    const section = calculateVimshottariDashaV2({
      moonLongitudeDeg: NAKSHATRA_SPAN_DEG / 2,
      birthUtcIso,
      runtimeClockIso: '2001-01-01T00:00:00.000Z',
    });

    expect(section.fields?.dashaBalanceDays).toBeCloseTo(3.5 * 365.25, 10);
    expect(section.fields?.dashaBalanceDays).not.toBeCloseTo(3.5 * 360, 10);
  });

  it('selects current antardasha using deterministic runtime clock', () => {
    const section = calculateVimshottariDashaV2({
      moonLongitudeDeg: 0,
      birthUtcIso,
      runtimeClockIso: '2000-02-01T00:00:00.000Z',
    });
    const fields = section.fields as {
      currentMahadasha?: { lord?: string } | null;
      currentAntardasha?: { lord?: string } | null;
    } | undefined;

    expect(section.status).toBe('computed');
    expect(fields?.currentMahadasha?.lord).toBe('Ketu');
    expect(fields?.currentAntardasha?.lord).toBe('Ketu');
  });
});
