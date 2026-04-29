/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { D1Chart } from './d1.ts'
import type { GrahaDrishti } from './aspects.ts'
import type { NavamsaChart } from './navamsa.ts'

export type YogaResult = {
  yoga_id: string
  yoga_name: string
  present: boolean
  status: 'calculated' | 'unavailable' | 'unsupported'
  confidence: 'high' | 'medium' | 'low'
  rule_formula: string
  evidence: Record<string, unknown>
  cancellation_evidence?: Record<string, unknown>
  warnings: string[]
}

function unavailableYoga(id: string, name: string, reason: string): YogaResult {
  return {
    yoga_id: id,
    yoga_name: name,
    present: false,
    status: 'unavailable',
    confidence: 'low',
    rule_formula: '',
    evidence: { reason },
    warnings: [],
  }
}

export function calculateYogas(
  d1Chart: D1Chart,
  aspects: GrahaDrishti[],
  navamsa: NavamsaChart,
): YogaResult[] {
  const { planet_to_house, planet_to_sign, lagna_sign_index } = d1Chart
  const evidence = {
    house_placements_available: Object.values(planet_to_house).every((value) => value !== null),
    sign_placements_available: Object.values(planet_to_sign).every((value) => value !== null),
    lagna_sign_index,
    aspects_count: aspects.length,
    navamsa_placements_count: navamsa.placements.length,
  }

  return [
    unavailableYoga('gajakesari', 'Gajakesari Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('chandra_mangala', 'Chandra-Mangala Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('budha_aditya', 'Budha-Aditya Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('ruchaka', 'Ruchaka Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('bhadra', 'Bhadra Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('hamsa', 'Hamsa Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('malavya', 'Malavya Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('sasa', 'Sasa Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('parivartana', 'Parivartana Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('vipreet_raja', 'Vipreet Raja Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('raja_yoga', 'Raja Yoga', 'unaudited_rule_disabled'),
    unavailableYoga('neech_bhang_raja', 'Neech Bhang Raja Yoga', 'unaudited_rule_disabled'),
  ].map((yoga) => ({
    ...yoga,
    evidence,
  }))
}
