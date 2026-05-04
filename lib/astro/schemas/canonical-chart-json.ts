/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { CalculationSettingsMetadata } from '../calculation-settings-metadata.ts'
import type { AstroRuntimeClock } from '../calculations/runtime-clock.ts'
import type { AstroSectionContract } from './astro-section-contract.ts'

export const REQUIRED_CANONICAL_SECTION_KEYS = [
  'timeFacts',
  'planetaryPositions',
  'lagna',
  'houses',
  'panchang',
  'd1Chart',
  'd9Chart',
  'vimshottari',
  'advanced',
] as const

export type CanonicalChartJsonV2 = {
  schemaVersion: 'chart_json_v2';
  metadata: {
    userId?: string;
    profileId?: string;
    calculationId?: string;
    chartVersionId?: string;
    inputHash?: string;
    settingsHash?: string;
    engine: string;
    engineVersion?: string;
    calculationSettings?: CalculationSettingsMetadata;
    runtimeClock?: AstroRuntimeClock;
  };
  sections: {
    timeFacts: AstroSectionContract;
    planetaryPositions: AstroSectionContract;
    lagna: AstroSectionContract;
    houses: AstroSectionContract;
    panchang: AstroSectionContract;
    d1Chart: AstroSectionContract;
    d9Chart: AstroSectionContract;
    vimshottari: AstroSectionContract;
    transits?: AstroSectionContract;
    advanced: Record<string, AstroSectionContract>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSection(value: unknown): value is AstroSectionContract {
  return isRecord(value) && typeof value.status === 'string' && typeof value.source === 'string'
}

export function isCanonicalChartJsonV2(value: unknown): value is CanonicalChartJsonV2 {
  if (!isRecord(value)) return false
  if (value.schemaVersion !== 'chart_json_v2') return false
  if (!isRecord(value.metadata)) return false
  if (!isRecord(value.sections)) return false
  const sections = value.sections as Record<string, unknown>
  if (!REQUIRED_CANONICAL_SECTION_KEYS.every((key) => key in sections)) return false
  return REQUIRED_CANONICAL_SECTION_KEYS.every((key) => {
    if (key === 'advanced') return isRecord(sections.advanced)
    return isSection(sections[key])
  })
}

export function buildCanonicalChartJsonV2(args: {
  metadata: CanonicalChartJsonV2['metadata'];
  sections: CanonicalChartJsonV2['sections'];
}): CanonicalChartJsonV2 {
  return {
    schemaVersion: 'chart_json_v2',
    metadata: args.metadata,
    sections: args.sections,
  }
}
