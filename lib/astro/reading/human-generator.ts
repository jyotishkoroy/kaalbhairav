/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

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
  const cleaned = memorySummary.replace(/\s+/g, ' ').trim()
  if (/previous concern:/i.test(cleaned)) return cleaned.length > 160 ? `${cleaned.slice(0, 157).trimEnd()}...` : cleaned
  return cleaned.length > 160 ? `Earlier context: ${cleaned.slice(0, 149).trimEnd()}...` : `Earlier context: ${cleaned}`
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

function buildOpening(concern: UserConcern, question?: string): string {
  const datePhrase = question ? extractDatePhrase(question) : undefined
  const familyPressure = question && /family.*(marriage|career)|(marriage|career).*(family)/i.test(question)

  if (concern.topic === 'career') {
    if (familyPressure) {
      return 'You are balancing family pressure with career and marriage concerns, so I would keep this grounded in clarity, boundaries, and practical next steps.'
    }
    return datePhrase
      ? `You are asking about ${datePhrase} and your career. I would read this as a work-and-progress question first.`
      : `You are asking about career progress, so I would focus on work, effort, timing, and practical next steps.`
  }

  if (concern.topic === 'money') {
    return datePhrase
      ? `You are asking about ${datePhrase} and money. I would read this as a financial timing question first.`
      : `You are asking about money, so the useful answer is about stability, planning, and cash-flow discipline.`
  }

  if (concern.topic === 'relationship' || concern.topic === 'marriage') {
    return datePhrase
      ? `You are asking about ${datePhrase} and your relationship or marriage. I would read this as a timing-and-connection question first.`
      : `You are asking about a relationship or marriage, so the useful answer is about consistency, clarity, and emotional steadiness.`
  }

  if (concern.topic === 'education') {
    return `You are asking about education, so the useful answer is about study, preparation, and the right environment.`
  }

  if (concern.topic === 'health') {
    return `You are asking about health or wellbeing, so I will keep this safe, practical, and non-diagnostic.`
  }

  if (concern.topic === 'death') {
    return `You are asking about death or lifespan, so I will keep this safe and refuse to make a fatal prediction.`
  }

  if (concern.questionType === 'timing') {
    return datePhrase
      ? `You are asking about ${datePhrase}, so I will keep this focused on timing and what to prepare for.`
      : `You are asking about timing, so I will keep this focused on when, how long, and what to prepare for.`
  }

  if (concern.questionType === 'remedy' || concern.topic === 'remedy') {
    return `You are asking for a remedy, so I will keep this safe, practical, and not fear-based.`
  }

  return `You are asking for guidance on a specific situation, so I will keep the answer focused and practical.`
}

function dedupeAdjacentWords(text: string): string {
  return text.split(/\s+/).reduce<string[]>((acc, word) => {
    const prev = acc[acc.length - 1]
    if (prev && prev.toLowerCase() === word.toLowerCase()) return acc
    acc.push(word)
    return acc
  }, []).join(' ')
}

function dedupeRepeatedLines(text: string): string {
  const lines = text.split('\n\n').map((line) => line.trim()).filter(Boolean)
  const output: string[] = []
  for (const line of lines) {
    if (output.includes(line)) continue
    output.push(line)
  }
  return output.join('\n\n')
}

function buildChartBasis(concern: UserConcern, question?: string): string {
  const profile = getChartProfileForTopic(concern.subtopic ?? concern.topic)
  if (!profile) {
    return 'What I can safely anchor this to: the chart patterns available in the reading, with uncertainty where the evidence is broad.'
  }

  const anchors = profile.mustUseAnchors.slice(0, 4).join(', ')
  const timing = concern.questionType === 'timing' || /tomorrow|today|when|date|month/i.test(question ?? '')
    ? 'Timing is a tendency reading, not a guaranteed event.'
    : 'This is a tendency reading, not a fixed fate claim.'

  return `What I can safely anchor this to: ${profile.coreLogic} The main anchors are ${anchors}. ${timing}`
}

function shouldRenderTopicBlock(topic: string, concern: UserConcern): boolean {
  if (topic === concern.topic) return true
  if (topic === 'health' && concern.topic === 'death') return true
  if (topic === 'career' && concern.topic === 'remedy') return true
  return false
}

function buildSpecificityLine(question: string | undefined, concern: UserConcern): string {
  const text = (question ?? '').toLowerCase()

  if (/identity, personality, core temperament/i.test(text)) {
    return 'Identity questions should separate temperament from behavior, so the answer should distinguish inner pattern from outer action.'
  }

  if (concern.topic === 'career') {
    if (/(promotion|promote|increment)/i.test(text)) return 'This is a promotion question, so the answer should center on responsibility, visibility, and recognition.'
    if (/(salary|pay|income)/i.test(text)) return 'This is an income question, so the answer should center on earnings growth, leverage, and proof of output.'
    if (/(business|job|startup|office)/i.test(text)) return 'This is a work-choice question, so the answer should compare stability, ownership, and execution style.'
    if (/(foreign company|abroad company|multinational)/i.test(text)) return 'This is a work-mobility question, so the answer should weigh networks, adaptation, and practical timing.'
  }

  if (concern.topic === 'money') {
    if (/(debt|loan)/i.test(text)) return 'This is a debt question, so the answer should focus on repayment structure and expense control.'
    if (/(investment|profit|stock)/i.test(text)) return 'This is a finance-growth question, so the answer should stress discipline before speculation.'
    return 'This is a cash-flow question, so the answer should separate income, savings, and leakage.'
  }

  if (/business, contracts, legal/i.test(text)) {
    if (/(contract|agreement)/i.test(text)) return 'Contract questions should focus on terms, documentation, and what can be verified in writing.'
    if (/(court|case|lawsuit)/i.test(text)) return 'Legal-conflict questions should focus on evidence, process, and realistic boundaries.'
    return 'Business and legal questions should separate opportunity from enforceable details.'
  }

  if (/money, income, wealth/i.test(text)) {
    if (/(debt|loan)/i.test(text)) return 'Debt questions should focus on repayment structure, expense leakage, and realistic sequencing.'
    if (/(salary|income|wealth)/i.test(text)) return 'Income questions should focus on earning structure, timing, and savings discipline.'
    return 'Money questions should separate cash flow from wishful thinking.'
  }

  if (concern.topic === 'education') {
    if (/(exam|test|result)/i.test(text)) return 'This is an exam question, so the answer should center on preparation, recall, and consistency.'
    return 'This is a study question, so the answer should focus on structure, repetition, and retention.'
  }

  if (concern.topic === 'relationship' || concern.topic === 'marriage') {
    if (/(love|dating|crush)/i.test(text)) return 'This is a love question, so the answer should center on attraction, privacy, and clarity.'
    return 'This is a partnership question, so the answer should center on maturity, commitment, and communication.'
  }

  if (concern.topic === 'health') {
    if (/physical health, vitality/i.test(text)) return 'Vitality questions should stay on energy, recovery, routine, and the body load that affects stamina.'
    if (/mental health, stress/i.test(text)) return 'Stress questions should stay on mental load, sleep quality, and overstimulation.'
    if (/(sleep|rest|insomnia)/i.test(text)) return 'This is a sleep question, so the answer should focus on routine, stimulation, and recovery.'
    return 'This is a wellbeing question, so the answer should stay practical and non-diagnostic.'
  }

  if (concern.questionType === 'timing') {
    if (/tomorrow/i.test(text)) return 'This is a short-window timing question, so the answer should speak in tendencies rather than guarantees.'
    if (/(2026|2027|month|date)/i.test(text)) return 'This is a dated timing question, so the answer should anchor the relevant window carefully.'
  }

  return 'This answer should stay specific to the actual question being asked.'
}

function buildSafeSleepRemedyAnswer(): string {
  return [
    'For sleep, keep the remedy simple, low-cost, and non-fear-based.',
    'Tonight, try a steady routine: dim screens, avoid late caffeine, take 5 slow breaths, and write down one worry to handle tomorrow.',
    'A short prayer or mantra can be used as calming support if it feels natural to you, but not as a replacement for medical care.',
    'If sleep trouble is persistent, severe, or linked with anxiety or physical symptoms, speak with a qualified professional.',
  ].join('\n\n')
}

function buildQuestionModeLine(question: string | undefined): string {
  const text = (question ?? '').toLowerCase()

  if (text.includes('deepest contradiction')) {
    return 'The main tension here is between what looks strong on the chart and what still needs disciplined execution.'
  }
  if (text.includes('what should i do first') || text.includes('first about')) {
    return 'The first move should be a concrete step that can be checked, repeated, and adjusted.'
  }
  if (text.includes('what should i avoid')) {
    return 'The main thing to avoid is rushing into a vague promise without evidence or a clear plan.'
  }
  if (text.includes('what should i track')) {
    return 'The useful thing to track is the pattern of outcomes over time, not a one-off mood.'
  }
  if (text.includes('follow-up question')) {
    return 'The best next question is narrower, because the current one is still too broad to answer cleanly.'
  }
  if (text.includes('conservative advice')) {
    return 'The safest reading keeps the claim modest and practical rather than dramatic.'
  }
  if (text.includes('how does jupiter mahadasha affect')) {
    return 'Jupiter Mahadasha should be read as a growth-and-judgment period, not as a guarantee.'
  }
  if (text.includes('how does 2026-2027 varshaphal affect')) {
    return 'The 2026-2027 annual cycle should be read as a mixed window with both momentum and caution.'
  }
  return 'The answer should stay tied to the exact question wording rather than drifting into generic guidance.'
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

  if ((input.concern.questionType === 'remedy' || input.concern.topic === 'remedy') && /sleep|insomnia|night routine/i.test(input.question ?? '')) {
    return lintHumanStyle(buildSafeSleepRemedyAnswer())
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
  const specificityLine = buildSpecificityLine(input.question, input.concern)
  const questionModeLine = buildQuestionModeLine(input.question)
  const dashaSignal = visibleEvidence.some((item) =>
    /saturn|shani/i.test(`${item.factor} ${item.humanMeaning} ${item.likelyExperience} ${item.guidance}`),
  )
    ? 'Dasha note: Saturn is part of the evidence, so responsibility, delay, and disciplined effort matter here.'
    : ''
  const accuracyLine = input.concern.topic === 'health' || input.concern.topic === 'death'
    ? 'This is supportive reflection only, not diagnosis or lifespan prediction.'
    : 'This is a chart-based tendency reading, not a guaranteed outcome.'
  const followUpQuestion = input.concern.topic === 'career'
    ? 'If you want, I can narrow this to role fit, promotion timing, visibility, or income.'
    : input.concern.topic === 'money'
      ? 'If you want, I can focus on income growth, debt, or expense control.'
      : input.concern.topic === 'health'
        ? 'If you want, I can narrow the symptom, sleep issue, or routine trigger.'
        : input.concern.topic === 'marriage' || input.concern.topic === 'relationship'
          ? 'If you want, I can focus on timing, compatibility, or communication.'
          : input.concern.topic === 'education'
            ? 'If you want, I can focus on exam strategy, study method, or course choice.'
              : input.concern.questionType === 'timing'
                ? 'If you want, I can anchor the exact window more tightly around today, tomorrow, 2026, or 2027.'
                : 'If you want, I can narrow the answer to one smaller part of the question.'
  const closing = renderClosing(input.concern)

  const raw = [
    opening,
    topicOpening,
    memoryBridge,
    mainSignal,
    experience,
    specificityLine,
    questionModeLine,
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

  const deduped = dedupeRepeatedLines(dedupeAdjacentWords(raw))

  return applyLanguageTone({
    text: lintHumanStyle(deduped),
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
