/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { AstroGuidanceAnswer } from './types.ts'
import type { PredictionContext } from '../types.ts'
import type { ConversationState } from './types.ts'

export const BHAIRAV_GURU_IDENTITY = `You are Bhairav Guru, a respectful Jyotish guidance assistant for Kaalbhairav.org.
You are not a human astrologer.
You do not claim personal case experience.
You explain backend-calculated Jyotish context in a calm, direct, culturally familiar way.`

export const ANSWER_CONTRACT_INSTRUCTIONS = `CRITICAL RULES:
- Return JSON only. No markdown. No prose outside JSON.
- Do NOT calculate astrology.
- Do NOT invent missing placements, dashas, timings, or panchang values.
- ONLY explain the supplied backend-generated prediction_context.
- If a value is not in prediction_context, do not claim it.
- Never include birth_date, birth_time, latitude, longitude, or encrypted_birth_data in output.
- Remedies: only slow breaths, simple mantra, lighting a diya with intention, journaling, silence, speaking less. No gemstones, no fear, no guarantees.
- Frame all guidance as reflection and symbolism, not deterministic prediction.

Return this JSON structure exactly:
{
  "mode": "final_answer",
  "final_answer": {
    "summary": "...",
    "direct_answer": "...",
    "reason": "...",
    "astro_basis": ["..."],
    "practical_advice": "...",
    "remedy": "...",
    "astrology_data_confidence": 0-100,
    "astrology_data_confidence_reason": "...",
    "situation_confidence": 0-100,
    "situation_confidence_reason": "...",
    "overall_confidence_score": 0-100,
    "confidence_label": "low|medium|medium-high|high",
    "human_note": "...",
    "disclaimer": "..."
  }
}`

export function buildSystemPrompt(): string {
  return `${BHAIRAV_GURU_IDENTITY}\n\n${ANSWER_CONTRACT_INSTRUCTIONS}`
}

export function buildUserPrompt(state: ConversationState, context: PredictionContext): string {
  const lines: string[] = []
  lines.push(`Main question: ${state.main_question}`)
  if (state.subtopic) lines.push(`Subtopic: ${state.subtopic}`)
  if (state.known_context.situation) lines.push(`Situation: ${state.known_context.situation}`)
  if (state.known_context.timeframe) lines.push(`Timeframe: ${state.known_context.timeframe}`)
  if (state.known_context.emotional_state) lines.push(`Emotional state: ${state.known_context.emotional_state}`)
  if (state.known_context.people_involved) lines.push(`People involved: ${state.known_context.people_involved}`)

  const ex = context.expanded_context
  const missing = ex?.sections_unavailable ?? []
  if (missing.length > 0) {
    lines.push(`Missing backend sections (do not invent): ${missing.join(', ')}`)
    lines.push(`Daily timing data is incomplete, so read this as a broader chart-based reflection than a precise today-specific prediction.`)
  }

  if (state.high_risk_flags && state.high_risk_flags.length > 0) {
    lines.push(
      `High-risk topics detected: ${state.high_risk_flags.join(', ')} — do not make deterministic predictions. Required disclaimer: "This is offered for reflection and symbolic interpretation, not as a guarantee or professional advice. For medical, legal, financial, or mental-health concerns, consult a qualified professional."`,
    )
  }

  return lines.join('\n')
}

export function buildSafeContext(context: PredictionContext): Record<string, unknown> {
  return {
    do_not_recalculate: true,
    calculation_status: context.chart_identity.calculation_status,
    core_natal_summary: context.core_natal_summary,
    expanded_context: context.expanded_context,
    current_timing: context.current_timing,
    dashas: context.dashas,
    life_area_signatures: context.life_area_signatures,
    confidence: context.confidence,
    warnings_summary: context.warnings?.slice(0, 5)?.map((w) => ({
      code: w.warning_code,
      severity: w.severity,
    })),
    llm_instructions: context.llm_instructions,
  }
}

export function renderFinalAnswer(answer: AstroGuidanceAnswer['final_answer']): string {
  if (!answer) return SAFE_FALLBACK_RENDERED_TEXT
  const lines: string[] = []
  lines.push(`Answer:\n${answer.summary}`)
  if (answer.direct_answer && answer.direct_answer !== answer.summary) {
    lines.push(`\n${answer.direct_answer}`)
  }
  if (answer.reason) lines.push(`\nReason:\n${answer.reason}`)
  if (answer.astro_basis?.length) {
    lines.push(`\nAstro basis:`)
    for (const b of answer.astro_basis) lines.push(`- ${b}`)
  }
  if (answer.practical_advice) lines.push(`\nAdvice:\n${answer.practical_advice}`)
  if (answer.remedy) lines.push(`\nRemedy:\n${answer.remedy}`)
  lines.push(`\nConfidence:\n${answer.overall_confidence_score}% — ${answer.confidence_label}.`)
  if (answer.astrology_data_confidence_reason) lines.push(`\nWhy:\n${answer.astrology_data_confidence_reason}`)
  if (answer.human_note) lines.push(`\nHuman note:\n${answer.human_note}`)
  if (answer.disclaimer) lines.push(`\n${answer.disclaimer}`)
  return lines.join('')
}

const SAFE_FALLBACK_RENDERED_TEXT =
  `Answer:\nI could not safely format the guidance this time.\n\nReason:\nThe answer did not pass the safety and structure checks.\n\nAdvice:\nPlease ask again in one sentence, focusing on the exact situation.\n\nConfidence:\n0% — low.\n\nWhy:\nThe model response could not be validated.\n\nHuman note:\nBetter to pause than give you a careless answer.`
