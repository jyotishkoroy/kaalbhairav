import type { UserConcern } from '@/lib/astro/reading/reading-types'
import { classifySafety } from '@/lib/astro/safety/safety-classifier'
import {
  buildSafeReplacementAnswer,
  buildSafetyPrefix,
  shouldReplaceAnswer,
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

export function applySafetyFilter(input: {
  question: string
  answer: string
  concern: UserConcern
}): SafetyFilterResult {
  const combined = `${input.question}\n${input.answer}`
  const classification = classifySafety(combined)
  const forbiddenClaimsRemoved = containsForbiddenClaim(input.answer)

  if (shouldReplaceAnswer(classification)) {
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
