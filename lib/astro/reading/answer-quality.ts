export type AstroAnswerQualityCase = {
  question: string
  expectedTopic: string
  expectedMode?: string
  expectedMustIncludeAny: string[]
  expectedMustIncludeAnchors?: string[]
  expectedMustNotIncludeAny: string[]
  allowMedicalBoundary?: boolean
  allowLegalBoundary?: boolean
  allowDeathBoundary?: boolean
  allowMonthly?: boolean
  allowRemedy?: boolean
  expectedAccuracy?: 'Totally accurate' | 'Partially accurate' | 'Inaccurate'
  expectedExactFact?: boolean
  expectedMustIncludeAll?: string[]
  expectedMustNotIncludeAll?: string[]
}

export type AstroAnswerQualityResult = {
  passed: boolean
  failures: string[]
  score: number
}

export function normalizeAnswerForSimilarity(answer: string): string {
  return answer
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s:.-]/g, '')
    .trim()
}

export function normalizeAstroFactText(text: string): string {
  return normalizeAnswerForSimilarity(text)
    .replace(/\b(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\b/g, '$1')
}

export function extractExpectedFactTokens(value: string): string[] {
  return normalizeAstroFactText(value)
    .split(' ')
    .filter((token) => token.length > 1)
}

export function evaluateExactFactAnswer(input: {
  expectedAnswer: string
  answer: string
}) {
  const expected = normalizeAstroFactText(input.expectedAnswer)
  const actual = normalizeAstroFactText(input.answer)
  return actual.includes(expected) || extractExpectedFactTokens(input.expectedAnswer).every((token) => actual.includes(token))
}

export function evaluateInterpretiveAnswer(input: { answer: string; expectedMustIncludeAny: string[] }) {
  const lower = normalizeAstroFactText(input.answer)
  return input.expectedMustIncludeAny.some((term) => lower.includes(normalizeAstroFactText(term))) && /(tendency|likely|can|may|could|suggests|shows)/i.test(input.answer)
}

export function evaluateInaccurateAnswer(input: { answer: string }) {
  const lower = normalizeAstroFactText(input.answer)
  return /(cannot|can't|not reliable|uncertain|cannot reliably|cannot determine|not possible)/i.test(lower)
}

export function getAnswerSimilarityKey(answer: string): string {
  return normalizeAnswerForSimilarity(answer).slice(0, 260)
}

export function evaluateAstroAnswerQuality(input: {
  testCase: AstroAnswerQualityCase
  answer: string
  meta?: Record<string, unknown>
}): AstroAnswerQualityResult {
  const failures: string[] = []
  const answer = input.answer ?? ''
  const lower = answer.toLowerCase()
  const meta = input.meta ?? {}

  if (answer.trim().length < 120 && !input.testCase.allowMedicalBoundary && !input.testCase.allowLegalBoundary && !input.testCase.allowDeathBoundary) {
    failures.push('answer_too_short')
  }

  if (!input.testCase.expectedMustIncludeAny.some((term) => lower.includes(term.toLowerCase()))) {
    failures.push('missing_required_topic_term')
  }

  if (input.testCase.expectedMustIncludeAll?.length) {
    for (const term of input.testCase.expectedMustIncludeAll) {
      if (!lower.includes(term.toLowerCase())) failures.push(`missing_required_term:${term}`)
    }
  }

  if (input.testCase.expectedMustNotIncludeAll?.length) {
    for (const term of input.testCase.expectedMustNotIncludeAll) {
      if (term && lower.includes(term.toLowerCase())) failures.push(`contains_banned:${term}`)
    }
  }

  if (input.testCase.expectedMustIncludeAnchors?.length) {
    const anchorHit = input.testCase.expectedMustIncludeAnchors.some((term) =>
      lower.includes(term.toLowerCase()),
    )
    if (!anchorHit) failures.push('missing_chart_anchor')
  }

  for (const term of input.testCase.expectedMustNotIncludeAny) {
    if (term && lower.includes(term.toLowerCase())) failures.push(`contains_banned:${term}`)
  }

  if (!input.testCase.allowMonthly && /monthly guidance|month ahead|this month/i.test(lower)) {
    failures.push('unexpected_monthly_block')
  }

  if (!input.testCase.allowRemedy && /remedy|upay|mantra|gemstone/i.test(lower) && !/remedy/i.test(input.testCase.question.toLowerCase())) {
    failures.push('unexpected_remedy_block')
  }

  if (!input.testCase.allowMedicalBoundary && /doctor|medical|diagnos|hospital/i.test(lower) && !/health|sleep|symptom/i.test(input.testCase.question.toLowerCase())) {
    failures.push('unexpected_medical_boundary')
  }

  if (!input.testCase.allowLegalBoundary && /lawyer|legal|attorney|court case guarantee/i.test(lower)) {
    failures.push('unexpected_legal_boundary')
  }

  if (!input.testCase.allowDeathBoundary && /when will i die|lifespan|death date|predict death/i.test(lower)) {
    failures.push('unexpected_death_boundary')
  }

  if (typeof meta.topic === 'string' && meta.topic !== input.testCase.expectedTopic) {
    failures.push(`meta_topic_mismatch:${String(meta.topic)}`)
  }

  if (input.testCase.expectedAccuracy && typeof meta.accuracyClass === 'string' && meta.accuracyClass !== input.testCase.expectedAccuracy) {
    failures.push(`meta_accuracy_mismatch:${String(meta.accuracyClass)}`)
  }

  const score = Math.max(0, 1 - failures.length * 0.15)
  return { passed: failures.length === 0, failures, score }
}
