/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AyanamshaProvider } from './ayanamsha-provider.ts';
import { tropicalToSidereal } from './ayanamsha-provider.ts';
import type { AstroSectionContract, NormalizedBirthInputV2, PlanetNameV2 } from './contracts.ts';
import type { EphemerisBody, EphemerisProvider } from './ephemeris-provider.ts';
import { normalizeRahuKetuMeanNode } from './ephemeris-provider.ts';
import { calculateKpCusps } from './kp-cusps.ts';
import { calculateKpLordDetails } from './kp-sub-lord.ts';
import { makeUnavailableValue } from './unavailable.ts';

export type KpPlanetPositionV2 = {
  body: PlanetNameV2;
  tropicalLongitudeDeg: number;
  siderealLongitudeDeg: number;
  signNumber: number;
  signName: string;
  rashiLord: string;
  nakshatraName: string;
  nakshatraLord: string;
  subLord: string;
  subSubLord: string;
  retrograde: boolean;
  speedDegPerDay: number | null;
  source: 'deterministic_calculation';
};

export type CalculateKpSectionArgs = {
  jdUtExact: number | null;
  normalizedTime?: NormalizedBirthInputV2 | null;
  ephemerisProvider?: EphemerisProvider;
  ayanamshaProvider?: AyanamshaProvider;
};

const KP_BODIES: EphemerisBody[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'];

function makeKpUnavailable(
  reason: 'insufficient_birth_data' | 'ephemeris_unavailable' | 'module_not_implemented',
): AstroSectionContract {
  return {
    status: 'unavailable',
    source: 'none',
    reason,
    fields: {
      kp: makeUnavailableValue({
        requiredModule: 'kp',
        fieldKey: 'kp.byBody',
        reason,
      }),
      significators: makeUnavailableValue({
        requiredModule: 'kp_significators',
        fieldKey: 'kp.significators',
        reason: 'module_not_implemented',
      }),
    },
  };
}

export async function calculateKpPlanetaryPositions(args: {
  jdUtExact: number;
  ephemerisProvider: EphemerisProvider;
  ayanamshaProvider: AyanamshaProvider;
}): Promise<{
  kpAyanamshaDeg: number;
  byBody: Partial<Record<PlanetNameV2, KpPlanetPositionV2>>;
  engine: string;
  ephemerisVersion: string;
}> {
  if (!Number.isFinite(args.jdUtExact)) {
    throw new Error('jdUtExact must be finite for KP planetary positions.');
  }

  const kpAyanamshaDeg = await args.ayanamshaProvider.calculateAyanamshaDeg(args.jdUtExact, 'kp_new');

  if (!Number.isFinite(kpAyanamshaDeg)) {
    throw new Error('KP ayanamsha provider returned a non-finite value.');
  }

  const tropicalPositions = await args.ephemerisProvider.calculateTropicalPositions(args.jdUtExact, KP_BODIES);
  const normalizedPositions = normalizeRahuKetuMeanNode(tropicalPositions);
  const byBody: Partial<Record<PlanetNameV2, KpPlanetPositionV2>> = {};

  for (const position of normalizedPositions) {
    const siderealLongitudeDeg = tropicalToSidereal(position.tropicalLongitudeDeg, kpAyanamshaDeg);
    const details = calculateKpLordDetails(siderealLongitudeDeg);

    byBody[position.body as PlanetNameV2] = {
      body: position.body as PlanetNameV2,
      tropicalLongitudeDeg: position.tropicalLongitudeDeg,
      siderealLongitudeDeg,
      signNumber: details.signNumber,
      signName: details.signName,
      rashiLord: details.rashiLord,
      nakshatraName: details.nakshatraName,
      nakshatraLord: details.nakshatraLord,
      subLord: details.subLord,
      subSubLord: details.subSubLord,
      retrograde:
        position.body === 'Rahu' ||
        position.body === 'Ketu' ||
        Boolean(position.retrograde) ||
        (typeof position.speedLongitudeDegPerDay === 'number' &&
          position.speedLongitudeDegPerDay < 0),
      speedDegPerDay: position.speedLongitudeDegPerDay ?? null,
      source: 'deterministic_calculation',
    };
  }

  return {
    kpAyanamshaDeg,
    byBody,
    engine: args.ephemerisProvider.engineId,
    ephemerisVersion: args.ephemerisProvider.ephemerisVersion,
  };
}

export async function calculateKpSection(
  args: CalculateKpSectionArgs,
): Promise<AstroSectionContract> {
  if (args.jdUtExact === null || args.jdUtExact === undefined || !Number.isFinite(args.jdUtExact)) {
    return makeKpUnavailable('insufficient_birth_data');
  }

  if (!args.ephemerisProvider || !args.ayanamshaProvider) {
    return makeKpUnavailable('module_not_implemented');
  }

  try {
    const planetary = await calculateKpPlanetaryPositions({
      jdUtExact: args.jdUtExact,
      ephemerisProvider: args.ephemerisProvider,
      ayanamshaProvider: args.ayanamshaProvider,
    });

    const cuspSection = await calculateKpCusps({
      jdUtExact: args.jdUtExact,
      latitudeDeg: args.normalizedTime?.latitudeDeg ?? null,
      longitudeDeg: args.normalizedTime?.longitudeDeg ?? null,
      kpAyanamshaDeg: planetary.kpAyanamshaDeg,
      ephemerisProvider: args.ephemerisProvider,
    });

    return {
      status: cuspSection.status === 'computed' ? 'computed' : 'partial',
      source: 'deterministic_calculation',
      engine: planetary.engine,
      fields: {
        kpAyanamshaDeg: planetary.kpAyanamshaDeg,
        byBody: planetary.byBody,
        cusps: cuspSection.fields?.cusps ?? makeUnavailableValue({
          requiredModule: 'kp_cusps',
          fieldKey: 'kp.cusps',
          reason: 'module_not_implemented',
        }),
        significators: makeUnavailableValue({
          requiredModule: 'kp_significators',
          fieldKey: 'kp.significators',
          reason: 'module_not_implemented',
        }),
      },
      warnings: [
        ...(cuspSection.warnings ?? []),
        'KP significator priority logic is unavailable until deterministic implementation and fixture validation exist.',
      ],
    };
  } catch (error) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'ephemeris_unavailable',
      fields: {
        kp: makeUnavailableValue({
          requiredModule: 'kp',
          fieldKey: 'kp.byBody',
          reason: 'ephemeris_unavailable',
        }),
        significators: makeUnavailableValue({
          requiredModule: 'kp_significators',
          fieldKey: 'kp.significators',
          reason: 'module_not_implemented',
        }),
      },
      warnings: [error instanceof Error ? error.message : 'KP calculation unavailable.'],
    };
  }
}
