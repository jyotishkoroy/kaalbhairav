/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract, PlanetNameV2, PlanetaryPositionV2 } from './contracts.ts'
import type { AyanamshaProvider } from './ayanamsha-provider.ts'
import { tropicalToSidereal } from './ayanamsha-provider.ts'
import type { EphemerisBody, EphemerisProvider, TropicalBodyPosition } from './ephemeris-provider.ts'
import { assertProviderReturnedBodies, normalizeRahuKetuMeanNode } from './ephemeris-provider.ts'
import { calcPlanet, SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN, SE_MEAN_NODE, SE_TRUE_NODE } from '../engine/swiss.ts'
import { normalize360 } from './math.ts'
import { calculateSign } from './sign.ts'
import { calculateNakshatra, calculateNakshatraPada, type NakshatraPlacement } from './nakshatra.ts'
import { nearSignBoundary, nearNakshatraBoundary, nearPadaBoundary } from './boundary.ts'
import { longitudeToSignDegree } from './longitude.ts'

export type PlanetPosition = {
  name: string
  tropical_longitude: number
  sidereal_longitude: number
  speed_longitude: number
  is_retrograde: boolean
  sign: string
  sign_index: number
  degrees_in_sign: number
  nakshatra: string
  nakshatra_index: number
  nakshatra_lord: string
  pada: number
  boundary_warnings: string[]
  source: 'swiss_ephemeris'
}

const PLANET_IDS: Record<string, number> = {
  Sun: SE_SUN, Moon: SE_MOON, Mercury: SE_MERCURY, Venus: SE_VENUS,
  Mars: SE_MARS, Jupiter: SE_JUPITER, Saturn: SE_SATURN,
}

export const V2_PLANETARY_BODIES: readonly EphemerisBody[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Rahu',
]

export type CalculatePlanetaryPositionsV2Args = {
  jdUtExact: number;
  ephemerisProvider: EphemerisProvider;
  ayanamshaProvider: AyanamshaProvider;
  ayanamshaType: 'lahiri';
};

export type PlanetaryPositionsV2Fields = {
  ayanamshaDeg: number;
  ayanamshaType: 'lahiri';
  byBody: Partial<Record<PlanetNameV2, PlanetaryPositionV2>>;
};

function toPlanetNameV2(body: EphemerisBody): PlanetNameV2 {
  return body;
}

function maybeCalculateNakshatraPada(siderealLongitudeDeg: number): {
  nakshatra: string | null;
  pada: 1 | 2 | 3 | 4 | null;
} {
  try {
    const nakshatraPada = calculateNakshatraPada(siderealLongitudeDeg);

    return {
      nakshatra: nakshatraPada.name,
      pada: nakshatraPada.pada,
    };
  } catch {
    return {
      nakshatra: null,
      pada: null,
    };
  }
}

export async function calculatePlanetaryPositionsV2(
  args: CalculatePlanetaryPositionsV2Args,
): Promise<AstroSectionContract> {
  if (!Number.isFinite(args.jdUtExact)) {
    return {
      status: 'error',
      source: 'none',
      reason: 'jdUtExact must be a finite number.',
      fields: {},
    };
  }

  try {
    const tropicalPositions = await args.ephemerisProvider.calculateTropicalPositions(
      args.jdUtExact,
      [...V2_PLANETARY_BODIES],
    );

    const normalizedTropicalPositions = normalizeRahuKetuMeanNode(tropicalPositions);

    assertProviderReturnedBodies(
      [...V2_PLANETARY_BODIES, 'Ketu'],
      normalizedTropicalPositions,
    );

    const ayanamshaDeg = await args.ayanamshaProvider.calculateAyanamshaDeg(
      args.jdUtExact,
      args.ayanamshaType,
    );

    if (!Number.isFinite(ayanamshaDeg)) {
      throw new Error('Ayanamsha provider returned a non-finite value.');
    }

    const byBody: Partial<Record<PlanetNameV2, PlanetaryPositionV2>> = {};

    for (const position of normalizedTropicalPositions) {
      const body = toPlanetNameV2(position.body);
      const siderealLongitudeDeg = tropicalToSidereal(position.tropicalLongitudeDeg, ayanamshaDeg);
      const signDegree = longitudeToSignDegree(siderealLongitudeDeg);
      const nakshatraPada = maybeCalculateNakshatraPada(siderealLongitudeDeg);

      byBody[body] = {
        body,
        sign: signDegree.signName,
        signNumber: signDegree.signNumber,
        degreeInSign: signDegree.degreeInSign,
        absoluteLongitude: siderealLongitudeDeg,
        nakshatra: nakshatraPada.nakshatra,
        pada: nakshatraPada.pada,
        retrograde:
          position.body === 'Rahu' ||
          position.body === 'Ketu' ||
          (position.speedLongitudeDegPerDay ?? 0) < 0,
        speedDegPerDay: position.speedLongitudeDegPerDay ?? null,
        source: 'deterministic_calculation',
      };
    }

    return {
      status: 'computed',
      source: 'deterministic_calculation',
      engine: args.ephemerisProvider.engineId,
      fields: {
        ayanamshaDeg,
        ayanamshaType: args.ayanamshaType,
        byBody,
      } satisfies PlanetaryPositionsV2Fields,
    };
  } catch (error) {
    return {
      status: 'error',
      source: 'none',
      reason: error instanceof Error ? error.message : 'Planetary position calculation failed.',
      fields: {},
    };
  }
}

export function calculatePlanetPosition(
  planetName: string, jd_ut: number, ayanamsa: number, nodeType: 'mean_node' | 'true_node' = 'mean_node',
): PlanetPosition {
  let tropical: number
  let speed: number
  let isRetrograde: boolean

  if (planetName === 'Ketu') {
    // Ketu derived from Rahu
    const rahuPos = calculatePlanetPosition('Rahu', jd_ut, ayanamsa, nodeType)
    const ketuTropical = normalize360(rahuPos.tropical_longitude + 180)
    const ketuSidereal = normalize360(rahuPos.sidereal_longitude + 180)
    const sign = calculateSign(ketuSidereal)
    const nak = calculateNakshatra(ketuSidereal)
    return {
      name: 'Ketu',
      tropical_longitude: ketuTropical,
      sidereal_longitude: ketuSidereal,
      speed_longitude: rahuPos.speed_longitude,
      is_retrograde: true,
      ...sign,
      ...extractNakFields(nak),
      boundary_warnings: buildBoundaryWarnings('Ketu', ketuSidereal),
      source: 'swiss_ephemeris',
    }
  }

  if (planetName === 'Rahu') {
    const bodyId = nodeType === 'true_node' ? SE_TRUE_NODE : SE_MEAN_NODE
    const result = calcPlanet(jd_ut, bodyId)
    if (result.error && result.error.length > 0 && !result.error.includes('Moshier')) {
      throw new Error(`Swiss Ephemeris error for Rahu: ${result.error}`)
    }
    tropical = normalize360(result.data[0])
    speed = result.data[3]
    isRetrograde = speed < 0
  } else {
    const bodyId = PLANET_IDS[planetName]
    if (bodyId === undefined) throw new Error(`Unknown planet: ${planetName}`)
    const result = calcPlanet(jd_ut, bodyId)
    if (result.error && result.error.length > 0 && !result.error.includes('Moshier')) {
      throw new Error(`Swiss Ephemeris error for ${planetName}: ${result.error}`)
    }
    tropical = normalize360(result.data[0])
    speed = result.data[3]
    isRetrograde = speed < 0
  }

  const sidereal = normalize360(tropical - ayanamsa)
  const sign = calculateSign(sidereal)
  const nak = calculateNakshatra(sidereal)

  return {
    name: planetName,
    tropical_longitude: tropical,
    sidereal_longitude: sidereal,
    speed_longitude: speed,
    is_retrograde: isRetrograde,
    ...sign,
    ...extractNakFields(nak),
    boundary_warnings: buildBoundaryWarnings(planetName, sidereal),
    source: 'swiss_ephemeris',
  }
}

function extractNakFields(nak: NakshatraPlacement) {
  return {
    nakshatra: nak.nakshatra,
    nakshatra_index: nak.nakshatra_index,
    nakshatra_lord: nak.nakshatra_lord,
    pada: nak.pada,
  }
}

function buildBoundaryWarnings(planet: string, sidereal: number): string[] {
  const warnings: string[] = []
  if (nearSignBoundary(sidereal)) warnings.push(`${planet} near sign boundary`)
  if (nearNakshatraBoundary(sidereal)) warnings.push(`${planet} near nakshatra boundary`)
  if (nearPadaBoundary(sidereal)) warnings.push(`${planet} near pada boundary`)
  return warnings
}

export function calculateAllPlanets(
  jd_ut: number, ayanamsa: number, nodeType: 'mean_node' | 'true_node' = 'mean_node',
): Record<string, PlanetPosition> {
  const grahas = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu']
  const result: Record<string, PlanetPosition> = {}
  for (const g of grahas) {
    result[g] = calculatePlanetPosition(g, jd_ut, ayanamsa, nodeType)
  }
  return result
}
