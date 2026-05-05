/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract } from './calculations/contracts.ts';
import { makeUnavailableSection } from './calculations/unavailable.ts';
import type { CanonicalChartJsonV2 } from './chart-json-v2.ts';
import { assertCanonicalChartJsonV2 } from './chart-json-v2.ts';

export const CANONICAL_CHART_JSON_V2_SECTION_KEYS = [
  'timeFacts',
  'planetaryPositions',
  'lagna',
  'houses',
  'panchang',
  'd1Chart',
  'd9Chart',
  'shodashvarga',
  'shodashvargaBhav',
  'vimshottari',
  'kp',
  'dosha',
  'ashtakavarga',
  'transits',
  'advanced',
] as const satisfies readonly (keyof CanonicalChartJsonV2['sections'])[];

export type BuildCanonicalChartJsonV2Args = {
  profileId: string;
  calculationId?: string;
  inputHash: string;
  settingsHash: string;
  engineVersion: string;
  ephemerisVersion: string;
  ayanamsha: string;
  houseSystem: string;
  runtimeClockIso: string;
  sections: Partial<CanonicalChartJsonV2['sections']>;
};

function unavailableSectionFor(sectionKey: keyof CanonicalChartJsonV2['sections']): AstroSectionContract {
  return makeUnavailableSection({
    requiredModule: sectionKey,
    fieldKey: `sections.${sectionKey}`,
    reason: 'insufficient_birth_data',
    warnings: [`Canonical chart section ${sectionKey} was not present in calculation output.`],
  });
}

export function normalizeCanonicalSections(
  sections: Partial<CanonicalChartJsonV2['sections']>,
): CanonicalChartJsonV2['sections'] {
  const normalized = {} as CanonicalChartJsonV2['sections'];

  for (const sectionKey of CANONICAL_CHART_JSON_V2_SECTION_KEYS) {
    const section = sections[sectionKey];

    normalized[sectionKey] =
      section && typeof section === 'object'
        ? section
        : unavailableSectionFor(sectionKey);
  }

  return normalized;
}

function normalizeIso(value: string, fieldName: string): string {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} is required.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO datetime.`);
  }

  return date.toISOString();
}

export function buildCanonicalChartJsonV2FromCalculation(
  args: BuildCanonicalChartJsonV2Args,
): CanonicalChartJsonV2 {
  if (!args.profileId) {
    throw new Error('profileId is required to build chart_json_v2.');
  }

  if (!args.inputHash) {
    throw new Error('inputHash is required to build chart_json_v2.');
  }

  if (!args.settingsHash) {
    throw new Error('settingsHash is required to build chart_json_v2.');
  }

  const chartJson: CanonicalChartJsonV2 = {
    schemaVersion: 'chart_json_v2',
    metadata: {
      profileId: args.profileId,
      calculationId: args.calculationId,
      inputHash: args.inputHash,
      settingsHash: args.settingsHash,
      engineVersion: args.engineVersion,
      ephemerisVersion: args.ephemerisVersion,
      ayanamsha: args.ayanamsha,
      houseSystem: args.houseSystem,
      runtimeClockIso: normalizeIso(args.runtimeClockIso, 'runtimeClockIso'),
    },
    sections: normalizeCanonicalSections(args.sections),
  };

  return assertCanonicalChartJsonV2(chartJson);
}

export function withPersistedChartVersionMetadata(
  chartJson: CanonicalChartJsonV2,
  chartVersionId: string,
  chartVersion: number,
): CanonicalChartJsonV2 {
  if (!chartVersionId) {
    throw new Error('chartVersionId is required.');
  }

  if (!Number.isInteger(chartVersion) || chartVersion <= 0) {
    throw new Error('chartVersion must be a positive integer.');
  }

  return assertCanonicalChartJsonV2({
    ...chartJson,
    metadata: {
      ...chartJson.metadata,
      chartVersionId,
      chartVersion,
    },
  });
}

export function hasCanonicalChartJsonV2Sections(
  value: unknown,
): value is { sections: Partial<CanonicalChartJsonV2['sections']> } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const sections = (value as { sections?: unknown }).sections;

  return Boolean(sections) && typeof sections === 'object' && !Array.isArray(sections);
}
