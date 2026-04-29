/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { UserConcern } from '@/lib/astro/reading/reading-types'
import {
  classifySafety,
  type SafetyClassification,
  type SafetyRiskName,
} from '@/lib/astro/safety/safety-classifier'
import {
  buildSafeReplacementAnswer,
  buildSafetyPrefix,
} from '@/lib/astro/safety/safety-response'
import {
  containsForbiddenClaim,
  removeForbiddenClaims,
} from '@/lib/astro/safety/forbidden-claims'

export type SafetyFilterResult = {
  answer: string
  riskNames: string[]
  replaced: boolean
  forbiddenClaimsRemoved: boolean
}

function mergeClassifications(
  primary: SafetyClassification,
  secondary: SafetyClassification | undefined,
): SafetyClassification {
  if (!secondary) return primary

  const risk = { ...primary.risk, ...secondary.risk }
  const riskNames = Array.from(
    new Set<SafetyRiskName>([
      ...primary.riskNames,
      ...secondary.riskNames,
    ]),
  )

  return {
    risk,
    riskNames,
    hasRisk: riskNames.length > 0,
  }
}

export function applySafetyFilter(input: {
  question: string
  answer: string
  concern: UserConcern
}): SafetyFilterResult {
  const questionClassification = classifySafety(input.question)
  const answerClassification =
    input.concern.topic === 'death' ||
    (input.concern.topic === 'health' && input.concern.questionType === 'yes_no')
      ? classifySafety(input.answer)
      : undefined
  const classification = mergeClassifications(
    questionClassification,
    answerClassification,
  )
  const forbiddenClaimsRemoved = containsForbiddenClaim(input.answer)
  const replaceableRisks = new Set([
    'selfHarm',
    'medical',
    'death',
    'legal',
    'pregnancy',
  ])
  const shouldReplace = classification.riskNames.some((riskName) =>
    replaceableRisks.has(riskName),
  )

  if (shouldReplace) {
    const replacement = buildSafeReplacementAnswer({
      classification,
      concern: input.concern,
    })

    return {
      answer: removeForbiddenClaims(replacement),
      riskNames: classification.riskNames,
      replaced: true,
      forbiddenClaimsRemoved,
    }
  }

  const cleanedAnswer = removeForbiddenClaims(input.answer)
  const prefix = buildSafetyPrefix({
    classification,
    concern: input.concern,
  })

  const answer = prefix ? `${prefix}\n\n${cleanedAnswer}` : cleanedAnswer

  return {
    answer,
    riskNames: classification.riskNames,
    replaced: false,
    forbiddenClaimsRemoved,
  }
}
