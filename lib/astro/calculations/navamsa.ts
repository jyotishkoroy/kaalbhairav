import type { NavamsaD9, ZodiacSign, PlanetName, NavamsaPlanet } from '../engine/types'

export type NavamsaInput = {
  planets_sidereal: Array<{ planet: PlanetName; longitude_deg: number }>
  lagna_sidereal_deg: number | null
  engine_mode: string
}

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

/**
 * Navamsa sign sequence starts from:
 *   Fire signs (0,4,8)  → Aries (index 0)
 *   Earth signs (1,5,9) → Capricorn (index 9)
 *   Air signs (2,6,10)  → Libra (index 6)
 *   Water signs (3,7,11)→ Cancer (index 3)
 */
function longitudeToNavamsaSign(longitude_deg: number): ZodiacSign {
  const normalised = ((longitude_deg % 360) + 360) % 360
  const sign_index = Math.floor(normalised / 30)
  const deg_in_sign = normalised % 30
  const navamsa_index = Math.floor(deg_in_sign / (30 / 9))

  const start_map: Record<number, number> = {
    0: 0, 1: 9, 2: 6, 3: 3, 4: 0, 5: 9,
    6: 6, 7: 3, 8: 0, 9: 9, 10: 6, 11: 3,
  }
  const start = start_map[sign_index] ?? 0
  return SIGNS[(start + navamsa_index) % 12]
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

  const navamsaLagna: ZodiacSign | null =
    input.lagna_sidereal_deg != null
      ? longitudeToNavamsaSign(input.lagna_sidereal_deg)
      : null

  const planets: NavamsaPlanet[] = input.planets_sidereal.map((p) => {
    const navamsa_sign = longitudeToNavamsaSign(p.longitude_deg)
    const navamsa_house = navamsaLagna
      ? ((SIGNS.indexOf(navamsa_sign) - SIGNS.indexOf(navamsaLagna) + 12) % 12) + 1
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
