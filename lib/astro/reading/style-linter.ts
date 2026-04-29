const STYLE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bBased on the data provided\b/gi, 'What I am seeing here'],
  [/\baccording to the information provided\b/gi, 'from what is visible here'],
  [/\bas an AI\b/gi, ''],
  [/\bI am an AI\b/gi, ''],
  [/\bIn conclusion\b/gi, 'So my honest reading is'],
  [/\bIt is important to note\b/gi, 'I would be careful about one thing'],
  [/\bHere are the key insights\b/gi, 'The first thing that stands out'],
]

const FORBIDDEN_STYLE_PHRASES = [
  'as an ai',
  'based on the data provided',
  'according to the information provided',
  'here are the key insights',
]

export function lintHumanStyle(text: string): string {
  const replaced = STYLE_REPLACEMENTS.reduce((current, [pattern, replacement]) => {
    return current.replace(pattern, replacement)
  }, text)

  return replaced
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function containsAiStylePhrase(text: string): boolean {
  const lower = text.toLowerCase()

  return FORBIDDEN_STYLE_PHRASES.some((phrase) => lower.includes(phrase))
}

export function getForbiddenStylePhrases(): string[] {
  return [...FORBIDDEN_STYLE_PHRASES]
}
