export type AstroTopic =
  | 'career'
  | 'relationship'
  | 'family'
  | 'health'
  | 'money'
  | 'daily_guidance'
  | 'spiritual'
  | 'general'

export type ConversationSpecificity = 'clear' | 'medium' | 'too_broad'

export type ContextSectionStatus = 'real' | 'partial' | 'stub' | 'not_available' | 'missing'

export type ConversationState = {
  main_question: string
  topic: AstroTopic
  subtopic?: string
  specificity: ConversationSpecificity
  sub_questions_asked: number
  known_context: {
    situation?: string
    people_involved?: string
    timeframe?: string
    emotional_state?: string
    desired_outcome?: string
  }
  ready_to_answer: boolean
  needs_follow_up: boolean
  high_risk_flags?: Array<
    | 'medical'
    | 'legal'
    | 'financial'
    | 'death'
    | 'pregnancy'
    | 'marriage'
    | 'accident'
    | 'mental_health'
    | 'fixed_date'
  >
}

export type IntentClassification = {
  topic: AstroTopic
  subtopic?: string
  specificity: ConversationSpecificity
  needs_follow_up: boolean
  emotional_state?: string
  high_risk_flags: ConversationState['high_risk_flags']
  extracted_context: ConversationState['known_context']
  confidence: number
  reason: string
}

export type OrchestratorInput = {
  user_id: string
  profile_id: string
  session_id?: string
  question: string
  requested_topic?: string
  recent_message_metadata: unknown[]
}

export type AstroGuidanceAnswer = {
  mode: 'clarifying_question' | 'final_answer'
  clarifying_question?: string
  final_answer?: {
    summary: string
    direct_answer: string
    reason: string
    astro_basis: string[]
    practical_advice: string
    remedy: string
    astrology_data_confidence: number
    astrology_data_confidence_reason: string
    situation_confidence: number
    situation_confidence_reason: string
    overall_confidence_score: number
    confidence_label: 'low' | 'medium' | 'medium-high' | 'high'
    human_note: string
    disclaimer?: string
  }
}

export type OrchestratorOutput =
  | {
      mode: 'clarifying_question'
      state: ConversationState
      clarifying_question: string
      metadata: Record<string, unknown>
    }
  | {
      mode: 'final_answer'
      state: ConversationState
      answer: AstroGuidanceAnswer
      rendered: string
      metadata: Record<string, unknown>
    }
