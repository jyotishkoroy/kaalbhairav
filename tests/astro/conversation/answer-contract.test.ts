/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, it, expect } from 'vitest'
import { parseAndValidate, SAFE_FALLBACK_ANSWER, SAFE_FALLBACK_RENDERED } from '../../../lib/astro/conversation/answer-contract'

const validFinalAnswer = {
  mode: 'final_answer',
  final_answer: {
    summary: 'This is a summary.',
    direct_answer: 'Direct answer here.',
    reason: 'Reason here.',
    astro_basis: ['Moon in Virgo', 'Saturn aspect'],
    practical_advice: 'Practical advice.',
    remedy: 'Take 3 slow breaths.',
    astrology_data_confidence: 65,
    astrology_data_confidence_reason: 'Partial data.',
    situation_confidence: 70,
    situation_confidence_reason: 'Good context.',
    overall_confidence_score: 67,
    confidence_label: 'medium-high',
    human_note: 'Human note here.',
    disclaimer: 'Reflection only.',
  },
}

const validClarifyingQuestion = {
  mode: 'clarifying_question',
  clarifying_question: 'What kind of meeting is it?',
}

describe('parseAndValidate', () => {
  it('valid final_answer passes', () => {
    expect(parseAndValidate(JSON.stringify(validFinalAnswer))).not.toBeNull()
  })

  it('valid clarifying_question passes', () => {
    expect(parseAndValidate(JSON.stringify(validClarifyingQuestion))).not.toBeNull()
  })

  it('malformed JSON returns null', () => {
    expect(parseAndValidate('not json at all')).toBeNull()
  })

  it('invalid confidence label fails', () => {
    const bad = { ...validFinalAnswer, final_answer: { ...validFinalAnswer.final_answer, confidence_label: 'super-high' } }
    expect(parseAndValidate(JSON.stringify(bad))).toBeNull()
  })

  it('missing final_answer when mode is final_answer fails', () => {
    expect(parseAndValidate(JSON.stringify({ mode: 'final_answer' }))).toBeNull()
  })

  it('confidence values out of range fail', () => {
    const bad = { ...validFinalAnswer, final_answer: { ...validFinalAnswer.final_answer, overall_confidence_score: 150 } }
    expect(parseAndValidate(JSON.stringify(bad))).toBeNull()
  })

  it('empty string returns null', () => {
    expect(parseAndValidate('')).toBeNull()
  })

  it('safe fallback answer is valid', () => {
    expect(parseAndValidate(JSON.stringify(SAFE_FALLBACK_ANSWER))).not.toBeNull()
  })

  it('safe fallback rendered is a string', () => {
    expect(typeof SAFE_FALLBACK_RENDERED).toBe('string')
    expect(SAFE_FALLBACK_RENDERED.length).toBeGreaterThan(10)
  })
})
