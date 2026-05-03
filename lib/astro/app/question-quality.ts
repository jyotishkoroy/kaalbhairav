/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type QuestionQualityResult = {
  normalizedQuestion: string
  warnings: string[]
  suspectedMisspellings: string[]
}

// Safe, well-known misspelling corrections — only when unambiguous
const SAFE_CORRECTIONS: Array<[RegExp, string, string]> = [
  [/\bcarreer\b/gi, 'carreer', 'career'],
  [/\bcarreers\b/gi, 'carreers', 'careers'],
  [/\bmarrage\b/gi, 'marrage', 'marriage'],
  [/\bmariage\b/gi, 'mariage', 'marriage'],
  [/\bmarrege\b/gi, 'marrege', 'marriage'],
  [/\bmarraiage\b/gi, 'marraiage', 'marriage'],
  [/\bbussiness\b/gi, 'bussiness', 'business'],
  [/\bbusiness\b/gi, 'business', 'business'], // already correct — no-op
  [/\bfinanc\b(?!e|i|ing|ed|er|al)/gi, 'financ', 'finance'],
  [/\brelashionship\b/gi, 'relashionship', 'relationship'],
  [/\brelationshp\b/gi, 'relationshp', 'relationship'],
  [/\brelationhip\b/gi, 'relationhip', 'relationship'],
  [/\bhealt\b(?!h)/gi, 'healt', 'health'],
  [/\bpromotoin\b/gi, 'promotoin', 'promotion'],
  [/\bpromoton\b/gi, 'promoton', 'promotion'],
  [/\bprfession\b/gi, 'prfession', 'profession'],
  [/\bprofesion\b/gi, 'profesion', 'profession'],
  // Vedic/astrology terms
  [/\blagn\b(?!a)/gi, 'lagn', 'lagna'],
  [/\bnaakshatra\b/gi, 'naakshatra', 'nakshatra'],
  [/\bnakshatr\b(?!a)/gi, 'nakshatr', 'nakshatra'],
  [/\bmahadash\b(?!a)/gi, 'mahadash', 'mahadasha'],
  [/\bantardash\b(?!a)/gi, 'antardash', 'antardasha'],
  [/\braahu\b/gi, 'raahu', 'rahu'],
  [/\bketuu\b/gi, 'ketuu', 'ketu'],
  [/\bshanee\b/gi, 'shanee', 'shani'],
  [/\bshhanee\b/gi, 'shhanee', 'shani'],
  [/\bmaangal\b/gi, 'maangal', 'mangal'],
  [/\bbuddha\b(?!\s*purnima|\s*jayanti)/gi, 'buddha', 'budha'],
  [/\bshukraa\b/gi, 'shukraa', 'shukra'],
  [/\bsuriya\b/gi, 'suriya', 'surya'],
  [/\bchander\b/gi, 'chander', 'chandra'],
  [/\bchandar\b/gi, 'chandar', 'chandra'],
  [/\bkundalee\b/gi, 'kundalee', 'kundali'],
  [/\bkundlee\b/gi, 'kundlee', 'kundali'],
]

export function analyzeQuestionQuality(question: string): QuestionQualityResult {
  const warnings: string[] = []
  const suspectedMisspellings: string[] = []
  let normalized = question

  for (const [pattern, original, correction] of SAFE_CORRECTIONS) {
    if (original === correction) continue // no-op entries
    if (pattern.test(normalized)) {
      // Find original casing in normalized string
      const match = normalized.match(pattern)
      if (match) {
        const found = match[0]
        normalized = normalized.replace(pattern, correction)
        suspectedMisspellings.push(`${found} → ${correction}`)
        warnings.push(`I interpreted "${found}" as "${correction}".`)
      }
    }
  }

  return { normalizedQuestion: normalized, warnings, suspectedMisspellings }
}
