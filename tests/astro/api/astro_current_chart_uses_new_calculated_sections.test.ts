/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';

import {
  buildCanonicalChartJsonV2FromCalculation,
  withPersistedChartVersionMetadata,
} from '@/lib/astro/canonical-chart-json-adapter.ts';
import { assertCanonicalChartJsonV2 } from '@/lib/astro/chart-json-v2.ts';

function computedSection(fields: Record<string, unknown> = {}) {
  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields,
  } as const;
}

function unavailableSection(requiredModule: string, fieldKey: string) {
  return {
    status: 'unavailable',
    source: 'none',
    reason: 'insufficient_birth_data',
    fields: {
      value: {
        status: 'unavailable',
        value: null,
        reason: 'insufficient_birth_data',
        source: 'none',
        requiredModule,
        fieldKey,
      },
    },
  } as const;
}

function completeSections() {
  return {
    timeFacts: computedSection({ utcDateTimeIso: '2026-05-05T00:00:00.000Z' }),
    planetaryPositions: computedSection({
      byBody: {
        Sun: { sign: 'Aries', signNumber: 1, absoluteLongitude: 10 },
        Moon: { sign: 'Cancer', signNumber: 4, absoluteLongitude: 95, nakshatra: 'Pushya', pada: 1 },
      },
    }),
    lagna: computedSection({
      ascendant: { sign: 'Leo', signNumber: 5, absoluteLongitude: 120 },
    }),
    houses: computedSection({ placements: {} }),
    panchang: computedSection({ tithi: 1, paksha: 'Shukla' }),
    d1Chart: computedSection({ byBody: {} }),
    d9Chart: computedSection({ byBody: {} }),
    shodashvarga: computedSection({ byBody: {} }),
    shodashvargaBhav: computedSection({ byBody: {} }),
    vimshottari: computedSection({
      currentMahadasha: { lord: 'Saturn' },
      currentAntardasha: { lord: 'Mercury' },
    }),
    kp: computedSection({ byBody: {} }),
    dosha: computedSection({ manglik: { isManglik: false } }),
    ashtakavarga: computedSection({
      sarvashtakavargaTotal: { grandTotal: 292 },
    }),
    transits: unavailableSection('transits', 'transits'),
    advanced: unavailableSection('advanced', 'advanced'),
  };
}

describe('astro current chart canonical v2', () => {
  it('builds canonical chart_json_v2 with all deterministic sections', () => {
    const chart = buildCanonicalChartJsonV2FromCalculation({
      profileId: 'profile-test',
      calculationId: 'calc-test',
      inputHash: 'input-test',
      settingsHash: 'settings-test',
      engineVersion: 'engine-test',
      ephemerisVersion: 'ephemeris-test',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: '2026-05-05T00:00:00.000Z',
      sections: completeSections(),
    });

    expect(chart.schemaVersion).toBe('chart_json_v2');
    expect(chart.metadata.profileId).toBe('profile-test');
    expect(chart.metadata.inputHash).toBe('input-test');
    expect(chart.sections.timeFacts.status).toBe('computed');
    expect(((chart.sections.planetaryPositions.fields as { byBody?: Record<string, { sign?: string }> })?.byBody?.Moon?.sign)).toBe('Cancer');
    expect(() => assertCanonicalChartJsonV2(chart)).not.toThrow();
  });

  it('preserves partial and unavailable sections without stringifying them', () => {
    const chart = buildCanonicalChartJsonV2FromCalculation({
      profileId: 'profile-test',
      calculationId: 'calc-test',
      inputHash: 'input-test',
      settingsHash: 'settings-test',
      engineVersion: 'engine-test',
      ephemerisVersion: 'ephemeris-test',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: '2026-05-05T00:00:00.000Z',
      sections: {
        ...completeSections(),
        kp: {
          status: 'partial',
          source: 'deterministic_calculation',
          warnings: ['kp partial'],
          fields: {
            significators: unavailableSection('kp_significators', 'sections.kp.fields.significators'),
          },
        },
      },
    });

    expect(chart.sections.kp.status).toBe('partial');
    expect(chart.sections.kp.warnings).toEqual(['kp partial']);
    expect(chart.sections.kp.fields?.significators).toBeTypeOf('object');
    expect(chart.sections.kp.fields?.significators).toMatchObject({ status: 'unavailable', reason: 'insufficient_birth_data' });
  });

  it('rejects missing required metadata', () => {
    expect(() =>
      buildCanonicalChartJsonV2FromCalculation({
        profileId: '',
        calculationId: 'calc-test',
        inputHash: 'input-test',
        settingsHash: 'settings-test',
        engineVersion: 'engine-test',
        ephemerisVersion: 'ephemeris-test',
        ayanamsha: 'lahiri',
        houseSystem: 'whole_sign',
        runtimeClockIso: '2026-05-05T00:00:00.000Z',
        sections: completeSections(),
      }),
    ).toThrow();
  });

  it('fills missing canonical sections as structured unavailable', () => {
    const chart = buildCanonicalChartJsonV2FromCalculation({
      profileId: 'profile-test',
      calculationId: 'calc-test',
      inputHash: 'input-test',
      settingsHash: 'settings-test',
      engineVersion: 'engine-test',
      ephemerisVersion: 'ephemeris-test',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: '2026-05-05T00:00:00.000Z',
      sections: {
        timeFacts: computedSection({ utcDateTimeIso: '2026-05-05T00:00:00.000Z' }),
        planetaryPositions: computedSection({ byBody: { Moon: { sign: 'Cancer' } } }),
      },
    });

    expect(chart.sections.lagna.status).toBe('unavailable');
    expect(chart.sections.advanced.status).toBe('unavailable');
    expect(chart.sections.transits.status).toBe('unavailable');
  });

  it('adds persisted chart version metadata immutably after DB/RPC', () => {
    const chart = buildCanonicalChartJsonV2FromCalculation({
      profileId: 'profile-test',
      calculationId: 'calc-test',
      inputHash: 'input-test',
      settingsHash: 'settings-test',
      engineVersion: 'engine-test',
      ephemerisVersion: 'ephemeris-test',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: '2026-05-05T00:00:00.000Z',
      sections: completeSections(),
    });
    const persisted = withPersistedChartVersionMetadata(chart, 'version-id-1', 7);

    expect(chart.metadata.chartVersionId).toBeUndefined();
    expect(persisted.metadata.chartVersionId).toBe('version-id-1');
    expect(persisted.metadata.chartVersion).toBe(7);
  });

  it('does not accept old unversioned chart as canonical chart_json_v2', () => {
    expect(() => assertCanonicalChartJsonV2({ metadata: {}, sections: {} })).toThrow();
  });
});
