/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { AstroEvidence } from '@/lib/astro/interpretation/evidence'

function prioritizeRemedyEvidence(evidence: AstroEvidence[]): AstroEvidence[] {
  const remedy = evidence.filter(
    (item) => item.visibleToUser && item.topic === 'remedy',
  )
  const nonRemedy = evidence.filter(
    (item) => item.visibleToUser && item.topic !== 'remedy',
  )

  return [...remedy, ...nonRemedy]
}

export function renderGuidance(evidence: AstroEvidence[]): string {
  const guidance = prioritizeRemedyEvidence(evidence)
    .map((item) => item.guidance)
    .filter(Boolean)

  if (guidance.length === 0) {
    return 'The best step is to pause, observe the situation clearly, and avoid making decisions only from fear.'
  }

  const unique = Array.from(new Set(guidance)).slice(0, 3)

  return `My practical guidance is this: ${unique.join(' ')}`
}

export function renderCaution(evidence: AstroEvidence[]): string {
  const cautions = prioritizeRemedyEvidence(evidence)
    .filter((item) => item.caution)
    .map((item) => item.caution)
    .filter((caution): caution is string => Boolean(caution))

  if (cautions.length === 0) {
    return ''
  }

  const unique = Array.from(new Set(cautions)).slice(0, 2)

  return `I would be careful about one thing: ${unique.join(' ')}`
}
