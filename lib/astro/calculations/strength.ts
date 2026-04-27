import type { GrahaName } from './constants.ts'
import type { PlanetPosition } from './planets.ts'
import type { D1Chart } from './d1.ts'
import type { NavamsaChart } from './navamsa.ts'
import type { GrahaDrishti } from './aspects.ts'

export type StrengthIndicator = {
  planet: string
  indicator: string
  category: 'strength' | 'weakness' | 'mixed'
  rule: string
  evidence: Record<string, unknown>
  confidence: 'high' | 'medium' | 'low'
  present: boolean
  status: 'calculated' | 'unsupported' | 'unavailable'
}

export type StrengthWeaknessResult = {
  indicators: StrengthIndicator[]
  dignity_table_version: string
  combustion_table_version: string
  warnings: string[]
}

const DIGNITY_VERSION = '1.0.0-audited'
const COMBUSTION_VERSION = 'disabled-unaudited'

function unsupportedIndicator(planet: string, indicator: string, category: StrengthIndicator['category'], evidence: Record<string, unknown>): StrengthIndicator {
  return {
    planet,
    indicator,
    category,
    rule: '',
    evidence,
    confidence: 'low',
    present: false,
    status: 'unsupported',
  }
}

export function calculateStrength(
  planets: Record<string, PlanetPosition>,
  d1Chart: D1Chart,
  navamsa: NavamsaChart,
  aspects: GrahaDrishti[] = [],
): StrengthWeaknessResult {
  const indicators: StrengthIndicator[] = []
  const warnings: string[] = []
  const evidence = {
    planet_count: Object.keys(planets).length,
    house_count: d1Chart.houses.length,
    navamsa_count: navamsa.placements.length,
    aspect_count: aspects.length,
  }

  for (const name of Object.keys(planets)) {
    if (name === 'Rahu' || name === 'Ketu') continue
    const gName = name as GrahaName
    indicators.push(unsupportedIndicator(gName, 'dignity', 'mixed', evidence))
    indicators.push(unsupportedIndicator(gName, 'moolatrikona', 'strength', evidence))
    indicators.push(unsupportedIndicator(gName, 'friendly_sign', 'strength', evidence))
    indicators.push(unsupportedIndicator(gName, 'enemy_sign', 'weakness', evidence))
    indicators.push(unsupportedIndicator(gName, 'house_strength', 'strength', evidence))
    indicators.push(unsupportedIndicator(gName, 'house_weakness', 'weakness', evidence))
    indicators.push(unsupportedIndicator(gName, 'retrograde', 'mixed', evidence))
    indicators.push(unsupportedIndicator(gName, 'combustion', 'weakness', evidence))
    indicators.push(unsupportedIndicator(gName, 'vargottama', 'strength', evidence))
    indicators.push(unsupportedIndicator(gName, 'aspect_support', 'strength', evidence))
    indicators.push(unsupportedIndicator(gName, 'aspect_affliction', 'weakness', evidence))
  }

  warnings.push('Unaudited strength and weakness rules are disabled in production output')

  return { indicators, dignity_table_version: DIGNITY_VERSION, combustion_table_version: COMBUSTION_VERSION, warnings }
}
