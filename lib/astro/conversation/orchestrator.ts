import type { OrchestratorInput, OrchestratorOutput, ConversationState, AstroTopic } from './types.ts'
import type { PredictionContext } from '../types.ts'
import { classifyIntent } from './intent-classifier.ts'
import { evaluateFollowUp } from './follow-up-policy.ts'
import { buildSystemPrompt, buildUserPrompt, buildSafeContext, renderFinalAnswer } from './human-tone.ts'
import { computeConfidence } from './confidence-scoring.ts'
import { parseAndValidate, SAFE_FALLBACK_ANSWER, SAFE_FALLBACK_RENDERED } from './answer-contract.ts'
import { generateAstrologyReadingWithRouter } from '../reading/reading-router.ts'
import type { AstrologyReadingInput } from '../reading/reading-router-types.ts'

const ORCHESTRATOR_VERSION = '1.0.0'
const FORBIDDEN_KEYS = ['birth_date', 'birth_time', 'encrypted_birth_data', 'latitude', 'longitude']

type PriorState = {
  sub_questions_asked: number
  is_continuation: boolean
  topic: AstroTopic | null
  known_context: ConversationState['known_context']
}

function extractPriorState(recentMetadata: unknown[]): PriorState {
  // recentMetadata is ordered descending (most recent first) — find the newest CQ
  const meta = recentMetadata as Array<Record<string, unknown>>
  const lastCQ = meta.find((m) => m?.mode === 'clarifying_question')
  if (!lastCQ) return { sub_questions_asked: 0, is_continuation: false, topic: null, known_context: {} }
  return {
    sub_questions_asked: Number(lastCQ.sub_questions_asked ?? 0),
    is_continuation: true,
    topic: (lastCQ.topic as AstroTopic) ?? null,
    known_context: (lastCQ.known_context as ConversationState['known_context']) ?? {},
  }
}

function isContinuation(question: string, prior: PriorState): boolean {
  if (!prior.is_continuation) return false
  return question.trim().split(/\s+/).length <= 8
}

export async function runOrchestrator(
  input: OrchestratorInput,
  predictionContext: PredictionContext | null,
): Promise<OrchestratorOutput> {
  const classification = classifyIntent(input.question)
  const prior = extractPriorState(input.recent_message_metadata)
  const isReply = isContinuation(input.question, prior)

  // Restore sub_questions count from prior if this is a continuation
  const sub_questions_asked = isReply ? prior.sub_questions_asked : 0

  // Build known_context from prior + new message
  const knownContext: ConversationState['known_context'] = isReply ? { ...prior.known_context } : {}
  if (classification.extracted_context.timeframe) knownContext.timeframe = classification.extracted_context.timeframe
  if (classification.emotional_state) knownContext.emotional_state = classification.emotional_state
  // Set situation from reply only if it has enough substance
  if (isReply && input.question.trim().length > 20) {
    knownContext.situation = input.question.trim()
  }

  // Resolve topic: use new classification if specific, fall back to prior
  let resolvedTopic = classification.topic
  if (isReply && classification.topic === 'general' && prior.topic && prior.topic !== 'general') {
    resolvedTopic = prior.topic
  }

  const state: ConversationState = {
    main_question: isReply ? (prior.known_context.situation ?? input.question) : input.question,
    topic: resolvedTopic,
    subtopic: classification.subtopic,
    specificity: classification.specificity,
    sub_questions_asked,
    known_context: knownContext,
    ready_to_answer: false,
    needs_follow_up: classification.needs_follow_up,
    high_risk_flags: classification.high_risk_flags,
  }

  const followUp = evaluateFollowUp(state)

  if (followUp.should_ask) {
    const newCount = sub_questions_asked + 1
    const metadata: Record<string, unknown> = {
      orchestrator_version: ORCHESTRATOR_VERSION,
      mode: 'clarifying_question',
      topic: state.topic,
      subtopic: state.subtopic,
      specificity: state.specificity,
      sub_questions_asked: newCount,
      known_context: { ...knownContext, topic: state.topic },
      high_risk_flags: state.high_risk_flags ?? [],
      context_status: { selected_topic_context: 'pending' },
    }
    return {
      mode: 'clarifying_question',
      state: { ...state, sub_questions_asked: newCount },
      clarifying_question: followUp.question,
      metadata,
    }
  }

  // Final answer path
  if (!predictionContext) {
    return {
      mode: 'final_answer',
      state,
      answer: {
        mode: 'final_answer',
        final_answer: {
          summary: 'Please calculate your chart first.',
          direct_answer: 'Your chart has not been calculated yet. Please go to your profile and calculate it before asking questions.',
          reason: 'No prediction context available.',
          astro_basis: [],
          practical_advice: 'Go to your profile and calculate your chart.',
          remedy: '',
          astrology_data_confidence: 0,
          astrology_data_confidence_reason: 'No chart calculated.',
          situation_confidence: 0,
          situation_confidence_reason: 'No chart calculated.',
          overall_confidence_score: 0,
          confidence_label: 'low',
          human_note: 'Chart calculation is required before guidance can be given.',
        },
      },
      rendered: 'Please calculate your chart first before asking questions.',
      metadata: {
        orchestrator_version: ORCHESTRATOR_VERSION,
        mode: 'final_answer',
        topic: state.topic,
        context_status: { selected_topic_context: 'missing' },
        validation_status: 'no_context',
      },
    }
  }

  // Safety gate: block if forbidden keys appear in context
  const safeContext = buildSafeContext(predictionContext)
  const ctxStr = JSON.stringify(safeContext)
  for (const k of FORBIDDEN_KEYS) {
    if (ctxStr.includes(`"${k}"`)) {
      console.error('orchestrator_safety_gate', { key: k, topic: state.topic })
      return {
        mode: 'final_answer',
        state,
        answer: SAFE_FALLBACK_ANSWER,
        rendered: SAFE_FALLBACK_RENDERED,
        metadata: {
          orchestrator_version: ORCHESTRATOR_VERSION,
          mode: 'final_answer',
          topic: state.topic,
          error_code: 'safety_gate',
          validation_status: 'blocked',
        },
      }
    }
  }

  const scores = computeConfidence(predictionContext, state)

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return {
      mode: 'final_answer',
      state,
      answer: SAFE_FALLBACK_ANSWER,
      rendered: SAFE_FALLBACK_RENDERED,
      metadata: {
        orchestrator_version: ORCHESTRATOR_VERSION,
        mode: 'final_answer',
        topic: state.topic,
        error_code: 'no_groq_key',
        validation_status: 'error',
      },
    }
  }

  const systemPrompt =
    buildSystemPrompt() +
    `\n\nConfidence guidance: set astrology_data_confidence to ${scores.astrology_data_confidence}, situation_confidence to ${scores.situation_confidence}, overall_confidence_score to ${scores.overall_confidence_score}, confidence_label to "${scores.confidence_label}".`

  const userPrompt = buildUserPrompt(state, predictionContext)
  const stableInput: AstrologyReadingInput = {
    userId: input.user_id,
    question: input.question,
    message: input.question,
    context: {
      predictionContext,
      state,
      safeContext,
      systemPrompt,
      userPrompt,
      groqKey,
      topic: state.topic,
    },
  }
  let validatedAnswer: typeof SAFE_FALLBACK_ANSWER | null = null

  const result = await generateAstrologyReadingWithRouter(stableInput, {
    stableGenerator: async (routerInput) => {
      const routerContext = (routerInput.context ?? {}) as Record<string, unknown>
      const routerPredictionContext = routerContext.predictionContext as PredictionContext
      const routerState = routerContext.state as ConversationState
      const routerSafeContext = routerContext.safeContext as ReturnType<typeof buildSafeContext>
      const routerSystemPrompt = routerContext.systemPrompt as string
      const routerUserPrompt = routerContext.userPrompt as string
      const routerGroqKey = routerContext.groqKey as string | undefined

      for (let attempt = 0; attempt < 2; attempt++) {
        let rawAnswer: string | null = null
        const repairHint =
          attempt === 1
            ? '\n\nIMPORTANT: Your previous response failed JSON validation. Return ONLY valid JSON matching the schema exactly. No extra text.'
            : ''

        try {
          const llmPayload = {
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: routerSystemPrompt + repairHint },
              { role: 'system', content: `prediction_context (do not recalculate):\n${JSON.stringify(routerSafeContext)}` },
              { role: 'user', content: routerUserPrompt },
            ],
            response_format: { type: 'json_object' },
            stream: false,
            temperature: 0.4,
            max_tokens: 900,
          }

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${routerGroqKey}`,
            },
            body: JSON.stringify(llmPayload),
          })

          if (!res.ok) throw new Error(`Groq ${res.status}`)
          const json = await res.json()
          rawAnswer = json.choices?.[0]?.message?.content ?? null
        } catch {
          console.error('orchestrator_groq_error', { attempt, topic: routerState.topic })
        }

        if (rawAnswer) {
          validatedAnswer = parseAndValidate(rawAnswer)
          if (validatedAnswer) break
        }
      }

      const metadata: Record<string, unknown> = {
        orchestrator_version: ORCHESTRATOR_VERSION,
        mode: 'final_answer',
        topic: routerState.topic,
        subtopic: routerState.subtopic,
        specificity: routerState.specificity,
        sub_questions_asked: routerState.sub_questions_asked,
        known_context: routerState.known_context,
        high_risk_flags: routerState.high_risk_flags ?? [],
        context_status: {
          selected_topic_context: routerState.topic,
          daily_transits: routerPredictionContext.expanded_context?.daily_transits_summary ? 'real' : 'not_available',
          panchang: routerPredictionContext.expanded_context?.panchang_summary ? 'real' : 'not_available',
          current_timing: routerPredictionContext.expanded_context?.current_timing_summary ? 'real' : 'not_available',
        },
        validation_status: validatedAnswer ? 'passed' : 'failed',
      }

      if (!validatedAnswer) {
        return {
          answer: SAFE_FALLBACK_RENDERED,
          text: SAFE_FALLBACK_RENDERED,
          message: SAFE_FALLBACK_RENDERED,
          meta: {
            version: 'stable',
            routedBy: 'astro-reading-router',
            ...metadata,
          },
        }
      }

      const rendered =
        validatedAnswer.mode === 'final_answer' && validatedAnswer.final_answer
          ? renderFinalAnswer(validatedAnswer.final_answer)
          : SAFE_FALLBACK_RENDERED

      return {
        answer: rendered,
        text: rendered,
        message: rendered,
        meta: {
          version: 'stable',
          routedBy: 'astro-reading-router',
          ...metadata,
        },
      }
    },
  })

  const finalAnswer = validatedAnswer ?? SAFE_FALLBACK_ANSWER
  const rendered = typeof result.text === 'string' ? result.text : SAFE_FALLBACK_RENDERED
  const metadata = (result.meta ?? {}) as Record<string, unknown>

  return {
    mode: 'final_answer',
    state,
    answer: finalAnswer as typeof SAFE_FALLBACK_ANSWER,
    rendered,
    metadata,
  }
}
