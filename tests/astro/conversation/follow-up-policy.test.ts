/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { describe, it, expect } from 'vitest'
import { evaluateFollowUp } from '../../../lib/astro/conversation/follow-up-policy'
import type { ConversationState } from '../../../lib/astro/conversation/types'

function makeState(overrides: Partial<ConversationState>): ConversationState {
  return {
    main_question: 'How will my day go?',
    topic: 'daily_guidance',
    specificity: 'too_broad',
    sub_questions_asked: 0,
    known_context: {},
    ready_to_answer: false,
    needs_follow_up: true,
    ...overrides,
  }
}

describe('evaluateFollowUp', () => {
  it('too_broad + 0 asked → should ask', () => {
    const d = evaluateFollowUp(makeState({}))
    expect(d.should_ask).toBe(true)
  })

  it('clear specificity → should not ask', () => {
    const d = evaluateFollowUp(makeState({ specificity: 'clear' }))
    expect(d.should_ask).toBe(false)
  })

  it('ready_to_answer → should not ask', () => {
    const d = evaluateFollowUp(makeState({ ready_to_answer: true }))
    expect(d.should_ask).toBe(false)
  })

  it('max 3 sub_questions enforced', () => {
    const d = evaluateFollowUp(makeState({ sub_questions_asked: 3, specificity: 'too_broad' }))
    expect(d.should_ask).toBe(false)
  })

  it('after 3 questions force final answer regardless of specificity', () => {
    const d = evaluateFollowUp(makeState({ sub_questions_asked: 3, specificity: 'too_broad', needs_follow_up: true }))
    expect(d.should_ask).toBe(false)
  })

  it('medium specificity + 2 asked → should not ask (max 2 for medium)', () => {
    const d = evaluateFollowUp(makeState({ specificity: 'medium', sub_questions_asked: 2, topic: 'career' }))
    expect(d.should_ask).toBe(false)
  })

  it('medium specificity + 1 asked + situation set → should not ask', () => {
    const d = evaluateFollowUp(makeState({
      specificity: 'medium',
      sub_questions_asked: 1,
      topic: 'career',
      known_context: { situation: 'Meeting with managers.' },
    }))
    expect(d.should_ask).toBe(false)
  })

  it('daily_guidance too_broad → asks first template question', () => {
    const d = evaluateFollowUp(makeState({}))
    expect(d.should_ask).toBe(true)
    if (d.should_ask) {
      expect(d.question).toContain('specific thing on your mind today')
    }
  })

  it('career medium 0 asked → asks career first template', () => {
    const d = evaluateFollowUp(makeState({ topic: 'career', specificity: 'medium', sub_questions_asked: 0 }))
    expect(d.should_ask).toBe(true)
    if (d.should_ask) {
      expect(d.question).toContain('meeting')
    }
  })

  it('career medium 1 asked → asks second template (meeting type)', () => {
    const d = evaluateFollowUp(makeState({ topic: 'career', specificity: 'medium', sub_questions_asked: 1 }))
    expect(d.should_ask).toBe(true)
    if (d.should_ask) {
      expect(d.question).toContain('manager')
    }
  })
})
