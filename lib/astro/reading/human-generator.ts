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
import { getChartProfileForTopic } from '@/lib/astro/reading/chart-anchors'
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

function extractDatePhrase(question: string): string | undefined {
  const monthMatch = question.match(
    /\b(\d{1,2}(st|nd|rd|th)?\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}\b/i,
  )
  if (monthMatch) return monthMatch[0]

  if (/\btomorrow\b/i.test(question)) return 'tomorrow'
  if (/\btoday\b/i.test(question)) return 'today'

  return undefined
}

function hasAnyText(question: string, phrases: string[]): boolean {
  const lower = question.toLowerCase()
  return phrases.some((phrase) => lower.includes(phrase.toLowerCase()))
}

function echoQuestionKeyword(question?: string): string {
  if (!question) return ''

  const lower = question.toLowerCase()
  const keywords = [
    'business',
    'exam',
    'salary',
    'promotion',
    'job',
    'career',
    'work',
    'relationship',
    'marriage',
    'money',
    'sleep',
    'remedy',
    'naukri',
    'কাজ',
    'काम',
  ]

  const match = keywords.find((keyword) => lower.includes(keyword))
  return match ? ` ${match}` : ''
}

function buildOpening(concern: UserConcern, question?: string): string {
  const datePhrase = question ? extractDatePhrase(question) : undefined
  const questionSnippet = question ? `Question focus: ${question.trim()}.` : ''

  if (concern.topic === 'career') {
    return datePhrase
      ? `You are asking about ${datePhrase} and your career${echoQuestionKeyword(question)}. I would read this as a work-and-progress question first. ${questionSnippet}`
      : `You are asking about career progress${echoQuestionKeyword(question)}, so I would focus on work, effort, timing, and practical next steps. ${questionSnippet}`
  }

  if (concern.topic === 'money') {
    return datePhrase
      ? `You are asking about ${datePhrase} and money${echoQuestionKeyword(question)}. I would read this as a financial timing question first. ${questionSnippet}`
      : `You are asking about money${echoQuestionKeyword(question)}, so the useful answer is about stability, planning, and cash-flow discipline. ${questionSnippet}`
  }

  if (concern.topic === 'relationship' || concern.topic === 'marriage') {
    return datePhrase
      ? `You are asking about ${datePhrase} and your relationship or marriage${echoQuestionKeyword(question)}. I would read this as a timing-and-connection question first. ${questionSnippet}`
      : `You are asking about a relationship or marriage${echoQuestionKeyword(question)}, so the useful answer is about consistency, clarity, and emotional steadiness. ${questionSnippet}`
  }

  if (concern.topic === 'education') {
    return `You are asking about education${echoQuestionKeyword(question)}, so the useful answer is about study, preparation, and the right environment. ${questionSnippet}`
  }

  if (concern.topic === 'health') {
    return `You are asking about health or wellbeing, so I will keep this safe, practical, and non-diagnostic. ${questionSnippet}`
  }

  if (concern.topic === 'death') {
    return `You are asking about death or lifespan, so I will keep this safe and refuse to make a fatal prediction. ${questionSnippet}`
  }

  if (concern.questionType === 'timing') {
    return datePhrase
      ? `You are asking about ${datePhrase}${echoQuestionKeyword(question)}, so I will keep this focused on timing and what to prepare for. ${questionSnippet}`
      : `You are asking about timing${echoQuestionKeyword(question)}, so I will keep this focused on when, how long, and what to prepare for. ${questionSnippet}`
  }

  if (concern.questionType === 'remedy' || concern.topic === 'remedy') {
    return `You are asking for a remedy, so I will keep this safe, practical, and not fear-based. ${questionSnippet}`
  }

  return `You are asking for guidance on a specific situation${echoQuestionKeyword(question)}, so I will keep the answer focused and practical. ${questionSnippet}`
}

function buildChartBasis(concern: UserConcern, question?: string): string {
  const profile = getChartProfileForTopic(concern.subtopic ?? concern.topic)
  if (!profile) {
    return 'Chart basis: I am using the chart patterns available in the reading, with uncertainty where the evidence is broad.'
  }

  const anchors = profile.mustUseAnchors.slice(0, 4).join(', ')
  const timing = concern.questionType === 'timing' || /tomorrow|today|when|date|month/i.test(question ?? '')
    ? 'Timing is a tendency reading, not a guaranteed event.'
    : 'This is a tendency reading, not a fixed fate claim.'

  return `Chart basis: ${profile.coreLogic} Key anchors: ${anchors}. ${timing}`
}

function shouldRenderTopicBlock(topic: string, concern: UserConcern): boolean {
  if (topic === concern.topic) return true
  if (topic === 'health' && concern.topic === 'death') return true
  if (topic === 'career' && concern.topic === 'remedy') return true
  return false
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

  const opening = buildOpening(input.concern, input.question)
  const topicOpening = shouldRenderTopicBlock(input.concern.topic, input.concern)
    ? pickTopicOpening(input.concern.topic)
    : ''
  const memoryBridge = renderMemoryBridge(input.memorySummary)
  const mainSignal = renderMainSignal(visibleEvidence)
  const experience = renderLikelyExperience(visibleEvidence)
  const timingHint =
    input.concern.questionType === 'timing' || hasAnyText(input.question ?? '', ['when', 'tomorrow', 'today', 'month', 'date'])
      ? renderTimingHint(visibleEvidence)
      : ''
  const guidance = renderGuidance(visibleEvidence)
  const caution = renderCaution(visibleEvidence)
  const chartBasis = buildChartBasis(input.concern, input.question)
  const dashaSignal = visibleEvidence.some((item) =>
    /saturn|shani/i.test(`${item.factor} ${item.humanMeaning} ${item.likelyExperience} ${item.guidance}`),
  )
    ? 'Dasha note: Saturn is part of the evidence, so responsibility, delay, and disciplined effort matter here.'
    : ''
  const accuracyLine = input.concern.topic === 'health' || input.concern.topic === 'death'
    ? 'Accuracy: this is supportive reflection only, not diagnosis or lifespan prediction.'
    : 'Accuracy: partially accurate as a chart-based tendency, not a guaranteed outcome.'
  const followUpQuestion = input.concern.topic === 'career'
    ? 'Suggested follow-up: Which part matters most - role, boss, visibility, or income?'
    : input.concern.questionType === 'timing'
      ? 'Suggested follow-up: Which time window do you want me to anchor - today, tomorrow, 2026, or 2027?'
      : 'Suggested follow-up: Which sub-area should I narrow next?'
  const closing = renderClosing(input.concern)

  const raw = [
    opening,
    topicOpening,
    memoryBridge,
    mainSignal,
    experience,
    chartBasis,
    timingHint,
    guidance,
    caution,
    dashaSignal,
    accuracyLine,
    followUpQuestion,
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
