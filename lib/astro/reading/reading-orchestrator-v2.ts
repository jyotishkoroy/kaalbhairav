import { getAstroFeatureFlags } from '@/lib/astro/config/feature-flags'
import { buildAstroEvidence } from '@/lib/astro/interpretation'
import { generateMonthlyGuidance, renderMonthlyGuidance } from '@/lib/astro/monthly'
import { interpretRemedies } from '@/lib/astro/interpretation/remedies'
import {
  buildMemorySummary,
  extractGuidanceForMemory,
  getAstrologyMemory,
  saveAstrologyReadingMemory,
  summarizeReadingForMemory,
} from '@/lib/astro/memory'
import {
  classifyUserConcern,
  detectsMonthlyGuidanceRequest,
} from '@/lib/astro/reading/concern-classifier'
import { generateHumanReadingResult } from '@/lib/astro/reading/human-generator'
import { detectPreferredLanguage } from '@/lib/astro/reading/language-style'
import { selectReadingMode } from '@/lib/astro/reading/reading-modes'
import { applySafetyFilter } from '@/lib/astro/safety'
import { getLLMProviderConfig, getLLMRefinerConfig } from '@/lib/llm/config'
import { refineReadingWithSafeLLM } from '@/lib/astro/reading/local-ai-refiner'
import { getChartProfileForTopic } from '@/lib/astro/reading/chart-anchors'
import { answerExactChartFact } from '@/lib/astro/reading/chart-facts'
import type {
  AstrologyReadingInput,
  AstrologyReadingResult,
  GenerateStableReading,
} from './reading-router-types'
import type { ReadingMode, ReadingV2Input } from './reading-types'

function getQuestion(input: AstrologyReadingInput): string {
  if (typeof input.question === 'string' && input.question.trim()) {
    return input.question.trim()
  }

  if (typeof input.message === 'string' && input.message.trim()) {
    return input.message.trim()
  }

  return ''
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

type ClassifiedConcern = ReturnType<typeof classifyUserConcern>

function getNestedRecord(
  source: unknown,
  key: string,
): Record<string, unknown> | undefined {
  const record = asRecord(source)
  const value = record?.[key]

  return asRecord(value)
}

function getChartSource(input: AstrologyReadingInput): unknown {
  const directChart = input.chart
  if (directChart) return directChart

  const contextChart = getNestedRecord(input.context, 'chart')
  if (contextChart) return contextChart

  const metadataChart = getNestedRecord(input.metadata, 'chart')
  if (metadataChart) return metadataChart

  return undefined
}

function getDashaSource(input: AstrologyReadingInput): unknown {
  const directDasha = asRecord(input.dasha)
  if (directDasha) return directDasha

  const chartDasha = getNestedRecord(input.chart, 'dasha')
  if (chartDasha) return chartDasha

  const contextDasha = getNestedRecord(input.context, 'dasha')
  if (contextDasha) return contextDasha

  const metadataDasha = getNestedRecord(input.metadata, 'dasha')
  if (metadataDasha) return metadataDasha

  return undefined
}

function getTransitSource(input: AstrologyReadingInput): unknown {
  const directTransits = asRecord(input.transits)
  if (directTransits) return directTransits

  const chartTransits = getNestedRecord(input.chart, 'transits')
  if (chartTransits) return chartTransits

  const contextTransits = getNestedRecord(input.context, 'transits')
  if (contextTransits) return contextTransits

  const metadataTransits = getNestedRecord(input.metadata, 'transits')
  if (metadataTransits) return metadataTransits

  return undefined
}

async function callStableFallback(
  input: AstrologyReadingInput,
  stableFallback?: GenerateStableReading,
): Promise<AstrologyReadingResult | undefined> {
  if (!stableFallback) return undefined

  const fallbackResult = await stableFallback(input)

  return {
    ...fallbackResult,
    meta: {
      ...(fallbackResult.meta ?? {}),
      version: 'v2',
      routedBy: 'astro-reading-router',
      usedFallback: true,
    },
  }
}

async function getOptionalMemorySummary(input: {
  enabled: boolean
  userId?: string
}): Promise<{ summary: string | undefined; topic?: ClassifiedConcern['topic'] } | undefined> {
  if (!input.enabled || !input.userId) return undefined

  try {
    const memory = await getAstrologyMemory(input.userId)
    return {
      summary: buildMemorySummary(memory),
      topic: memory?.previousReadings.at(-1)?.topic,
    }
  } catch {
    return {
      summary: undefined,
    }
  }
}

async function saveOptionalMemory(input: {
  enabled: boolean
  userId?: string
  topic: ClassifiedConcern['topic']
  question: string
  answer: string
  emotionalTone: string
  birthDetails?: unknown
}): Promise<void> {
  if (!input.enabled || !input.userId) return

  try {
    await saveAstrologyReadingMemory({
      userId: input.userId,
      topic: input.topic,
      question: input.question,
      summary: summarizeReadingForMemory(input.answer),
      guidanceGiven: extractGuidanceForMemory(input.answer),
      emotionalTone: input.emotionalTone,
      birthProfile: asRecord(input.birthDetails),
    })
  } catch {
    // Memory must never break a reading.
  }
}

function toReadingV2Input(input: AstrologyReadingInput): ReadingV2Input {
  return {
    userId: typeof input.userId === 'string' ? input.userId : undefined,
    question: getQuestion(input),
    birthDetails: asRecord(input.birthDetails),
    chart: input.chart,
    context: input.context,
    metadata: input.metadata,
  }
}

function hasExplicitRemedyIntent(question: string, mode: ReadingMode): boolean {
  const text = question.toLowerCase()
  return (
    mode === 'remedy_focused' ||
    /\b(remedy|remedies|upay|mantra|puja|gemstone|ratna)\b/i.test(text) ||
    text.includes('उपाय') ||
    text.includes('प्रार्थना')
  )
}

function hasExplicitMonthlyIntent(question: string, mode: ReadingMode): boolean {
  const text = question.toLowerCase()
  const exactDatePattern =
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}\b/i
  const monthTerms = [
    'this month',
    'monthly',
    'month ahead',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
    'january',
    'february',
    'march',
  ]

  return (
    !exactDatePattern.test(text) &&
    (detectsMonthlyGuidanceRequest(text) ||
      monthTerms.some((term) => text.includes(term)) ||
      (mode === 'timing_prediction' &&
        /\b20\d{2}\b/.test(text) &&
        monthTerms.some((term) => text.includes(term))))
  )
}

/**
 * Reading Orchestrator V2.
 *
 * This composes the zero-cost V2 stack:
 * concern classifier -> evidence engine -> memory -> human template generator -> safety.
 *
 * This function is only reached through the existing router when
 * ASTRO_READING_V2_ENABLED=true. Stable path remains default.
 */
export async function generateReadingV2(
  input: AstrologyReadingInput,
  options?: {
    stableFallback?: GenerateStableReading
  },
): Promise<AstrologyReadingResult> {
  const question = getQuestion(input)

  if (!question) {
    const fallback = await callStableFallback(input, options?.stableFallback)

    if (fallback) return fallback

    return {
      answer:
        'I need your question before I can give a reading. Please ask about the area you want clarity on.',
      meta: {
        version: 'v2',
        routedBy: 'astro-reading-router',
        usedFallback: false,
        reason: 'missing_question',
      },
    }
  }

  try {
    const v2Input = toReadingV2Input(input)
    const concern = classifyUserConcern(v2Input.question)
    const flags = getAstroFeatureFlags()
    const memoryEnabled = flags.memoryEnabled
    const remediesEnabled = flags.remediesEnabled
    const monthlyEnabled = flags.monthlyEnabled
    const userId =
      typeof input.userId === 'string' && input.userId.trim()
        ? input.userId.trim()
        : undefined
    const chart = getChartSource(input)
    const dasha = getDashaSource(input)
    const transits = getTransitSource(input)
    const mode = selectReadingMode(concern)
    const exactFact = answerExactChartFact(v2Input.question)
    if (exactFact) {
      const exactAnswer = [
        `Direct answer:\n${exactFact.answer}`,
        `How this is derived:\n${exactFact.reasoning}`,
        `Accuracy:\nTotally accurate — this is directly read from the report or deterministically derived from listed chart data.`,
        exactFact.followUpQuestion ? `Suggested follow-up:\n${exactFact.followUpQuestion}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
      const safety = applySafetyFilter({
        question: v2Input.question,
        answer: exactAnswer,
        concern,
      })
      return {
        answer: safety.answer,
        meta: {
          version: 'v2',
          topic: exactFact.topic,
          domainName: exactFact.domainName,
          accuracyClass: exactFact.accuracy,
          chartAnchorsUsed: exactFact.anchors,
          evidenceCount: exactFact.anchors.length,
          questionBankAligned: true,
          exactFactAnswered: true,
          llmRefinerUsed: false,
          routedBy: 'astro-reading-router',
          usedFallback: false,
          safetyLayer: 'enabled_phase_8',
          safetyRiskNames: safety.riskNames,
          safetyReplacedAnswer: safety.replaced,
          forbiddenClaimsRemoved: safety.forbiddenClaimsRemoved,
          followUpQuestion: exactFact.followUpQuestion,
        },
      }
    }
    const chartProfile = getChartProfileForTopic(concern.subtopic ?? concern.topic)
    const shouldAddRemedyEvidence =
      remediesEnabled &&
      hasExplicitRemedyIntent(v2Input.question, mode) &&
      (concern.topic === 'remedy' || concern.questionType === 'remedy')
    let evidence = buildAstroEvidence({
      concern,
      chart,
      dasha,
      transits,
      profile: input.birthDetails,
      metadata: input.metadata,
    })
    if (shouldAddRemedyEvidence) {
      const remedyEvidence = interpretRemedies({
        concern: {
          ...concern,
          topic: 'remedy',
          questionType: 'remedy',
        },
        chart,
        dasha,
        transits,
        profile: input.birthDetails,
        metadata: input.metadata,
      })

      const existingIds = new Set(evidence.map((item) => item.id))
      evidence = [
        ...evidence,
        ...remedyEvidence.filter((item) => !existingIds.has(item.id)),
      ]
    } else {
      evidence = evidence.filter((item) => item.topic !== 'remedy')
    }
    const remedyEvidenceIncluded = evidence.some((item) => item.topic === 'remedy')
    const language = detectPreferredLanguage(v2Input.question)
    const memoryContext: {
      summary?: string
      topic?: ClassifiedConcern['topic']
    } =
      (await getOptionalMemorySummary({
        enabled: memoryEnabled,
        userId,
      })) ?? {}
    const memorySummary =
      typeof memoryContext.summary === 'string' ? memoryContext.summary : undefined
    const shouldIncludeMemory =
      Boolean(memorySummary) && memoryContext.topic === concern.topic
    const shouldIncludeMonthlyGuidance =
      monthlyEnabled && hasExplicitMonthlyIntent(v2Input.question, mode)
    const llmConfig = getLLMProviderConfig()
    const llmRefinerConfig = getLLMRefinerConfig()
    const result = generateHumanReadingResult({
      concern,
      evidence,
      question: v2Input.question,
      mode,
      language,
      memorySummary: shouldIncludeMemory ? memorySummary : undefined,
    })
    let monthlyGuidanceText = ''
    let monthlyGuidanceIncluded = false

    if (shouldIncludeMonthlyGuidance) {
      const monthlyGuidance = generateMonthlyGuidance({
        topic: concern.topic,
        chart,
        dasha,
        transits,
        question: v2Input.question,
      })

      monthlyGuidanceText = renderMonthlyGuidance(monthlyGuidance)
      monthlyGuidanceIncluded = true
    }

    const combinedAnswer = [result.answer, monthlyGuidanceText]
      .filter(Boolean)
      .join('\n\n')
    const firstSafety = applySafetyFilter({
      question: v2Input.question,
      answer: combinedAnswer,
      concern,
    })
    let finalSafety = firstSafety
    let llmRefinerUsed = false
    let llmRefinerFallback = false
    let llmModel: string | undefined

    if (llmRefinerConfig.enabled) {
      const refined = await refineReadingWithSafeLLM({
        question: v2Input.question,
        answer: firstSafety.answer,
        maxTokens: llmRefinerConfig.maxTokens,
        temperature: llmRefinerConfig.temperature,
        originalAnswer: result.answer,
        topic: concern.topic,
        mode,
      })

      llmRefinerUsed = refined.usedLLM
      llmRefinerFallback = refined.fallback
      llmModel = refined.model

      finalSafety = applySafetyFilter({
        question: v2Input.question,
        answer: refined.answer,
        concern,
      })
    }
    await saveOptionalMemory({
      enabled: memoryEnabled,
      userId,
      topic: concern.topic,
      question: v2Input.question,
      answer: finalSafety.answer,
      emotionalTone: concern.emotionalTone,
      birthDetails: input.birthDetails,
    })

    return {
      answer: finalSafety.answer,
      meta: {
        ...result.meta,
        version: 'v2',
        topic: concern.topic,
        domainId: chartProfile?.id,
        domainName: chartProfile?.domain,
        mode,
        language,
        accuracyClass:
          concern.topic === 'health' || concern.topic === 'death'
            ? 'supportive-only'
            : concern.questionType === 'timing'
              ? 'tendency'
              : 'partial',
        readingStyle: concern.questionType === 'timing' ? 'timing' : concern.wantsPracticalSteps ? 'practical' : 'chart-anchored',
        chartAnchorsUsed: chartProfile?.mustUseAnchors ?? [],
        evidenceCount: evidence.length,
        routedBy: 'astro-reading-router',
        usedFallback: false,
        safetyLayer: 'enabled_phase_8',
        safetyRiskNames: Array.from(
          new Set([
            ...firstSafety.riskNames,
            ...finalSafety.riskNames,
          ]),
        ),
        safetyReplacedAnswer: firstSafety.replaced || finalSafety.replaced,
        forbiddenClaimsRemoved:
          firstSafety.forbiddenClaimsRemoved ||
          finalSafety.forbiddenClaimsRemoved,
        memoryLayer: memoryEnabled ? 'enabled_phase_7' : 'disabled',
        memorySummaryUsed: Boolean(shouldIncludeMemory),
        remediesLayer: remediesEnabled ? 'enabled_phase_9' : 'disabled',
        remedyEvidenceIncluded,
        monthlyLayer: monthlyEnabled ? 'enabled_phase_11' : 'disabled',
        monthlyGuidanceIncluded,
        llmProvider: llmConfig.provider,
        llmRefinerEnabled: llmRefinerConfig.enabled,
        llmRefinerUsed,
        llmRefinerFallback,
        llmModel,
        followUpQuestion:
          concern.topic === 'career'
            ? 'Which part matters most: role, boss, visibility, or income?'
            : concern.questionType === 'timing'
              ? 'Which exact window should I anchor: tomorrow, this week, 2026, or 2027?'
              : 'Which sub-area should I narrow next?',
        followUpAnswer:
          concern.topic === 'career'
            ? 'Focus on visibility, steady execution, and the kind of responsibility that fits Sun in the 10th with Moon-Mercury support in the 11th.'
            : 'Read the timing as a tendency window, not a fixed promise.',
        followUpReason:
          'Follow-up questions make the reading more specific and reduce generic advice.',
        questionBankAligned: true,
      },
    }
  } catch (error) {
    const fallback = await callStableFallback(input, options?.stableFallback)

    if (fallback) return fallback

    return {
      answer:
        'I could not complete this reading cleanly. Please try again with your question and birth details.',
      meta: {
        version: 'v2',
        routedBy: 'astro-reading-router',
        usedFallback: false,
        error:
          error instanceof Error ? error.message : 'unknown_reading_v2_error',
      },
    }
  }
}
