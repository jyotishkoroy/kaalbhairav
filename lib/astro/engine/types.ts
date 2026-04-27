import type { SignPlacement } from '../calculations/sign.ts'
import type { NakshatraPlacement } from '../calculations/nakshatra.ts'
import type { TithiResult } from '../calculations/tithi.ts'

// ── Shared primitives ──────────────────────────────────────────────────────

export type CalcStatus = 'real' | 'partial' | 'stub' | 'not_available' | 'error'

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces'

export type Nakshatra =
  | 'Ashwini' | 'Bharani' | 'Krittika' | 'Rohini' | 'Mrigashira'
  | 'Ardra' | 'Punarvasu' | 'Pushya' | 'Ashlesha' | 'Magha'
  | 'Purva Phalguni' | 'Uttara Phalguni' | 'Hasta' | 'Chitra' | 'Swati'
  | 'Vishakha' | 'Anuradha' | 'Jyeshtha' | 'Mula' | 'Purva Ashadha'
  | 'Uttara Ashadha' | 'Shravana' | 'Dhanishtha' | 'Shatabhisha'
  | 'Purva Bhadrapada' | 'Uttara Bhadrapada' | 'Revati'

export type PlanetName =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Rahu' | 'Ketu'

// ── 1. Daily Transits ──────────────────────────────────────────────────────

export type TransitPlanet = {
  planet: PlanetName
  longitude_deg: number
  sidereal_longitude_deg: number
  sign: ZodiacSign
  nakshatra: Nakshatra
  pada: 1 | 2 | 3 | 4
  house_transited: number
  retrograde: boolean
}

export type DailyTransits = {
  status: CalcStatus
  calculated_at: string
  transits: TransitPlanet[]
  transit_planets?: TransitPlanet[]
  current_moon_rashi?: SignPlacement | null
  current_moon_nakshatra?: NakshatraPlacement | null
  current_tithi?: TithiResult | null
  transit_relation_to_natal?: Array<unknown>
  warnings: string[]
}

// ── 2. Panchang ────────────────────────────────────────────────────────────

export type Tithi = {
  number: number
  name: string
  paksha: 'shukla' | 'krishna'
  completion_percent: number
}

export type PanchangYoga =
  | 'Vishkambha' | 'Priti' | 'Ayushman' | 'Saubhagya' | 'Shobhana'
  | 'Atiganda' | 'Sukarman' | 'Dhriti' | 'Shula' | 'Ganda'
  | 'Vriddhi' | 'Dhruva' | 'Vyaghata' | 'Harshana' | 'Vajra'
  | 'Siddhi' | 'Vyatipata' | 'Variyan' | 'Parigha' | 'Shiva'
  | 'Siddha' | 'Sadhya' | 'Shubha' | 'Shukla' | 'Brahma'
  | 'Indra' | 'Vaidhriti'

export type PanchangKarana =
  | 'Bava' | 'Balava' | 'Kaulava' | 'Taitila' | 'Garaja'
  | 'Vanija' | 'Vishti' | 'Shakuni' | 'Chatushpada' | 'Naga' | 'Kimstughna'

export type Vara = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'

export type Panchang = {
  status: CalcStatus
  calculated_at: string
  date_local: string | null
  vara: Vara | null
  tithi: Tithi | null
  nakshatra: Nakshatra | null
  yoga: PanchangYoga | null
  karana: PanchangKarana | null
  sunrise_utc: string | null
  sunset_utc: string | null
  sunrise_local?: string | null
  sunset_local?: string | null
  moon_rashi?: SignPlacement | null
  sunrise_moon_rashi?: SignPlacement | null
  warnings: string[]
}

// ── 3. Current Timing Context ─────────────────────────────────────────────

export type DashaPeriod = {
  lord: PlanetName
  start_date: string
  end_date: string
}

export type CurrentTimingContext = {
  status: CalcStatus
  calculated_at: string
  current_mahadasha: DashaPeriod | null
  current_antardasha: DashaPeriod | null
  current_pratyantardasha: DashaPeriod | null
  transiting_lagna_sign: ZodiacSign | null
  elapsed_dasha_percent: number | null
  warnings: string[]
}

// ── 4. Navamsa / D9 ──────────────────────────────────────────────────────

export type NavamsaPlanet = {
  planet: PlanetName
  navamsa_sign: ZodiacSign
  navamsa_house: number
}

export type NavamsaD9 = {
  status: CalcStatus
  calculated_at: string
  navamsa_lagna: ZodiacSign | null
  planets: NavamsaPlanet[]
  warnings: string[]
}

// ── 5. Basic Aspects (Jyotish drishti) ───────────────────────────────────

export type AspectType =
  | 'graha_drishti_7th'
  | 'mars_drishti_4th'
  | 'mars_drishti_8th'
  | 'jupiter_drishti_5th'
  | 'jupiter_drishti_9th'
  | 'saturn_drishti_3rd'
  | 'saturn_drishti_10th'
  | 'rahu_ketu_drishti_5th'
  | 'rahu_ketu_drishti_9th'

export type Aspect = {
  aspecting_planet: PlanetName
  aspected_planet: PlanetName | null
  aspected_house: number | null
  aspect_type: AspectType
  strength: 'full' | 'partial'
}

export type BasicAspects = {
  status: CalcStatus
  calculated_at: string
  aspects: Aspect[]
  warnings: string[]
}

// ── 6. Life-Area Signatures ───────────────────────────────────────────────

export type LifeArea =
  | 'self' | 'wealth' | 'siblings' | 'home_mother'
  | 'children_intellect' | 'enemies_health' | 'partner_marriage'
  | 'longevity_transformation' | 'dharma_fortune' | 'career_status'
  | 'gains_network' | 'losses_liberation'

export type LifeAreaSignature = {
  area: LifeArea
  house_number: number
  house_sign: ZodiacSign
  lord: PlanetName
  lord_placement_house: number
  lord_placement_sign: ZodiacSign
  occupying_planets: PlanetName[]
  strength_note: string | null
}

export type LifeAreaSignatures = {
  status: CalcStatus
  calculated_at: string
  signatures: LifeAreaSignature[]
  warnings: string[]
}

// ── Master expanded chart output ──────────────────────────────────────────

export type AstroExpandedSections = {
  daily_transits?: DailyTransits
  panchang?: Panchang
  current_timing?: CurrentTimingContext
  navamsa_d9?: NavamsaD9
  planetary_aspects?: BasicAspects
  basic_aspects?: BasicAspects
  life_area_signatures?: LifeAreaSignatures
}
