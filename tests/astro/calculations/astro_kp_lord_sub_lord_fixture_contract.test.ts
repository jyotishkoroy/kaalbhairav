/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import type { AyanamshaProvider } from '@/lib/astro/calculations/ayanamsha-provider';
import type { EphemerisProvider } from '@/lib/astro/calculations/ephemeris-provider';
import { calculateKpCusps } from '@/lib/astro/calculations/kp-cusps';
import {
  calculateKpLordDetails,
  calculateKpNakshatraLord,
  calculateKpRashiLord,
  locateKpSubLord,
  locateKpSubSubLord,
} from '@/lib/astro/calculations/kp-sub-lord';
import { calculateKpPlanetaryPositions, calculateKpSection } from '@/lib/astro/calculations/kp';
import { isUnavailableValue } from '@/lib/astro/calculations/unavailable';
import { NAKSHATRA_SPAN_DEG } from '@/lib/astro/calculations/dasha-constants';

const fakeAyanamshaProvider: AyanamshaProvider = {
  engineId: 'fake-kp-ayanamsha',
  calculateAyanamshaDeg(_jdUtExact, type) {
    if (type === 'kp_new') {
      return 23;
    }

    if (type === 'lahiri') {
      return 24;
    }

    throw new Error(`unsupported ayanamsha ${type}`);
  },
};

const fakeEphemerisProvider: EphemerisProvider = {
  engineId: 'fake-kp-ephemeris',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions() {
    return [
      { body: 'Sun', tropicalLongitudeDeg: 23, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Moon', tropicalLongitudeDeg: 36 + 20 / 60, retrograde: false, speedLongitudeDegPerDay: 13 },
      { body: 'Mars', tropicalLongitudeDeg: 53, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Mercury', tropicalLongitudeDeg: 83, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Jupiter', tropicalLongitudeDeg: 113, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Venus', tropicalLongitudeDeg: 143, retrograde: false, speedLongitudeDegPerDay: 1 },
      { body: 'Saturn', tropicalLongitudeDeg: 173, retrograde: true, speedLongitudeDegPerDay: -0.03 },
      { body: 'Rahu', tropicalLongitudeDeg: 350, retrograde: true, speedLongitudeDegPerDay: -0.05 },
    ];
  },
  async calculateAscendantMc() {
    return {
      ascendantTropicalDeg: 123,
      mcTropicalDeg: 213,
      cuspsTropicalDeg: [123, 153, 183, 213, 243, 273, 303, 333, 3, 33, 63, 93],
    };
  },
};

const noCuspProvider: EphemerisProvider = {
  engineId: 'fake-no-cusp-provider',
  engineVersion: 'fake-engine-v1',
  ephemerisVersion: 'fake-ephemeris-v1',
  async calculateTropicalPositions() {
    return fakeEphemerisProvider.calculateTropicalPositions(0, []);
  },
};

const normalizedTime: Parameters<typeof calculateKpSection>[0]['normalizedTime'] = {
  dateLocal: '2026-05-05',
  timeLocal: '07:30:00',
  localDateTimeIso: '2026-05-05T07:30:00.000',
  utcDateTimeIso: '2026-05-05T02:00:00.000Z',
  placeName: 'Test Place',
  latitudeDeg: 13.0833,
  longitudeDeg: 80.2707,
  timezoneMode: 'fixed_offset_hours',
  timezone: null,
  timezoneHours: 5.5,
  warTimeCorrectionSeconds: 0,
  standardMeridianDeg: 82.5,
  localTimeCorrectionSeconds: -535.032,
  localMeanTimeIso: '2026-05-05T07:21:04.968',
  printedJulianDay: 2460796,
  jdUtExact: 2460795.5833333335,
  runtimeClockIso: '2026-05-05T00:00:00.000Z',
  warnings: [],
};

describe('astro kp lord and sub-lord fixture contract', () => {
  it('calculates KP rashi and nakshatra lords from normalized sidereal longitude', () => {
    expect(calculateKpRashiLord(0)).toBe('Mars');
    expect(calculateKpNakshatraLord(0)).toBe('Ketu');
    expect(calculateKpRashiLord(30)).toBe('Venus');
    expect(calculateKpNakshatraLord(30)).toBe('Sun');
  });

  it('locates KP sub lord and sub-sub lord by Vimshottari proportional spans', () => {
    const nearStart = locateKpSubLord(0.01);
    const nearStartSubSub = locateKpSubSubLord(0.01);
    expect(nearStart.lord).toBe('Ketu');
    expect(nearStartSubSub.lord).toBe('Ketu');

    const afterKetuSub = locateKpSubLord(0.8);
    expect(afterKetuSub.lord).toBe('Venus');
  });

  it('exact KP sub boundary belongs to the next subdivision', () => {
    const boundary = (NAKSHATRA_SPAN_DEG * 7) / 120;
    expect(locateKpSubLord(boundary).lord).toBe('Venus');
    expect(calculateKpNakshatraLord(13 + 20 / 60)).toBe('Venus');
  });

  it('rejects malformed longitudes', () => {
    expect(() => calculateKpLordDetails(Number.NaN)).toThrow(/finite/);
    expect(() => locateKpSubLord(Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => calculateKpRashiLord(Number.NaN)).toThrow(/finite/);
  });

  it('returns unavailable when KP ayanamsha provider is missing', async () => {
    const section = await calculateKpSection({
      jdUtExact: normalizedTime!.jdUtExact!,
      normalizedTime,
      ephemerisProvider: fakeEphemerisProvider,
    });

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
    expect(isUnavailableValue(section.fields?.kp)).toBe(true);
    expect(isUnavailableValue(section.fields?.significators)).toBe(true);
  });

  it('uses KP New ayanamsha rather than Lahiri for sidereal KP positions', async () => {
    const positions = await calculateKpPlanetaryPositions({
      jdUtExact: normalizedTime!.jdUtExact!,
      ephemerisProvider: fakeEphemerisProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });

    expect(positions.kpAyanamshaDeg).toBe(23);
    expect(positions.byBody.Sun?.siderealLongitudeDeg ?? Number.NaN).toBeCloseTo(0);
    expect(positions.byBody.Sun?.signName).toBe('Aries');
    expect(positions.byBody.Sun?.rashiLord).toBe('Mars');
  });

  it('computes Ketu opposite Rahu in KP positions', async () => {
    const positions = await calculateKpPlanetaryPositions({
      jdUtExact: normalizedTime!.jdUtExact!,
      ephemerisProvider: fakeEphemerisProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });

    expect(positions.byBody.Rahu).toBeDefined();
    expect(positions.byBody.Ketu).toBeDefined();
    expect(positions.byBody.Rahu?.retrograde).toBe(true);
    expect(positions.byBody.Ketu?.retrograde).toBe(true);
    expect(((positions.byBody.Ketu!.siderealLongitudeDeg - positions.byBody.Rahu!.siderealLongitudeDeg) + 360) % 360).toBe(180);
  });

  it('computes KP cusps only from deterministic KP/Placidus provider and KP ayanamsha', async () => {
    const cusps = await calculateKpCusps({
      jdUtExact: normalizedTime!.jdUtExact!,
      latitudeDeg: normalizedTime.latitudeDeg,
      longitudeDeg: normalizedTime.longitudeDeg,
      kpAyanamshaDeg: 23,
      ephemerisProvider: fakeEphemerisProvider,
    });

    expect(cusps.status).toBe('computed');
    const cuspList = cusps.fields?.cusps as Array<{ siderealLongitudeDeg: number; rashiLord: string; nakshatraLord: string; subLord: string; subSubLord: string }> | undefined;
    expect(cuspList).toHaveLength(12);
    expect(cuspList?.[0]?.siderealLongitudeDeg).toBeCloseTo(100);
    expect(cuspList?.[0]?.rashiLord).toBeTruthy();
    expect(cuspList?.[0]?.nakshatraLord).toBeTruthy();
    expect(cuspList?.[0]?.subLord).toBeTruthy();
    expect(cuspList?.[0]?.subSubLord).toBeTruthy();
  });

  it('does not reuse Sripati cusps when KP/Placidus cusp provider is absent', async () => {
    const cusps = await calculateKpCusps({
      jdUtExact: normalizedTime!.jdUtExact!,
      latitudeDeg: normalizedTime.latitudeDeg,
      longitudeDeg: normalizedTime.longitudeDeg,
      kpAyanamshaDeg: 23,
      ephemerisProvider: noCuspProvider,
    });

    expect(cusps.status).toBe('unavailable');
    expect(cusps.source).toBe('none');
    expect(isUnavailableValue(cusps.fields?.cusps)).toBe(true);
  });

  it('keeps deterministic KP planet lords while KP significators remain unavailable', async () => {
    const section = await calculateKpSection({
      jdUtExact: normalizedTime!.jdUtExact!,
      normalizedTime,
      ephemerisProvider: fakeEphemerisProvider,
      ayanamshaProvider: fakeAyanamshaProvider,
    });

    expect(section.status === 'computed' || section.status === 'partial').toBe(true);
    const byBody = section.fields?.byBody as Record<string, { rashiLord: string }> | undefined;
    expect(byBody?.Sun?.rashiLord).toBe('Mars');
    expect(isUnavailableValue(section.fields?.significators)).toBe(true);
    expect(section.fields && 'significators' in section.fields).toBe(true);
  });
});
