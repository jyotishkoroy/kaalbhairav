/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { D1Chart } from './d1.ts'
import type { GrahaDrishti } from './aspects.ts'
import type { PlanetPosition } from './planets.ts'

export type DoshaResult = {
  dosha_id: string
  dosha_name: string
  present: boolean
  severity: 'none' | 'low' | 'medium' | 'high'
  status: 'calculated' | 'unavailable' | 'unsupported'
  confidence: 'high' | 'medium' | 'low'
  evidence: Record<string, unknown>
  cancellation_evidence: Record<string, unknown>
  warnings: string[]
}

function unavailableDosha(id: string, name: string, reason: string): DoshaResult {
  return {
    dosha_id: id,
    dosha_name: name,
    present: false,
    severity: 'none',
    status: 'unavailable',
    confidence: 'low',
    evidence: { reason },
    cancellation_evidence: {},
    warnings: [],
  }
}

export function calculateDoshas(
  d1Chart: D1Chart,
  aspects: GrahaDrishti[],
  planets?: Record<string, PlanetPosition>,
): DoshaResult[] {
  const { planet_to_house, lagna_sign_index } = d1Chart
  const evidence = {
    lagna_sign_index,
    house_placements_available: Object.values(planet_to_house).every((value) => value !== null),
    aspects_count: aspects.length,
    planets_available: planets ? Object.keys(planets) : [],
  }

  return [
    unavailableDosha('mangal_dosha', 'Mangal Dosha (Kuja Dosha)', 'unaudited_rule_disabled'),
    unavailableDosha('kaal_sarpa', 'Kaal Sarpa Dosha', 'unaudited_rule_disabled'),
    unavailableDosha('shani_dosha_moon', 'Shani Dosha (Saturn 7th from Moon)', 'unaudited_rule_disabled'),
    unavailableDosha('pitra_dosha', 'Pitra Dosha', 'unaudited_rule_disabled'),
  ].map((dosha) => ({
    ...dosha,
    evidence,
  }))
}

export {
  buildDoshaSectionV2,
  calculateKalsarpaBoundary,
  calculateManglikDosha,
  MANGLIK_HOUSES,
} from './dosha-v2.ts'
