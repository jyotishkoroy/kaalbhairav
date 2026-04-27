import { RASHI_MAP, NAVAMSA_START } from './constants.ts'
import { normalize360 } from './math.ts'
import { nearNavamsaBoundary } from './boundary.ts'
import type { PlanetPosition } from './planets.ts'
import type { LagnaResult } from './lagna.ts'
import type { NavamsaD9, ZodiacSign, PlanetName, NavamsaPlanet } from '../engine/types.ts'

// ─── New master-spec types ─────────────────────────────────────────────────

export type NavamsaPlacement = {
  body: string
  d1_sign_index: number
  d1_degrees_in_sign: number
  navamsa_index: number
  navamsa_sign: string
  navamsa_sign_index: number
  navamsa_house: number | null
  boundary_warnings: string[]
}

export type NavamsaChart = {
  navamsa_lagna_sign_index: number | null
  navamsa_lagna_sign: string | null
  placements: NavamsaPlacement[]
}

// ─── Core formula ──────────────────────────────────────────────────────────

function calcNavamsaSignIndex(sidereal: number): { navamsa_sign_index: number; navamsa_index: number } {
  const normalized = normalize360(sidereal)
  const d1_sign_index = Math.floor(normalized / 30)
  const degrees_in_sign = normalized - d1_sign_index * 30
  const navamsa_index = Math.floor(degrees_in_sign / (30 / 9))
  const start = NAVAMSA_START[d1_sign_index as keyof typeof NAVAMSA_START] ?? 0
  const navamsa_sign_index = (start + navamsa_index) % 12
  return { navamsa_sign_index, navamsa_index }
}

// ─── Master-spec Navamsa calculation ──────────────────────────────────────

export function calculateNavamsaChart(
  planets: Record<string, PlanetPosition>,
  lagna: LagnaResult | null,
): NavamsaChart {
  const navamsaLagna = lagna
    ? calcNavamsaSignIndex(lagna.sidereal_longitude).navamsa_sign_index
    : null

  const placements: NavamsaPlacement[] = Object.entries(planets).map(([name, pos]) => {
    const { navamsa_sign_index, navamsa_index } = calcNavamsaSignIndex(pos.sidereal_longitude)
    const navamsa_house = navamsaLagna !== null
      ? ((navamsa_sign_index - navamsaLagna + 12) % 12) + 1
      : null
    const bw: string[] = []
    if (nearNavamsaBoundary(pos.sidereal_longitude)) bw.push(`${name} near navamsa boundary`)
    return {
      body: name,
      d1_sign_index: pos.sign_index,
      d1_degrees_in_sign: pos.degrees_in_sign,
      navamsa_index,
      navamsa_sign: RASHI_MAP[navamsa_sign_index].english_name,
      navamsa_sign_index,
      navamsa_house,
      boundary_warnings: bw,
    }
  })

  return {
    navamsa_lagna_sign_index: navamsaLagna,
    navamsa_lagna_sign: navamsaLagna !== null ? RASHI_MAP[navamsaLagna].english_name : null,
    placements,
  }
}

// ─── Legacy adapter for existing types ────────────────────────────────────

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export type NavamsaInput = {
  planets_sidereal: Array<{ planet: PlanetName; longitude_deg: number }>
  lagna_sidereal_deg: number | null
  engine_mode: string
}

export async function calculateNavamsa(input: NavamsaInput): Promise<NavamsaD9> {
  const now = new Date().toISOString()

  if (input.engine_mode !== 'real') {
    return {
      status: 'stub',
      calculated_at: now,
      navamsa_lagna: null,
      planets: [],
      warnings: ['Engine is in stub mode. Navamsa requires ASTRO_ENGINE_MODE=real.'],
    }
  }

  if (!input.planets_sidereal || input.planets_sidereal.length === 0) {
    return {
      status: 'not_available',
      calculated_at: now,
      navamsa_lagna: null,
      planets: [],
      warnings: ['Planetary longitudes not available from chart calculation.'],
    }
  }

  const navamsaLagnaIdx =
    input.lagna_sidereal_deg != null
      ? calcNavamsaSignIndex(input.lagna_sidereal_deg).navamsa_sign_index
      : null

  const navamsaLagna: ZodiacSign | null = navamsaLagnaIdx !== null ? SIGNS[navamsaLagnaIdx] : null

  const planets: NavamsaPlanet[] = input.planets_sidereal.map((p) => {
    const { navamsa_sign_index } = calcNavamsaSignIndex(p.longitude_deg)
    const navamsa_sign = SIGNS[navamsa_sign_index]
    const navamsa_house = navamsaLagnaIdx !== null
      ? ((navamsa_sign_index - navamsaLagnaIdx + 12) % 12) + 1
      : 0
    return { planet: p.planet, navamsa_sign, navamsa_house }
  })

  return {
    status: 'real',
    calculated_at: now,
    navamsa_lagna: navamsaLagna,
    planets,
    warnings: navamsaLagna === null ? ['Lagna unavailable; navamsa house numbers not calculated.'] : [],
  }
}
