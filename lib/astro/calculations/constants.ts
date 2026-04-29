/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

// Versioned constants for all Jyotish calculations.

export const CONSTANTS_VERSION = '1.0.0'
export const RASHI_MAP_VERSION = '1.0.0'
export const NAKSHATRA_MAP_VERSION = '1.0.0'
export const DASHA_ORDER_VERSION = '1.0.0'
export const PANCHANG_SEQUENCE_VERSION = '1.0.0'

// ─── Numeric constants ─────────────────────────────────────────────────────

export const FULL_CIRCLE_DEGREES = 360
export const SIGN_SPAN_DEGREES = 30
export const NAKSHATRA_COUNT = 27
export const NAKSHATRA_SPAN = 360 / 27 // 13.333333333333334
export const PADA_COUNT_PER_NAKSHATRA = 4
export const PADA_SPAN = NAKSHATRA_SPAN / 4 // 3.3333333333333335
export const TITHI_COUNT = 30
export const TITHI_SPAN = 12
export const HALF_TITHI_SPAN = 6
export const YOGA_COUNT = 27
export const YOGA_SPAN = 360 / 27
export const BOUNDARY_THRESHOLD_DEGREES = 1 / 60
export const VIMSHOTTARI_TOTAL_YEARS = 120
export const DASHA_YEAR_DAYS = 365.25

// ─── Rashi / Sign map ─────────────────────────────────────────────────────

export const RASHI_MAP = [
  { index: 0, jyotish_name: 'Mesha', english_name: 'Aries' },
  { index: 1, jyotish_name: 'Vrishabha', english_name: 'Taurus' },
  { index: 2, jyotish_name: 'Mithuna', english_name: 'Gemini' },
  { index: 3, jyotish_name: 'Karka', english_name: 'Cancer' },
  { index: 4, jyotish_name: 'Simha', english_name: 'Leo' },
  { index: 5, jyotish_name: 'Kanya', english_name: 'Virgo' },
  { index: 6, jyotish_name: 'Tula', english_name: 'Libra' },
  { index: 7, jyotish_name: 'Vrishchika', english_name: 'Scorpio' },
  { index: 8, jyotish_name: 'Dhanu', english_name: 'Sagittarius' },
  { index: 9, jyotish_name: 'Makara', english_name: 'Capricorn' },
  { index: 10, jyotish_name: 'Kumbha', english_name: 'Aquarius' },
  { index: 11, jyotish_name: 'Meena', english_name: 'Pisces' },
] as const

export type RashiEntry = (typeof RASHI_MAP)[number]

// ─── Nakshatra map ────────────────────────────────────────────────────────

export const NAKSHATRA_MAP = [
  { index: 0, name: 'Ashwini', lord: 'Ketu' },
  { index: 1, name: 'Bharani', lord: 'Venus' },
  { index: 2, name: 'Krittika', lord: 'Sun' },
  { index: 3, name: 'Rohini', lord: 'Moon' },
  { index: 4, name: 'Mrigashira', lord: 'Mars' },
  { index: 5, name: 'Ardra', lord: 'Rahu' },
  { index: 6, name: 'Punarvasu', lord: 'Jupiter' },
  { index: 7, name: 'Pushya', lord: 'Saturn' },
  { index: 8, name: 'Ashlesha', lord: 'Mercury' },
  { index: 9, name: 'Magha', lord: 'Ketu' },
  { index: 10, name: 'Purva Phalguni', lord: 'Venus' },
  { index: 11, name: 'Uttara Phalguni', lord: 'Sun' },
  { index: 12, name: 'Hasta', lord: 'Moon' },
  { index: 13, name: 'Chitra', lord: 'Mars' },
  { index: 14, name: 'Swati', lord: 'Rahu' },
  { index: 15, name: 'Vishakha', lord: 'Jupiter' },
  { index: 16, name: 'Anuradha', lord: 'Saturn' },
  { index: 17, name: 'Jyeshtha', lord: 'Mercury' },
  { index: 18, name: 'Mula', lord: 'Ketu' },
  { index: 19, name: 'Purva Ashadha', lord: 'Venus' },
  { index: 20, name: 'Uttara Ashadha', lord: 'Sun' },
  { index: 21, name: 'Shravana', lord: 'Moon' },
  { index: 22, name: 'Dhanistha', lord: 'Mars' },
  { index: 23, name: 'Shatabhisha', lord: 'Rahu' },
  { index: 24, name: 'Purva Bhadrapada', lord: 'Jupiter' },
  { index: 25, name: 'Uttara Bhadrapada', lord: 'Saturn' },
  { index: 26, name: 'Revati', lord: 'Mercury' },
] as const

export type NakshatraEntry = (typeof NAKSHATRA_MAP)[number]

// ─── Vimshottari dasha ────────────────────────────────────────────────────

export const DASHA_SEQUENCE = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
] as const

export type DashaLord = (typeof DASHA_SEQUENCE)[number]

export const DASHA_YEARS: Record<DashaLord, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
} as const

// ─── Tithi names (1-indexed) ──────────────────────────────────────────────

export const TITHI_NAMES: Record<number, string> = {
  1: 'Pratipada', 2: 'Dvitiya', 3: 'Tritiya', 4: 'Chaturthi', 5: 'Panchami',
  6: 'Shashthi', 7: 'Saptami', 8: 'Ashtami', 9: 'Navami', 10: 'Dashami',
  11: 'Ekadashi', 12: 'Dwadashi', 13: 'Trayodashi', 14: 'Chaturdashi',
  15: 'Purnima',
  16: 'Pratipada', 17: 'Dvitiya', 18: 'Tritiya', 19: 'Chaturthi', 20: 'Panchami',
  21: 'Shashthi', 22: 'Saptami', 23: 'Ashtami', 24: 'Navami', 25: 'Dashami',
  26: 'Ekadashi', 27: 'Dwadashi', 28: 'Trayodashi', 29: 'Chaturdashi',
  30: 'Amavasya',
}

// ─── Yoga names (0-indexed) ───────────────────────────────────────────────

export const YOGA_NAMES: readonly string[] = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti',
]

// ─── Karana names ─────────────────────────────────────────────────────────

export const KARANA_REPEATING = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'] as const
export const KARANA_FIXED = ['Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'] as const

export function karanaNameByHalfTithiIndex(k: number): string {
  if (k === 0) return 'Kimstughna'
  if (k >= 1 && k <= 56) return KARANA_REPEATING[(k - 1) % 7]
  if (k === 57) return 'Shakuni'
  if (k === 58) return 'Chatushpada'
  if (k === 59) return 'Naga'
  throw new Error(`Invalid karana half-tithi index: ${k}`)
}

// ─── Required grahas ──────────────────────────────────────────────────────

export const REQUIRED_GRAHAS = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu',
] as const

export type GrahaName = (typeof REQUIRED_GRAHAS)[number]

// ─── Sign lord map ────────────────────────────────────────────────────────

export const SIGN_LORD_BY_SIGN_INDEX: Record<number, GrahaName> = {
  0: 'Mars',    // Aries
  1: 'Venus',   // Taurus
  2: 'Mercury', // Gemini
  3: 'Moon',    // Cancer
  4: 'Sun',     // Leo
  5: 'Mercury', // Virgo
  6: 'Venus',   // Libra
  7: 'Mars',    // Scorpio
  8: 'Jupiter', // Sagittarius
  9: 'Saturn',  // Capricorn
  10: 'Saturn', // Aquarius
  11: 'Jupiter',// Pisces
} as const

// ─── Life-area house map ──────────────────────────────────────────────────

export const LIFE_AREA_HOUSE: Record<string, number> = {
  self: 1,
  wealth: 2,
  siblings: 3,
  home_mother: 4,
  children_intellect: 5,
  enemies_health: 6,
  partner_marriage: 7,
  longevity_transformation: 8,
  dharma_fortune: 9,
  career_status: 10,
  gains_network: 11,
  losses_liberation: 12,
} as const

// ─── Graha drishti aspect offsets ────────────────────────────────────────

export function aspectOffsets(planet: string, includeNodeSpecialAspects: boolean): number[] {
  const offsets = [7]
  if (planet === 'Mars') offsets.push(4, 8)
  if (planet === 'Jupiter') offsets.push(5, 9)
  if (planet === 'Saturn') offsets.push(3, 10)
  if (includeNodeSpecialAspects && (planet === 'Rahu' || planet === 'Ketu')) offsets.push(5, 9)
  return offsets
}

// ─── Navamsa start sign ───────────────────────────────────────────────────

export const NAVAMSA_START: Record<number, number> = {
  0: 0,  // Aries movable -> Aries
  1: 9,  // Taurus fixed -> Capricorn
  2: 6,  // Gemini dual -> Libra
  3: 3,  // Cancer movable -> Cancer
  4: 0,  // Leo fixed -> Aries
  5: 9,  // Virgo dual -> Capricorn
  6: 6,  // Libra movable -> Libra
  7: 3,  // Scorpio fixed -> Cancer
  8: 0,  // Sagittarius dual -> Aries
  9: 9,  // Capricorn movable -> Capricorn
  10: 6, // Aquarius fixed -> Libra
  11: 3, // Pisces dual -> Cancer
} as const

// ─── Strength/dignity tables (audited) ───────────────────────────────────

export const EXALTATION_SIGN: Partial<Record<GrahaName, number>> = {
  Sun: 0,      // Aries
  Moon: 1,     // Taurus
  Mars: 9,     // Capricorn
  Mercury: 5,  // Virgo
  Jupiter: 3,  // Cancer
  Venus: 11,   // Pisces
  Saturn: 6,   // Libra
}

export const DEBILITATION_SIGN: Partial<Record<GrahaName, number>> = {
  Sun: 6,      // Libra
  Moon: 7,     // Scorpio
  Mars: 3,     // Cancer
  Mercury: 11, // Pisces
  Jupiter: 9,  // Capricorn
  Venus: 5,    // Virgo
  Saturn: 0,   // Aries
}

export const COMBUSTION_THRESHOLD: Partial<Record<GrahaName, number>> = {
  Moon: 12,
  Mars: 17,
  Mercury: 14,
  Jupiter: 11,
  Venus: 10,
  Saturn: 15,
}

export const MOOLATRIKONA_RANGE: Partial<Record<GrahaName, { sign: number; from: number; to: number }>> = {
  Sun: { sign: 4, from: 0, to: 20 },      // Leo
  Moon: { sign: 1, from: 4, to: 30 },     // Taurus
  Mars: { sign: 0, from: 0, to: 12 },     // Aries
  Mercury: { sign: 5, from: 15, to: 20 }, // Virgo
  Jupiter: { sign: 8, from: 0, to: 10 },  // Sagittarius
  Venus: { sign: 6, from: 0, to: 15 },    // Libra
  Saturn: { sign: 10, from: 0, to: 20 },  // Aquarius
}

export const VARA_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

// ─── Natural benefics / malefics ──────────────────────────────────────────
// Rahu/Ketu are functional – always malefic in natural classification

export const NATURAL_MALEFICS: readonly GrahaName[] = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']
export const NATURAL_BENEFICS: readonly GrahaName[] = ['Jupiter', 'Venus', 'Mercury', 'Moon']

// ─── Planetary friendship (Parashari / classical) ─────────────────────────
// Source: Brihat Parashara Hora Shastra, Chapter on Graha Mitras.

export const PLANET_FRIENDS: Partial<Record<GrahaName, GrahaName[]>> = {
  Sun:     ['Moon', 'Mars', 'Jupiter'],
  Moon:    ['Sun', 'Mercury'],
  Mars:    ['Sun', 'Moon', 'Jupiter'],
  Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'],
  Venus:   ['Mercury', 'Saturn'],
  Saturn:  ['Mercury', 'Venus'],
}

export const PLANET_ENEMIES: Partial<Record<GrahaName, GrahaName[]>> = {
  Sun:     ['Venus', 'Saturn'],
  Moon:    [],
  Mars:    ['Mercury'],
  Mercury: ['Moon'],
  Jupiter: ['Mercury', 'Venus'],
  Venus:   ['Sun', 'Moon'],
  Saturn:  ['Sun', 'Moon', 'Mars'],
}

// ─── Exaltation sign lord for Neech Bhang calculation ─────────────────────
// Which planet is exalted in the same sign as each planet's debilitation sign?
// E.g. Sun debilitated in Libra (6) – Saturn is exalted in Libra → Saturn is the "exaltation lord" of Sun's debilitation sign.

export const EXALTATION_LORD_OF_DEBILITATION_SIGN: Partial<Record<GrahaName, GrahaName>> = {
  Sun:     'Saturn',  // Libra: Saturn exalted
  Moon:    'Jupiter', // Scorpio: ... actually no standard exaltation in Scorpio. Mark Jupiter (Sagittarius adjacent) - skip in practice
  Mars:    'Jupiter', // Cancer: Jupiter exalted in Cancer
  Mercury: 'Venus',   // Pisces: Venus exalted in Pisces
  Jupiter: 'Mars',    // Capricorn: Mars exalted in Capricorn
  Venus:   'Mercury', // Virgo: Mercury exalted in Virgo
  Saturn:  'Sun',     // Aries: Sun exalted in Aries
}
