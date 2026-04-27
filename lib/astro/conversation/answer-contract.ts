import { z } from 'zod'
import type { AstroGuidanceAnswer } from './types.ts'

const confidenceLabelSchema = z.enum(['low', 'medium', 'medium-high', 'high'])
const confidenceInt = z.number().int().min(0).max(100)

const finalAnswerSchema = z.object({
  summary: z.string().min(1),
  direct_answer: z.string().min(1),
  reason: z.string().min(1),
  astro_basis: z.array(z.string()),
  practical_advice: z.string().min(1),
  remedy: z.string(),
  astrology_data_confidence: confidenceInt,
  astrology_data_confidence_reason: z.string().min(1),
  situation_confidence: confidenceInt,
  situation_confidence_reason: z.string().min(1),
  overall_confidence_score: confidenceInt,
  confidence_label: confidenceLabelSchema,
  human_note: z.string().min(1),
  disclaimer: z.string().optional(),
})

export const guidanceAnswerSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('clarifying_question'),
    clarifying_question: z.string().min(1),
  }),
  z.object({
    mode: z.literal('final_answer'),
    final_answer: finalAnswerSchema,
  }),
])

export function parseAndValidate(raw: string): AstroGuidanceAnswer | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const result = guidanceAnswerSchema.safeParse(parsed)
  return result.success ? (result.data as AstroGuidanceAnswer) : null
}

export const SAFE_FALLBACK_RENDERED =
  `Answer:\nI could not safely format the guidance this time.\n\nReason:\nThe answer did not pass the safety and structure checks.\n\nAdvice:\nPlease ask again in one sentence, focusing on the exact situation.\n\nConfidence:\n0% — low.\n\nWhy:\nThe model response could not be validated.\n\nHuman note:\nBetter to pause than give you a careless answer.`

export const SAFE_FALLBACK_ANSWER: AstroGuidanceAnswer = {
  mode: 'final_answer',
  final_answer: {
    summary: 'Unable to format guidance.',
    direct_answer: 'I could not safely format the guidance this time.',
    reason: 'The answer did not pass the safety and structure checks.',
    astro_basis: [],
    practical_advice: 'Please ask again in one sentence, focusing on the exact situation.',
    remedy: '',
    astrology_data_confidence: 0,
    astrology_data_confidence_reason: 'Validation failed.',
    situation_confidence: 0,
    situation_confidence_reason: 'Validation failed.',
    overall_confidence_score: 0,
    confidence_label: 'low',
    human_note: 'Better to pause than give you a careless answer.',
  },
}
