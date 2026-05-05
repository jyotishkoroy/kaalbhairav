/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import { assertCanonicalChartJsonV2, isCanonicalChartJsonV2 } from '@/lib/astro/chart-json-v2';
import { assertDeterministicSource } from '@/lib/astro/calculations/provenance';
import {
  ASTRO_UNAVAILABLE_MODULE_IDS,
  isUnavailableValue,
  makeUnavailableSection,
  makeUnavailableValue,
} from '@/lib/astro/calculations/unavailable';

function computedSection(fields: Record<string, unknown> = {}) {
  return {
    status: 'computed' as const,
    source: 'deterministic_calculation' as const,
    fields,
  };
}

function unavailableSection(fieldKey: string) {
  return makeUnavailableSection({
    requiredModule: ASTRO_UNAVAILABLE_MODULE_IDS.shadbala,
    fieldKey,
    reason: 'module_not_implemented',
  });
}

function buildValidChartJsonV2(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 'chart_json_v2',
    metadata: {
      profileId: 'profile_test_001',
      inputHash: 'input_hash_test',
      settingsHash: 'settings_hash_test',
      engineVersion: 'test-engine-v1',
      ephemerisVersion: 'test-ephemeris-v1',
      ayanamsha: 'lahiri',
      houseSystem: 'whole_sign',
      runtimeClockIso: '2026-01-01T00:00:00.000Z',
    },
    sections: {
      timeFacts: computedSection({ utcDateTimeIso: '2000-01-01T00:00:00.000Z' }),
      planetaryPositions: computedSection({ byBody: {} }),
      lagna: computedSection({ sign: 'Leo', signNumber: 5 }),
      houses: computedSection({ system: 'whole_sign' }),
      panchang: computedSection({}),
      d1Chart: computedSection({}),
      d9Chart: computedSection({}),
      shodashvarga: computedSection({}),
      shodashvargaBhav: computedSection({}),
      vimshottari: computedSection({}),
      kp: computedSection({}),
      dosha: computedSection({}),
      ashtakavarga: unavailableSection('ashtakavarga.binduMatrix'),
      transits: unavailableSection('transits.current'),
      advanced: unavailableSection('shadbala.total'),
    },
    ...overrides,
  };
}

describe('astro calculation contracts', () => {
  it('accepts a complete canonical chart JSON v2 object', () => {
    const chartJson = buildValidChartJsonV2();
    expect(isCanonicalChartJsonV2(chartJson)).toBe(true);
    expect(assertCanonicalChartJsonV2(chartJson)).toBe(chartJson);
  });

  it('accepts partial sections with warnings', () => {
    const chartJson = buildValidChartJsonV2({
      sections: {
        ...buildValidChartJsonV2().sections,
        kp: {
          status: 'partial' as const,
          source: 'deterministic_calculation' as const,
          fields: {
            byBody: {},
          },
          warnings: ['KP cusps unavailable; deterministic planet lords preserved.'],
        },
      },
    });

    expect(isCanonicalChartJsonV2(chartJson)).toBe(true);
  });

  it('rejects malformed chart JSON without schemaVersion', () => {
    const chartJson = buildValidChartJsonV2();
    const withoutSchemaVersion = { ...chartJson } as Record<string, unknown>;
    delete withoutSchemaVersion.schemaVersion;

    expect(isCanonicalChartJsonV2(withoutSchemaVersion)).toBe(false);
    expect(() => assertCanonicalChartJsonV2(withoutSchemaVersion)).toThrow(/CanonicalChartJsonV2/);
  });

  it('creates and detects structured unavailable values', () => {
    const unavailable = makeUnavailableValue({
      requiredModule: ASTRO_UNAVAILABLE_MODULE_IDS.shadbala,
      fieldKey: 'shadbala.total',
      reason: 'module_not_implemented',
    });

    expect(unavailable).toEqual({
      status: 'unavailable',
      value: null,
      reason: 'module_not_implemented',
      source: 'none',
      requiredModule: 'shadbala',
      fieldKey: 'shadbala.total',
    });

    expect(isUnavailableValue(unavailable)).toBe(true);

    const section = makeUnavailableSection({
      requiredModule: ASTRO_UNAVAILABLE_MODULE_IDS.shadbala,
      fieldKey: 'shadbala.total',
    });

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
    expect(section.fields?.['shadbala.total']).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        source: 'none',
        value: null,
      }),
    );
  });

  it('rejects exact deterministic fields with source none or LLM-like sources', () => {
    expect(() =>
      assertDeterministicSource(
        {
          status: 'unavailable',
          source: 'none',
          fields: {},
        },
        'lagna.sign',
      ),
    ).toThrow(/deterministic calculation or stored current chart JSON/);

    expect(() =>
      assertDeterministicSource(
        {
          status: 'computed',
          source: 'llm_grounded_text',
          fields: {
            sign: 'Leo',
          },
        },
        'lagna.sign',
      ),
    ).toThrow(/deterministic calculation or stored current chart JSON/);

    expect(() =>
      assertDeterministicSource(
        {
          status: 'computed',
          source: 'deterministic_calculation',
          fields: {
            sign: 'Leo',
          },
        },
        'lagna.sign',
      ),
    ).not.toThrow();
  });
});
