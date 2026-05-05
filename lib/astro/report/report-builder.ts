/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { isCanonicalChartJsonV2 } from '../schemas/canonical-chart-json.ts';
import { ASTRO_REPORT_FIELD_REGISTRY, type AstroReportFieldRegistryEntry } from './field-registry.ts';
import { isDeterministicReportFieldSource } from './field-source-types.ts';
import { validateReportContractProvenance, validateReportFieldProvenance } from './fact-provenance-validator.ts';
import { unavailableAstroValue } from './unavailable.ts';
import type { AstroReportContract, ResolvedAstroReportField } from './report-contract.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readPath(root: unknown, dottedPath: string): unknown {
  if (dottedPath.startsWith('canonical_chart_json_v2.')) {
    const canonical = isRecord(root) ? root.canonical_chart_json_v2 : undefined;
    return readPath(canonical, dottedPath.slice('canonical_chart_json_v2.'.length));
  }
  let current: unknown = root;
  for (const part of dottedPath.split('.')) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function firstDefinedPath(root: unknown, paths: string[]): { value: unknown; path: string } | undefined {
  for (const path of paths) {
    const value = readPath(root, path);
    if (value !== undefined && value !== null) return { value, path };
  }
  return undefined;
}

function isSectionStatusUnavailable(status: unknown): boolean {
  return status === 'unavailable' || status === 'partial' || status === 'error';
}

function getCanonicalSectionForPath(chartJson: unknown, path: string): { status?: string; reason?: string } | undefined {
  const prefix = 'canonical_chart_json_v2.sections.';
  if (!path.startsWith(prefix)) return undefined;
  const remainder = path.slice(prefix.length);
  const sectionName = remainder.split('.')[0];
  const canonical = isCanonicalChartJsonV2(chartJson) ? chartJson : (isRecord(chartJson) ? (chartJson.canonical_chart_json_v2 as unknown) : undefined);
  const sections = isRecord(canonical) ? (canonical.sections as Record<string, unknown> | undefined) : undefined;
  if (!sections || !isRecord(sections[sectionName])) return undefined;
  const section = sections[sectionName] as Record<string, unknown>;
  return { status: typeof section.status === 'string' ? section.status : undefined, reason: typeof section.reason === 'string' ? section.reason : undefined };
}

function normalizeValue(value: unknown): string | number | boolean | Record<string, unknown> | unknown[] | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value;
  if (isRecord(value)) return value;
  return undefined;
}

function unavailableReasonFromValidation(failureCode?: string, entry?: AstroReportFieldRegistryEntry): 'provenance_invalid' | 'source_not_allowed' | 'missing_chart_path' {
  switch (failureCode) {
    case 'missing_source_path':
    case 'source_path_not_allowed':
    case 'section_not_computed':
      return 'missing_chart_path';
    case 'llm_exact_fact_not_allowed':
    case 'client_context_not_allowed':
    case 'source_type_not_allowed':
    case 'missing_provenance':
    case 'missing_registry_entry':
    case 'field_not_registered':
    case 'missing_source_type':
    case 'missing_chart_version_id':
    case 'missing_profile_id':
    case 'unsupported_exact_field':
      return 'provenance_invalid';
    default:
      return entry?.sourceType === 'llm_grounded_text' ? 'source_not_allowed' : 'provenance_invalid';
  }
}

function toUnavailableFromValidation(args: {
  field: ResolvedAstroReportField;
  entry: AstroReportFieldRegistryEntry;
  failureCode?: string;
  message?: string;
}): ResolvedAstroReportField {
  const reason = unavailableReasonFromValidation(args.failureCode, args.entry);
  return {
    fieldKey: args.field.fieldKey,
    groupId: args.field.groupId,
    displayLabel: args.field.displayLabel,
    status: 'unavailable',
    unavailable: unavailableAstroValue({
      reason,
      requiredModule: args.entry.calculationModule,
      requiredChartPath: args.entry.requiredChartPaths[0],
      message: 'This field is unavailable because its provenance could not be verified.',
    }),
    source_type: 'unavailable',
    provenance: {
      ...args.field.provenance,
      sourceType: 'unavailable',
      registryFieldKey: args.entry.fieldKey,
    },
    riskLevel: args.field.riskLevel,
    warnings: [...args.field.warnings, `fact_provenance_invalid:${args.field.fieldKey}:${args.failureCode ?? 'unknown'}`],
  };
}

function resolveField(args: {
  chartJson: unknown;
  profileId?: string;
  chartVersionId?: string;
  nowIso: string;
  entry: AstroReportFieldRegistryEntry;
}): ResolvedAstroReportField {
  const { chartJson, entry } = args;
  for (const path of entry.requiredChartPaths) {
    const canonicalSectionStatus = getCanonicalSectionForPath(chartJson, path);
    if (canonicalSectionStatus && isSectionStatusUnavailable(canonicalSectionStatus.status)) {
      return {
        fieldKey: entry.fieldKey,
        groupId: entry.groupId,
        displayLabel: entry.displayLabel,
        status: 'unavailable',
        unavailable: unavailableAstroValue({
          reason: canonicalSectionStatus.status === 'unavailable' ? 'section_unavailable' : 'missing_chart_path',
          requiredModule: entry.calculationModule,
          requiredChartPath: path,
          message: canonicalSectionStatus.status === 'unavailable'
            ? 'This field is unavailable because the required section is unavailable.'
            : 'This field is unavailable because the required chart path is missing.',
        }),
        source_type: 'unavailable',
        provenance: {
          chartVersionId: args.chartVersionId,
          profileId: args.profileId,
          sourcePath: path,
          sourceType: 'unavailable',
          registryFieldKey: entry.fieldKey,
          computedAt: args.nowIso,
        },
        riskLevel: entry.riskLevel,
        warnings: [`field_unavailable:${entry.fieldKey}:${canonicalSectionStatus.status === 'unavailable' ? 'section_unavailable' : 'missing_chart_path'}`],
      };
    }
  }
  const source = firstDefinedPath(chartJson, entry.requiredChartPaths);
  const canonicalSectionStatus = source ? getCanonicalSectionForPath(chartJson, source.path) : undefined;

  if (!source) {
    return {
      fieldKey: entry.fieldKey,
      groupId: entry.groupId,
      displayLabel: entry.displayLabel,
      status: 'unavailable',
      unavailable: unavailableAstroValue({
        reason: entry.unavailablePolicy.reason,
        requiredModule: entry.unavailablePolicy.requiredModule ?? entry.calculationModule,
        requiredChartPath: entry.requiredChartPaths[0],
      }),
      source_type: 'unavailable',
      provenance: {
        chartVersionId: args.chartVersionId,
        profileId: args.profileId,
        sourcePath: entry.requiredChartPaths[0],
        sourceType: 'unavailable',
        registryFieldKey: entry.fieldKey,
        computedAt: args.nowIso,
      },
      riskLevel: entry.riskLevel,
      warnings: [`field_unavailable:${entry.fieldKey}:${entry.unavailablePolicy.reason}`],
    };
  }

  if (!isDeterministicReportFieldSource(entry.sourceType)) {
    return {
      fieldKey: entry.fieldKey,
      groupId: entry.groupId,
      displayLabel: entry.displayLabel,
      status: 'unavailable',
      unavailable: unavailableAstroValue({
        reason: 'source_not_allowed',
        requiredModule: entry.calculationModule,
        requiredChartPath: source.path,
      }),
      source_type: 'unavailable',
      provenance: {
        chartVersionId: args.chartVersionId,
        profileId: args.profileId,
        sourcePath: source.path,
        sourceType: 'unavailable',
        registryFieldKey: entry.fieldKey,
        computedAt: args.nowIso,
      },
      riskLevel: entry.riskLevel,
      warnings: [`field_unavailable:${entry.fieldKey}:source_not_allowed`],
    };
  }

  const normalized = normalizeValue(source.value);
  if (normalized === undefined) {
    return {
      fieldKey: entry.fieldKey,
      groupId: entry.groupId,
      displayLabel: entry.displayLabel,
      status: 'unavailable',
      unavailable: unavailableAstroValue({
        reason: 'missing_chart_path',
        requiredModule: entry.calculationModule,
        requiredChartPath: source.path,
      }),
      source_type: 'unavailable',
      provenance: {
        chartVersionId: args.chartVersionId,
        profileId: args.profileId,
        sourcePath: source.path,
        sourceType: 'unavailable',
        registryFieldKey: entry.fieldKey,
        computedAt: args.nowIso,
      },
      riskLevel: entry.riskLevel,
      warnings: [`field_unavailable:${entry.fieldKey}:missing_chart_path`],
    };
  }

  return {
    fieldKey: entry.fieldKey,
    groupId: entry.groupId,
    displayLabel: entry.displayLabel,
    status: 'resolved',
    value: normalized,
    source_type: entry.sourceType,
    source_path: source.path,
    source_section_status: canonicalSectionStatus?.status,
    provenance: {
      chartVersionId: args.chartVersionId,
      profileId: args.profileId,
      sourcePath: source.path,
      sourceType: entry.sourceType,
      registryFieldKey: entry.fieldKey,
      computedAt: args.nowIso,
    },
    riskLevel: entry.riskLevel,
    warnings: [],
  };
}

export function buildAstroReportContract(args: {
  chartJson: unknown;
  profileId?: string;
  chartVersionId?: string;
  now?: Date;
  sourceMode?: 'server_current_chart' | 'test_fixture' | 'unknown';
  registry?: readonly AstroReportFieldRegistryEntry[];
}): AstroReportContract {
  const nowIso = (args.now ?? new Date()).toISOString();
  const registry = args.registry ?? ASTRO_REPORT_FIELD_REGISTRY;
  const grouped = new Map<string, { groupId: string; groupName: string; fields: ResolvedAstroReportField[] }>();
  let unavailableCount = 0;
  let resolvedCount = 0;
  const warnings: string[] = [];

  for (const entry of registry) {
    if (!entry.enabled) continue;
    const resolvedRaw = resolveField({ chartJson: args.chartJson, profileId: args.profileId, chartVersionId: args.chartVersionId, nowIso, entry });
    const validation = validateReportFieldProvenance(resolvedRaw, { requireChartVersionId: true, requireProfileId: true });
    const resolved = validation.ok
      ? { ...resolvedRaw, provenance_validation: { status: validation.status } }
      : toUnavailableFromValidation({ field: resolvedRaw, entry, failureCode: validation.failureCode, message: validation.message });
    if (resolved.status === 'resolved') resolvedCount += 1;
    else unavailableCount += 1;
    if (resolved.warnings.length) warnings.push(...resolved.warnings);
    if (!grouped.has(entry.groupId)) grouped.set(entry.groupId, { groupId: entry.groupId, groupName: entry.groupName, fields: [] });
    grouped.get(entry.groupId)!.fields.push(resolved);
  }

  const report: AstroReportContract = {
    schemaVersion: 'astro_report_contract_v1',
    generatedAt: nowIso,
    profileId: args.profileId,
    chartVersionId: args.chartVersionId,
    sourceMode: args.sourceMode ?? 'unknown',
    groups: [...grouped.values()],
    unavailableCount,
    resolvedCount,
    warnings,
  };
  const provenanceValidation = validateReportContractProvenance(report, { requireChartVersionId: true, requireProfileId: true });
  if (!provenanceValidation.ok) {
    for (const failure of provenanceValidation.failures) {
      warnings.push(`fact_provenance_invalid:${failure.fieldKey}:${failure.failureCode ?? 'unknown'}`);
    }
  }
  report.warnings = warnings;
  return report;
}
