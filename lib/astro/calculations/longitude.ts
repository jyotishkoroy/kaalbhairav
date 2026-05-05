/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type SignNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type SignDegree = {
  signNumber: SignNumber;
  signName: string;
  degreeInSign: number;
};

export const ZODIAC_SIGN_NAMES = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

export function normalizeDegrees360(value: number): number {
  assertFinite(value, 'Longitude');

  const normalized = value % 360;
  if (Object.is(normalized, -0) || normalized === 0) {
    return 0;
  }

  return normalized < 0 ? normalized + 360 : normalized;
}

export function longitudeToSignDegree(longitudeDeg: number): SignDegree {
  const normalized = normalizeDegrees360(longitudeDeg);
  const signIndex = Math.floor(normalized / 30);
  const signNumber = (signIndex + 1) as SignNumber;
  const signName = ZODIAC_SIGN_NAMES[signIndex];
  const degreeInSign = normalized - signIndex * 30;

  return {
    signNumber,
    signName,
    degreeInSign,
  };
}

export function formatDms(value: number): string {
  assertFinite(value, 'DMS value');

  const sign = value < 0 || Object.is(value, -0) ? '-' : '';
  let remaining = Math.abs(value);
  let degrees = Math.floor(remaining);
  remaining = (remaining - degrees) * 60;
  let minutes = Math.floor(remaining);
  let seconds = Math.round((remaining - minutes) * 60);

  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }

  if (minutes === 60) {
    minutes = 0;
    degrees += 1;
  }

  return `${sign}${degrees}°${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"`
}

export function parseDms(value: string): number {
  if (typeof value !== 'string') {
    throw new Error('DMS value must be a string.');
  }

  const trimmed = value.trim();
  const match = trimmed.match(
    /^([+-])?\s*(\d+(?:\.\d+)?)\s*(?:°|:|\s)\s*(\d+(?:\.\d+)?)\s*(?:'|:|\s)\s*(\d+(?:\.\d+)?)\s*(?:"|)?$/,
  );

  if (!match) {
    throw new Error(`Malformed DMS value: ${value}`);
  }

  const sign = match[1] === '-' ? -1 : 1;
  const degrees = Number(match[2]);
  const minutes = Number(match[3]);
  const seconds = Number(match[4]);

  if (![degrees, minutes, seconds].every(Number.isFinite)) {
    throw new Error(`Malformed DMS value: ${value}`);
  }

  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    throw new Error(`Malformed DMS value: ${value}`);
  }

  return sign * (degrees + minutes / 60 + seconds / 3600);
}
