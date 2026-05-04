/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type UnavailableReason =
  | 'module_not_implemented'
  | 'missing_current_chart'
  | 'missing_chart_path'
  | 'incompatible_settings'
  | 'missing_golden_fixture'
  | 'unsupported_question'
  | 'insufficient_birth_time'
  | 'unsafe_to_answer'
  | 'section_unavailable'
  | 'field_not_registered'
  | 'source_not_allowed';

export type UnavailableAstroValue = {
  value: null;
  status: 'unavailable';
  reason: UnavailableReason;
  source_type: 'unavailable';
  required_module?: string;
  required_chart_path?: string;
  message: string;
};

function defaultUnavailableMessage(reason: UnavailableReason, requiredModule?: string, requiredChartPath?: string): string {
  switch (reason) {
    case 'missing_current_chart':
      return 'This field is unavailable because the current chart is not ready.';
    case 'missing_chart_path':
      return 'This field is unavailable because the required chart path is missing.';
    case 'module_not_implemented':
      return 'This field is unavailable because the required calculation module is not implemented.';
    case 'incompatible_settings':
      return 'This field is unavailable because the chart settings are not compatible with this field.';
    case 'missing_golden_fixture':
      return 'This field is unavailable because the required golden fixture is missing.';
    case 'unsupported_question':
      return 'This field is unavailable because the question is not supported for deterministic resolution.';
    case 'insufficient_birth_time':
      return 'This field is unavailable because the birth time is insufficient for a deterministic answer.';
    case 'unsafe_to_answer':
      return 'This field is unavailable because it is unsafe to answer deterministically.';
    case 'section_unavailable':
      return requiredModule
        ? `This field is unavailable because the required section in ${requiredModule} is unavailable.`
        : 'This field is unavailable because the required section is unavailable.';
    case 'field_not_registered':
      return requiredChartPath
        ? `This field is unavailable because the field is not registered for path ${requiredChartPath}.`
        : 'This field is unavailable because the field is not registered.';
    case 'source_not_allowed':
      return 'This field is unavailable because the source is not allowed.';
  }
}

export function unavailableAstroValue(args: {
  reason: UnavailableReason;
  requiredModule?: string;
  requiredChartPath?: string;
  message?: string;
}): UnavailableAstroValue {
  return {
    value: null,
    status: 'unavailable',
    reason: args.reason,
    source_type: 'unavailable',
    required_module: args.requiredModule,
    required_chart_path: args.requiredChartPath,
    message: args.message ?? defaultUnavailableMessage(args.reason, args.requiredModule, args.requiredChartPath),
  };
}
