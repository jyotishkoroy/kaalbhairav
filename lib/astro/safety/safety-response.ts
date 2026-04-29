/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { UserConcern } from '@/lib/astro/reading/reading-types'
import type {
  SafetyClassification,
  SafetyRiskName,
} from '@/lib/astro/safety/safety-classifier'

const SAFETY_MESSAGES: Record<SafetyRiskName, string> = {
  selfHarm:
    'If this question is connected to thoughts of harming yourself, please contact local emergency services or a trusted crisis support line now. Astrology should not be used for immediate safety decisions.',
  medical:
    'The chart can show general stress patterns, but I would not treat astrology as a replacement for medical advice. If symptoms are present, please speak with a qualified doctor.',
  death:
    'I would not predict death, death dates, or exact lifespan. A responsible reading can only discuss wellbeing, caution, and steadier life choices.',
  legal:
    'Astrology should not be treated as legal advice. If this involves a court, police, contract, or legal risk, speak with a qualified legal professional.',
  pregnancy:
    'Astrology should not be used to confirm pregnancy, fertility, miscarriage risk, or medical outcomes. Please use proper medical testing and qualified medical guidance.',
  fearBased:
    'I would avoid fear-based conclusions like curses, doom, or guaranteed misfortune. A responsible reading should reduce fear, not increase it.',
  gemstone:
    'I would not suggest strong gemstones or expensive remedies without a careful full-chart review by a trusted expert. Start with safe, simple, non-harmful practices.',
}

export function buildSafetyMessages(
  classification: SafetyClassification,
): string[] {
  return classification.riskNames.map((riskName) => SAFETY_MESSAGES[riskName])
}

export function buildSafetyPrefix(input: {
  classification: SafetyClassification
  concern: UserConcern
}): string {
  const messages = buildSafetyMessages(input.classification)

  if (messages.length === 0) return ''

  return messages.join('\n\n')
}

export function shouldReplaceAnswer(
  classification: SafetyClassification,
): boolean {
  return (
    classification.risk.selfHarm ||
    classification.risk.death ||
    classification.risk.medical ||
    classification.risk.pregnancy ||
    classification.risk.legal
  )
}

export function buildSafeReplacementAnswer(input: {
  classification: SafetyClassification
  concern: UserConcern
}): string {
  const prefix = buildSafetyPrefix(input)

  if (input.classification.risk.selfHarm) {
    return [
      prefix,
      'For the astrology part, I can only speak in a general and supportive way: this is a moment to prioritize immediate human support and safety over prediction.',
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  if (input.classification.risk.death) {
    return [
      prefix,
      'Instead of lifespan prediction, I can help you look at wellbeing routines, stress periods, and practical caution in a non-fear-based way.',
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  if (input.classification.risk.medical || input.classification.risk.pregnancy) {
    return [
      prefix,
      'For a chart-based reading, I can only discuss general wellbeing, rest, routine, and stress management. I cannot diagnose or confirm medical conditions.',
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  if (input.classification.risk.legal) {
    return [
      prefix,
      'I can only offer general emotional and timing reflection. I cannot predict or decide legal outcomes.',
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  return prefix
}
