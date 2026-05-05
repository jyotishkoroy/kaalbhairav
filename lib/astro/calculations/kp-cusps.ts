/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract } from './contracts.ts';
import type { EphemerisProvider } from './ephemeris-provider.ts';
import { normalizeDegrees360 } from './longitude.ts';
import { makeUnavailableValue } from './unavailable.ts';
import { calculateKpLordDetails } from './kp-sub-lord.ts';

export type KpCuspV2 = {
  houseNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  tropicalLongitudeDeg: number;
  siderealLongitudeDeg: number;
  rashiLord: string;
  nakshatraLord: string;
  subLord: string;
  subSubLord: string;
};

export type CalculateKpCuspsArgs = {
  jdUtExact: number | null;
  latitudeDeg: number | null;
  longitudeDeg: number | null;
  kpAyanamshaDeg: number | null;
  ephemerisProvider?: EphemerisProvider;
};

function normalizeHouseNumber(index: number): KpCuspV2['houseNumber'] {
  return (((index - 1) % 12 + 12) % 12 + 1) as KpCuspV2['houseNumber'];
}

export async function calculateKpCusps(
  args: CalculateKpCuspsArgs,
): Promise<AstroSectionContract> {
  if (
    args.jdUtExact === null ||
    args.latitudeDeg === null ||
    args.longitudeDeg === null ||
    args.kpAyanamshaDeg === null ||
    !Number.isFinite(args.jdUtExact) ||
    !Number.isFinite(args.latitudeDeg) ||
    !Number.isFinite(args.longitudeDeg) ||
    !Number.isFinite(args.kpAyanamshaDeg)
  ) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'insufficient_birth_data',
      fields: {
        cusps: makeUnavailableValue({
          requiredModule: 'kp_cusps',
          fieldKey: 'kp.cusps',
          reason: 'insufficient_birth_data',
        }),
      },
    };
  }

  if (!args.ephemerisProvider?.calculateAscendantMc) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'module_not_implemented',
      fields: {
        cusps: makeUnavailableValue({
          requiredModule: 'kp_cusps',
          fieldKey: 'kp.cusps',
          reason: 'module_not_implemented',
        }),
      },
      warnings: ['KP/Placidus cusp provider is unavailable.'],
    };
  }

  try {
    const ascMc = await args.ephemerisProvider.calculateAscendantMc({
      jdUtExact: args.jdUtExact,
      latitudeDeg: args.latitudeDeg,
      longitudeDeg: args.longitudeDeg,
      houseSystem: 'kp_placidus',
    });

    if (!ascMc.cuspsTropicalDeg || ascMc.cuspsTropicalDeg.length !== 12) {
      return {
        status: 'unavailable',
        source: 'none',
        reason: 'ephemeris_unavailable',
        fields: {
          cusps: makeUnavailableValue({
            requiredModule: 'kp_cusps',
            fieldKey: 'kp.cusps',
            reason: 'ephemeris_unavailable',
          }),
        },
        warnings: ['KP/Placidus provider did not return 12 cusps.'],
      };
    }

    const cusps = ascMc.cuspsTropicalDeg.map((tropicalLongitudeDeg, index) => {
      if (!Number.isFinite(tropicalLongitudeDeg)) {
        throw new Error(`KP cusp ${index + 1} tropical longitude must be finite.`);
      }

      const siderealLongitudeDeg = normalizeDegrees360(
        tropicalLongitudeDeg - args.kpAyanamshaDeg!,
      );
      const details = calculateKpLordDetails(siderealLongitudeDeg);

      return {
        houseNumber: normalizeHouseNumber(index + 1),
        tropicalLongitudeDeg: normalizeDegrees360(tropicalLongitudeDeg),
        siderealLongitudeDeg,
        rashiLord: details.rashiLord,
        nakshatraLord: details.nakshatraLord,
        subLord: details.subLord,
        subSubLord: details.subSubLord,
      };
    });

    return {
      status: 'computed',
      source: 'deterministic_calculation',
      engine: args.ephemerisProvider.engineId,
      fields: {
        cusps,
      },
    };
  } catch (error) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'ephemeris_unavailable',
      fields: {
        cusps: makeUnavailableValue({
          requiredModule: 'kp_cusps',
          fieldKey: 'kp.cusps',
          reason: 'ephemeris_unavailable',
        }),
      },
      warnings: [error instanceof Error ? error.message : 'KP cusp calculation unavailable.'],
    };
  }
}
