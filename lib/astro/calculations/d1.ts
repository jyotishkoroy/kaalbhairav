/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { PlanetPosition } from './planets.ts'
import type { LagnaResult } from './lagna.ts'
import type { WholeSignHouse } from './houses.ts'
import type { SignPlacement } from './sign.ts'

export type D1PlanetPlacement = {
  planet: string
  sign: string
  sign_index: number
  degrees_in_sign: number
  house_number: number | null
  house_reliability: 'high' | 'medium' | 'low' | 'not_available'
}

export type D1Chart = {
  lagna_sign_index: number | null
  houses: WholeSignHouse[]
  planet_to_sign: Record<string, SignPlacement>
  planet_to_house: Record<string, number | null>
  occupying_planets_by_house: Record<number, string[]>
}

export function calculateD1Chart(
  planets: Record<string, PlanetPosition>,
  lagna: LagnaResult | null,
  houses: WholeSignHouse[],
): D1Chart {
  const lagnaSignIdx = lagna?.sign_index ?? null
  const planet_to_sign: Record<string, SignPlacement> = {}
  const planet_to_house: Record<string, number | null> = {}
  const occupying_planets_by_house: Record<number, string[]> = {}

  for (let h = 1; h <= 12; h++) occupying_planets_by_house[h] = []

  for (const [name, pos] of Object.entries(planets)) {
    planet_to_sign[name] = {
      sign: pos.sign,
      sign_index: pos.sign_index,
      degrees_in_sign: pos.degrees_in_sign,
      near_sign_boundary: pos.boundary_warnings.some(w => w.includes('sign boundary')),
    }
    if (lagnaSignIdx !== null) {
      const houseNum = ((pos.sign_index - lagnaSignIdx + 12) % 12) + 1
      planet_to_house[name] = houseNum
      occupying_planets_by_house[houseNum].push(name)
    } else {
      planet_to_house[name] = null
    }
  }

  return {
    lagna_sign_index: lagnaSignIdx,
    houses,
    planet_to_sign,
    planet_to_house,
    occupying_planets_by_house,
  }
}
