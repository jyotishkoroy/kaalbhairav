import type { ReadingMode, UserConcern } from '@/lib/astro/reading/reading-types'

export function selectReadingMode(concern: UserConcern): ReadingMode {
  if (concern.questionType === 'remedy') return 'remedy_focused'
  if (concern.questionType === 'timing') return 'timing_prediction'
  if (concern.wantsPracticalSteps || concern.questionType === 'decision') {
    return 'practical_guidance'
  }

  if (concern.wantsTechnicalAstrology) return 'deep_astrology'

  if (concern.needsReassurance) return 'short_comfort'

  return 'human_conversation'
}

export function getModeInstruction(mode: ReadingMode): string {
  switch (mode) {
    case 'short_comfort':
      return 'Keep the reading brief, reassuring, and grounded.'
    case 'deep_astrology':
      return 'Include a little more astrological reasoning without dumping technical data.'
    case 'practical_guidance':
      return 'Prioritize clear next steps and practical decision-making.'
    case 'timing_prediction':
      return 'Discuss timing as probability and preparation, not certainty.'
    case 'remedy_focused':
      return 'Give safe, simple, non-fear-based remedy guidance.'
    case 'human_conversation':
    default:
      return 'Use a natural conversational astrologer tone.'
  }
}
