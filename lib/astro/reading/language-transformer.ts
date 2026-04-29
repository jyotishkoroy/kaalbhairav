import type { ReadingLanguage } from '@/lib/astro/reading/reading-types'
import {
  localizeSupportiveLine,
  pickLocalizedSoftener,
} from '@/lib/astro/reading/language-style'

const ENGLISH_TO_HINGLISH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bThis phase\b/gi, 'Yeh phase'],
  [/\bThis does not look like denial\b/gi, 'Yeh denial jaisa nahi lagta'],
  [/\bdelay\b/gi, 'delay'],
  [/\bpractical guidance\b/gi, 'practical guidance'],
  [/\bBe careful\b/gi, 'Careful rehna'],
  [/\bI would be careful about one thing\b/gi, 'Ek cheez par careful rehna'],
]

export function applyLanguageTone(input: {
  text: string
  language: ReadingLanguage
}): string {
  switch (input.language) {
    case 'hinglish':
      return addLocalizedSupport(
        input.text,
        input.language,
        transformHinglish(input.text),
      )
    case 'hindi':
      return addLocalizedSupport(input.text, input.language, input.text)
    case 'bengali':
      return addLocalizedSupport(input.text, input.language, input.text)
    case 'english':
    default:
      return input.text
  }
}

function transformHinglish(text: string): string {
  return ENGLISH_TO_HINGLISH_REPLACEMENTS.reduce((current, [pattern, value]) => {
    return current.replace(pattern, value)
  }, text)
}

function addLocalizedSupport(
  originalText: string,
  language: ReadingLanguage,
  transformedText: string,
): string {
  if (language === 'english') return transformedText

  const softener = pickLocalizedSoftener(language)
  const delayLine = localizeSupportiveLine({
    language,
    key: 'delayNotDenial',
  })

  const lines = [softener, delayLine, transformedText].filter(Boolean)
  const unique = Array.from(new Set(lines))

  if (unique.join('\n\n').trim() === originalText.trim()) {
    return originalText
  }

  return unique.join('\n\n')
}
