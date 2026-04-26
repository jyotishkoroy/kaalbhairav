import type { AstrologySettings, AstroWarning } from '../types'
import type { NormalizedBirthInput } from '../normalize'
import type { EngineResult } from './index'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const eph = require('ephemeris') as {
  getAllPlanets: (date: Date, lon: number, lat: number, height: number) => {
    observed: Record<string, { apparentLongitudeDd: number; is_retrograde?: boolean }>
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanistha',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

const DASHA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
}

// nakshatra index 0–26 → dasha lord (repeating 9-lord cycle)
const NAK_DASHA = NAKSHATRA_NAMES.map((_, i) => DASHA_LORDS[i % 9])

const PLANET_KEYS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const

// ─── Astronomy helpers ────────────────────────────────────────────────────────

function julianDay(d: Date): number {
  const Y = d.getUTCFullYear()
  const M = d.getUTCMonth() + 1
  const D = d.getUTCDate() +
    (d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600) / 24
  let y = Y, m = M
  if (m <= 2) { y -= 1; m += 12 }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5
}

function lahiriAyanamsa(JD: number): number {
  // IAU Lahiri / Chitrapaksha — accurate to ~0.01° for dates 1900–2100
  const T = (JD - 2415020.0) / 36524.22
  return 22.46045 + 1.39656 * T - 0.0000139 * T * T
}

function toSidereal(tropical: number, ayanamsa: number): number {
  return ((tropical - ayanamsa) % 360 + 360) % 360
}

function gmst(JD: number): number {
  const T = (JD - 2451545.0) / 36525
  const θ = 280.46061837 + 360.98564736629 * (JD - 2451545.0) +
    T * T * 0.000387933 - T * T * T / 38710000
  return ((θ % 360) + 360) % 360
}

function tropicalAscendant(JD: number, lat: number, lon: number): number {
  const RAMC = ((gmst(JD) + lon) % 360 + 360) % 360
  const T = (JD - 2451545.0) / 36525
  const eps = (23.439292 - 0.013004 * T) * (Math.PI / 180)
  const r = RAMC * (Math.PI / 180)
  const p = lat * (Math.PI / 180)
  // Standard ascendant formula
  let asc = Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(eps) + Math.tan(p) * Math.sin(eps)))
  asc = (asc * 180 / Math.PI + 360) % 360
  return asc
}

function meanLunarNode(JD: number): number {
  const T = (JD - 2451545.0) / 36525
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000
  return ((omega % 360) + 360) % 360
}

// ─── Zodiac / nakshatra lookups ───────────────────────────────────────────────

function signOf(sidereal: number) {
  const i = Math.floor(sidereal / 30)
  return { index: i, name: ZODIAC_SIGNS[i], degrees_in_sign: parseFloat((sidereal % 30).toFixed(4)) }
}

function nakshatraOf(sidereal: number) {
  const span = 360 / 27
  const i = Math.floor(sidereal / span)
  const pada = Math.floor((sidereal % span) / (span / 4)) + 1
  return { index: i, name: NAKSHATRA_NAMES[i], pada }
}

// ─── Birth-time UTC conversion ────────────────────────────────────────────────

function birthDateUTC(normalized: NormalizedBirthInput): Date {
  const time = normalized.birth_time_iso ?? '12:00:00'
  const localStr = `${normalized.birth_date_iso}T${time}`
  const utcGuess = new Date(localStr + 'Z')

  // Format utcGuess in the target timezone; the difference reveals the offset
  try {
    const fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: normalized.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
    const localInTz = new Date(fmt.format(utcGuess).replace(' ', 'T') + 'Z')
    const offsetMs = localInTz.getTime() - utcGuess.getTime()
    return new Date(utcGuess.getTime() - offsetMs)
  } catch {
    return utcGuess // fallback: treat as UTC (warns from normalize already)
  }
}

// ─── Vimshottari dasha ────────────────────────────────────────────────────────

function vimshottariDasha(moonSidereal: number, birthUTC: Date): Record<string, unknown> {
  const span = 360 / 27
  const nakIdx = Math.floor(moonSidereal / span)
  const fraction = (moonSidereal % span) / span

  const lordAtBirth = NAK_DASHA[nakIdx]
  const totalYears = DASHA_YEARS[lordAtBirth]
  const elapsedYears = fraction * totalYears
  const remainingYears = totalYears - elapsedYears

  const startIdx = DASHA_LORDS.indexOf(lordAtBirth)
  const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000

  const dashaStart = new Date(birthUTC.getTime() - elapsedYears * MS_PER_YEAR)
  const sequence: Array<{ lord: string; years: number; start: string; end: string }> = []
  let cursor = dashaStart.getTime()

  for (let i = 0; i < 9; i++) {
    const lord = DASHA_LORDS[(startIdx + i) % 9]
    const years = i === 0 ? totalYears : DASHA_YEARS[lord]
    const end = cursor + years * MS_PER_YEAR
    sequence.push({ lord, years, start: new Date(cursor).toISOString().slice(0, 10), end: new Date(end).toISOString().slice(0, 10) })
    cursor = end
  }

  const now = Date.now()
  const current = sequence.find(d => new Date(d.start).getTime() <= now && now < new Date(d.end).getTime()) ?? null

  return {
    system: 'vimshottari',
    moon_nakshatra: NAKSHATRA_NAMES[nakIdx],
    dasha_at_birth: {
      lord: lordAtBirth,
      total_years: totalYears,
      elapsed_at_birth: parseFloat(elapsedYears.toFixed(2)),
      remaining_at_birth: parseFloat(remainingYears.toFixed(2)),
    },
    sequence,
    current_dasha: current,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function runEngineReal(
  normalized: NormalizedBirthInput,
  settings: AstrologySettings,
): EngineResult {
  const warnings: AstroWarning[] = [...normalized.warnings]
  const unsupported: string[] = []

  // ── Validate settings ──────────────────────────────────────────────────────
  if (settings.zodiac_type !== 'sidereal') {
    warnings.push({
      warning_code: 'TROPICAL_NOT_SUPPORTED',
      severity: 'medium',
      affected_calculations: ['planets', 'lagna', 'houses', 'nakshatras'],
      explanation: 'Only sidereal zodiac is supported in V1. Calculations use sidereal regardless.',
      confidence_impact: -20,
    })
  }
  if (settings.ayanamsa !== 'lahiri') {
    warnings.push({
      warning_code: 'AYANAMSA_FALLBACK',
      severity: 'low',
      affected_calculations: ['planets', 'lagna'],
      explanation: `Ayanamsa "${settings.ayanamsa}" requested but V1 only supports Lahiri. Using Lahiri.`,
      confidence_impact: -5,
    })
  }
  if (!['whole_sign', 'equal'].includes(settings.house_system)) {
    warnings.push({
      warning_code: 'HOUSE_SYSTEM_FALLBACK',
      severity: 'low',
      affected_calculations: ['houses'],
      explanation: `House system "${settings.house_system}" not supported in V1. Using whole-sign.`,
      confidence_impact: -5,
    })
  }
  if (settings.node_type !== 'mean_node') {
    warnings.push({
      warning_code: 'TRUE_NODE_NOT_SUPPORTED',
      severity: 'low',
      affected_calculations: ['rahu', 'ketu'],
      explanation: 'Only mean node supported in V1. True node requested but mean node used.',
      confidence_impact: -3,
    })
  }

  // ── Time + JD ──────────────────────────────────────────────────────────────
  const birthUTC = birthDateUTC(normalized)
  const JD = julianDay(birthUTC)
  const ayanamsa = lahiriAyanamsa(JD)

  // ── Planetary positions via Moshier ephemeris ──────────────────────────────
  const result = eph.getAllPlanets(birthUTC, normalized.longitude_rounded, normalized.latitude_rounded, 0)

  const planets: Record<string, unknown> = {}

  for (const key of PLANET_KEYS) {
    const raw = result.observed[key]
    if (!raw) continue
    const tropical = raw.apparentLongitudeDd
    const sidereal = toSidereal(tropical, ayanamsa)
    const sign = signOf(sidereal)
    const nak = nakshatraOf(sidereal)
    planets[key] = {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      tropical_longitude: parseFloat(tropical.toFixed(4)),
      sidereal_longitude: parseFloat(sidereal.toFixed(4)),
      sign: sign.name,
      sign_index: sign.index,
      degrees_in_sign: sign.degrees_in_sign,
      nakshatra: nak.name,
      nakshatra_index: nak.index,
      pada: nak.pada,
      is_retrograde: raw.is_retrograde ?? false,
    }
  }

  // ── Rahu / Ketu (mean lunar nodes) ────────────────────────────────────────
  const rahuTropical = meanLunarNode(JD)
  const rahuSidereal = toSidereal(rahuTropical, ayanamsa)
  const ketuSidereal = (rahuSidereal + 180) % 360

  const rahuSign = signOf(rahuSidereal)
  const rahuNak = nakshatraOf(rahuSidereal)
  planets['rahu'] = {
    name: 'Rahu',
    tropical_longitude: parseFloat(rahuTropical.toFixed(4)),
    sidereal_longitude: parseFloat(rahuSidereal.toFixed(4)),
    sign: rahuSign.name, sign_index: rahuSign.index, degrees_in_sign: rahuSign.degrees_in_sign,
    nakshatra: rahuNak.name, nakshatra_index: rahuNak.index, pada: rahuNak.pada,
    is_retrograde: true,
  }
  const ketuSign = signOf(ketuSidereal)
  const ketuNak = nakshatraOf(ketuSidereal)
  planets['ketu'] = {
    name: 'Ketu',
    tropical_longitude: parseFloat(((rahuTropical + 180) % 360).toFixed(4)),
    sidereal_longitude: parseFloat(ketuSidereal.toFixed(4)),
    sign: ketuSign.name, sign_index: ketuSign.index, degrees_in_sign: ketuSign.degrees_in_sign,
    nakshatra: ketuNak.name, nakshatra_index: ketuNak.index, pada: ketuNak.pada,
    is_retrograde: true,
  }

  // ── Lagna / ascendant ──────────────────────────────────────────────────────
  const lagnaUnknown = !normalized.birth_time_known
  if (lagnaUnknown) {
    warnings.push({
      warning_code: 'LAGNA_UNCERTAIN',
      severity: 'high',
      affected_calculations: ['lagna', 'houses', 'dashas'],
      explanation: 'Birth time unknown — lagna and house placements use noon as default and are unreliable.',
      confidence_impact: -35,
    })
  }

  const lagunaTropical = tropicalAscendant(JD, normalized.latitude_rounded, normalized.longitude_rounded)
  const lagnaSidereal = toSidereal(lagunaTropical, ayanamsa)
  const lagnaSign = signOf(lagnaSidereal)
  const lagnaNak = nakshatraOf(lagnaSidereal)

  const lagna: Record<string, unknown> = {
    tropical_longitude: parseFloat(lagunaTropical.toFixed(4)),
    sidereal_longitude: parseFloat(lagnaSidereal.toFixed(4)),
    sign: lagnaSign.name,
    sign_index: lagnaSign.index,
    degrees_in_sign: lagnaSign.degrees_in_sign,
    nakshatra: lagnaNak.name,
    nakshatra_index: lagnaNak.index,
    pada: lagnaNak.pada,
    uncertain: lagnaUnknown,
  }

  // ── Whole-sign houses ──────────────────────────────────────────────────────
  const houses: Record<string, unknown> = {}
  for (let h = 1; h <= 12; h++) {
    const signIdx = (lagnaSign.index + h - 1) % 12
    houses[`house_${h}`] = {
      house: h,
      sign: ZODIAC_SIGNS[signIdx],
      sign_index: signIdx,
      uncertain: lagnaUnknown,
    }
  }

  // ── D1 chart: planet → house mapping ──────────────────────────────────────
  const d1Placements: Record<string, unknown> = {}
  const allPlanetKeys = [...PLANET_KEYS, 'rahu', 'ketu'] as const
  for (const key of allPlanetKeys) {
    const p = planets[key] as { sign_index: number } | undefined
    if (!p) continue
    const houseNum = ((p.sign_index - lagnaSign.index + 12) % 12) + 1
    d1Placements[key] = { house: houseNum, sign: ZODIAC_SIGNS[p.sign_index], sign_index: p.sign_index }
  }

  const d1_chart: Record<string, unknown> = {
    system: 'whole_sign',
    lagna_sign: lagnaSign.name,
    lagna_sign_index: lagnaSign.index,
    placements: d1Placements,
    uncertain: lagnaUnknown,
  }

  // ── Vimshottari dasha ──────────────────────────────────────────────────────
  const moonPlanet = planets['moon'] as { sidereal_longitude: number } | undefined
  const dashas = moonPlanet
    ? vimshottariDasha(moonPlanet.sidereal_longitude, birthUTC)
    : { available: false, reason: 'moon position unavailable' }

  if (!moonPlanet) unsupported.push('dashas')

  // ── Life area signatures (placeholder — V1 stub values) ───────────────────
  const life_area_signatures: Record<string, unknown> = {
    career: { available: false, reason: 'detailed interpretation not implemented in V1' },
    relationships: { available: false, reason: 'detailed interpretation not implemented in V1' },
    wealth: { available: false, reason: 'detailed interpretation not implemented in V1' },
    health: { available: false, reason: 'detailed interpretation not implemented in V1' },
    spirituality: { available: false, reason: 'detailed interpretation not implemented in V1' },
  }

  unsupported.push(
    'divisional_charts', 'doshas', 'transits', 'aspects',
    'ashtakavarga', 'jaimini', 'timing_signatures',
  )

  return {
    calculation_status: 'real',
    astronomical_data: {
      julian_day: parseFloat(JD.toFixed(4)),
      ayanamsa_value: parseFloat(ayanamsa.toFixed(4)),
      ayanamsa_system: 'lahiri',
      birth_utc: birthUTC.toISOString(),
    },
    panchang: {},
    avkahada: {},
    planets,
    lagna,
    houses,
    d1_chart,
    divisional_charts: {},
    dashas,
    doshas: {},
    transits: {},
    aspects: {},
    ashtakavarga: {},
    jaimini: {},
    life_area_signatures,
    timing_signatures: {},
    warnings,
    audit: {
      sources: ['moshier-ephemeris (ephemeris@2.2.0)'],
      engine_modules: ['planets', 'lagna', 'houses_whole_sign', 'vimshottari_dasha', 'mean_lunar_node'],
      notes: [
        `Lahiri ayanamsa: ${ayanamsa.toFixed(4)}°`,
        `Birth UTC: ${birthUTC.toISOString()}`,
        lagnaUnknown ? 'Lagna computed from noon — uncertain' : 'Lagna computed from provided birth time',
        `Unsupported in V1: ${unsupported.join(', ')}`,
      ],
    },
  }
}
