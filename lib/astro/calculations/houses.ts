/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { RASHI_MAP } from './constants.ts';
import type { LagnaResult, LagnaReliability } from './lagna.ts';
import type { AstroSectionContract, PlanetNameV2, PlanetaryPositionV2 } from './contracts.ts';
import type { AscendantMcResult, EphemerisProvider } from './ephemeris-provider.ts';
import { longitudeToSignDegree, normalizeDegrees360, type SignNumber } from './longitude.ts';
import { makeUnavailableValue } from './unavailable.ts';

export type WholeSignHouse = {
  house_number: number;
  sign: string;
  sign_index: number;
  reliability: LagnaReliability;
};

export function calculateWholeSignHouses(lagna: LagnaResult | null): WholeSignHouse[] {
  if (!lagna) return [];
  return Array.from({ length: 12 }, (_, i) => {
    const house_number = i + 1;
    const sign_index = (lagna.sign_index + i) % 12;
    return {
      house_number,
      sign: RASHI_MAP[sign_index].english_name,
      sign_index,
      reliability: lagna.reliability,
    };
  });
}

export type HouseSystemV2 = 'whole_sign' | 'sripati' | 'kp_placidus';

export type HouseCuspV2 = {
  houseNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  cuspLongitudeDeg: number;
  sign: string;
  signNumber: SignNumber;
  degreeInSign: number;
};

export type HousePlacementV2 = {
  body: PlanetNameV2;
  sign: string;
  signNumber: SignNumber;
  degreeInSign: number;
  absoluteLongitude: number;
  wholeSignHouse: number;
  bhavaHouse: number | null;
  source: 'deterministic_calculation';
};

export type BuildHousesV2Args = {
  lagna: AstroSectionContract;
  planetaryPositions: AstroSectionContract;
  houseSystem: HouseSystemV2;
  ephemerisProvider?: EphemerisProvider;
  jdUtExact?: number | null;
  latitudeDeg?: number | null;
  longitudeDeg?: number | null;
  ayanamshaDeg?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSignNumber(value: unknown): value is SignNumber {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12;
}

export function calculateWholeSignHouse(
  planetSignNumber: number,
  lagnaSignNumber: number,
): number {
  if (!Number.isInteger(planetSignNumber) || planetSignNumber < 1 || planetSignNumber > 12) {
    throw new Error('planetSignNumber must be an integer from 1 to 12.');
  }

  if (!Number.isInteger(lagnaSignNumber) || lagnaSignNumber < 1 || lagnaSignNumber > 12) {
    throw new Error('lagnaSignNumber must be an integer from 1 to 12.');
  }

  return (((planetSignNumber - lagnaSignNumber) % 12) + 12) % 12 + 1;
}

export function extractLagnaSignNumber(lagna: AstroSectionContract): SignNumber | null {
  const ascendant = isRecord(lagna.fields?.ascendant) ? lagna.fields.ascendant : null;
  const signNumber = ascendant?.signNumber;

  return isSignNumber(signNumber) ? signNumber : null;
}

export function extractPlanetaryByBody(
  planetaryPositions: AstroSectionContract,
): Partial<Record<PlanetNameV2, PlanetaryPositionV2>> | null {
  const byBody = planetaryPositions.fields?.byBody;

  if (!isRecord(byBody)) {
    return null;
  }

  return byBody as Partial<Record<PlanetNameV2, PlanetaryPositionV2>>;
}

export function normalizeHouseCusps(cuspsTropicalOrSiderealDeg: number[]): HouseCuspV2[] {
  if (!Array.isArray(cuspsTropicalOrSiderealDeg) || cuspsTropicalOrSiderealDeg.length !== 12) {
    throw new Error('Expected exactly 12 house cusps.');
  }

  return cuspsTropicalOrSiderealDeg.map((cusp, index) => {
    if (!Number.isFinite(cusp)) {
      throw new Error(`House cusp ${index + 1} must be a finite number.`);
    }

    const normalized = normalizeDegrees360(cusp);
    const signDegree = longitudeToSignDegree(normalized);

    return {
      houseNumber: (index + 1) as HouseCuspV2['houseNumber'],
      cuspLongitudeDeg: normalized,
      sign: signDegree.signName,
      signNumber: signDegree.signNumber,
      degreeInSign: signDegree.degreeInSign,
    };
  });
}

function longitudeInArc(
  valueDeg: number,
  startDeg: number,
  endDeg: number,
): boolean {
  const value = normalizeDegrees360(valueDeg);
  const start = normalizeDegrees360(startDeg);
  const end = normalizeDegrees360(endDeg);

  if (start === end) {
    return false;
  }

  if (start < end) {
    return value >= start && value < end;
  }

  return value >= start || value < end;
}

export function calculateBhavaHouseFromCusps(
  longitudeDeg: number,
  cusps: readonly HouseCuspV2[],
): number | null {
  if (!Number.isFinite(longitudeDeg)) {
    throw new Error('longitudeDeg must be a finite number.');
  }

  if (cusps.length !== 12) {
    throw new Error('Expected exactly 12 house cusps.');
  }

  for (let index = 0; index < cusps.length; index += 1) {
    const current = cusps[index];
    const next = cusps[(index + 1) % cusps.length];

    if (longitudeInArc(longitudeDeg, current.cuspLongitudeDeg, next.cuspLongitudeDeg)) {
      return current.houseNumber;
    }
  }

  return null;
}

export function buildWholeSignPlacements(args: {
  planetaryPositions: AstroSectionContract;
  lagna: AstroSectionContract;
}): Record<string, HousePlacementV2> {
  const lagnaSignNumber = extractLagnaSignNumber(args.lagna);
  const byBody = extractPlanetaryByBody(args.planetaryPositions);

  if (!lagnaSignNumber) {
    throw new Error('Lagna sign number is required for whole-sign placement.');
  }

  if (!byBody) {
    throw new Error('Planetary positions are required for whole-sign placement.');
  }

  const placements: Record<string, HousePlacementV2> = {};

  for (const [body, position] of Object.entries(byBody)) {
    if (!position) {
      continue;
    }

    placements[body] = {
      body: body as PlanetNameV2,
      sign: position.sign,
      signNumber: position.signNumber,
      degreeInSign: position.degreeInSign,
      absoluteLongitude: position.absoluteLongitude,
      wholeSignHouse: calculateWholeSignHouse(position.signNumber, lagnaSignNumber),
      bhavaHouse: null,
      source: 'deterministic_calculation',
    };
  }

  return placements;
}

export function applyBhavaHousesToPlacements(args: {
  placements: Record<string, HousePlacementV2>;
  cusps: readonly HouseCuspV2[];
}): Record<string, HousePlacementV2> {
  const nextPlacements: Record<string, HousePlacementV2> = {};

  for (const [body, placement] of Object.entries(args.placements)) {
    nextPlacements[body] = {
      ...placement,
      bhavaHouse: calculateBhavaHouseFromCusps(placement.absoluteLongitude, args.cusps),
    };
  }

  return nextPlacements;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export async function buildHousesSectionV2(
  args: BuildHousesV2Args,
): Promise<AstroSectionContract> {
  try {
    if (args.planetaryPositions.status !== 'computed') {
      return {
        status: 'unavailable',
        source: 'none',
        reason: 'planetary_positions_unavailable',
        fields: {
          houses: makeUnavailableValue({
            requiredModule: 'houses',
            fieldKey: 'houses.placements',
            reason: 'insufficient_birth_data',
          }),
        },
        warnings: ['House placement requires computed planetary positions.'],
      };
    }

    if (args.lagna.status !== 'computed') {
      return {
        status: 'unavailable',
        source: 'none',
        reason: 'lagna_unavailable',
        fields: {
          houses: makeUnavailableValue({
            requiredModule: 'houses',
            fieldKey: 'houses.lagna',
            reason: 'insufficient_birth_data',
          }),
        },
        warnings: ['House placement requires computed Lagna.'],
      };
    }

    const wholeSignPlacements = buildWholeSignPlacements({
      planetaryPositions: args.planetaryPositions,
      lagna: args.lagna,
    });

    if (args.houseSystem === 'whole_sign') {
      return {
        status: 'computed',
        source: 'deterministic_calculation',
        fields: {
          houseSystem: 'whole_sign',
          cusps: null,
          placements: wholeSignPlacements,
        },
      };
    }

    if (
      !args.ephemerisProvider?.calculateAscendantMc ||
      args.jdUtExact === null ||
      args.jdUtExact === undefined ||
      args.latitudeDeg === null ||
      args.latitudeDeg === undefined ||
      args.longitudeDeg === null ||
      args.longitudeDeg === undefined
    ) {
      return {
        status: 'partial',
        source: 'deterministic_calculation',
        reason: 'house_cusps_unavailable',
        fields: {
          houseSystem: args.houseSystem,
          cusps: makeUnavailableValue({
            requiredModule: 'house_cusps',
            fieldKey: 'houses.cusps',
            reason: 'module_not_implemented',
          }),
          placements: wholeSignPlacements,
        },
        warnings: [
          `${args.houseSystem} cusp provider is unavailable; whole-sign placements were preserved.`,
        ],
      };
    }

    const providerHouseSystem = args.houseSystem === 'kp_placidus' ? 'kp_placidus' : 'sripati';

    const ascMc: AscendantMcResult = await args.ephemerisProvider.calculateAscendantMc({
      jdUtExact: args.jdUtExact,
      latitudeDeg: args.latitudeDeg,
      longitudeDeg: args.longitudeDeg,
      houseSystem: providerHouseSystem,
    });

    if (!ascMc.cuspsTropicalDeg || ascMc.cuspsTropicalDeg.length !== 12) {
      return {
        status: 'partial',
        source: 'deterministic_calculation',
        reason: 'house_cusps_unavailable',
        fields: {
          houseSystem: args.houseSystem,
          cusps: makeUnavailableValue({
            requiredModule: 'house_cusps',
            fieldKey: 'houses.cusps',
            reason: 'ephemeris_unavailable',
          }),
          placements: wholeSignPlacements,
        },
        warnings: [
          `${args.houseSystem} provider did not return 12 cusps; whole-sign placements were preserved.`,
        ],
      };
    }

    if (!isFiniteNumber(args.ayanamshaDeg)) {
      return {
        status: 'partial',
        source: 'deterministic_calculation',
        reason: 'house_cusps_unavailable',
        fields: {
          houseSystem: args.houseSystem,
          cusps: makeUnavailableValue({
            requiredModule: 'house_cusps',
            fieldKey: 'houses.cusps',
            reason: 'ephemeris_unavailable',
          }),
          placements: wholeSignPlacements,
        },
        warnings: [
          `${args.houseSystem} provider returned cusps, but ayanamsha is unavailable; whole-sign placements were preserved.`,
        ],
      };
    }

    const ayanamshaDeg = args.ayanamshaDeg;
    const siderealCusps = ascMc.cuspsTropicalDeg.map((cusp) =>
      normalizeDegrees360(cusp - ayanamshaDeg),
    );
    const cusps = normalizeHouseCusps(siderealCusps);
    const placements = applyBhavaHousesToPlacements({
      placements: wholeSignPlacements,
      cusps,
    });

    return {
      status: 'computed',
      source: 'deterministic_calculation',
      engine: args.ephemerisProvider.engineId,
      fields: {
        houseSystem: args.houseSystem,
        cusps,
        placements,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      source: 'none',
      reason: error instanceof Error ? error.message : 'House calculation failed.',
      fields: {},
    };
  }
}
