/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { UnavailableAstroValue } from './unavailable.ts';
import type { ReportFieldRiskLevel, ReportFieldSourceType } from './field-source-types.ts';

export type ResolvedAstroReportField =
  | {
      fieldKey: string;
      groupId: string;
      displayLabel: string;
      status: 'resolved';
      value: string | number | boolean | Record<string, unknown> | unknown[];
      source_type: ReportFieldSourceType;
      source_path?: string;
      source_section_status?: string;
      provenance: {
        chartVersionId?: string;
        profileId?: string;
        sourcePath?: string;
        sourceType: ReportFieldSourceType;
        registryFieldKey: string;
        computedAt?: string;
      };
      riskLevel: ReportFieldRiskLevel;
      warnings: string[];
    }
  | {
      fieldKey: string;
      groupId: string;
      displayLabel: string;
      status: 'unavailable';
      unavailable: UnavailableAstroValue;
      source_type: 'unavailable';
      provenance: {
        chartVersionId?: string;
        profileId?: string;
        sourcePath?: string;
        sourceType: 'unavailable';
        registryFieldKey: string;
        computedAt?: string;
      };
      riskLevel: ReportFieldRiskLevel;
      warnings: string[];
    };

export type AstroReportGroup = {
  groupId: string;
  groupName: string;
  fields: ResolvedAstroReportField[];
};

export type AstroReportContract = {
  schemaVersion: 'astro_report_contract_v1';
  generatedAt: string;
  profileId?: string;
  chartVersionId?: string;
  sourceMode: 'server_current_chart' | 'test_fixture' | 'unknown';
  groups: AstroReportGroup[];
  unavailableCount: number;
  resolvedCount: number;
  warnings: string[];
};

export function isUnavailableReportField(field: ResolvedAstroReportField): boolean {
  return field.status === 'unavailable';
}
