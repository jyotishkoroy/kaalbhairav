/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract, AstroUnavailableValue } from './contracts.ts';
import { makeUnavailableValue } from './unavailable.ts';

export type AdvancedModuleKey =
  | 'shadbala'
  | 'kp_significators'
  | 'varshaphal'
  | 'yogini_dasha'
  | 'chara_dasha'
  | 'lal_kitab_judgement'
  | 'sade_sati_dates'
  | 'ashtakavarga_bindu_matrix'
  | 'transit_prediction_timing';

export type AdvancedModulePolicyEntry = {
  key: AdvancedModuleKey;
  status: 'unavailable';
  reason: 'module_not_implemented' | 'fixture_validation_missing' | 'ephemeris_unavailable' | 'unsupported_setting';
  fieldKey: string;
  requiredModule: string;
  note: string;
};

export const ADVANCED_MODULE_POLICY: Record<AdvancedModuleKey, AdvancedModulePolicyEntry> = {
  shadbala: { key: 'shadbala', status: 'unavailable', reason: 'module_not_implemented', fieldKey: 'advanced.shadbala', requiredModule: 'shadbala', note: 'Shadbala is unavailable until deterministic implementation and fixture validation exist.' },
  kp_significators: { key: 'kp_significators', status: 'unavailable', reason: 'module_not_implemented', fieldKey: 'advanced.kpSignificators', requiredModule: 'kp_significators', note: 'KP significator priority logic remains unavailable.' },
  varshaphal: { key: 'varshaphal', status: 'unavailable', reason: 'module_not_implemented', fieldKey: 'advanced.varshaphal', requiredModule: 'varshaphal', note: 'Varshaphal requires deterministic solar-return root solving and fixtures.' },
  yogini_dasha: { key: 'yogini_dasha', status: 'unavailable', reason: 'module_not_implemented', fieldKey: 'advanced.yoginiDasha', requiredModule: 'yogini_dasha', note: 'Yogini Dasha remains unavailable until exact rules and fixture validation exist.' },
  chara_dasha: { key: 'chara_dasha', status: 'unavailable', reason: 'module_not_implemented', fieldKey: 'advanced.charaDasha', requiredModule: 'chara_dasha', note: 'Chara Dasha remains unavailable until exact Jaimini rules and fixture validation exist.' },
  lal_kitab_judgement: { key: 'lal_kitab_judgement', status: 'unavailable', reason: 'module_not_implemented', fieldKey: 'advanced.lalKitabJudgement', requiredModule: 'lal_kitab_judgement', note: 'Lal Kitab judgement remains unavailable.' },
  sade_sati_dates: { key: 'sade_sati_dates', status: 'unavailable', reason: 'module_not_implemented', fieldKey: 'advanced.sadeSatiDates', requiredModule: 'sade_sati_dates', note: 'Detailed Sade Sati date tables require deterministic Saturn ingress dates and fixture validation.' },
  ashtakavarga_bindu_matrix: { key: 'ashtakavarga_bindu_matrix', status: 'unavailable', reason: 'module_not_implemented', fieldKey: 'advanced.ashtakavargaBinduMatrix', requiredModule: 'ashtakavarga_bindu_matrix', note: 'Full Ashtakavarga bindu matrix remains unavailable unless BAV contribution matrix is implemented and tested.' },
  transit_prediction_timing: { key: 'transit_prediction_timing', status: 'unavailable', reason: 'fixture_validation_missing', fieldKey: 'advanced.transitPredictionTiming', requiredModule: 'transit_prediction_timing', note: 'Transit prediction timing requires deterministic as-of date, ephemeris support, and fixture validation.' },
};

export function makeAdvancedUnavailableValue(key: AdvancedModuleKey): AstroUnavailableValue {
  const policy = ADVANCED_MODULE_POLICY[key];

  return makeUnavailableValue({
    requiredModule: policy.requiredModule,
    fieldKey: policy.fieldKey,
    reason: policy.reason,
  });
}

export function makeAdvancedUnavailableFields(): Record<AdvancedModuleKey, AstroUnavailableValue> {
  return Object.keys(ADVANCED_MODULE_POLICY).reduce((acc, key) => {
    const moduleKey = key as AdvancedModuleKey;
    acc[moduleKey] = makeAdvancedUnavailableValue(moduleKey);
    return acc;
  }, {} as Record<AdvancedModuleKey, AstroUnavailableValue>);
}

export function makeAdvancedUnavailableSection(): AstroSectionContract {
  return {
    status: 'unavailable',
    source: 'none',
    reason: 'module_not_implemented',
    fields: {
      modules: makeAdvancedUnavailableFields(),
      policy: ADVANCED_MODULE_POLICY,
    },
    warnings: [
      'Advanced modules are unavailable until deterministic implementation and fixture validation exist.',
    ],
  };
}

export function isAdvancedModuleComputedAllowed(args: {
  moduleKey: AdvancedModuleKey;
  fixtureValidated: boolean;
  allowUnverifiedAdvancedCalcs: boolean;
}): boolean {
  if (args.fixtureValidated) {
    return true;
  }

  if (!args.allowUnverifiedAdvancedCalcs) {
    return false;
  }

  return false;
}
