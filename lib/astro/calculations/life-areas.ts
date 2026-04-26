import type { LifeAreaSignatures, LifeAreaSignature, LifeArea, ZodiacSign, PlanetName } from '../engine/types'

export type LifeAreasInput = {
  house_signs: ZodiacSign[]
  planet_houses: Array<{ planet: PlanetName; house: number; sign: ZodiacSign }>
  engine_mode: string
}

const LIFE_AREA_HOUSES: Record<LifeArea, number> = {
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
}

const SIGN_LORDS: Record<ZodiacSign, PlanetName> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
}

export async function calculateLifeAreaSignatures(input: LifeAreasInput): Promise<LifeAreaSignatures> {
  const now = new Date().toISOString()

  if (input.engine_mode !== 'real') {
    return {
      status: 'stub',
      calculated_at: now,
      signatures: [],
      warnings: ['Engine is in stub mode. Life-area signatures require ASTRO_ENGINE_MODE=real.'],
    }
  }

  if (!input.house_signs || input.house_signs.length !== 12) {
    return {
      status: 'not_available',
      calculated_at: now,
      signatures: [],
      warnings: ['House sign data (12 entries) not available from chart calculation.'],
    }
  }

  const planetHouseMap = new Map<number, PlanetName[]>()
  for (const { planet, house } of input.planet_houses) {
    const existing = planetHouseMap.get(house) ?? []
    planetHouseMap.set(house, [...existing, planet])
  }

  const lordPlacementMap = new Map<PlanetName, { house: number; sign: ZodiacSign }>()
  for (const p of input.planet_houses) {
    lordPlacementMap.set(p.planet, { house: p.house, sign: p.sign })
  }

  const signatures: LifeAreaSignature[] = (Object.keys(LIFE_AREA_HOUSES) as LifeArea[]).map((area) => {
    const house_number = LIFE_AREA_HOUSES[area]
    const house_sign = input.house_signs[house_number - 1]
    const lord = SIGN_LORDS[house_sign]
    const lordPlacement = lordPlacementMap.get(lord)
    const occupying_planets = planetHouseMap.get(house_number) ?? []

    let strength_note: string | null = null
    if (lordPlacement) {
      if (lordPlacement.sign === house_sign) strength_note = 'lord in own sign'
      else if (lordPlacement.house === house_number) strength_note = 'lord occupies own house'
    }

    return {
      area,
      house_number,
      house_sign,
      lord,
      lord_placement_house: lordPlacement?.house ?? 0,
      lord_placement_sign: lordPlacement?.sign ?? house_sign,
      occupying_planets,
      strength_note,
    }
  })

  return {
    status: 'real',
    calculated_at: now,
    signatures,
    warnings: [],
  }
}
