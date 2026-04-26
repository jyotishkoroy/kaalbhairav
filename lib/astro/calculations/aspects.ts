import type { BasicAspects, Aspect, PlanetName } from '../engine/types'

export type AspectsInput = {
  planet_houses: Array<{ planet: PlanetName; house: number }>
  engine_mode: string
}

const SPECIAL_ASPECTS: Record<string, number[]> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
  Rahu: [5, 9],
  Ketu: [5, 9],
}

function targetHouse(from_house: number, offset: number): number {
  return ((from_house - 1 + offset - 1 + 12) % 12) + 1
}

export async function calculateAspects(input: AspectsInput): Promise<BasicAspects> {
  const now = new Date().toISOString()

  if (input.engine_mode !== 'real') {
    return {
      status: 'stub',
      calculated_at: now,
      aspects: [],
      warnings: ['Engine is in stub mode. Aspects require ASTRO_ENGINE_MODE=real.'],
    }
  }

  if (!input.planet_houses || input.planet_houses.length === 0) {
    return {
      status: 'not_available',
      calculated_at: now,
      aspects: [],
      warnings: ['Planet house data not available from chart calculation.'],
    }
  }

  const aspects: Aspect[] = []
  const houseMap = new Map<number, PlanetName[]>()

  for (const { planet, house } of input.planet_houses) {
    const existing = houseMap.get(house) ?? []
    houseMap.set(house, [...existing, planet])
  }

  for (const { planet, house } of input.planet_houses) {
    const seventh = targetHouse(house, 7)
    const seventhOccupants = houseMap.get(seventh) ?? []
    if (seventhOccupants.length > 0) {
      for (const aspected of seventhOccupants) {
        aspects.push({
          aspecting_planet: planet,
          aspected_planet: aspected,
          aspected_house: null,
          aspect_type: 'graha_drishti_7th',
          strength: 'full',
        })
      }
    } else {
      aspects.push({
        aspecting_planet: planet,
        aspected_planet: null,
        aspected_house: seventh,
        aspect_type: 'graha_drishti_7th',
        strength: 'full',
      })
    }

    const specials = SPECIAL_ASPECTS[planet] ?? []
    for (const offset of specials) {
      const target = targetHouse(house, offset)
      const occupants = houseMap.get(target) ?? []
      const aspectType: Aspect['aspect_type'] =
        planet === 'Mars' && offset === 4 ? 'mars_drishti_4th' :
        planet === 'Mars' && offset === 8 ? 'mars_drishti_8th' :
        planet === 'Jupiter' && offset === 5 ? 'jupiter_drishti_5th' :
        planet === 'Jupiter' && offset === 9 ? 'jupiter_drishti_9th' :
        planet === 'Saturn' && offset === 3 ? 'saturn_drishti_3rd' :
        planet === 'Saturn' && offset === 10 ? 'saturn_drishti_10th' :
        planet === 'Rahu' && offset === 5 ? 'rahu_ketu_drishti_5th' :
        'rahu_ketu_drishti_9th'

      const strength: 'full' | 'partial' = (planet === 'Rahu' || planet === 'Ketu') ? 'partial' : 'full'

      if (occupants.length > 0) {
        for (const aspected of occupants) {
          aspects.push({
            aspecting_planet: planet,
            aspected_planet: aspected,
            aspected_house: null,
            aspect_type: aspectType,
            strength,
          })
        }
      } else {
        aspects.push({
          aspecting_planet: planet,
          aspected_planet: null,
          aspected_house: target,
          aspect_type: aspectType,
          strength,
        })
      }
    }
  }

  return {
    status: 'real',
    calculated_at: now,
    aspects,
    warnings: [],
  }
}
