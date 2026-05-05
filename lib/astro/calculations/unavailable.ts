/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type {
  AstroSectionContract,
  AstroUnavailableReason,
  AstroUnavailableValue,
} from './contracts.ts';
import { makeUnavailableExactFieldValue } from '../unavailable-field-registry.ts';

export const ASTRO_UNAVAILABLE_MODULE_IDS = {
  shadbala: 'shadbala',
  kpSignificators: 'kp_significators',
  varshaphal: 'varshaphal',
  yoginiDasha: 'yogini_dasha',
  charaDasha: 'chara_dasha',
  lalKitabJudgement: 'lal_kitab_judgement',
  sadeSatiDates: 'sade_sati_dates',
  ashtakavargaBinduMatrix: 'ashtakavarga_bindu_matrix',
} as const;

export type AstroUnavailableModuleId =
  (typeof ASTRO_UNAVAILABLE_MODULE_IDS)[keyof typeof ASTRO_UNAVAILABLE_MODULE_IDS];

export type MakeUnavailableValueArgs = {
  requiredModule: string;
  fieldKey: string;
  reason?: AstroUnavailableReason;
};

export function makeUnavailableValue(args: MakeUnavailableValueArgs): AstroUnavailableValue {
  return {
    status: 'unavailable',
    value: null,
    reason: args.reason ?? 'module_not_implemented',
    source: 'none',
    requiredModule: args.requiredModule,
    fieldKey: args.fieldKey,
  };
}

export function makeUnsupportedExactUnavailableValue(args: {
  requiredModule: string;
  fieldKey: string;
  reason?: AstroUnavailableReason;
}): AstroUnavailableValue {
  const exact = makeUnavailableExactFieldValue(args.fieldKey);
  if (exact) {
    return {
      status: exact.status,
      value: exact.value,
      reason: exact.reason,
      source: exact.source,
      requiredModule: exact.requiredModule,
      fieldKey: exact.fieldKey,
    };
  }
  return makeUnavailableValue({ requiredModule: args.requiredModule, fieldKey: args.fieldKey, reason: args.reason ?? 'module_not_implemented' });
}

export type MakeUnavailableSectionArgs = {
  requiredModule: string;
  fieldKey: string;
  reason?: AstroUnavailableReason;
  warnings?: string[];
};

export function makeUnavailableSection(args: MakeUnavailableSectionArgs): AstroSectionContract {
  return {
    status: 'unavailable',
    source: 'none',
    reason: args.reason ?? 'module_not_implemented',
    fields: {
      [args.fieldKey]: makeUnavailableValue(args),
    },
    warnings: args.warnings,
  };
}

export function isUnavailableValue(value: unknown): value is AstroUnavailableValue {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AstroUnavailableValue>;

  return (
    candidate.status === 'unavailable' &&
    candidate.value === null &&
    candidate.source === 'none' &&
    typeof candidate.reason === 'string' &&
    typeof candidate.requiredModule === 'string' &&
    typeof candidate.fieldKey === 'string'
  );
}
