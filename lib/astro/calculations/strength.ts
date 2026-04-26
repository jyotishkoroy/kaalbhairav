import {
  SIGN_LORD_BY_SIGN_INDEX, EXALTATION_SIGN, DEBILITATION_SIGN,
  COMBUSTION_THRESHOLD, MOOLATRIKONA_RANGE,
  PLANET_FRIENDS, PLANET_ENEMIES, NATURAL_MALEFICS, NATURAL_BENEFICS,
  type GrahaName,
} from './constants'
import { normalize360 } from './math'
import type { PlanetPosition } from './planets'
import type { D1Chart } from './d1'
import type { NavamsaChart } from './navamsa'
import type { GrahaDrishti } from './aspects'

export type StrengthIndicator = {
  planet: string
  indicator: string
  category: 'strength' | 'weakness' | 'mixed'
  rule: string
  evidence: Record<string, unknown>
  confidence: 'high' | 'medium' | 'low'
}

export type StrengthWeaknessResult = {
  indicators: StrengthIndicator[]
  dignity_table_version: string
  combustion_table_version: string
  warnings: string[]
}

const DIGNITY_VERSION = '1.0.0-audited'
const COMBUSTION_VERSION = '1.0.0-candidate'
const KENDRA_HOUSES = [1, 4, 7, 10]
const TRIKONA_HOUSES = [1, 5, 9]
const DUSTHANA_HOUSES = [6, 8, 12]

export function calculateStrength(
  planets: Record<string, PlanetPosition>,
  d1Chart: D1Chart,
  navamsa: NavamsaChart,
  aspects: GrahaDrishti[] = [],
): StrengthWeaknessResult {
  const indicators: StrengthIndicator[] = []
  const warnings: string[] = []
  const sunPos = planets['Sun']

  for (const [name, pos] of Object.entries(planets)) {
    if (name === 'Rahu' || name === 'Ketu') continue
    const gName = name as GrahaName
    const signIdx = pos.sign_index
    const hasBoundaryWarning = pos.boundary_warnings.length > 0

    // ── Own sign ──────────────────────────────────────────────────────────
    const ownLord = SIGN_LORD_BY_SIGN_INDEX[signIdx]
    const isOwnSign = ownLord === gName
    if (isOwnSign) {
      indicators.push({
        planet: name, indicator: 'own_sign', category: 'strength',
        rule: `${name} in its own sign (${pos.sign})`,
        evidence: { sign: pos.sign, sign_index: signIdx },
        confidence: hasBoundaryWarning ? 'medium' : 'high',
      })
    }

    // ── Exaltation ────────────────────────────────────────────────────────
    const exaltSign = EXALTATION_SIGN[gName]
    const isExalted = exaltSign !== undefined && signIdx === exaltSign
    if (isExalted) {
      indicators.push({
        planet: name, indicator: 'exaltation', category: 'strength',
        rule: `${name} in exaltation sign`,
        evidence: { sign: pos.sign, sign_index: signIdx, exaltation_sign_index: exaltSign },
        confidence: hasBoundaryWarning ? 'medium' : 'high',
      })
    }

    // ── Debilitation ──────────────────────────────────────────────────────
    const debilSign = DEBILITATION_SIGN[gName]
    const isDebilitated = debilSign !== undefined && signIdx === debilSign
    if (isDebilitated) {
      indicators.push({
        planet: name, indicator: 'debilitation', category: 'weakness',
        rule: `${name} in debilitation sign`,
        evidence: { sign: pos.sign, sign_index: signIdx, debilitation_sign_index: debilSign },
        confidence: hasBoundaryWarning ? 'medium' : 'high',
      })
    }

    // ── Moolatrikona ──────────────────────────────────────────────────────
    const mt = MOOLATRIKONA_RANGE[gName]
    if (mt && signIdx === mt.sign) {
      const degInSign = pos.degrees_in_sign
      if (degInSign >= mt.from && degInSign <= mt.to) {
        indicators.push({
          planet: name, indicator: 'moolatrikona', category: 'strength',
          rule: `${name} in Moolatrikona range ${mt.from}°–${mt.to}° of sign ${mt.sign}`,
          evidence: { sign_index: signIdx, degrees_in_sign: degInSign, mt_from: mt.from, mt_to: mt.to },
          confidence: 'medium',
        })
      }
    }

    // ── Friendly sign ─────────────────────────────────────────────────────
    if (!isOwnSign && !isExalted && !isDebilitated) {
      const signLord = SIGN_LORD_BY_SIGN_INDEX[signIdx] as GrahaName
      const friends = PLANET_FRIENDS[gName] ?? []
      if (friends.includes(signLord)) {
        indicators.push({
          planet: name, indicator: 'friendly_sign', category: 'strength',
          rule: `${name} in sign of friend ${signLord}`,
          evidence: { sign: pos.sign, sign_index: signIdx, sign_lord: signLord },
          confidence: hasBoundaryWarning ? 'medium' : 'high',
        })
      }

      // ── Enemy sign ──────────────────────────────────────────────────────
      const enemies = PLANET_ENEMIES[gName] ?? []
      if (enemies.includes(signLord)) {
        indicators.push({
          planet: name, indicator: 'enemy_sign', category: 'weakness',
          rule: `${name} in sign of enemy ${signLord}`,
          evidence: { sign: pos.sign, sign_index: signIdx, sign_lord: signLord },
          confidence: hasBoundaryWarning ? 'medium' : 'high',
        })
      }
    }

    // ── House placement strength / weakness ───────────────────────────────
    const houseNum = d1Chart.planet_to_house[name]
    if (houseNum !== null && houseNum !== undefined) {
      if (KENDRA_HOUSES.includes(houseNum) || TRIKONA_HOUSES.includes(houseNum)) {
        const category = (KENDRA_HOUSES.includes(houseNum) && TRIKONA_HOUSES.includes(houseNum))
          ? 'strength' // house 1 is both
          : 'strength'
        const label = TRIKONA_HOUSES.includes(houseNum) && !KENDRA_HOUSES.includes(houseNum)
          ? 'trikona' : KENDRA_HOUSES.includes(houseNum) && !TRIKONA_HOUSES.includes(houseNum)
          ? 'kendra' : 'kendra_trikona'
        indicators.push({
          planet: name, indicator: `house_${label}`, category,
          rule: `${name} in ${label} house ${houseNum}`,
          evidence: { house: houseNum, house_type: label },
          confidence: 'high',
        })
      }
      if (DUSTHANA_HOUSES.includes(houseNum)) {
        indicators.push({
          planet: name, indicator: 'house_dusthana', category: 'weakness',
          rule: `${name} in dusthana house ${houseNum} (6, 8, or 12)`,
          evidence: { house: houseNum },
          confidence: 'high',
        })
      }
    }

    // ── Retrograde ────────────────────────────────────────────────────────
    if (pos.is_retrograde) {
      indicators.push({
        planet: name, indicator: 'retrograde', category: 'mixed',
        rule: `${name} is retrograde (speed < 0)`,
        evidence: { speed: pos.speed_longitude },
        confidence: 'high',
      })
    }

    // ── Combustion ────────────────────────────────────────────────────────
    if (sunPos && name !== 'Sun' && name !== 'Moon') {
      const threshold = COMBUSTION_THRESHOLD[gName]
      if (threshold !== undefined) {
        const angDist = Math.min(
          normalize360(pos.sidereal_longitude - sunPos.sidereal_longitude),
          normalize360(sunPos.sidereal_longitude - pos.sidereal_longitude),
        )
        if (angDist <= threshold) {
          indicators.push({
            planet: name, indicator: 'combust', category: 'weakness',
            rule: `${name} within ${threshold}° of Sun (combust threshold)`,
            evidence: { angular_distance: angDist, threshold, sun_longitude: sunPos.sidereal_longitude, planet_longitude: pos.sidereal_longitude },
            confidence: 'medium',
          })
          warnings.push(`${name} combustion uses candidate threshold ${threshold}° — requires validation against authoritative source`)
        }
      }
    }

    // ── Vargottama ────────────────────────────────────────────────────────
    const navamsaPlacement = navamsa.placements.find(p => p.body === name)
    if (navamsaPlacement && navamsaPlacement.navamsa_sign_index === signIdx) {
      indicators.push({
        planet: name, indicator: 'vargottama', category: 'strength',
        rule: `${name} in same sign in D1 and D9 (Vargottama)`,
        evidence: { d1_sign_index: signIdx, d9_sign_index: navamsaPlacement.navamsa_sign_index },
        confidence: 'high',
      })
    }

    // ── Aspect support (benefic planets aspecting this planet's house) ────
    if (aspects.length > 0 && houseNum !== null && houseNum !== undefined) {
      const beneficAspects = aspects.filter(a =>
        a.target_house === houseNum && NATURAL_BENEFICS.includes(a.source_planet as GrahaName) && a.source_planet !== name,
      )
      if (beneficAspects.length > 0) {
        indicators.push({
          planet: name, indicator: 'aspect_support', category: 'strength',
          rule: `${name}'s house ${houseNum} receives benefic aspect`,
          evidence: { aspecting_benefics: beneficAspects.map(a => a.source_planet), house: houseNum },
          confidence: 'medium',
        })
      }

      // ── Aspect affliction (malefic planets aspecting) ──────────────────
      const maleficAspects = aspects.filter(a =>
        a.target_house === houseNum && NATURAL_MALEFICS.includes(a.source_planet as GrahaName) && a.source_planet !== name,
      )
      if (maleficAspects.length > 0) {
        indicators.push({
          planet: name, indicator: 'aspect_affliction', category: 'weakness',
          rule: `${name}'s house ${houseNum} receives malefic aspect`,
          evidence: { aspecting_malefics: maleficAspects.map(a => a.source_planet), house: houseNum },
          confidence: 'medium',
        })
      }
    }
  }

  return { indicators, dignity_table_version: DIGNITY_VERSION, combustion_table_version: COMBUSTION_VERSION, warnings }
}
