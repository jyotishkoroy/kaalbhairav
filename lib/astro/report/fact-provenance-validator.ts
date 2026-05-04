/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { findAstroReportField, type AstroReportFieldRegistryEntry } from './field-registry.ts';
import { isDeterministicReportFieldSource } from './field-source-types.ts';
import type { AstroReportContract, ResolvedAstroReportField } from './report-contract.ts';

export type FactProvenanceValidationStatus = 'valid' | 'invalid' | 'unavailable';

export type FactProvenanceFailureCode =
  | 'missing_provenance'
  | 'missing_registry_entry'
  | 'field_not_registered'
  | 'missing_source_type'
  | 'source_type_not_allowed'
  | 'missing_source_path'
  | 'source_path_not_allowed'
  | 'missing_chart_version_id'
  | 'missing_profile_id'
  | 'section_not_computed'
  | 'client_context_not_allowed'
  | 'llm_exact_fact_not_allowed'
  | 'raw_engine_field_not_allowed'
  | 'unavailable_without_reason'
  | 'value_missing'
  | 'unsupported_exact_field';

export type FactProvenanceValidationResult = {
  status: FactProvenanceValidationStatus;
  ok: boolean;
  fieldKey: string;
  failureCode?: FactProvenanceFailureCode;
  message?: string;
  sourcePath?: string;
  sourceType?: string;
  registryFieldKey?: string;
  chartVersionId?: string;
  profileId?: string;
};

export type FactProvenanceValidatorOptions = {
  allowClientContext?: boolean;
  requireProfileId?: boolean;
  requireChartVersionId?: boolean;
};

function makeResult(args: {
  status: FactProvenanceValidationStatus;
  fieldKey: string;
  failureCode?: FactProvenanceFailureCode;
  message?: string;
  sourcePath?: string;
  sourceType?: string;
  registryFieldKey?: string;
  chartVersionId?: string;
  profileId?: string;
}): FactProvenanceValidationResult {
  return { ok: args.status !== 'invalid', ...args };
}

function isExactChartField(entry: AstroReportFieldRegistryEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.sourceType === 'llm_grounded_text' || entry.sourceType === 'rag_grounded_text' || entry.sourceType === 'unavailable') return false;
  if (entry.sourceType === 'input_display') return entry.riskLevel === 'SAFE';
  return isDeterministicReportFieldSource(entry.sourceType);
}

function isAllowedClientPath(path?: string): boolean {
  if (!path) return true;
  return !(
    path.startsWith('llm.')
    || path.startsWith('client.')
    || path.startsWith('requestBody.')
    || path.startsWith('body.')
  );
}

export function validateReportFieldProvenance(
  field: ResolvedAstroReportField,
  options: FactProvenanceValidatorOptions = {},
): FactProvenanceValidationResult {
  const registryEntry = findAstroReportField(field.fieldKey);
  if (!registryEntry) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'field_not_registered', message: 'Field is not registered.', registryFieldKey: field.fieldKey });
  }
  if (!registryEntry.enabled) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'missing_registry_entry', message: 'Field registry entry is disabled.', registryFieldKey: registryEntry.fieldKey });
  }
  const provenance = field.provenance;
  const sourceType = field.source_type;

  if (field.status === 'unavailable') {
    if (!field.unavailable?.reason || field.unavailable.status !== 'unavailable' || field.unavailable.source_type !== 'unavailable') {
      return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'unavailable_without_reason', message: 'Unavailable field is missing an unavailable reason.', sourceType: 'unavailable', registryFieldKey: registryEntry.fieldKey });
    }
    if (!provenance || provenance.registryFieldKey !== field.fieldKey || provenance.sourceType !== 'unavailable') {
      return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'missing_provenance', message: 'Unavailable field is missing provenance.', sourceType: 'unavailable', registryFieldKey: registryEntry.fieldKey });
    }
    return makeResult({
      status: 'unavailable',
      fieldKey: field.fieldKey,
      sourceType: 'unavailable',
      sourcePath: provenance.sourcePath,
      registryFieldKey: provenance.registryFieldKey,
      chartVersionId: provenance.chartVersionId,
      profileId: provenance.profileId,
    });
  }

  if (field.value === undefined || field.value === null) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'value_missing', message: 'Resolved field has no value.', sourceType, registryFieldKey: registryEntry.fieldKey });
  }
  if (!provenance) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'missing_provenance', message: 'Resolved field is missing provenance.', sourceType, registryFieldKey: registryEntry.fieldKey });
  }
  if (provenance.registryFieldKey !== field.fieldKey) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'missing_provenance', message: 'Registry field key does not match field key.', sourceType, registryFieldKey: provenance.registryFieldKey });
  }
  if (!isDeterministicReportFieldSource(field.source_type) && field.source_type !== 'input_display') {
    return makeResult({
      status: 'invalid',
      fieldKey: field.fieldKey,
      failureCode: field.source_type === 'llm_grounded_text' ? 'llm_exact_fact_not_allowed' : 'source_type_not_allowed',
      message: 'Resolved field source type is not allowed for exact facts.',
      sourceType,
      registryFieldKey: registryEntry.fieldKey,
    });
  }
  if (field.source_type !== registryEntry.sourceType && !(field.source_type === 'input_display' && registryEntry.sourceType === 'input_display')) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'source_type_not_allowed', message: 'Resolved field source type does not match registry.', sourceType, registryFieldKey: registryEntry.fieldKey });
  }
  if (!isExactChartField(registryEntry)) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'unsupported_exact_field', message: 'Field is not eligible as an exact chart fact.', sourceType, registryFieldKey: registryEntry.fieldKey });
  }
  if (!options.allowClientContext && (!isAllowedClientPath(field.source_path) || !isAllowedClientPath(provenance.sourcePath))) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'client_context_not_allowed', message: 'Client or LLM context is not allowed as a chart source.', sourceType, sourcePath: field.source_path ?? provenance.sourcePath, registryFieldKey: registryEntry.fieldKey });
  }
  const requiresPath = registryEntry.sourceType !== 'input_display' && registryEntry.sourceType !== 'static_template';
  if (requiresPath && !field.source_path) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'missing_source_path', message: 'Resolved field is missing a source path.', sourceType, registryFieldKey: registryEntry.fieldKey });
  }
  const chartPath = field.source_path ?? provenance.sourcePath;
  if (chartPath && !registryEntry.requiredChartPaths.includes(chartPath)) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'source_path_not_allowed', message: 'Resolved field source path is not allowed by registry.', sourceType, sourcePath: chartPath, registryFieldKey: registryEntry.fieldKey });
  }
  if (field.source_section_status && field.source_section_status !== 'computed') {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'section_not_computed', message: 'Resolved field source section is not computed.', sourceType, sourcePath: chartPath, registryFieldKey: registryEntry.fieldKey });
  }
  if (provenance.sourceType !== field.source_type) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'source_type_not_allowed', message: 'Provenance source type does not match field source type.', sourceType, registryFieldKey: registryEntry.fieldKey });
  }

  const hasChartVersion = Boolean(provenance.chartVersionId);
  const hasProfileId = Boolean(provenance.profileId);
  const requireChartVersion = options.requireChartVersionId === true || (options.requireChartVersionId !== false && registryEntry.sourceType !== 'input_display' && registryEntry.sourceType !== 'static_template');
  if (requireChartVersion && !hasChartVersion) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'missing_chart_version_id', message: 'Resolved field is missing chartVersionId provenance.', sourceType, sourcePath: chartPath, registryFieldKey: registryEntry.fieldKey });
  }
  if (options.requireProfileId === true && !hasProfileId) {
    return makeResult({ status: 'invalid', fieldKey: field.fieldKey, failureCode: 'missing_profile_id', message: 'Resolved field is missing profileId provenance.', sourceType, sourcePath: chartPath, registryFieldKey: registryEntry.fieldKey });
  }

  return makeResult({
    status: 'valid',
    fieldKey: field.fieldKey,
    sourceType,
    sourcePath: chartPath,
    registryFieldKey: registryEntry.fieldKey,
    chartVersionId: provenance.chartVersionId,
    profileId: provenance.profileId,
  });
}

export function validateReportContractProvenance(
  report: AstroReportContract,
  options: FactProvenanceValidatorOptions = {},
): { ok: boolean; status: 'valid' | 'invalid'; results: FactProvenanceValidationResult[]; failures: FactProvenanceValidationResult[] } {
  const results: FactProvenanceValidationResult[] = [];
  for (const group of report.groups) {
    for (const field of group.fields) {
      const patchedField = {
        ...field,
        provenance: {
          ...field.provenance,
          chartVersionId: field.provenance.chartVersionId ?? report.chartVersionId,
          profileId: field.provenance.profileId ?? report.profileId,
        },
      } as ResolvedAstroReportField;
      results.push(validateReportFieldProvenance(patchedField, options));
    }
  }
  const failures = results.filter((result) => !result.ok);
  return { ok: failures.length === 0, status: failures.length === 0 ? 'valid' : 'invalid', results, failures };
}

export function assertReportContractProvenance(
  report: AstroReportContract,
  options: FactProvenanceValidatorOptions = {},
): void {
  const result = validateReportContractProvenance(report, options);
  if (result.ok) return;
  const codes = result.failures.slice(0, 5).map((failure) => `${failure.fieldKey}:${failure.failureCode ?? 'unknown'}`).join(', ');
  throw new Error(`Fact provenance validation failed: ${codes}`);
}
