/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export const VIMSHOTTARI_SEQUENCE = [
  'Ketu',
  'Venus',
  'Sun',
  'Moon',
  'Mars',
  'Rahu',
  'Jupiter',
  'Saturn',
  'Mercury',
] as const;

export type VimshottariLord = (typeof VIMSHOTTARI_SEQUENCE)[number];

export const VIMSHOTTARI_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
} as const satisfies Record<VimshottariLord, number>;

export const NAKSHATRA_SPAN_DEG = 13 + 20 / 60;

export const PADA_SPAN_DEG = 3 + 20 / 60;

export const VIMSHOTTARI_YEAR_DAYS = 365.25;

export const NAKSHATRA_NAMES = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
] as const;

export type NakshatraName = (typeof NAKSHATRA_NAMES)[number];

export function normalizeVimshottariLord(value: string): VimshottariLord {
  const found = VIMSHOTTARI_SEQUENCE.find(
    (lord) => lord.toLowerCase() === value.trim().toLowerCase(),
  );

  if (!found) {
    throw new Error(`Unsupported Vimshottari lord: ${value}`);
  }

  return found;
}

export function getNextVimshottariLord(lord: VimshottariLord): VimshottariLord {
  const index = VIMSHOTTARI_SEQUENCE.indexOf(lord);
  return VIMSHOTTARI_SEQUENCE[(index + 1) % VIMSHOTTARI_SEQUENCE.length];
}

export function getVimshottariLordAtOffset(
  startLord: VimshottariLord,
  offset: number,
): VimshottariLord {
  if (!Number.isInteger(offset)) {
    throw new Error('Vimshottari offset must be an integer.');
  }

  const startIndex = VIMSHOTTARI_SEQUENCE.indexOf(startLord);
  const normalizedIndex =
    ((startIndex + offset) % VIMSHOTTARI_SEQUENCE.length +
      VIMSHOTTARI_SEQUENCE.length) %
    VIMSHOTTARI_SEQUENCE.length;

  return VIMSHOTTARI_SEQUENCE[normalizedIndex];
}
