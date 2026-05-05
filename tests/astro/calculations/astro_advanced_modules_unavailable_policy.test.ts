/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import {
  ADVANCED_MODULE_POLICY,
  makeAdvancedUnavailableFields,
  makeAdvancedUnavailableSection,
  makeAdvancedUnavailableValue,
  isAdvancedModuleComputedAllowed,
} from '@/lib/astro/calculations/advanced-policy.ts';
import { buildTransitsUnavailableSection, resolveTransitAsOfDateIso } from '@/lib/astro/calculations/transits.ts';
import { calculateBasicSadeSatiPhaseV2 } from '@/lib/astro/calculations/timing.ts';
import { isUnavailableValue } from '@/lib/astro/calculations/unavailable.ts';

describe('astro advanced modules unavailable policy', () => {
  it('makes all unsupported advanced modules structured unavailable', () => {
    const section = makeAdvancedUnavailableSection();

    expect(section.status).toBe('unavailable');
    expect(section.source).toBe('none');
    expect(isUnavailableValue((section.fields?.modules as Record<string, unknown>).shadbala)).toBe(true);
    expect(isUnavailableValue((section.fields?.modules as Record<string, unknown>).kp_significators)).toBe(true);
    expect(isUnavailableValue((section.fields?.modules as Record<string, unknown>).varshaphal)).toBe(true);
    expect(isUnavailableValue((section.fields?.modules as Record<string, unknown>).yogini_dasha)).toBe(true);
    expect(isUnavailableValue((section.fields?.modules as Record<string, unknown>).chara_dasha)).toBe(true);
    expect(isUnavailableValue((section.fields?.modules as Record<string, unknown>).lal_kitab_judgement)).toBe(true);
    expect(isUnavailableValue((section.fields?.modules as Record<string, unknown>).sade_sati_dates)).toBe(true);
    expect(isUnavailableValue((section.fields?.modules as Record<string, unknown>).ashtakavarga_bindu_matrix)).toBe(true);
  });

  it('unverified advanced calculations remain untrusted even when allow flag is true', () => {
    expect(isAdvancedModuleComputedAllowed({ moduleKey: 'shadbala', fixtureValidated: false, allowUnverifiedAdvancedCalcs: true })).toBe(false);
    expect(isAdvancedModuleComputedAllowed({ moduleKey: 'shadbala', fixtureValidated: true, allowUnverifiedAdvancedCalcs: false })).toBe(true);
  });

  it('invalid transit as-of dates are rejected', () => {
    expect(() => resolveTransitAsOfDateIso({ asOfDateIso: 'not-a-date' })).toThrow(/valid ISO date/);
    expect(() => resolveTransitAsOfDateIso({})).toThrow(/require asOfDateIso or runtimeClockIso/);
  });

  it('transit as-of date resolves from runtimeClockIso when asOfDateIso is absent', () => {
    expect(resolveTransitAsOfDateIso({ runtimeClockIso: '2026-05-05T00:00:00.000Z' })).toBe('2026-05-05T00:00:00.000Z');
  });

  it('transits are unavailable without deterministic ephemeris support', () => {
    const section = buildTransitsUnavailableSection({ runtimeClockIso: '2026-05-05T00:00:00.000Z' });

    expect(section.status).toBe('unavailable');
    expect(isUnavailableValue(section.fields?.transits)).toBe(true);
    expect(isUnavailableValue(section.fields?.predictionTiming)).toBe(true);
  });

  it('basic Sade Sati phase computes only phase without dates', () => {
    const first = calculateBasicSadeSatiPhaseV2({ natalMoonSignNumber: 4, transitSaturnSignNumber: 3 });
    const second = calculateBasicSadeSatiPhaseV2({ natalMoonSignNumber: 4, transitSaturnSignNumber: 4 });
    const third = calculateBasicSadeSatiPhaseV2({ natalMoonSignNumber: 4, transitSaturnSignNumber: 5 });
    const inactive = calculateBasicSadeSatiPhaseV2({ natalMoonSignNumber: 4, transitSaturnSignNumber: 6 });

    expect(first.phase).toBe('first_phase');
    expect(second.phase).toBe('second_phase');
    expect(third.phase).toBe('third_phase');
    expect(inactive.phase).toBe('not_active');
    expect(first.warnings.join(' ')).toMatch(/detailed.*start\/end dates.*unavailable/i);
    expect(Object.keys(first).join(' ')).not.toMatch(/startDate|endDate/);
  });

  it('Sade Sati phase rejects invalid sign numbers and returns unavailable for null', () => {
    expect(() => calculateBasicSadeSatiPhaseV2({ natalMoonSignNumber: 13, transitSaturnSignNumber: 4 })).toThrow(/must be an integer sign number/);
    expect(calculateBasicSadeSatiPhaseV2({ natalMoonSignNumber: null, transitSaturnSignNumber: 4 }).status).toBe('unavailable');
    expect(calculateBasicSadeSatiPhaseV2({ natalMoonSignNumber: 4, transitSaturnSignNumber: null }).status).toBe('unavailable');
  });

  it('policy lists advanced modules unavailable and value helpers match', () => {
    for (const key of ['shadbala', 'kp_significators', 'varshaphal', 'yogini_dasha', 'chara_dasha', 'lal_kitab_judgement', 'sade_sati_dates', 'ashtakavarga_bindu_matrix', 'transit_prediction_timing'] as const) {
      expect(ADVANCED_MODULE_POLICY[key].status).toBe('unavailable');
      expect(isUnavailableValue(makeAdvancedUnavailableValue(key))).toBe(true);
    }

    expect(makeAdvancedUnavailableFields().shadbala.status).toBe('unavailable');
  });
});
