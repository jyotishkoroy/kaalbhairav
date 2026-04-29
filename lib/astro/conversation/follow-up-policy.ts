/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { ConversationState, AstroTopic } from './types.ts'

const MAX_SUB_QUESTIONS = 3

const CLARIFYING_TEMPLATES: Record<AstroTopic, string[]> = {
  daily_guidance: [
    'Are you asking generally, or is there one specific thing on your mind today?',
    'Is there a particular situation — work, relationship, or something personal — you are navigating right now?',
    'What outcome would feel like a good day for you?',
  ],
  career: [
    'Could you tell me more — is this about a meeting, a job search, a promotion, or something else at work?',
    'What kind of meeting is it — with your manager, client, team, or someone senior?',
    'What outcome are you hoping for?',
  ],
  relationship: [
    'Is this about an existing relationship, or meeting someone new?',
    'What aspect concerns you most — timing, compatibility, or a specific situation?',
    'Is there a particular event or decision coming up?',
  ],
  family: [
    'Which relationship in the family is this about?',
    'Is there a specific situation or event you are facing?',
    'How long has this been weighing on you?',
  ],
  health: [
    'Are you asking about a physical concern, mental wellbeing, or general vitality?',
    'Is this an existing condition or a concern about the future?',
    'Is there a specific event like a treatment or a decision coming up?',
  ],
  money: [
    'Is this about income, debt, savings, or an investment decision?',
    'Is there a specific decision or situation you are facing right now?',
    'What would a good outcome look like for you?',
  ],
  spiritual: [
    'Are you asking about daily practice, a specific deity, or something you experienced recently?',
    'Is there a particular practice or experience you would like guidance on?',
    'What are you hoping to understand or resolve?',
  ],
  general: [
    'Could you share a bit more — what area of your life is most on your mind?',
    'Are you asking about your chart overall, or a specific life area like career, relationships, or health?',
    'What would feel most useful to explore right now?',
  ],
}

export type FollowUpDecision =
  | { should_ask: true; question: string }
  | { should_ask: false }

export function evaluateFollowUp(state: ConversationState): FollowUpDecision {
  if (state.sub_questions_asked >= MAX_SUB_QUESTIONS) return { should_ask: false }
  if (state.ready_to_answer) return { should_ask: false }
  if (state.specificity === 'clear') return { should_ask: false }

  // After 1+ questions, if we have a concrete situation, proceed to answer
  if (state.sub_questions_asked >= 1 && state.known_context.situation) return { should_ask: false }

  // Max questions by specificity
  const maxForSpecificity =
    state.specificity === 'too_broad' ? 3
    : state.specificity === 'medium' ? 2
    : 0

  if (state.sub_questions_asked >= maxForSpecificity) return { should_ask: false }

  const templates = CLARIFYING_TEMPLATES[state.topic] ?? CLARIFYING_TEMPLATES.general
  const question = templates[state.sub_questions_asked] ?? templates[templates.length - 1]

  return { should_ask: true, question }
}
