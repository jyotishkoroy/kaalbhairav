export type SafetyRisk = {
  selfHarm: boolean
  medical: boolean
  death: boolean
  legal: boolean
  pregnancy: boolean
  fearBased: boolean
  gemstone: boolean
}

export type SafetyRiskName = keyof SafetyRisk

export type SafetyClassification = {
  risk: SafetyRisk
  riskNames: SafetyRiskName[]
  hasRisk: boolean
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasWord(text: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(text)
}

function hasAnyWord(text: string, words: string[]): boolean {
  return words.some((word) => hasWord(text, word))
}

function hasAnyPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase.toLowerCase()))
}

function hasAnyMatch(
  text: string,
  words: string[],
  phrases: string[] = [],
): boolean {
  return hasAnyWord(text, words) || hasAnyPhrase(text, phrases)
}

const RISK_PATTERNS: Record<
  SafetyRiskName,
  { words: string[]; phrases: string[] }
> = {
  selfHarm: {
    words: ['suicide'],
    phrases: ['kill myself', 'end my life', 'self harm', 'self-harm', 'harm myself'],
  },
  medical: {
    words: [
      'disease',
      'cancer',
      'illness',
      'ill',
      'diagnose',
      'diagnosis',
      'doctor',
      'medical',
      'hospital',
      'symptom',
      'symptoms',
      'treatment',
      'sick',
      'sickness',
      'medicine',
      'medication',
    ],
    phrases: [
      'serious disease',
      'medical condition',
      'health problem',
      'mental health',
      'do i have',
      'am i sick',
      'according to my chart do i have',
    ],
  },
  death: {
    words: ['death', 'die', 'lifespan', 'longevity'],
    phrases: ['life span', 'when will i die', 'death date', 'how long will i live'],
  },
  legal: {
    words: [
      'court',
      'lawsuit',
      'lawyer',
      'attorney',
      'judge',
      'bail',
      'jail',
      'prison',
      'fir',
      'contract',
      'legal',
      'police',
    ],
    phrases: [
      'court case',
      'legal case',
      'police case',
      'win my case',
      'sign this contract',
      'legal notice',
      'property dispute',
    ],
  },
  pregnancy: {
    words: ['pregnant', 'pregnancy', 'conceive', 'miscarriage', 'fertility'],
    phrases: [],
  },
  fearBased: {
    words: ['curse', 'doomed', 'ruined'],
    phrases: ['cursed', 'black magic', 'evil eye', 'never marry'],
  },
  gemstone: {
    words: ['blue sapphire', 'neelam', 'gemstone', 'stone'],
    phrases: ['wear sapphire', 'wear gem'],
  },
}

export function detectSafetyRisk(message: string): SafetyRisk {
  const text = normalizeText(message)

  return {
    selfHarm: hasAnyMatch(
      text,
      RISK_PATTERNS.selfHarm.words,
      RISK_PATTERNS.selfHarm.phrases,
    ),
    medical: hasAnyMatch(
      text,
      RISK_PATTERNS.medical.words,
      RISK_PATTERNS.medical.phrases,
    ),
    death: hasAnyMatch(
      text,
      RISK_PATTERNS.death.words,
      RISK_PATTERNS.death.phrases,
    ),
    legal: hasAnyMatch(
      text,
      RISK_PATTERNS.legal.words,
      RISK_PATTERNS.legal.phrases,
    ),
    pregnancy: hasAnyMatch(
      text,
      RISK_PATTERNS.pregnancy.words,
      RISK_PATTERNS.pregnancy.phrases,
    ),
    fearBased: hasAnyMatch(
      text,
      RISK_PATTERNS.fearBased.words,
      RISK_PATTERNS.fearBased.phrases,
    ),
    gemstone: hasAnyMatch(
      text,
      RISK_PATTERNS.gemstone.words,
      RISK_PATTERNS.gemstone.phrases,
    ),
  }
}

export function classifySafety(message: string): SafetyClassification {
  const risk = detectSafetyRisk(message)
  const riskNames = Object.entries(risk)
    .filter(([, value]) => value)
    .map(([key]) => key as SafetyRiskName)

  return {
    risk,
    riskNames,
    hasRisk: riskNames.length > 0,
  }
}

export function classifySafetyRisk(message: string): SafetyClassification {
  return classifySafety(message)
}
