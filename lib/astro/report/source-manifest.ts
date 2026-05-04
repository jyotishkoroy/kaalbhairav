/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { getAstroReportFieldRegistry } from './field-registry.ts';

export type AstroReportSourceManifestEntry = {
  fieldKey: string;
  sourceType: string;
  requiredChartPaths: string[];
  calculationModule?: string;
  riskLevel: string;
  enabled: boolean;
  allowedSourceTypes: string[];
  requiresSourcePath: boolean;
  requiresChartVersion: boolean;
  exactFactEligible: boolean;
};

export function buildAstroReportSourceManifest(): AstroReportSourceManifestEntry[] {
  return getAstroReportFieldRegistry().map((entry) => ({
    fieldKey: entry.fieldKey,
    sourceType: entry.sourceType,
    requiredChartPaths: [...entry.requiredChartPaths],
    calculationModule: entry.calculationModule,
    riskLevel: entry.riskLevel,
    enabled: entry.enabled,
    allowedSourceTypes: [entry.sourceType],
    requiresSourcePath: entry.sourceType !== 'input_display' && entry.sourceType !== 'static_template',
    requiresChartVersion: entry.sourceType !== 'input_display' && entry.sourceType !== 'static_template',
    exactFactEligible: entry.sourceType === 'input_display' || entry.sourceType === 'astronomical_calculation' || entry.sourceType === 'deterministic_derived' || entry.sourceType === 'static_lookup' || entry.sourceType === 'static_template',
  }));
}
