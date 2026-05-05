/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type EphemerisBody =
  | 'Sun'
  | 'Moon'
  | 'Mars'
  | 'Mercury'
  | 'Jupiter'
  | 'Venus'
  | 'Saturn'
  | 'Rahu'
  | 'Ketu'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto';

export type TropicalBodyPosition = {
  body: EphemerisBody;
  tropicalLongitudeDeg: number;
  tropicalLatitudeDeg?: number;
  speedLongitudeDegPerDay?: number;
  retrograde: boolean;
};

export type AscendantMcResult = {
  ascendantTropicalDeg: number;
  mcTropicalDeg: number;
  cuspsTropicalDeg?: number[];
};

export type SunriseSunsetResult = {
  sunriseLocalIso: string;
  sunsetLocalIso: string;
};

export interface EphemerisProvider {
  engineId: string;
  engineVersion: string;
  ephemerisVersion: string;
  calculateTropicalPositions(
    jdUtExact: number,
    bodies: EphemerisBody[],
  ): Promise<TropicalBodyPosition[]>;
  calculateAscendantMc?(args: {
    jdUtExact: number;
    latitudeDeg: number;
    longitudeDeg: number;
    houseSystem: 'sripati' | 'kp_placidus';
  }): Promise<AscendantMcResult>;
  calculateSunriseSunset?(args: {
    dateLocal: string;
    latitudeDeg: number;
    longitudeDeg: number;
    timezoneHours: number;
  }): Promise<SunriseSunsetResult>;
}

const EPHEMERIS_BODIES = new Set<EphemerisBody>([
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
  'Uranus',
  'Neptune',
  'Pluto',
]);

function isEphemerisBody(value: unknown): value is EphemerisBody {
  return typeof value === 'string' && EPHEMERIS_BODIES.has(value as EphemerisBody);
}

export function normalizeDegrees360(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Longitude must be a finite number.');
  }

  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function validateTropicalBodyPosition(position: TropicalBodyPosition): TropicalBodyPosition {
  if (!position || typeof position !== 'object') {
    throw new Error('Ephemeris position must be an object.');
  }

  if (!isEphemerisBody(position.body)) {
    throw new Error(`Unsupported ephemeris body: ${String(position.body)}`);
  }

  const tropicalLongitudeDeg = normalizeDegrees360(position.tropicalLongitudeDeg);

  if (position.tropicalLatitudeDeg !== undefined && !Number.isFinite(position.tropicalLatitudeDeg)) {
    throw new Error(`Latitude for ${position.body} must be finite when provided.`);
  }

  if (position.speedLongitudeDegPerDay !== undefined && !Number.isFinite(position.speedLongitudeDegPerDay)) {
    throw new Error(`Speed for ${position.body} must be finite when provided.`);
  }

  if (typeof position.retrograde !== 'boolean') {
    throw new Error(`Retrograde flag for ${position.body} must be boolean.`);
  }

  return {
    body: position.body,
    tropicalLongitudeDeg,
    tropicalLatitudeDeg: position.tropicalLatitudeDeg,
    speedLongitudeDegPerDay: position.speedLongitudeDegPerDay,
    retrograde: position.retrograde,
  };
}

export function assertProviderReturnedBodies(
  requestedBodies: readonly EphemerisBody[],
  returnedPositions: readonly TropicalBodyPosition[],
): void {
  const returnedBodies = new Set(
    returnedPositions.map((position) => validateTropicalBodyPosition(position).body),
  );

  const missing = requestedBodies.filter((body) => {
    if (body === 'Ketu') {
      return !returnedBodies.has('Ketu') && !returnedBodies.has('Rahu');
    }

    return !returnedBodies.has(body);
  });

  if (missing.length > 0) {
    throw new Error(`Provider did not return requested body positions: ${missing.join(', ')}`);
  }
}

export function normalizeRahuKetuMeanNode(
  positions: readonly TropicalBodyPosition[],
): TropicalBodyPosition[] {
  const validated = positions.map((position) => validateTropicalBodyPosition(position));
  const rahu = validated.find((position) => position.body === 'Rahu');

  if (!rahu) {
    return validated;
  }

  const normalizedRahu: TropicalBodyPosition = {
    ...rahu,
    retrograde: true,
  };
  const derivedKetu: TropicalBodyPosition = {
    body: 'Ketu',
    tropicalLongitudeDeg: normalizeDegrees360(rahu.tropicalLongitudeDeg + 180),
    tropicalLatitudeDeg:
      rahu.tropicalLatitudeDeg === undefined ? undefined : -rahu.tropicalLatitudeDeg,
    speedLongitudeDegPerDay: rahu.speedLongitudeDegPerDay,
    retrograde: true,
  };

  const result: TropicalBodyPosition[] = [];
  for (const position of validated) {
    if (position.body === 'Rahu') {
      result.push(normalizedRahu, derivedKetu);
      continue;
    }

    if (position.body === 'Ketu') {
      continue;
    }

    result.push(position);
  }

  return result;
}
