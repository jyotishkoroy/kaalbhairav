import type {
  AstroEvidence,
  AstroEvidenceWithSource,
  ReadingTopic,
} from '@/lib/astro/interpretation/evidence'

export type { AstroEvidence, AstroEvidenceWithSource, ReadingTopic }

export type EmotionalTone =
  | 'calm'
  | 'anxious'
  | 'sad'
  | 'angry'
  | 'confused'
  | 'hopeful'
  | 'urgent'

export type QuestionType =
  | 'timing'
  | 'yes_no'
  | 'decision'
  | 'explanation'
  | 'remedy'
  | 'general_prediction'

export type ReadingMode =
  | 'short_comfort'
  | 'deep_astrology'
  | 'practical_guidance'
  | 'timing_prediction'
  | 'remedy_focused'
  | 'human_conversation'

export type ReadingLanguage = 'english' | 'hinglish' | 'hindi' | 'bengali'

export type UserConcern = {
  topic: ReadingTopic
  subtopic?: string
  emotionalTone: EmotionalTone
  questionType: QuestionType
  needsReassurance: boolean
  wantsTechnicalAstrology: boolean
  wantsPracticalSteps: boolean
  highRiskFlags: string[]
}

export type BirthDetailsInput = {
  date?: string
  time?: string
  place?: string
  timezone?: number
  latitude?: number
  longitude?: number
  [key: string]: unknown
}

export type ChartSummary = {
  lagna?: string
  moonSign?: string
  sunSign?: string
  nakshatra?: string
  nakshatraPada?: number
  currentDasha?: string
  currentAntardasha?: string
  dominantPlanets?: string[]
  sensitiveHouses?: string[]
  [key: string]: unknown
}

export type ReadingV2Input = {
  userId?: string
  question: string
  birthDetails?: BirthDetailsInput
  chart?: unknown
  context?: unknown
  metadata?: Record<string, unknown>
}

export type ReadingV2Meta = {
  version: 'v2'
  topic?: ReadingTopic
  mode?: ReadingMode
  language?: ReadingLanguage
  evidenceCount?: number
  usedFallback?: boolean
  routedBy?: string
  [key: string]: unknown
}

export type ReadingV2Result = {
  answer: string
  meta: ReadingV2Meta
}

export type ReadingStyle = {
  warmth: number
  technicalDepth: number
  directness: number
  reassurance: number
  spiritualTone: number
}
