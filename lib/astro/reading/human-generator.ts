import type { AstroEvidence } from '@/lib/astro/interpretation/evidence'
import type {
  ReadingLanguage,
  ReadingMode,
  ReadingV2Result,
  UserConcern,
} from '@/lib/astro/reading/reading-types'
import { applyLanguageTone } from '@/lib/astro/reading/language-transformer'
import { selectReadingMode } from '@/lib/astro/reading/reading-modes'
import { detectPreferredLanguage } from '@/lib/astro/reading/language-style'
import { lintHumanStyle } from '@/lib/astro/reading/style-linter'
import {
  pickOpening,
  pickTopicOpening,
  renderCaution,
  renderClosing,
  renderGuidance,
  renderLikelyExperience,
  renderMainSignal,
  renderTimingHint,
} from '@/lib/astro/reading/templates'

export type HumanReadingInput = {
  concern: UserConcern
  evidence: AstroEvidence[]
  question?: string
  memorySummary?: string
  mode?: ReadingMode
  language?: ReadingLanguage
}

function renderMemoryBridge(memorySummary?: string): string {
  if (!memorySummary) return ''

  return `From the earlier context, I would keep this in mind: ${memorySummary}`
}

function renderEmptyEvidenceReading(concern: UserConcern): string {
  const opening = pickOpening(concern)
  const topicOpening = pickTopicOpening(concern.topic)
  const closing = renderClosing(concern)

  return lintHumanStyle([opening, topicOpening, closing].filter(Boolean).join('\n\n'))
}

export function generateHumanReading(input: HumanReadingInput): string {
  const visibleEvidence = input.evidence.filter((item) => item.visibleToUser)

  if (visibleEvidence.length === 0) {
    return renderEmptyEvidenceReading(input.concern)
  }

  const opening = pickOpening(input.concern)
  const topicOpening = pickTopicOpening(input.concern.topic)
  const memoryBridge = renderMemoryBridge(input.memorySummary)
  const mainSignal = renderMainSignal(visibleEvidence)
  const experience = renderLikelyExperience(visibleEvidence)
  const timingHint = renderTimingHint(visibleEvidence)
  const guidance = renderGuidance(visibleEvidence)
  const caution = renderCaution(visibleEvidence)
  const closing = renderClosing(input.concern)

  const raw = [
    opening,
    topicOpening,
    memoryBridge,
    mainSignal,
    experience,
    timingHint,
    guidance,
    caution,
    closing,
  ]
    .filter(Boolean)
    .join('\n\n')

  return applyLanguageTone({
    text: lintHumanStyle(raw),
    language: input.language ?? detectPreferredLanguage(input.question ?? ''),
  })
}

export function generateHumanReadingResult(
  input: HumanReadingInput,
): ReadingV2Result {
  const mode = input.mode ?? selectReadingMode(input.concern)
  const language = input.language ?? detectPreferredLanguage(input.question ?? '')
  const answer = generateHumanReading({
    ...input,
    mode,
    language,
  })

  return {
    answer,
    meta: {
      version: 'v2',
      topic: input.concern.topic,
      mode,
      language,
      evidenceCount: input.evidence.length,
    },
  }
}
