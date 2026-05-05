/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import {
  NAKSHATRA_NAMES,
  NAKSHATRA_SPAN_DEG,
  VIMSHOTTARI_SEQUENCE,
  VIMSHOTTARI_YEARS,
  type NakshatraName,
  type VimshottariLord,
} from './dasha-constants.ts';
import { longitudeToSignDegree, normalizeDegrees360, type SignNumber } from './longitude.ts';

export const KP_SIGN_LORDS = {
  1: 'Mars',
  2: 'Venus',
  3: 'Mercury',
  4: 'Moon',
  5: 'Sun',
  6: 'Mercury',
  7: 'Venus',
  8: 'Mars',
  9: 'Jupiter',
  10: 'Saturn',
  11: 'Saturn',
  12: 'Jupiter',
} as const satisfies Record<SignNumber, VimshottariLord>;

export type KpSubdivisionResult = {
  lord: VimshottariLord;
  startLongitudeDeg: number;
  endLongitudeDeg: number;
  spanDeg: number;
  offsetWithinParentDeg: number;
};

export type KpLordDetails = {
  longitudeDeg: number;
  signNumber: SignNumber;
  signName: string;
  rashiLord: VimshottariLord;
  nakshatraIndex: number;
  nakshatraName: NakshatraName;
  nakshatraLord: VimshottariLord;
  subLord: VimshottariLord;
  subSubLord: VimshottariLord;
};

function assertFiniteLongitude(longitudeDeg: number): number {
  if (!Number.isFinite(longitudeDeg)) {
    throw new Error('Longitude must be a finite number.');
  }

  return normalizeDegrees360(longitudeDeg);
}

function getVimshottariLordIndex(lord: VimshottariLord): number {
  return VIMSHOTTARI_SEQUENCE.indexOf(lord);
}

function getVimshottariLordAtOffset(
  startLord: VimshottariLord,
  offset: number,
): VimshottariLord {
  const startIndex = getVimshottariLordIndex(startLord);
  const normalizedIndex =
    ((startIndex + offset) % VIMSHOTTARI_SEQUENCE.length +
      VIMSHOTTARI_SEQUENCE.length) %
    VIMSHOTTARI_SEQUENCE.length;

  return VIMSHOTTARI_SEQUENCE[normalizedIndex];
}

function locateWeightedSubdivision(args: {
  parentStartLongitudeDeg: number;
  parentSpanDeg: number;
  offsetWithinParentDeg: number;
  startLord: VimshottariLord;
}): KpSubdivisionResult {
  const parentStart = normalizeDegrees360(args.parentStartLongitudeDeg);
  const offset = args.offsetWithinParentDeg;

  if (!Number.isFinite(args.parentSpanDeg) || args.parentSpanDeg <= 0) {
    throw new Error('parentSpanDeg must be a positive finite number.');
  }

  if (!Number.isFinite(offset) || offset < 0 || offset >= args.parentSpanDeg) {
    throw new Error('offsetWithinParentDeg must be inside the parent span.');
  }

  let cumulative = 0;

  for (let index = 0; index < VIMSHOTTARI_SEQUENCE.length; index += 1) {
    const lord = getVimshottariLordAtOffset(args.startLord, index);
    const spanDeg = (args.parentSpanDeg * VIMSHOTTARI_YEARS[lord]) / 120;
    const startOffset = cumulative;
    cumulative += spanDeg;

    const isLast = index === VIMSHOTTARI_SEQUENCE.length - 1;

    if (offset < cumulative || isLast) {
      return {
        lord,
        startLongitudeDeg: normalizeDegrees360(parentStart + startOffset),
        endLongitudeDeg: normalizeDegrees360(parentStart + cumulative),
        spanDeg,
        offsetWithinParentDeg: offset - startOffset,
      };
    }
  }

  throw new Error('Unable to locate KP subdivision.');
}

export function calculateKpRashiLord(longitudeDeg: number): VimshottariLord {
  const signDegree = longitudeToSignDegree(assertFiniteLongitude(longitudeDeg));
  return KP_SIGN_LORDS[signDegree.signNumber];
}

export function calculateKpNakshatraLord(longitudeDeg: number): VimshottariLord {
  const longitude = assertFiniteLongitude(longitudeDeg);
  const nakshatraIndex = Math.min(Math.floor(longitude / NAKSHATRA_SPAN_DEG), 26);
  return VIMSHOTTARI_SEQUENCE[nakshatraIndex % VIMSHOTTARI_SEQUENCE.length];
}

export function locateKpSubLord(longitudeDeg: number): KpSubdivisionResult {
  const longitude = assertFiniteLongitude(longitudeDeg);
  const nakshatraIndex = Math.min(Math.floor(longitude / NAKSHATRA_SPAN_DEG), 26);
  const nakshatraStart = nakshatraIndex * NAKSHATRA_SPAN_DEG;
  const offsetWithinNakshatra = longitude - nakshatraStart;
  const nakshatraLord = VIMSHOTTARI_SEQUENCE[nakshatraIndex % VIMSHOTTARI_SEQUENCE.length];

  return locateWeightedSubdivision({
    parentStartLongitudeDeg: nakshatraStart,
    parentSpanDeg: NAKSHATRA_SPAN_DEG,
    offsetWithinParentDeg: offsetWithinNakshatra,
    startLord: nakshatraLord,
  });
}

export function locateKpSubSubLord(longitudeDeg: number): KpSubdivisionResult {
  const longitude = assertFiniteLongitude(longitudeDeg);
  const sub = locateKpSubLord(longitude);
  const subStart = sub.startLongitudeDeg;
  const offsetWithinSub =
    normalizeDegrees360(longitude - subStart) >= sub.spanDeg
      ? 0
      : normalizeDegrees360(longitude - subStart);

  return locateWeightedSubdivision({
    parentStartLongitudeDeg: sub.startLongitudeDeg,
    parentSpanDeg: sub.spanDeg,
    offsetWithinParentDeg: offsetWithinSub,
    startLord: sub.lord,
  });
}

export function calculateKpLordDetails(longitudeDeg: number): KpLordDetails {
  const longitude = assertFiniteLongitude(longitudeDeg);
  const signDegree = longitudeToSignDegree(longitude);
  const nakshatraIndex = Math.min(Math.floor(longitude / NAKSHATRA_SPAN_DEG), 26);
  const sub = locateKpSubLord(longitude);
  const subSub = locateKpSubSubLord(longitude);

  return {
    longitudeDeg: longitude,
    signNumber: signDegree.signNumber,
    signName: signDegree.signName,
    rashiLord: KP_SIGN_LORDS[signDegree.signNumber],
    nakshatraIndex,
    nakshatraName: NAKSHATRA_NAMES[nakshatraIndex],
    nakshatraLord: VIMSHOTTARI_SEQUENCE[nakshatraIndex % VIMSHOTTARI_SEQUENCE.length],
    subLord: sub.lord,
    subSubLord: subSub.lord,
  };
}
