/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract } from './calculations/contracts';

export type CanonicalChartJsonV2 = {
  schemaVersion: 'chart_json_v2';
  metadata: {
    profileId: string;
    chartVersionId?: string;
    chartVersion?: number;
    calculationId?: string;
    inputHash: string;
    settingsHash: string;
    engineVersion: string;
    ephemerisVersion: string;
    ayanamsha: string;
    houseSystem: string;
    runtimeClockIso: string;
  };
  sections: {
    timeFacts: AstroSectionContract;
    planetaryPositions: AstroSectionContract;
    lagna: AstroSectionContract;
    houses: AstroSectionContract;
    panchang: AstroSectionContract;
    d1Chart: AstroSectionContract;
    d9Chart: AstroSectionContract;
    shodashvarga: AstroSectionContract;
    shodashvargaBhav: AstroSectionContract;
    vimshottari: AstroSectionContract;
    kp: AstroSectionContract;
    dosha: AstroSectionContract;
    ashtakavarga: AstroSectionContract;
    transits: AstroSectionContract;
    advanced: AstroSectionContract;
  };
};

const REQUIRED_SECTION_KEYS = [
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
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidSection(value: unknown): value is AstroSectionContract {
  if (!isRecord(value)) {
    return false;
  }

  const status = value.status;
  const source = value.source;

  const validStatus =
    status === 'computed' ||
    status === 'partial' ||
    status === 'unavailable' ||
    status === 'error';

  const validSource =
    source === 'deterministic_calculation' ||
    source === 'stored_current_chart_json' ||
    source === 'none';

  if (!validStatus || !validSource) {
    return false;
  }

  if (value.fields !== undefined && !isRecord(value.fields)) {
    return false;
  }

  if (value.warnings !== undefined) {
    if (!Array.isArray(value.warnings)) {
      return false;
    }

    if (!value.warnings.every((warning) => typeof warning === 'string')) {
      return false;
    }
  }

  return true;
}

export function isCanonicalChartJsonV2(value: unknown): value is CanonicalChartJsonV2 {
  if (!isRecord(value)) {
    return false;
  }

  if (value.schemaVersion !== 'chart_json_v2') {
    return false;
  }

  if (!isRecord(value.metadata)) {
    return false;
  }

  const metadata = value.metadata;

  if (
    typeof metadata.profileId !== 'string' ||
    typeof metadata.inputHash !== 'string' ||
    typeof metadata.settingsHash !== 'string' ||
    typeof metadata.engineVersion !== 'string' ||
    typeof metadata.ephemerisVersion !== 'string' ||
    typeof metadata.ayanamsha !== 'string' ||
    typeof metadata.houseSystem !== 'string' ||
    typeof metadata.runtimeClockIso !== 'string'
  ) {
    return false;
  }

  if (metadata.chartVersionId !== undefined && typeof metadata.chartVersionId !== 'string') {
    return false;
  }

  if (metadata.chartVersion !== undefined && typeof metadata.chartVersion !== 'number') {
    return false;
  }

  if (metadata.calculationId !== undefined && typeof metadata.calculationId !== 'string') {
    return false;
  }

  const sections = value.sections;

  if (!isRecord(sections)) {
    return false;
  }

  return REQUIRED_SECTION_KEYS.every((sectionKey) => isValidSection(sections[sectionKey]));
}

export function assertCanonicalChartJsonV2(value: unknown): CanonicalChartJsonV2 {
  if (!isCanonicalChartJsonV2(value)) {
    throw new Error('Expected CanonicalChartJsonV2.');
  }

  return value;
}
