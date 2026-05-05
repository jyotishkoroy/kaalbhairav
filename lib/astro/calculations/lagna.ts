/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { AstroSectionContract } from './contracts.ts'
import type { AyanamshaProvider } from './ayanamsha-provider.ts'
import { tropicalToSidereal } from './ayanamsha-provider.ts'
import type { EphemerisProvider } from './ephemeris-provider.ts'
import { calculateGmstHours } from './sidereal-time.ts'
import { calculateMeanObliquityDeg } from './obliquity.ts'
import { getAscendant } from '../engine/swiss.ts'
import { normalize360 } from './math.ts'
import { calculateSign } from './sign.ts'
import { calculateNakshatra } from './nakshatra.ts'
import { nearSignBoundary } from './boundary.ts'
import { normalizeDegrees360, longitudeToSignDegree } from './longitude.ts'

export type LagnaReliability = 'high' | 'medium' | 'low' | 'not_available'

export type CalculateAscendantV2Args = {
  jdUtExact: number | null;
  latitudeDeg: number | null;
  longitudeDeg: number | null;
  ephemerisProvider: EphemerisProvider;
  ayanamshaProvider: AyanamshaProvider;
};

export type LagnaResult = {
  sidereal_longitude: number
  tropical_longitude: number
  sign: string
  sign_index: number
  degrees_in_sign: number
  nakshatra: string
  nakshatra_index: number
  pada: number
  uncertainty_flag: boolean
  reliability: LagnaReliability
  near_sign_boundary: boolean
  high_latitude_flag: boolean
}

export function calculateLagna(
  jd_ut: number,
  latitude: number,
  longitude: number,
  ayanamsa: number,
  birth_time_known: boolean,
  birth_time_precision: string,
): LagnaResult | null {
  if (!birth_time_known || birth_time_precision === 'unknown') return null

  const reliability: LagnaReliability =
    birth_time_precision === 'exact' || birth_time_precision === 'minute' ? 'high'
    : birth_time_precision === 'hour' ? 'medium'
    : 'low'

  const high_latitude_flag = Math.abs(latitude) >= 66.0

  try {
    const housesResult = getAscendant(jd_ut, latitude, longitude)
    if (housesResult.error && housesResult.error.length > 0) {
      return null
    }
    // ascendant is data.points[0] (verified against sweph@2.10.3-5 runtime API)
    const tropicalLong = normalize360(housesResult.data.points[0])
    const siderealLong = normalize360(tropicalLong - ayanamsa)
    const sign = calculateSign(siderealLong)
    const nak = calculateNakshatra(siderealLong)
    const uncertainty_flag = reliability !== 'high' || sign.near_sign_boundary || high_latitude_flag

    return {
      sidereal_longitude: siderealLong,
      tropical_longitude: tropicalLong,
      sign: sign.sign,
      sign_index: sign.sign_index,
      degrees_in_sign: sign.degrees_in_sign,
      nakshatra: nak.nakshatra,
      nakshatra_index: nak.nakshatra_index,
      pada: nak.pada,
      uncertainty_flag,
      reliability,
      near_sign_boundary: nearSignBoundary(siderealLong),
      high_latitude_flag,
    }
  } catch {
    return null
  }
}

function missingAscendantInput(args: CalculateAscendantV2Args): string | null {
  if (args.jdUtExact === null || !Number.isFinite(args.jdUtExact)) {
    return 'Exact birth time is required for Lagna calculation.';
  }
  if (args.latitudeDeg === null || !Number.isFinite(args.latitudeDeg)) {
    return 'Latitude is required for Lagna calculation.';
  }
  if (args.longitudeDeg === null || !Number.isFinite(args.longitudeDeg)) {
    return 'Longitude is required for Lagna calculation.';
  }
  return null;
}

function calculateTropicalAscendantDeg(args: {
  jdUtExact: number;
  latitudeDeg: number;
  longitudeDeg: number;
}): number {
  const gmstHours = calculateGmstHours(args.jdUtExact);
  const lstDeg = normalizeDegrees360((gmstHours * 15) + args.longitudeDeg);
  const epsilonDeg = calculateMeanObliquityDeg(args.jdUtExact);

  const theta = (lstDeg * Math.PI) / 180;
  const epsilon = (epsilonDeg * Math.PI) / 180;
  const latitude = (args.latitudeDeg * Math.PI) / 180;

  const numerator = -Math.cos(theta);
  const denominator =
    Math.sin(theta) * Math.cos(epsilon) +
    Math.tan(latitude) * Math.sin(epsilon);

  return normalizeDegrees360((Math.atan2(numerator, denominator) * 180) / Math.PI);
}

function calculateTropicalMcDeg(jdUtExact: number, longitudeDeg: number): number {
  const gmstHours = calculateGmstHours(jdUtExact);
  const lstDeg = normalizeDegrees360((gmstHours * 15) + longitudeDeg);
  const epsilonDeg = calculateMeanObliquityDeg(jdUtExact);

  const theta = (lstDeg * Math.PI) / 180;
  const epsilon = (epsilonDeg * Math.PI) / 180;

  return normalizeDegrees360((Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(epsilon)) * 180) / Math.PI);
}

export async function calculateAscendantV2(
  args: CalculateAscendantV2Args,
): Promise<AstroSectionContract> {
  const missingReason = missingAscendantInput(args);

  if (missingReason) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'insufficient_birth_data',
      fields: {
        lagna: {
          status: 'unavailable',
          value: null,
          reason: 'insufficient_birth_data',
          source: 'none',
          requiredModule: 'lagna',
          fieldKey: 'lagna.sign',
        },
      },
      warnings: [missingReason],
    };
  }

  const jdUtExact = args.jdUtExact;
  const latitudeDeg = args.latitudeDeg;
  const longitudeDeg = args.longitudeDeg;

  if (jdUtExact === null || latitudeDeg === null || longitudeDeg === null) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'insufficient_birth_data',
      fields: {},
    };
  }

  try {
    const providerAscMc = args.ephemerisProvider.calculateAscendantMc
      ? await args.ephemerisProvider.calculateAscendantMc({
          jdUtExact,
          latitudeDeg,
          longitudeDeg,
          houseSystem: 'sripati',
        })
      : null;

    const tropicalAscendantDeg =
      providerAscMc?.ascendantTropicalDeg ??
      calculateTropicalAscendantDeg({ jdUtExact, latitudeDeg, longitudeDeg });

    const tropicalMcDeg =
      providerAscMc?.mcTropicalDeg ?? calculateTropicalMcDeg(jdUtExact, longitudeDeg);

    const ayanamshaDeg = await args.ayanamshaProvider.calculateAyanamshaDeg(
      jdUtExact,
      'lahiri',
    );

    if (!Number.isFinite(ayanamshaDeg)) {
      throw new Error('Ayanamsha provider returned a non-finite value.');
    }

    const ascendantSiderealDeg = tropicalToSidereal(tropicalAscendantDeg, ayanamshaDeg);
    const mcSiderealDeg = tropicalToSidereal(tropicalMcDeg, ayanamshaDeg);
    const ascendantSign = longitudeToSignDegree(ascendantSiderealDeg);
    const mcSign = longitudeToSignDegree(mcSiderealDeg);

    return {
      status: 'computed',
      source: 'deterministic_calculation',
      engine: args.ephemerisProvider.engineId,
      fields: {
        ayanamshaDeg,
        ascendant: {
          sign: ascendantSign.signName,
          signNumber: ascendantSign.signNumber,
          degreeInSign: ascendantSign.degreeInSign,
          absoluteLongitude: ascendantSiderealDeg,
          tropicalLongitude: normalizeDegrees360(tropicalAscendantDeg),
          source: 'deterministic_calculation',
        },
        mc: {
          sign: mcSign.signName,
          signNumber: mcSign.signNumber,
          degreeInSign: mcSign.degreeInSign,
          absoluteLongitude: mcSiderealDeg,
          tropicalLongitude: normalizeDegrees360(tropicalMcDeg),
          source: 'deterministic_calculation',
        },
      },
    };
  } catch (error) {
    return {
      status: 'error',
      source: 'none',
      reason: error instanceof Error ? error.message : 'Ascendant calculation failed.',
      fields: {},
    };
  }
}
