/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { describe, it, expect } from 'vitest'
import { classifyIntent } from '../../../lib/astro/conversation/intent-classifier'

describe('classifyIntent', () => {
  it('"How will my today go?" → daily_guidance, too_broad, follow_up needed', () => {
    const r = classifyIntent('How will my today go?')
    expect(r.topic).toBe('daily_guidance')
    expect(r.specificity).toBe('too_broad')
    expect(r.needs_follow_up).toBe(true)
  })

  it('"My meeting." → career, meeting subtopic, medium', () => {
    const r = classifyIntent('My meeting.')
    expect(r.topic).toBe('career')
    expect(r.subtopic).toBe('meeting')
  })

  it('"Meeting with managers." → career, meeting subtopic', () => {
    const r = classifyIntent('Meeting with managers.')
    expect(r.topic).toBe('career')
    expect(r.subtopic).toBe('meeting')
  })

  it('career keywords → career topic', () => {
    expect(classifyIntent('How will my job interview go?').topic).toBe('career')
    expect(classifyIntent('My promotion chances this year?').topic).toBe('career')
  })

  it('relationship keywords → relationship topic', () => {
    expect(classifyIntent('When will I find a partner?').topic).toBe('relationship')
    expect(classifyIntent('My love life is confusing').topic).toBe('relationship')
  })

  it('health keywords → health topic', () => {
    expect(classifyIntent('I am worried about surgery').topic).toBe('health')
  })

  it('money keywords → money topic', () => {
    expect(classifyIntent('Should I invest in property?').topic).toBe('money')
  })

  it('spiritual keywords → spiritual topic', () => {
    expect(classifyIntent('Which mantra should I chant?').topic).toBe('spiritual')
  })

  it('vague question → general topic', () => {
    expect(classifyIntent('Tell me about my chart').topic).toBe('general')
  })

  it('death keyword → high_risk_flags includes death', () => {
    const r = classifyIntent('When will I die?')
    expect(r.high_risk_flags).toContain('death')
  })

  it('financial keyword → high_risk_flags includes financial', () => {
    const r = classifyIntent('Will I go bankrupt?')
    expect(r.high_risk_flags).toContain('financial')
  })

  it('medical keyword → high_risk_flags includes medical', () => {
    const r = classifyIntent('Will my surgery be successful?')
    expect(r.high_risk_flags).toContain('medical')
  })

  it('anxious emotional state detected', () => {
    const r = classifyIntent('I am so worried about my meeting tomorrow')
    expect(r.emotional_state).toBe('anxious')
  })

  it('today timeframe extracted', () => {
    const r = classifyIntent('How will my today go?')
    expect(r.extracted_context.timeframe).toBe('today')
  })

  it('tomorrow timeframe extracted', () => {
    const r = classifyIntent('How will tomorrow be for me?')
    expect(r.extracted_context.timeframe).toBe('tomorrow')
  })
})
