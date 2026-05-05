/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type UnsupportedExactFieldKey =
  | 'shadbala.total'
  | 'kp.significators'
  | 'varshaphal.varshaLagna'
  | 'yogini.currentDasha'
  | 'chara.currentDasha'
  | 'lalKitab.judgement'
  | 'sadeSati.dateTable'
  | 'ashtakavarga.binduMatrix';

export type UnsupportedExactFieldRegistryRow = {
  fieldKey: UnsupportedExactFieldKey;
  requiredModule: string;
  reason: 'module_not_implemented';
  safeMessage: string;
};

export const UNAVAILABLE_EXACT_FIELD_REGISTRY: Record<UnsupportedExactFieldKey, UnsupportedExactFieldRegistryRow> = {
  'shadbala.total': {
    fieldKey: 'shadbala.total',
    requiredModule: 'shadbala',
    reason: 'module_not_implemented',
    safeMessage: 'This exact field is unavailable because the deterministic shadbala calculation is not implemented. I will not guess it.',
  },
  'kp.significators': {
    fieldKey: 'kp.significators',
    requiredModule: 'kp-significators',
    reason: 'module_not_implemented',
    safeMessage: 'This exact field is unavailable because the deterministic kp-significators calculation is not implemented. I will not guess it.',
  },
  'varshaphal.varshaLagna': {
    fieldKey: 'varshaphal.varshaLagna',
    requiredModule: 'varshaphal',
    reason: 'module_not_implemented',
    safeMessage: 'This exact field is unavailable because the deterministic varshaphal calculation is not implemented. I will not guess it.',
  },
  'yogini.currentDasha': {
    fieldKey: 'yogini.currentDasha',
    requiredModule: 'yogini-dasha',
    reason: 'module_not_implemented',
    safeMessage: 'This exact field is unavailable because the deterministic yogini-dasha calculation is not implemented. I will not guess it.',
  },
  'chara.currentDasha': {
    fieldKey: 'chara.currentDasha',
    requiredModule: 'chara-dasha',
    reason: 'module_not_implemented',
    safeMessage: 'This exact field is unavailable because the deterministic chara-dasha calculation is not implemented. I will not guess it.',
  },
  'lalKitab.judgement': {
    fieldKey: 'lalKitab.judgement',
    requiredModule: 'lal-kitab',
    reason: 'module_not_implemented',
    safeMessage: 'This exact field is unavailable because the deterministic lal-kitab calculation is not implemented. I will not guess it.',
  },
  'sadeSati.dateTable': {
    fieldKey: 'sadeSati.dateTable',
    requiredModule: 'sade-sati',
    reason: 'module_not_implemented',
    safeMessage: 'This exact field is unavailable because the deterministic sade-sati calculation is not implemented. I will not guess it.',
  },
  'ashtakavarga.binduMatrix': {
    fieldKey: 'ashtakavarga.binduMatrix',
    requiredModule: 'ashtakavarga',
    reason: 'module_not_implemented',
    safeMessage: 'This exact field is unavailable because the deterministic ashtakavarga calculation is not implemented. I will not guess it.',
  },
};

export function isUnsupportedExactFieldKey(fieldKey: string): fieldKey is UnsupportedExactFieldKey {
  return Object.prototype.hasOwnProperty.call(UNAVAILABLE_EXACT_FIELD_REGISTRY, fieldKey);
}

export function getUnavailableExactField(fieldKey: string): UnsupportedExactFieldRegistryRow | null {
  return isUnsupportedExactFieldKey(fieldKey) ? UNAVAILABLE_EXACT_FIELD_REGISTRY[fieldKey] : null;
}

export function makeUnavailableExactFieldValue(fieldKey: string): {
  status: 'unavailable';
  value: null;
  reason: 'module_not_implemented';
  source: 'none';
  requiredModule: string;
  fieldKey: string;
} | null {
  const entry = getUnavailableExactField(fieldKey);
  if (!entry) return null;
  return {
    status: 'unavailable',
    value: null,
    reason: 'module_not_implemented',
    source: 'none',
    requiredModule: entry.requiredModule,
    fieldKey: entry.fieldKey,
  };
}
