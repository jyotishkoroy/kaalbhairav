/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract, PlanetNameV2, PlanetaryPositionV2 } from './contracts.ts';
import { normalizeDegrees360 } from './longitude.ts';
import { makeUnavailableValue } from './unavailable.ts';
import { buildSafeGenericRemedies, validateRemedyText } from './remedy-safety.ts';

export type ManglikBasis = 'lagna' | 'moon' | 'venus';
export type DoshaSeverity = 'none' | 'low' | 'medium' | 'high' | 'unavailable';

export type ManglikResult = {
  status: 'computed';
  isManglik: boolean;
  severity: DoshaSeverity;
  triggeringHouses: number[];
  basis: ManglikBasis[];
  rulesApplied: string[];
  source: 'deterministic_calculation';
};

export type KalsarpaResult = {
  status: 'computed' | 'unavailable';
  isKalsarpa: boolean | null;
  classification: 'none' | 'all_planets_between_rahu_ketu' | 'unavailable';
  reason?: string;
  source: 'deterministic_calculation' | 'none';
};

export type DoshaV2Fields = {
  manglik: ManglikResult | ReturnType<typeof makeUnavailableValue>;
  kalsarpa: KalsarpaResult | ReturnType<typeof makeUnavailableValue>;
  unsupported: Record<string, ReturnType<typeof makeUnavailableValue>>;
  safeRemedies: string[];
};

export const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12] as const;

const CLASSICAL_PLANETS: PlanetNameV2[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getByBody(section: AstroSectionContract): Partial<Record<PlanetNameV2, PlanetaryPositionV2>> | null {
  const byBody = section.fields?.byBody;
  return isRecord(byBody) ? (byBody as Partial<Record<PlanetNameV2, PlanetaryPositionV2>>) : null;
}

function getHousePlacementMap(section: AstroSectionContract): Record<string, { wholeSignHouse?: unknown; bhavaHouse?: unknown }> | null {
  const placements = section.fields?.placements;
  return isRecord(placements)
    ? (placements as Record<string, { wholeSignHouse?: unknown; bhavaHouse?: unknown }>)
    : null;
}

function getWholeSignHouse(houses: AstroSectionContract, body: PlanetNameV2): number | null {
  const placements = getHousePlacementMap(houses);
  const house = placements?.[body]?.wholeSignHouse;
  return typeof house === 'number' && Number.isInteger(house) && house >= 1 && house <= 12 ? house : null;
}

function calculateRelativeHouse(planetSignNumber: number, referenceSignNumber: number): number {
  if (!Number.isInteger(planetSignNumber) || planetSignNumber < 1 || planetSignNumber > 12) {
    throw new Error('planetSignNumber must be an integer from 1 to 12.');
  }
  if (!Number.isInteger(referenceSignNumber) || referenceSignNumber < 1 || referenceSignNumber > 12) {
    throw new Error('referenceSignNumber must be an integer from 1 to 12.');
  }
  return (((planetSignNumber - referenceSignNumber) % 12) + 12) % 12 + 1;
}

function getBodySignNumber(byBody: Partial<Record<PlanetNameV2, PlanetaryPositionV2>>, body: PlanetNameV2): number | null {
  const signNumber = byBody[body]?.signNumber;
  return typeof signNumber === 'number' && Number.isInteger(signNumber) && signNumber >= 1 && signNumber <= 12 ? signNumber : null;
}

function getBodyLongitude(byBody: Partial<Record<PlanetNameV2, PlanetaryPositionV2>>, body: PlanetNameV2): number | null {
  const longitude = byBody[body]?.absoluteLongitude;
  return typeof longitude === 'number' && Number.isFinite(longitude) ? normalizeDegrees360(longitude) : null;
}

export function calculateManglikDosha(args: {
  planetaryPositions: AstroSectionContract;
  houses: AstroSectionContract;
}): ManglikResult | ReturnType<typeof makeUnavailableValue> {
  const byBody = getByBody(args.planetaryPositions);

  if (!byBody) {
    return makeUnavailableValue({
      requiredModule: 'manglik',
      fieldKey: 'dosha.manglik',
      reason: 'insufficient_birth_data',
    });
  }

  const marsSignNumber = getBodySignNumber(byBody, 'Mars');

  if (!marsSignNumber) {
    return makeUnavailableValue({
      requiredModule: 'manglik',
      fieldKey: 'dosha.manglik',
      reason: 'insufficient_birth_data',
    });
  }

  const triggeringHouses: number[] = [];
  const basis: ManglikBasis[] = [];

  const marsFromLagna = getWholeSignHouse(args.houses, 'Mars');

  if (marsFromLagna !== null && MANGLIK_HOUSES.includes(marsFromLagna as (typeof MANGLIK_HOUSES)[number])) {
    triggeringHouses.push(marsFromLagna);
    basis.push('lagna');
  }

  const moonSign = getBodySignNumber(byBody, 'Moon');

  if (moonSign) {
    const marsFromMoon = calculateRelativeHouse(marsSignNumber, moonSign);
    if (MANGLIK_HOUSES.includes(marsFromMoon as (typeof MANGLIK_HOUSES)[number])) {
      triggeringHouses.push(marsFromMoon);
      basis.push('moon');
    }
  }

  const venusSign = getBodySignNumber(byBody, 'Venus');

  if (venusSign) {
    const marsFromVenus = calculateRelativeHouse(marsSignNumber, venusSign);
    if (MANGLIK_HOUSES.includes(marsFromVenus as (typeof MANGLIK_HOUSES)[number])) {
      triggeringHouses.push(marsFromVenus);
      basis.push('venus');
    }
  }

  const uniqueTriggeringHouses = [...new Set(triggeringHouses)].sort((a, b) => a - b);
  const uniqueBasis = [...new Set(basis)] as ManglikBasis[];
  const isManglik = uniqueBasis.length > 0;
  const severity: DoshaSeverity = !isManglik ? 'none' : uniqueBasis.length >= 3 ? 'high' : uniqueBasis.length === 2 ? 'medium' : 'low';

  return {
    status: 'computed',
    isManglik,
    severity,
    triggeringHouses: uniqueTriggeringHouses,
    basis: uniqueBasis,
    rulesApplied: ['Mars in houses 1, 2, 4, 7, 8, or 12 from Lagna, Moon, or Venus using deterministic whole-sign placement.'],
    source: 'deterministic_calculation',
  };
}

function longitudeInRahuToKetuArc(valueDeg: number, rahuDeg: number, ketuDeg: number): boolean {
  const value = normalizeDegrees360(valueDeg);
  const rahu = normalizeDegrees360(rahuDeg);
  const ketu = normalizeDegrees360(ketuDeg);

  if (rahu === ketu) {
    return false;
  }

  if (rahu < ketu) {
    return value > rahu && value < ketu;
  }

  return value > rahu || value < ketu;
}

function allClassicalPlanetsOnOneNodeArc(args: {
  byBody: Partial<Record<PlanetNameV2, PlanetaryPositionV2>>;
  rahuDeg: number;
  ketuDeg: number;
}): boolean {
  const statuses = CLASSICAL_PLANETS.map((body) => {
    const longitude = getBodyLongitude(args.byBody, body);
    if (longitude === null) {
      throw new Error(`${body} longitude is required for Kalsarpa boundary calculation.`);
    }
    return longitudeInRahuToKetuArc(longitude, args.rahuDeg, args.ketuDeg);
  });

  return statuses.every(Boolean) || statuses.every((value) => !value);
}

export function calculateKalsarpaBoundary(args: {
  planetaryPositions: AstroSectionContract;
}): KalsarpaResult | ReturnType<typeof makeUnavailableValue> {
  const byBody = getByBody(args.planetaryPositions);

  if (!byBody) {
    return makeUnavailableValue({
      requiredModule: 'kalsarpa',
      fieldKey: 'dosha.kalsarpa',
      reason: 'insufficient_birth_data',
    });
  }

  const rahuDeg = getBodyLongitude(byBody, 'Rahu');
  const ketuDeg = getBodyLongitude(byBody, 'Ketu');

  if (rahuDeg === null || ketuDeg === null) {
    return makeUnavailableValue({
      requiredModule: 'kalsarpa',
      fieldKey: 'dosha.kalsarpa',
      reason: 'insufficient_birth_data',
    });
  }

  try {
    const isKalsarpa = allClassicalPlanetsOnOneNodeArc({
      byBody,
      rahuDeg,
      ketuDeg,
    });

    return {
      status: 'computed',
      isKalsarpa,
      classification: isKalsarpa ? 'all_planets_between_rahu_ketu' : 'none',
      source: 'deterministic_calculation',
    };
  } catch (error) {
    return {
      status: 'unavailable',
      isKalsarpa: null,
      classification: 'unavailable',
      reason: error instanceof Error ? error.message : 'Kalsarpa boundary unavailable.',
      source: 'none',
    };
  }
}

function unsupportedDoshaModules() {
  return {
    shadbala: makeUnavailableValue({
      requiredModule: 'shadbala',
      fieldKey: 'dosha.shadbala',
      reason: 'module_not_implemented',
    }),
    sadeSatiDates: makeUnavailableValue({
      requiredModule: 'sade_sati_dates',
      fieldKey: 'dosha.sadeSatiDates',
      reason: 'module_not_implemented',
    }),
    lalKitabJudgement: makeUnavailableValue({
      requiredModule: 'lal_kitab_judgement',
      fieldKey: 'dosha.lalKitabJudgement',
      reason: 'module_not_implemented',
    }),
  };
}

export function buildDoshaSectionV2(args: {
  planetaryPositions: AstroSectionContract;
  houses: AstroSectionContract;
}): AstroSectionContract {
  if (args.planetaryPositions.status !== 'computed') {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'planetary_positions_unavailable',
      fields: {
        dosha: makeUnavailableValue({
          requiredModule: 'dosha',
          fieldKey: 'dosha',
          reason: 'insufficient_birth_data',
        }),
      },
    };
  }

  const manglik = calculateManglikDosha({
    planetaryPositions: args.planetaryPositions,
    houses: args.houses,
  });
  const kalsarpa = calculateKalsarpaBoundary({
    planetaryPositions: args.planetaryPositions,
  });
  const safeRemedies = buildSafeGenericRemedies();
  const remedyIssues = safeRemedies.flatMap((text) => validateRemedyText(text).issues);

  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      manglik,
      kalsarpa,
      unsupported: unsupportedDoshaModules(),
      safeRemedies,
      remedySafety: {
        status: remedyIssues.length > 0 ? 'warning' : 'safe',
        issues: remedyIssues,
      },
    } satisfies DoshaV2Fields & {
      remedySafety: {
        status: 'safe' | 'warning';
        issues: unknown[];
      };
    },
    warnings: [
      'Dosha results are deterministic rule-boundaries only and must not be used for fear-based predictions or coercive remedies.',
      'Unsupported advanced dosha modules remain unavailable until deterministic implementation and fixture validation exist.',
    ],
  };
}
