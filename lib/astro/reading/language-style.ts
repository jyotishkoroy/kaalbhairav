/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import emotionalLanguageData from '@/data/astro/emotional-language.json'
import type {
  ReadingLanguage,
  ReadingStyle,
  UserConcern,
} from '@/lib/astro/reading/reading-types'

export type EmotionalLanguagePack = {
  softeners: string[]
  delayNotDenial: string
  practicalReminder: string
  remedyBoundary: string
}

const EMOTIONAL_LANGUAGE = emotionalLanguageData as Record<
  ReadingLanguage,
  EmotionalLanguagePack
>

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
  'job kab',
  'career kab',
  'mujhe',
  'mera',
  'meri',
  'hoga',
  'hogi',
  'karu',
  'karun',
  'hai',
]

const HINDI_SCRIPT_PATTERN = /[अ-ह]/
const BENGALI_SCRIPT_PATTERN = /[অ-হ]/

export function detectPreferredLanguage(message: string): ReadingLanguage {
  if (HINDI_SCRIPT_PATTERN.test(message)) return 'hindi'
  if (BENGALI_SCRIPT_PATTERN.test(message)) return 'bengali'

  const lower = message.toLowerCase()

  if (HINGLISH_WORDS.some((word) => lower.includes(word))) {
    return 'hinglish'
  }

  return 'english'
}

export function getEmotionalLanguagePack(
  language: ReadingLanguage,
): EmotionalLanguagePack {
  return EMOTIONAL_LANGUAGE[language] ?? EMOTIONAL_LANGUAGE.english
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

export function getReadingStyleForConcern(
  concern: UserConcern,
): ReadingStyle {
  const needsSoftness =
    concern.needsReassurance ||
    concern.emotionalTone === 'sad' ||
    concern.emotionalTone === 'anxious' ||
    concern.emotionalTone === 'confused'

  return {
    warmth: needsSoftness ? 8 : 6,
    technicalDepth: concern.wantsTechnicalAstrology ? 7 : 3,
    directness:
      concern.questionType === 'decision' || concern.emotionalTone === 'urgent'
        ? 8
        : 6,
    reassurance: needsSoftness ? 8 : 5,
    spiritualTone:
      concern.topic === 'spirituality' || concern.questionType === 'remedy'
        ? 7
        : 4,
  }
}

export function getToneInstruction(input: {
  language: ReadingLanguage
  concern: UserConcern
}): string {
  const style = getReadingStyleForConcern(input.concern)
  const languageInstruction = getLanguageInstruction(input.language)

  return [
    languageInstruction,
    `Tone: warmth ${style.warmth}/10, technical depth ${style.technicalDepth}/10, directness ${style.directness}/10, reassurance ${style.reassurance}/10, spiritual tone ${style.spiritualTone}/10.`,
  ].join(' ')
}

export function localizeSupportiveLine(input: {
  language: ReadingLanguage
  key: keyof EmotionalLanguagePack
}): string {
  const pack = getEmotionalLanguagePack(input.language)
  const value = pack[input.key]

  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value
}

export function pickLocalizedSoftener(language: ReadingLanguage): string {
  const pack = getEmotionalLanguagePack(language)

  return pack.softeners[0] ?? ''
}
