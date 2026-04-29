/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import remediesData from '@/data/astro/remedies.json'
import type { AstroEvidence } from '@/lib/astro/interpretation/evidence'
import {
  getAntardasha,
  getMahadasha,
  matchesAny,
  type AstroInterpretationContext,
} from '@/lib/astro/interpretation/context'

export type Remedy = {
  planet?: string
  type: 'discipline' | 'charity' | 'mantra' | 'reflection' | 'service' | 'routine'
  instruction: string
  safetyNote?: string
}

type RemediesByPlanet = Record<string, Remedy[]>

const REMEDIES_BY_PLANET = remediesData as RemediesByPlanet

const UNSAFE_REMEDY_PATTERNS = [
  /guarantee/i,
  /miracle/i,
  /cure/i,
  /wear .* immediately/i,
  /blue sapphire immediately/i,
  /pay .* puja/i,
  /expensive/i,
  /do not see a doctor/i,
  /stop medical/i,
]

export const saturnSafeRemedies: Remedy[] = REMEDIES_BY_PLANET.Saturn ?? []

export function isSafeRemedy(remedy: Remedy): boolean {
  const combined = `${remedy.instruction} ${remedy.safetyNote ?? ''}`

  return !UNSAFE_REMEDY_PATTERNS.some((pattern) => pattern.test(combined))
}

export function getSafeRemediesForPlanet(
  planet: string | undefined,
  limit = 2,
): Remedy[] {
  const key = normalizePlanetKey(planet)
  const remedies = REMEDIES_BY_PLANET[key] ?? REMEDIES_BY_PLANET.General ?? []

  return remedies.filter(isSafeRemedy).slice(0, limit)
}

export function getGeneralSafeRemedies(limit = 2): Remedy[] {
  return (REMEDIES_BY_PLANET.General ?? []).filter(isSafeRemedy).slice(0, limit)
}

export function formatRemedy(remedy: Remedy): string {
  return remedy.safetyNote
    ? `${remedy.instruction} Safety note: ${remedy.safetyNote}`
    : remedy.instruction
}

function normalizePlanetKey(planet: string | undefined): string {
  if (!planet) return 'General'

  const lower = planet.toLowerCase()

  if (matchesAny(lower, ['saturn', 'shani'])) return 'Saturn'
  if (matchesAny(lower, ['jupiter', 'guru'])) return 'Jupiter'
  if (matchesAny(lower, ['venus', 'shukra'])) return 'Venus'
  if (matchesAny(lower, ['mercury', 'budh'])) return 'Mercury'
  if (matchesAny(lower, ['moon', 'chandra'])) return 'Moon'

  return 'General'
}

function pickRemedyPlanet(ctx: AstroInterpretationContext): string | undefined {
  const mahadasha = getMahadasha(ctx)
  const antardasha = getAntardasha(ctx)

  if (matchesAny(mahadasha, ['saturn', 'shani'])) return 'Saturn'
  if (matchesAny(antardasha, ['saturn', 'shani'])) return 'Saturn'
  if (matchesAny(mahadasha, ['jupiter', 'guru'])) return 'Jupiter'
  if (matchesAny(antardasha, ['jupiter', 'guru'])) return 'Jupiter'
  if (matchesAny(mahadasha, ['venus', 'shukra'])) return 'Venus'
  if (matchesAny(antardasha, ['venus', 'shukra'])) return 'Venus'
  if (matchesAny(mahadasha, ['mercury', 'budh'])) return 'Mercury'
  if (matchesAny(antardasha, ['mercury', 'budh'])) return 'Mercury'
  if (matchesAny(mahadasha, ['moon', 'chandra'])) return 'Moon'
  if (matchesAny(antardasha, ['moon', 'chandra'])) return 'Moon'

  return undefined
}

function remediesToGuidance(remedies: Remedy[]): string {
  if (remedies.length === 0) {
    return 'Use simple, non-harmful practices like routine, reflection, service, and calm decision-making.'
  }

  return remedies.map(formatRemedy).join(' ')
}

export function interpretRemedies(ctx: AstroInterpretationContext): AstroEvidence[] {
  if (ctx.concern.topic !== 'remedy' && ctx.concern.questionType !== 'remedy') {
    return []
  }

  const planet = pickRemedyPlanet(ctx)
  const remedies = planet ? getSafeRemediesForPlanet(planet, 2) : getGeneralSafeRemedies(2)
  const guidance = remediesToGuidance(remedies)
  const factor = planet ? `${planet}-safe remedy` : 'Safe general remedy'
  const id = planet ? `remedy-${planet.toLowerCase()}-safe` : 'remedy-general-safe'

  return [
    {
      id,
      topic: 'remedy',
      factor,
      humanMeaning:
        'A safe remedy should reduce fear, increase steadiness, and support better choices.',
      likelyExperience:
        'The person may want something practical to do because the phase feels slow, heavy, or uncertain.',
      guidance,
      caution:
        'Avoid remedies that promise certainty, create fear, require unaffordable spending, or replace medical/legal/professional help.',
      confidence: 'high',
      visibleToUser: true,
    },
  ]
}
