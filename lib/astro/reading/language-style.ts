import type { ReadingLanguage } from '@/lib/astro/reading/reading-types'

const HINGLISH_WORDS = [
  'kya',
  'kab',
  'kaise',
  'shaadi',
  'shadi',
  'naukri',
  'paisa',
  'upay',
  'kundli',
  'dasha',
]

export function detectPreferredLanguage(message: string): ReadingLanguage {
  if (/[अ-ह]/.test(message)) return 'hindi'
  if (/[অ-হ]/.test(message)) return 'bengali'

  const lower = message.toLowerCase()

  if (HINGLISH_WORDS.some((word) => lower.includes(word))) {
    return 'hinglish'
  }

  return 'english'
}

export function getLanguageInstruction(language: ReadingLanguage): string {
  switch (language) {
    case 'hinglish':
      return 'Use simple Hinglish phrasing while keeping the meaning clear.'
    case 'hindi':
      return 'Use simple Hindi phrasing where possible.'
    case 'bengali':
      return 'Use simple Bengali phrasing where possible.'
    case 'english':
    default:
      return 'Use clear, natural English.'
  }
}
