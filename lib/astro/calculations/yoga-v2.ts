/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract, PlanetNameV2, PlanetaryPositionV2 } from './contracts.ts';
import { makeUnavailableValue } from './unavailable.ts';

export type YogaRuleStatus = 'present' | 'absent' | 'unavailable';

export type YogaRuleResult = {
  key: string;
  name: string;
  status: YogaRuleStatus;
  evidence: Record<string, unknown>;
  source: 'deterministic_calculation' | 'none';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getByBody(section: AstroSectionContract): Partial<Record<PlanetNameV2, PlanetaryPositionV2>> | null {
  const byBody = section.fields?.byBody;
  return isRecord(byBody) ? (byBody as Partial<Record<PlanetNameV2, PlanetaryPositionV2>>) : null;
}

function getSign(byBody: Partial<Record<PlanetNameV2, PlanetaryPositionV2>>, body: PlanetNameV2): number | null {
  const signNumber = byBody[body]?.signNumber;
  return typeof signNumber === 'number' && Number.isInteger(signNumber) && signNumber >= 1 && signNumber <= 12 ? signNumber : null;
}

function getRelativeHouse(planetSign: number, referenceSign: number): number {
  return (((planetSign - referenceSign) % 12) + 12) % 12 + 1;
}

function unavailableYoga(key: string, name: string, reason: string): YogaRuleResult {
  return {
    key,
    name,
    status: 'unavailable',
    evidence: { reason },
    source: 'none',
  };
}

export function calculateGajakesariYoga(planetaryPositions: AstroSectionContract): YogaRuleResult {
  const byBody = getByBody(planetaryPositions);

  if (!byBody) {
    return unavailableYoga('gajakesari', 'Gajakesari Yoga', 'planetary_positions_unavailable');
  }

  const moonSign = getSign(byBody, 'Moon');
  const jupiterSign = getSign(byBody, 'Jupiter');

  if (!moonSign || !jupiterSign) {
    return unavailableYoga('gajakesari', 'Gajakesari Yoga', 'Moon and Jupiter signs are required.');
  }

  const relativeHouse = getRelativeHouse(jupiterSign, moonSign);
  const present = [1, 4, 7, 10].includes(relativeHouse);

  return {
    key: 'gajakesari',
    name: 'Gajakesari Yoga',
    status: present ? 'present' : 'absent',
    evidence: {
      moonSign,
      jupiterSign,
      jupiterHouseFromMoon: relativeHouse,
      rule: 'Jupiter in 1, 4, 7, or 10 from Moon by sign.',
    },
    source: 'deterministic_calculation',
  };
}

export function calculateChandraMangalYoga(planetaryPositions: AstroSectionContract): YogaRuleResult {
  const byBody = getByBody(planetaryPositions);

  if (!byBody) {
    return unavailableYoga('chandra_mangal', 'Chandra-Mangal Yoga', 'planetary_positions_unavailable');
  }

  const moonSign = getSign(byBody, 'Moon');
  const marsSign = getSign(byBody, 'Mars');

  if (!moonSign || !marsSign) {
    return unavailableYoga('chandra_mangal', 'Chandra-Mangal Yoga', 'Moon and Mars signs are required.');
  }

  const relativeHouse = getRelativeHouse(marsSign, moonSign);
  const present = relativeHouse === 1 || relativeHouse === 7;

  return {
    key: 'chandra_mangal',
    name: 'Chandra-Mangal Yoga',
    status: present ? 'present' : 'absent',
    evidence: {
      moonSign,
      marsSign,
      marsHouseFromMoon: relativeHouse,
      rule: 'Mars in same sign or 7th from Moon by sign.',
    },
    source: 'deterministic_calculation',
  };
}

export function calculateBudhaAdityaYoga(planetaryPositions: AstroSectionContract): YogaRuleResult {
  const byBody = getByBody(planetaryPositions);

  if (!byBody) {
    return unavailableYoga('budha_aditya', 'Budha-Aditya Yoga', 'planetary_positions_unavailable');
  }

  const sunSign = getSign(byBody, 'Sun');
  const mercurySign = getSign(byBody, 'Mercury');

  if (!sunSign || !mercurySign) {
    return unavailableYoga('budha_aditya', 'Budha-Aditya Yoga', 'Sun and Mercury signs are required.');
  }

  const present = sunSign === mercurySign;

  return {
    key: 'budha_aditya',
    name: 'Budha-Aditya Yoga',
    status: present ? 'present' : 'absent',
    evidence: {
      sunSign,
      mercurySign,
      rule: 'Sun and Mercury in same sign.',
    },
    source: 'deterministic_calculation',
  };
}

function unsupportedYogaModules() {
  return {
    rajYogaDetailed: makeUnavailableValue({
      requiredModule: 'raj_yoga_detailed',
      fieldKey: 'yoga.rajYogaDetailed',
      reason: 'module_not_implemented',
    }),
    dhanaYogaDetailed: makeUnavailableValue({
      requiredModule: 'dhana_yoga_detailed',
      fieldKey: 'yoga.dhanaYogaDetailed',
      reason: 'module_not_implemented',
    }),
    neechaBhangaDetailed: makeUnavailableValue({
      requiredModule: 'neecha_bhanga_detailed',
      fieldKey: 'yoga.neechaBhangaDetailed',
      reason: 'module_not_implemented',
    }),
  };
}

export function buildYogaSectionV2(args: {
  planetaryPositions: AstroSectionContract;
}): AstroSectionContract {
  if (args.planetaryPositions.status !== 'computed') {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'planetary_positions_unavailable',
      fields: {
        yoga: makeUnavailableValue({
          requiredModule: 'yoga',
          fieldKey: 'yoga',
          reason: 'insufficient_birth_data',
        }),
      },
    };
  }

  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      rules: {
        gajakesari: calculateGajakesariYoga(args.planetaryPositions),
        chandraMangal: calculateChandraMangalYoga(args.planetaryPositions),
        budhaAditya: calculateBudhaAdityaYoga(args.planetaryPositions),
      },
      unsupported: unsupportedYogaModules(),
    },
    warnings: ['Yoga outputs are deterministic rule-boundaries only. Do not convert them into guaranteed life outcomes.'],
  };
}
