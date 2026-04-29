/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export type ReadingTopic =
  | 'career'
  | 'marriage'
  | 'relationship'
  | 'money'
  | 'health'
  | 'family'
  | 'education'
  | 'spirituality'
  | 'remedy'
  | 'death'
  | 'general'

export type AstroEvidenceConfidence = 'low' | 'medium' | 'high'

export type AstroEvidence = {
  id: string
  topic: ReadingTopic
  factor: string
  humanMeaning: string
  likelyExperience: string
  guidance: string
  caution?: string
  timingHint?: string
  confidence: AstroEvidenceConfidence
  visibleToUser: boolean
}

export type AstroEvidenceSource = {
  kind:
    | 'chart'
    | 'dasha'
    | 'transit'
    | 'yoga'
    | 'house'
    | 'planet'
    | 'nakshatra'
    | 'manual'
    | 'unknown'
  label: string
  value?: string | number | boolean
}

export type AstroEvidenceWithSource = AstroEvidence & {
  sources?: AstroEvidenceSource[]
}
