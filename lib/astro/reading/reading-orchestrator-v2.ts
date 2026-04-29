import { getAstroFeatureFlags } from '@/lib/astro/config/feature-flags'
import { buildAstroEvidence } from '@/lib/astro/interpretation'
import {
  buildMemorySummary,
  extractGuidanceForMemory,
  getAstrologyMemory,
  saveAstrologyReadingMemory,
  summarizeReadingForMemory,
} from '@/lib/astro/memory'
import { classifyUserConcern } from '@/lib/astro/reading/concern-classifier'
import { generateHumanReadingResult } from '@/lib/astro/reading/human-generator'
import { detectPreferredLanguage } from '@/lib/astro/reading/language-style'
import { selectReadingMode } from '@/lib/astro/reading/reading-modes'
import type {
  AstrologyReadingInput,
  AstrologyReadingResult,
  GenerateStableReading,
} from './reading-router-types'
import type { ReadingV2Input } from './reading-types'

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
}): Promise<string | undefined> {
  if (!input.enabled || !input.userId) return undefined

  try {
    const memory = await getAstrologyMemory(input.userId)
    return buildMemorySummary(memory)
  } catch {
    return undefined
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

/**
 * Reading Orchestrator V2.
 *
 * This composes the zero-cost V2 stack:
 * concern classifier -> evidence engine -> human template generator.
 *
 * It intentionally does not implement persistent memory or the final safety layer yet.
 * Those are Phase 7 and Phase 8.
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
    const userId =
      typeof input.userId === 'string' && input.userId.trim()
        ? input.userId.trim()
        : undefined
    const chart = getChartSource(input)
    const dasha = getDashaSource(input)
    const transits = getTransitSource(input)
    const evidence = buildAstroEvidence({
      concern,
      chart,
      dasha,
      transits,
      profile: input.birthDetails,
      metadata: input.metadata,
    })
    const mode = selectReadingMode(concern)
    const language = detectPreferredLanguage(v2Input.question)
    const memorySummary = await getOptionalMemorySummary({
      enabled: memoryEnabled,
      userId,
    })
    const result = generateHumanReadingResult({
      concern,
      evidence,
      question: v2Input.question,
      mode,
      language,
      memorySummary,
    })
    await saveOptionalMemory({
      enabled: memoryEnabled,
      userId,
      topic: concern.topic,
      question: v2Input.question,
      answer: result.answer,
      emotionalTone: concern.emotionalTone,
      birthDetails: input.birthDetails,
    })

    return {
      answer: result.answer,
      meta: {
        ...result.meta,
        version: 'v2',
        topic: concern.topic,
        mode,
        language,
        evidenceCount: evidence.length,
        routedBy: 'astro-reading-router',
        usedFallback: false,
        safetyLayer: 'not_enabled_phase_7',
        memoryLayer: memoryEnabled ? 'enabled_phase_7' : 'disabled',
        memorySummaryUsed: Boolean(memorySummary),
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
