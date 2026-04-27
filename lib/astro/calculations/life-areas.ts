import { LIFE_AREA_HOUSE, SIGN_LORD_BY_SIGN_INDEX, RASHI_MAP } from './constants'
import type { D1Chart } from './d1'
import type { GrahaDrishti } from './aspects'
import type { StrengthIndicator } from './strength'
import type { LagnaResult } from './lagna'
import type { LifeAreaSignatures, LifeAreaSignature as LegacyLifeAreaSignature, LifeArea, ZodiacSign, PlanetName } from '../engine/types'

// ─── Master-spec Life Area Signature ──────────────────────────────────────

export type LifeAreaSignature = {
  life_area: string
  house_number: number
  house_sign: string | null
  house_sign_index: number | null
  house_lord: string | null
  lord_placement_house: number | null
  lord_placement_sign: string | null
  lord_placement_sign_index: number | null
  occupying_planets: string[]
  aspects_to_house: GrahaDrishti[]
  strength_note: StrengthIndicator[]
  reliability: 'high' | 'medium' | 'low' | 'not_available'
  warnings: string[]
}

export function calculateLifeAreas(
  d1Chart: D1Chart,
  aspects: GrahaDrishti[],
  strengthIndicators: StrengthIndicator[],
  lagna: LagnaResult | null,
): LifeAreaSignature[] {
  const reliability = lagna?.reliability ?? 'not_available'

  if (reliability === 'not_available') {
    return Object.keys(LIFE_AREA_HOUSE).map(area => ({
      life_area: area,
      house_number: LIFE_AREA_HOUSE[area],
      house_sign: null,
      house_sign_index: null,
      house_lord: null,
      lord_placement_house: null,
      lord_placement_sign: null,
      lord_placement_sign_index: null,
      occupying_planets: [],
      aspects_to_house: [],
      strength_note: [],
      reliability: 'not_available' as const,
      warnings: ['Lagna unavailable — life area signatures require reliable birth time'],
    }))
  }

  return Object.entries(LIFE_AREA_HOUSE).map(([area, houseNum]) => {
    const houseEntry = d1Chart.houses.find(h => h.house_number === houseNum)
    const houseSignIdx = houseEntry?.sign_index ?? null
    const houseLord = houseSignIdx !== null ? SIGN_LORD_BY_SIGN_INDEX[houseSignIdx] : null
    const lordPlacementHouse = houseLord ? d1Chart.planet_to_house[houseLord] ?? null : null
    const lordPlacementSignEntry = houseLord ? d1Chart.planet_to_sign[houseLord] : null
    const occupying = d1Chart.occupying_planets_by_house[houseNum] ?? []
    const aspectsToHouse = aspects.filter(a => a.target_house === houseNum)
    const strengthNote = strengthIndicators.filter(
      i => i.planet === houseLord || occupying.includes(i.planet),
    )

    const warnings: string[] = []
    if (lagna?.near_sign_boundary) warnings.push('Lagna near sign boundary — house sign assignments may be inaccurate')

    return {
      life_area: area,
      house_number: houseNum,
      house_sign: houseSignIdx !== null ? RASHI_MAP[houseSignIdx].english_name : null,
      house_sign_index: houseSignIdx,
      house_lord: houseLord ?? null,
      lord_placement_house: lordPlacementHouse,
      lord_placement_sign: lordPlacementSignEntry?.sign ?? null,
      lord_placement_sign_index: lordPlacementSignEntry?.sign_index ?? null,
      occupying_planets: occupying,
      aspects_to_house: aspectsToHouse,
      strength_note: strengthNote,
      reliability,
      warnings,
    }
  })
}

// ─── Legacy adapter ────────────────────────────────────────────────────────

export type LifeAreasInput = {
  house_signs: ZodiacSign[]
  planet_houses: Array<{ planet: PlanetName; house: number; sign: ZodiacSign }>
  engine_mode: string
}

const LIFE_AREA_HOUSES_LEGACY: Record<LifeArea, number> = {
  self: 1, wealth: 2, siblings: 3, home_mother: 4, children_intellect: 5,
  enemies_health: 6, partner_marriage: 7, longevity_transformation: 8,
  dharma_fortune: 9, career_status: 10, gains_network: 11, losses_liberation: 12,
}

const SIGN_LORDS_LEGACY: Record<ZodiacSign, PlanetName> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
}

export async function calculateLifeAreaSignatures(input: LifeAreasInput): Promise<LifeAreaSignatures> {
  const now = new Date().toISOString()
  if (input.engine_mode !== 'real') {
    return { status: 'stub', calculated_at: now, signatures: [], warnings: ['Engine is in stub mode.'] }
  }
  if (!input.house_signs || input.house_signs.length !== 12) {
    return { status: 'not_available', calculated_at: now, signatures: [], warnings: ['House sign data not available.'] }
  }

  const planetHouseMap = new Map<number, PlanetName[]>()
  const lordPlacementMap = new Map<PlanetName, { house: number; sign: ZodiacSign }>()
  for (const p of input.planet_houses) {
    planetHouseMap.set(p.house, [...(planetHouseMap.get(p.house) ?? []), p.planet])
    lordPlacementMap.set(p.planet, { house: p.house, sign: p.sign })
  }

  const signatures: LegacyLifeAreaSignature[] = (Object.keys(LIFE_AREA_HOUSES_LEGACY) as LifeArea[]).map(area => {
    const house_number = LIFE_AREA_HOUSES_LEGACY[area]
    const house_sign = input.house_signs[house_number - 1]
    const lord = SIGN_LORDS_LEGACY[house_sign]
    const lordPlacement = lordPlacementMap.get(lord)
    const occupying_planets = planetHouseMap.get(house_number) ?? []
    let strength_note: string | null = null
    if (lordPlacement) {
      if (lordPlacement.sign === house_sign) strength_note = 'lord in own sign'
      else if (lordPlacement.house === house_number) strength_note = 'lord occupies own house'
    }
    return { area, house_number, house_sign, lord, lord_placement_house: lordPlacement?.house ?? 0, lord_placement_sign: lordPlacement?.sign ?? house_sign, occupying_planets, strength_note }
  })

  return { status: 'real', calculated_at: now, signatures, warnings: [] }
}
