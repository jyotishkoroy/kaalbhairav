/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { PlanetPosition } from './planets.ts';
import type { LagnaResult } from './lagna.ts';
import type { WholeSignHouse } from './houses.ts';
import type { SignPlacement } from './sign.ts';
import type { AstroSectionContract, PlanetNameV2, PlanetaryPositionV2 } from './contracts.ts';

export type D1PlanetPlacement = {
  planet: string;
  sign: string;
  sign_index: number;
  degrees_in_sign: number;
  house_number: number | null;
  house_reliability: 'high' | 'medium' | 'low' | 'not_available';
};

export type D1Chart = {
  lagna_sign_index: number | null;
  houses: WholeSignHouse[];
  planet_to_sign: Record<string, SignPlacement>;
  planet_to_house: Record<string, number | null>;
  occupying_planets_by_house: Record<number, string[]>;
};

export type BuildD1ChartSectionArgs = {
  planetaryPositions: AstroSectionContract;
  lagna: AstroSectionContract;
  houseSystem?: 'whole_sign' | 'sripati' | 'kp_placidus';
};

function getPlanetaryByBody(
  planetaryPositions: AstroSectionContract,
): Partial<Record<PlanetNameV2, PlanetaryPositionV2>> | null {
  const byBody = planetaryPositions.fields?.byBody;
  if (!byBody || typeof byBody !== 'object' || Array.isArray(byBody)) {
    return null;
  }

  return byBody as Partial<Record<PlanetNameV2, PlanetaryPositionV2>>;
}

function getLagnaSignNumber(lagna: AstroSectionContract): number | null {
  const ascendant = lagna.fields?.ascendant;
  if (!ascendant || typeof ascendant !== 'object' || Array.isArray(ascendant)) {
    return null;
  }

  const signNumber = (ascendant as { signNumber?: unknown }).signNumber;
  return typeof signNumber === 'number' ? signNumber : null;
}

export function calculateD1Chart(
  planets: Record<string, PlanetPosition>,
  lagna: LagnaResult | null,
  houses: WholeSignHouse[],
): D1Chart {
  const lagnaSignIdx = lagna?.sign_index ?? null;
  const planet_to_sign: Record<string, SignPlacement> = {};
  const planet_to_house: Record<string, number | null> = {};
  const occupying_planets_by_house: Record<number, string[]> = {};

  for (let h = 1; h <= 12; h += 1) occupying_planets_by_house[h] = [];

  for (const [name, pos] of Object.entries(planets)) {
    planet_to_sign[name] = {
      sign: pos.sign,
      sign_index: pos.sign_index,
      degrees_in_sign: pos.degrees_in_sign,
      near_sign_boundary: pos.boundary_warnings.some((w) => w.includes('sign boundary')),
    };
    if (lagnaSignIdx !== null) {
      const houseNum = ((pos.sign_index - lagnaSignIdx + 12) % 12) + 1;
      planet_to_house[name] = houseNum;
      occupying_planets_by_house[houseNum].push(name);
    } else {
      planet_to_house[name] = null;
    }
  }

  return {
    lagna_sign_index: lagnaSignIdx,
    houses,
    planet_to_sign,
    planet_to_house,
    occupying_planets_by_house,
  };
}

export function buildD1ChartSection(args: BuildD1ChartSectionArgs): AstroSectionContract {
  if (args.planetaryPositions.status !== 'computed') {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'planetary_positions_unavailable',
      fields: {},
      warnings: ['D1 chart requires computed planetary positions.'],
    };
  }

  if (args.lagna.status !== 'computed') {
    return {
      status: 'partial',
      source: 'deterministic_calculation',
      reason: 'lagna_unavailable',
      fields: {
        byBody: getPlanetaryByBody(args.planetaryPositions) ?? {},
      },
      warnings: ['D1 chart was built without Lagna because Lagna is unavailable.'],
    };
  }

  const byBody = getPlanetaryByBody(args.planetaryPositions);
  const lagnaSignNumber = getLagnaSignNumber(args.lagna);

  if (!byBody || lagnaSignNumber === null) {
    return {
      status: 'error',
      source: 'none',
      reason: 'D1 chart requires planetary positions and Lagna sign.',
      fields: {},
    };
  }

  const placements: Record<string, unknown> = {};

  for (const [body, position] of Object.entries(byBody)) {
    if (!position || typeof position.signNumber !== 'number') {
      continue;
    }

    const wholeSignHouse = ((((position.signNumber - lagnaSignNumber) % 12) + 12) % 12) + 1;

    placements[body] = {
      sign: position.sign,
      signNumber: position.signNumber,
      degreeInSign: position.degreeInSign,
      absoluteLongitude: position.absoluteLongitude,
      wholeSignHouse,
      source: 'deterministic_calculation',
    };
  }

  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      houseSystem: args.houseSystem ?? 'whole_sign',
      lagnaSignNumber,
      placements,
    },
  };
}
