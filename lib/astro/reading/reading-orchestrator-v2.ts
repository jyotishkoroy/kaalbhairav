/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { getAstroFeatureFlags } from '@/lib/astro/config/feature-flags'
import { buildAstroEvidence } from '@/lib/astro/interpretation'
import { generateMonthlyGuidance, renderMonthlyGuidance } from '@/lib/astro/monthly'
import { interpretRemedies } from '@/lib/astro/interpretation/remedies'
import { selectDomainEvidence } from '@/lib/astro/evidence/domain-evidence-selector'
import { decideCompanionMemoryUse } from '@/lib/astro/memory/companion-memory-policy'
import { getAstroRagFlags } from '@/lib/astro/rag/feature-flags'
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
import { formatExactFactAnswer } from '@/lib/astro/rag/exact-fact-answer'
import { parseQuestionFrame } from '@/lib/astro/rag/question-frame-parser'
import { routeStructuredIntent } from '@/lib/astro/rag/structured-intent-router'
import { classifySafetyIntent } from '@/lib/astro/rag/safety-intent-classifier'
import { buildReadingPlan, renderReadingPlanFallback, renderUserFacingAnswerPlan, toUserFacingAnswerPlan } from '@/lib/astro/synthesis'
import { validateFinalAnswerQuality } from '@/lib/astro/validation/final-answer-quality-validator'
import {
  composeFinalUserAnswer,
  type FinalAnswerDomain,
  type FinalAnswerSafetyAction,
} from '@/lib/astro/reading/final-answer-composer'
import {
  gateFinalUserAnswer,
  getSafetyShortCircuitDomain,
  userExplicitlyAskedForChartBasis,
  userExplicitlyAskedForMemory,
} from '@/lib/astro/reading/final-response-gate'
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

function mapToFinalAnswerDomain(value: unknown): FinalAnswerDomain {
  const intent = String(value ?? '').toLowerCase()

  if (intent.includes('exact')) return 'exact_fact'
  if (intent.includes('career') || intent.includes('promotion') || intent.includes('job')) return 'career'
  if (intent.includes('business') || intent.includes('profit')) return 'business'
  if (intent.includes('money') || intent.includes('finance') || intent.includes('income')) return 'money'
  if (intent.includes('relationship') || intent.includes('ex') || intent.includes('partner')) return 'relationship'
  if (intent.includes('marriage')) return 'marriage'
  if (intent.includes('family') || intent.includes('parent')) return 'family'
  if (intent.includes('education') || intent.includes('study') || intent.includes('exam')) return 'education'
  if (intent.includes('foreign') || intent.includes('abroad') || intent.includes('relocation')) return 'foreign'
  if (intent.includes('remedy') || intent.includes('gemstone') || intent.includes('puja')) return 'remedy'
  if (intent.includes('spiritual') || intent.includes('curse') || intent.includes('black_magic')) return 'spiritual'
  if (intent.includes('sleep') || intent.includes('insomnia')) return 'sleep'
  if (intent.includes('health') || intent.includes('medical')) return 'health'
  if (intent.includes('legal') || intent.includes('court')) return 'legal'
  if (intent.includes('death') || intent.includes('lifespan') || intent.includes('danger_to_life')) return 'death_safety'
  if (intent.includes('timing')) return 'timing'
  if (intent.includes('mixed')) return 'mixed'

  return 'general'
}

function mapToFinalAnswerSafetyAction(value: unknown): FinalAnswerSafetyAction {
  const safety = String(value ?? '').toLowerCase()

  if (safety.includes('medical') || safety.includes('health')) return 'medical_boundary'
  if (safety.includes('legal') || safety.includes('court')) return 'legal_boundary'
  if (safety.includes('financial') || safety.includes('profit') || safety.includes('investment')) return 'financial_boundary'
  if (safety.includes('death') || safety.includes('lifespan') || safety.includes('danger')) return 'death_boundary'
  if (safety.includes('gemstone')) return 'gemstone_boundary'
  if (safety.includes('remedy') || safety.includes('puja')) return 'remedy_boundary'
  if (safety.includes('curse') || safety.includes('black') || safety.includes('doom')) return 'spiritual_fear_boundary'

  return 'none'
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
    const structuredFlagsEnabled =
      flags.userFacingPlanEnabled ||
      flags.finalAnswerQualityGateEnabled ||
      flags.domainAwareEvidenceEnabled ||
      flags.memoryRelevanceGateEnabled ||
      getAstroRagFlags().gradedSafetyActionsEnabled
    const questionFrame = structuredFlagsEnabled ? parseQuestionFrame(v2Input.question) : undefined
    const structuredIntent = structuredFlagsEnabled
      ? routeStructuredIntent({ rawQuestion: v2Input.question, questionFrame })
      : undefined
    const safetyDecisions = structuredFlagsEnabled
      ? classifySafetyIntent({
          rawQuestion: v2Input.question,
          coreQuestion: questionFrame?.coreQuestion ?? v2Input.question,
          questionFrame,
          structuredIntent,
        })
      : []
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
    const exactFactQuestion =
      structuredIntent?.primaryIntent === 'exact_fact' && questionFrame?.coreQuestion
        ? questionFrame.coreQuestion
        : v2Input.question
    const exactFact = answerExactChartFact(exactFactQuestion)
    if (exactFact) {
      const exactFactAccuracy = exactFact.accuracy === 'Totally accurate'
        ? 'totally_accurate' as const
        : 'unavailable' as const
      const exactAnswer = formatExactFactAnswer({
        directAnswer: exactFact.answer,
        derivation: exactFact.reasoning,
        accuracy: exactFactAccuracy,
        suggestedFollowUp: exactFact.followUpQuestion ?? 'You can ask another exact chart fact.',
        factKeys: exactFact.anchors,
      })
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
    const safetyShortCircuit = getSafetyShortCircuitDomain(v2Input.question)
    if (safetyShortCircuit) {
      const gatedAnswer = gateFinalUserAnswer({
        question: v2Input.question,
        draftAnswer: '',
        domain: safetyShortCircuit.domain,
        safetyAction: safetyShortCircuit.safetyAction,
        exactFact: false,
        allowChartAnchors: false,
        allowMemoryContext: false,
      })
      return {
        answer: gatedAnswer.answer,
        meta: {
          version: 'v2',
          routedBy: 'astro-reading-router',
          usedFallback: false,
          directV2Route: true,
          safetyShortCircuit: true,
          safetyLayer: 'enabled_phase_8',
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
    const domainEvidenceSelection =
      structuredIntent && flags.domainAwareEvidenceEnabled
        ? selectDomainEvidence({
            intent: structuredIntent,
            availableAnchors: evidence.map((item, index) => ({
              id: item.id ?? `evidence-${index}`,
              domain:
                concern.topic === 'money'
                  ? 'money'
                  : concern.topic === 'relationship'
                    ? 'relationship'
                    : concern.topic === 'marriage'
                      ? 'marriage'
                      : concern.topic === 'career'
                        ? 'career'
                        : concern.topic === 'remedy'
                          ? 'remedy'
                          : concern.topic === 'health'
                            ? 'health_adjacent'
                            : concern.topic === 'family'
                              ? 'family'
                              : concern.topic === 'education'
                                ? 'education'
                                : concern.topic === 'foreign'
                                  ? 'foreign_settlement'
                                  : 'general',
              text: `${item.factor}: ${item.humanMeaning}`,
              deterministic: true,
              relevanceScore: item.confidence === 'high' ? 3 : item.confidence === 'medium' ? 2 : 1,
              source: item.visibleToUser ? 'chart' : 'manual',
            })),
            maxAnchors: 6,
            requireQuestionRelevance: true,
          })
        : undefined
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
    const memoryDecision =
      flags.memoryRelevanceGateEnabled && memorySummary
        ? decideCompanionMemoryUse({
            memoryText: memorySummary,
            memoryTopic: memoryContext.topic ?? concern.topic,
            currentPrimaryIntent: structuredIntent?.primaryIntent ?? concern.topic,
            currentSecondaryIntents: structuredIntent?.secondaryIntents,
            currentQuestion: questionFrame?.coreQuestion ?? v2Input.question,
          })
        : undefined
    const shouldIncludeMemory =
      Boolean(memorySummary) &&
      memoryContext.topic === concern.topic &&
      (memoryDecision?.used ?? true)
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
    const internalPlan = buildReadingPlan({
      question: v2Input.question,
      structuredIntent,
      concern: {
        topic: concern.topic,
        mode:
          structuredIntent?.mode ??
          (concern.questionType === 'timing'
            ? 'timing'
            : concern.topic === 'remedy'
              ? 'remedy'
              : concern.topic === 'death' || concern.topic === 'legal'
                ? 'safety'
                : 'interpretive'),
        safetyRisks: safetyDecisions.map((item) => item.risk),
      },
      evidence: evidence.map((item) => ({
        id: item.id,
        label: item.factor,
        explanation: item.humanMeaning,
        confidence: item.confidence,
        source: 'chart',
      })),
      chartAnchors: domainEvidenceSelection?.selectedAnchors.map((anchor) => anchor.text) ?? chartProfile?.mustUseAnchors ?? [],
      memorySummary: shouldIncludeMemory ? memorySummary : undefined,
      memoryInternalSummary: memoryDecision?.internalOnlySummary ?? undefined,
      safetyRestrictions: safetyDecisions.map((item) => `${item.action}:${item.reason}`),
    })
    const renderedAnswer = flags.userFacingPlanEnabled
      ? renderUserFacingAnswerPlan(toUserFacingAnswerPlan(internalPlan))
      : renderReadingPlanFallback(internalPlan)
    const quality = flags.finalAnswerQualityGateEnabled
      ? validateFinalAnswerQuality({
          answerText: renderedAnswer,
          rawQuestion: v2Input.question,
          coreQuestion: questionFrame?.coreQuestion ?? v2Input.question,
          mode: structuredIntent?.mode ?? mode,
          primaryIntent: structuredIntent?.primaryIntent,
          secondaryIntents: structuredIntent?.secondaryIntents,
          exactFactExpected: structuredIntent?.primaryIntent === 'exact_fact',
          expectedDomain: structuredIntent?.primaryIntent,
          metadata: {
            structuredPipelineVersion: 'phase8',
          },
        })
      : { allowed: true, failures: [] as never[] }
    const composedAnswer = composeFinalUserAnswer({
      question: v2Input.question,
      draftAnswer: structuredFlagsEnabled
        ? quality.allowed
          ? renderedAnswer
          : renderReadingPlanFallback(internalPlan)
        : finalSafety.answer,
      domain: exactFact
        ? 'exact_fact'
        : mapToFinalAnswerDomain(
            structuredIntent?.primaryIntent ?? concern.topic,
          ),
      safetyAction: mapToFinalAnswerSafetyAction(
        safetyDecisions[0]?.action ?? concern.topic,
      ),
      exactFact: Boolean(exactFact),
    })

    const gatedAnswer = gateFinalUserAnswer({
      question: v2Input.question,
      draftAnswer: composedAnswer.answer,
      domain: exactFact
        ? 'exact_fact'
        : mapToFinalAnswerDomain(
            structuredIntent?.primaryIntent ?? concern.topic,
          ),
      safetyAction: mapToFinalAnswerSafetyAction(
        safetyDecisions[0]?.action ?? concern.topic,
      ),
      exactFact: Boolean(exactFact),
      allowChartAnchors: userExplicitlyAskedForChartBasis(v2Input.question),
      allowMemoryContext: userExplicitlyAskedForMemory(v2Input.question),
    })
    const finalAnswer = gatedAnswer.answer
    await saveOptionalMemory({
      enabled: memoryEnabled,
      userId,
      topic: concern.topic,
      question: v2Input.question,
      answer: finalAnswer,
      emotionalTone: concern.emotionalTone,
      birthDetails: input.birthDetails,
    })

    return {
      answer: finalAnswer,
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
        structuredPipelineVersion: 'phase8',
        questionFrameUsed: Boolean(questionFrame),
        structuredRoutingUsed: Boolean(structuredIntent),
        memoryUsed: Boolean(shouldIncludeMemory),
        evidenceDomain: domainEvidenceSelection?.primaryDomain,
        finalQualityPassed: quality.allowed,
        answerComposerRepaired: composedAnswer.repaired,
        finalResponseGate: {
          replaced: gatedAnswer.replaced,
          reason: gatedAnswer.reason,
        },
        safetyAction: safetyDecisions.map((item) => item.action),
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
