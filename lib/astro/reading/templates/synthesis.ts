/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { AstroEvidence } from '@/lib/astro/interpretation/evidence'

export function renderMainSignal(evidence: AstroEvidence[]): string {
  const visible = evidence.filter((item) => item.visibleToUser)

  if (visible.length === 0) {
    return 'I do not want to force a prediction where the available indicators are not specific enough.'
  }

  const primary = visible[0]

  if (!primary) {
    return 'I do not want to force a prediction where the available indicators are not specific enough.'
  }

  return `The main signal I see is ${primary.factor}. ${primary.humanMeaning}`
}

export function renderLikelyExperience(evidence: AstroEvidence[]): string {
  const experiences = evidence
    .filter((item) => item.visibleToUser)
    .map((item) => item.likelyExperience)
    .filter(Boolean)

  if (experiences.length === 0) {
    return ''
  }

  const unique = Array.from(new Set(experiences))
  const selected = unique.slice(0, 2)

  if (selected.length === 1) {
    return selected[0] ?? ''
  }

  return selected.join(' ')
}

export function renderTimingHint(evidence: AstroEvidence[]): string {
  const timingHints = evidence
    .filter((item) => item.visibleToUser && item.timingHint)
    .map((item) => item.timingHint)
    .filter((hint): hint is string => Boolean(hint))

  if (timingHints.length === 0) {
    return ''
  }

  return timingHints[0] ?? ''
}
