import type {
  EmotionalTone,
  QuestionType,
  UserConcern,
} from '@/lib/astro/reading/reading-types'
import type { ReadingTopic } from '@/lib/astro/interpretation/evidence'

const TOPIC_KEYWORDS: Record<ReadingTopic, string[]> = {
  career: [
    'career',
    'job',
    'work',
    'promotion',
    'salary',
    'business',
    'office',
    'boss',
    'manager',
    'startup',
    'client',
    'interview',
    'switch job',
    'change job',
    'naukri',
    'kaam',
    'profession',
  ],
  marriage: [
    'marriage',
    'married',
    'shaadi',
    'shadi',
    'spouse',
    'husband',
    'wife',
    'wedding',
    'proposal',
    'rishta',
    'vivah',
  ],
  relationship: [
    'relationship',
    'love',
    'breakup',
    'ex',
    'partner',
    'girlfriend',
    'boyfriend',
    'crush',
    'continue',
    'move on',
    'patch up',
    'dating',
  ],
  money: [
    'money',
    'finance',
    'financial',
    'income',
    'loan',
    'debt',
    'wealth',
    'profit',
    'loss',
    'investment',
    'cash',
    'paisa',
    'earning',
  ],
  health: [
    'health',
    'disease',
    'illness',
    'doctor',
    'medical',
    'sick',
    'hospital',
    'pain',
    'symptom',
    'pregnant',
    'pregnancy',
    'cancer',
    'depression',
    'anxiety',
  ],
  family: ['family', 'mother', 'father', 'parents', 'sibling', 'brother', 'sister', 'child', 'children', 'home', 'ghar'],
  education: ['education', 'study', 'studies', 'exam', 'college', 'school', 'degree', 'course', 'student', 'marks', 'result', 'admission'],
  spirituality: ['spiritual', 'spirituality', 'god', 'mantra', 'puja', 'pooja', 'meditation', 'karma', 'dharma', 'sadhana', 'moksha'],
  remedy: ['remedy', 'remedies', 'upay', 'solution', 'mantra', 'gemstone', 'stone', 'puja', 'pooja', 'donation', 'fast', 'vrat', 'what should i do'],
  death: ['death', 'die', 'lifespan', 'life span', 'when will i die', 'will i die', 'death date', 'longevity'],
  general: [],
}

const TIMING_WORDS = ['when', 'kab', 'date', 'month', 'monthly', 'this month', 'next month', 'year', 'time', 'period', 'phase', 'how long', 'by when', 'will it happen']

const YES_NO_WORDS = ['will i', 'will my', 'can i', 'can my', 'do i', 'does my', 'is there', 'am i']

const DECISION_WORDS = ['should i', 'continue', 'move on', 'leave', 'change', 'switch', 'start', 'stop', 'accept', 'reject', 'choose', 'decide']

const EXPLANATION_WORDS = ['why', 'reason', 'explain', 'understand', 'meaning', 'what is happening']

const REMEDY_WORDS = ['remedy', 'remedies', 'upay', 'solution', 'mantra', 'puja', 'pooja', 'gemstone', 'stone', 'donation', 'fast', 'vrat', 'what should i do']

const SAD_WORDS = ['tired', 'hopeless', 'sad', 'crying', 'lonely', 'alone', 'exhausted', 'waiting', 'broken', 'hurt']

const ANXIOUS_WORDS = ['anxious', 'anxiety', 'worried', 'worry', 'scared', 'fear', 'afraid', 'panic', 'pressure', 'stress', 'stressed', 'tension']

const ANGRY_WORDS = ['angry', 'anger', 'frustrated', 'irritated', 'fed up', 'unfair']

const CONFUSED_WORDS = ['confused', 'confusion', 'unclear', 'stuck', 'lost', "don't know", 'dont know', 'not sure', 'doubt']

const HOPEFUL_WORDS = ['hope', 'hopeful', 'possible', 'chance', 'improve', 'better', 'success']

const URGENT_WORDS = ['urgent', 'now', 'immediately', 'today', 'tomorrow', 'asap', 'right now']

const TECHNICAL_ASTRO_WORDS = ['dasha', 'mahadasha', 'antardasha', 'transit', 'gochar', 'lagna', 'rashi', 'rasi', 'nakshatra', 'house', 'planet', 'yoga', 'aspect', 'degree', 'chart', 'kundli', 'kundali', 'navamsa', 'd9', 'ashtakvarga', 'shadbala']

const PRACTICAL_WORDS = ['what should i do', 'next step', 'advice', 'guide', 'guidance', 'practical', 'action', 'decision', 'help me', 'how to', 'solution']

const HIGH_RISK_PATTERNS: Array<[string, RegExp]> = [
  ['self_harm', /\b(suicide|kill myself|end my life|self harm|self-harm)\b/i],
  ['death_prediction', /\b(death date|when will i die|when i will die|will i die|lifespan|life span|longevity)\b/i],
  ['medical_diagnosis', /\b(cancer|serious disease|diagnose|pregnant|pregnancy|medical|hospital|doctor)\b/i],
  ['legal_certainty', /\b(court|case|jail|prison|legal|lawsuit|police)\b/i],
  ['fear_based', /\b(cursed|black magic|evil eye|never marry|doomed)\b/i],
]

function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAny(message: string, words: string[]): boolean {
  return words.some((word) => message.includes(word))
}

function countMatches(message: string, words: string[]): number {
  return words.reduce((count, word) => {
    return message.includes(word) ? count + 1 : count
  }, 0)
}

export function detectTopic(message: string): ReadingTopic {
  const lower = normalizeMessage(message)

  if (includesAny(lower, TOPIC_KEYWORDS.death)) return 'death'

  const scores = Object.entries(TOPIC_KEYWORDS)
    .filter(([topic]) => topic !== 'general' && topic !== 'death')
    .map(([topic, words]) => ({
      topic: topic as ReadingTopic,
      score: countMatches(lower, words),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scores.length === 0) return 'general'

  const top = scores[0]

  if (!top) return 'general'

  if (top.topic === 'relationship' && includesAny(lower, TOPIC_KEYWORDS.marriage) && !includesAny(lower, ['breakup', 'ex', 'move on', 'girlfriend', 'boyfriend'])) {
    return 'marriage'
  }

  if (top.topic === 'relationship' && includesAny(lower, TOPIC_KEYWORDS.family)) {
    return 'family'
  }

  if (top.topic === 'remedy' && includesAny(lower, TOPIC_KEYWORDS.career) && !includesAny(lower, ['remedy', 'remedies', 'upay'])) {
    return 'career'
  }

  return top.topic
}

export function detectQuestionType(message: string): QuestionType {
  const lower = normalizeMessage(message)

  if (includesAny(lower, REMEDY_WORDS)) return 'remedy'
  if (includesAny(lower, DECISION_WORDS)) return 'decision'
  if (includesAny(lower, TIMING_WORDS)) return 'timing'
  if (includesAny(lower, EXPLANATION_WORDS)) return 'explanation'
  if (includesAny(lower, YES_NO_WORDS)) return 'yes_no'

  return 'general_prediction'
}

export function detectEmotionalTone(message: string): EmotionalTone {
  const lower = normalizeMessage(message)

  if (includesAny(lower, URGENT_WORDS)) return 'urgent'
  if (includesAny(lower, SAD_WORDS)) return 'sad'
  if (includesAny(lower, ANGRY_WORDS)) return 'angry'
  if (includesAny(lower, CONFUSED_WORDS)) return 'confused'
  if (includesAny(lower, ANXIOUS_WORDS)) return 'anxious'
  if (includesAny(lower, HOPEFUL_WORDS)) return 'hopeful'

  return 'calm'
}

export function detectsTechnicalRequest(message: string): boolean {
  return includesAny(normalizeMessage(message), TECHNICAL_ASTRO_WORDS)
}

export function detectsPracticalNeed(message: string): boolean {
  const lower = normalizeMessage(message)

  return includesAny(lower, PRACTICAL_WORDS) || detectQuestionType(lower) === 'decision' || detectQuestionType(lower) === 'remedy'
}

export function detectsMonthlyGuidanceRequest(message: string): boolean {
  const lower = normalizeMessage(message)

  return (
    lower.includes('this month') ||
    lower.includes('monthly guidance') ||
    lower.includes('month guidance') ||
    lower.includes('guidance for this month') ||
    lower.includes('what should i do this month') ||
    lower.includes('how is this month')
  )
}

export function detectHighRiskFlags(message: string): string[] {
  return HIGH_RISK_PATTERNS.filter(([, pattern]) => pattern.test(message)).map(([flag]) => flag)
}

export function classifyUserConcern(message: string): UserConcern {
  const lower = normalizeMessage(message)
  const topic = detectTopic(lower)
  const emotionalTone = detectEmotionalTone(lower)
  const questionType = detectQuestionType(lower)
  const highRiskFlags = detectHighRiskFlags(lower)

  return {
    topic,
    emotionalTone,
    questionType,
    needsReassurance: ['anxious', 'sad', 'urgent', 'confused'].includes(emotionalTone) || highRiskFlags.length > 0,
    wantsTechnicalAstrology: detectsTechnicalRequest(lower),
    wantsPracticalSteps: detectsPracticalNeed(lower),
    highRiskFlags,
  }
}
