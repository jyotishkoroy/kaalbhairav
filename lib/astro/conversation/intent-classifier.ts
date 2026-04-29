/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { AstroTopic, ConversationSpecificity, IntentClassification } from './types.ts'

const TOPIC_KEYWORDS: Record<AstroTopic, string[]> = {
  career: ['job', 'work', 'meeting', 'manager', 'boss', 'client', 'promotion', 'interview', 'business', 'office', 'career', 'colleague', 'appraisal', 'employ'],
  relationship: ['partner', 'love', 'breakup', 'marriage', 'spouse', 'dating', 'boyfriend', 'girlfriend', 'husband', 'wife', 'divorce', 'relationship', 'romantic'],
  family: ['parents', 'mother', 'father', 'sibling', 'child', 'children', 'home', 'family', 'brother', 'sister', 'son', 'daughter', 'parent', 'in-law'],
  health: ['health', 'illness', 'anxiety', 'surgery', 'treatment', 'pain', 'sick', 'disease', 'hospital', 'medicine', 'doctor', 'mental', 'recover'],
  money: ['money', 'debt', 'salary', 'investment', 'loan', 'property', 'finance', 'financial', 'wealth', 'savings', 'income', 'profit', 'loss', 'stock'],
  daily_guidance: ['today', 'tomorrow', 'this day', 'daily', 'how will my day', 'how will be my day', 'day go', 'my day', 'morning', 'evening', 'tonight', 'this week', 'how will i do today', 'how is my day', 'aaj', 'kal'],
  spiritual: ['puja', 'mantra', 'sadhana', 'guru', 'bhakti', 'dream', 'deity', 'temple', 'prayer', 'spiritual', 'meditation', 'karma', 'dharma'],
  general: [],
}

const HIGH_RISK_KEYWORDS: Record<string, string[]> = {
  medical: ['hospital', 'surgery', 'cancer', 'disease', 'ill', 'cure', 'heal', 'diagnos', 'medication'],
  legal: ['court', 'lawsuit', 'legal', 'police', 'arrest', 'judge', 'verdict', 'case'],
  financial: ['bankrupt', 'lose all', 'fraud', 'scam', 'ponzi'],
  death: ['die', 'death', 'dead', 'dying', 'when will i die', 'lifespan', 'longevity'],
  pregnancy: ['pregnant', 'pregnancy', 'conceive', 'fertility', 'ivf', 'childbirth'],
  marriage: ['when will i get married', 'when will i marry', 'predict my marriage'],
  accident: ['accident', 'crash', 'danger', 'safe travel'],
  mental_health: ['suicid', 'breakdown', 'psychiatr', 'depress'],
  fixed_date: ['exact date', 'exact time', 'when exactly', 'precise date', 'guaranteed when'],
}

const EMOTIONAL_KEYWORDS: Record<string, string[]> = {
  anxious: ['worried', 'scared', 'nervous', 'tense', 'panic', 'fear', 'afraid', 'concern'],
  sad: ['hurt', 'broken', 'low', 'depressed', 'sad', 'crying', 'unhappy', 'grief'],
  angry: ['angry', 'frustrated', 'irritated', 'furious', 'annoyed'],
  hopeful: ['excited', 'hopeful', 'waiting', 'hope', 'looking forward', 'optimistic'],
  confused: ['confused', 'stuck', 'unsure', 'unclear', 'lost', 'dont know', "don't know"],
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
}

function detectTopic(lower: string): { topic: AstroTopic; subtopic?: string } {
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS) as [AstroTopic, string[]][]) {
    if (topic === 'general') continue
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        if (topic === 'career') {
          if (lower.includes('meeting')) return { topic, subtopic: 'meeting' }
          if (lower.includes('interview') || lower.includes('job')) return { topic, subtopic: 'job_search' }
          if (lower.includes('boss') || lower.includes('manager')) return { topic, subtopic: 'manager' }
          if (lower.includes('promotion')) return { topic, subtopic: 'promotion' }
        }
        return { topic }
      }
    }
  }
  return { topic: 'general' }
}

function detectSpecificity(lower: string, { topic, subtopic }: { topic: AstroTopic; subtopic?: string }): ConversationSpecificity {
  const words = lower.trim().split(/\s+/).length
  // Very short vague questions
  if (words <= 4 && topic === 'general') return 'too_broad'
  if (topic === 'daily_guidance' && words <= 8) return 'too_broad'
  // Short but has some context
  if (subtopic) return 'medium'
  if (words <= 5) return 'medium'
  // Longer questions with specifics
  if (words >= 10) return 'clear'
  return 'medium'
}

function detectEmotionalState(lower: string): string | undefined {
  for (const [state, keywords] of Object.entries(EMOTIONAL_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return state
  }
  return undefined
}

function detectHighRiskFlags(lower: string): IntentClassification['high_risk_flags'] {
  const flags: string[] = []
  for (const [flag, keywords] of Object.entries(HIGH_RISK_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) flags.push(flag)
  }
  return flags as IntentClassification['high_risk_flags']
}

function extractContext(lower: string): IntentClassification['extracted_context'] {
  const ctx: IntentClassification['extracted_context'] = {}
  if (lower.includes('today')) ctx.timeframe = 'today'
  else if (lower.includes('tomorrow')) ctx.timeframe = 'tomorrow'
  else if (lower.includes('this week')) ctx.timeframe = 'this week'
  return ctx
}

export function classifyIntent(question: string): IntentClassification {
  const lower = normalize(question)
  const topicResult = detectTopic(lower)
  const specificity = detectSpecificity(lower, topicResult)
  const emotional_state = detectEmotionalState(lower)
  const high_risk_flags = detectHighRiskFlags(lower)
  const extracted_context = extractContext(lower)
  const needs_follow_up = specificity !== 'clear' || topicResult.topic === 'general'

  return {
    topic: topicResult.topic,
    subtopic: topicResult.subtopic,
    specificity,
    needs_follow_up,
    emotional_state,
    high_risk_flags,
    extracted_context,
    confidence: topicResult.topic === 'general' ? 0.5 : 0.85,
    reason: `keyword match: topic=${topicResult.topic}, specificity=${specificity}`,
  }
}
