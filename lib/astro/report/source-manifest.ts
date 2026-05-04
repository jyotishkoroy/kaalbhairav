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
};

export function buildAstroReportSourceManifest(): AstroReportSourceManifestEntry[] {
  return getAstroReportFieldRegistry().map((entry) => ({
    fieldKey: entry.fieldKey,
    sourceType: entry.sourceType,
    requiredChartPaths: [...entry.requiredChartPaths],
    calculationModule: entry.calculationModule,
    riskLevel: entry.riskLevel,
    enabled: entry.enabled,
  }));
}
