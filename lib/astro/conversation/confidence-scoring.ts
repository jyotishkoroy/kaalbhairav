/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { PredictionContext } from '../types.ts'
import type { ConversationState } from './types.ts'

export type ConfidenceResult = {
  astrology_data_confidence: number
  situation_confidence: number
  overall_confidence_score: number
  confidence_label: 'low' | 'medium' | 'medium-high' | 'high'
  penalty_reasons: string[]
}

function confidenceLabel(score: number): 'low' | 'medium' | 'medium-high' | 'high' {
  if (score >= 85) return 'high'
  if (score >= 65) return 'medium-high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function computeConfidence(
  context: PredictionContext | null,
  state: ConversationState,
): ConfidenceResult {
  if (!context) {
    return {
      astrology_data_confidence: 0,
      situation_confidence: 0,
      overall_confidence_score: 0,
      confidence_label: 'low',
      penalty_reasons: ['no prediction context'],
    }
  }

  const penalties: string[] = []
  let astroPenalty = 0
  let situationPenalty = 0

  const isStub = context.chart_identity.calculation_status === 'stub'
  if (isStub) {
    astroPenalty = 70
    penalties.push('engine stub: astro confidence capped at 30')
  }

  const ex = context.expanded_context
  const isDailyGuidance = state.topic === 'daily_guidance'

  if (isDailyGuidance) {
    if (!ex?.daily_transits_summary) { astroPenalty += 20; penalties.push('no daily transits for daily guidance') }
    if (!ex?.panchang_summary) { astroPenalty += 12; penalties.push('no panchang for daily guidance') }
  }

  if (!ex?.current_timing_summary) { astroPenalty += 15; penalties.push('no current timing') }

  const dashas = context.dashas as Record<string, unknown> | null
  if (!dashas || Object.keys(dashas).length === 0) {
    astroPenalty += 15
    penalties.push('no current dasha info')
  }

  if (state.topic !== 'general' && state.topic !== 'daily_guidance') {
    const lifeAreas = context.life_area_signatures as Record<string, unknown> | null
    if (!lifeAreas || Object.keys(lifeAreas).length === 0) {
      astroPenalty += 10
      penalties.push('no topic life-area signature')
    }
  }

  const warnings = context.warnings ?? []
  const hasLagnaWarning = warnings.some(
    (w) => w.warning_code?.includes('lagna') || w.warning_code?.includes('birth_time'),
  )
  if (hasLagnaWarning) { astroPenalty += 20; penalties.push('uncertain birth time / lagna warning') }

  const highRisk = state.high_risk_flags ?? []
  if (highRisk.length > 0) {
    situationPenalty += 20
    penalties.push(`high-risk topic: ${highRisk.join(', ')}`)
  }

  const knownContextFields = Object.values(state.known_context ?? {}).filter(Boolean).length
  if (knownContextFields < 2) { situationPenalty += 20; penalties.push('unclear situation') }

  const astroBase = isStub ? 30 : 90
  const astroConfidence = Math.max(0, Math.min(100, astroBase - astroPenalty))
  const situationBase = 80
  const situationConfidence = Math.max(0, Math.min(100, situationBase - situationPenalty))
  const overall = Math.round(astroConfidence * 0.6 + situationConfidence * 0.4)

  return {
    astrology_data_confidence: astroConfidence,
    situation_confidence: situationConfidence,
    overall_confidence_score: overall,
    confidence_label: confidenceLabel(overall),
    penalty_reasons: penalties,
  }
}
