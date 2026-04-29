import { getLLMProvider, isLLMProviderDisabledError } from '@/lib/llm'
import type { LLMProvider } from '@/lib/llm/provider'

export type LocalAIRefineInput = {
  answer: string
  question: string
  provider?: LLMProvider
}

export type LocalAIRefineResult = {
  answer: string
  usedLLM: boolean
  provider: string
}

export type SafeLLMRefineInput = {
  answer: string
  question: string
  provider?: LLMProvider
  model?: string
  maxTokens?: number
  temperature?: number
  originalAnswer?: string
  topic?: string
  mode?: string
}

export type SafeLLMRefineResult = {
  answer: string
  usedLLM: boolean
  provider: string
  model?: string
  fallback: boolean
}

function buildSystemPrompt(): string {
  return [
    'You are a careful astrology writing assistant.',
    'Rewrite only for warmth, clarity, and natural human flow.',
    'Do not add new predictions.',
    'Do not add new astrology claims.',
    'Do not add new remedies.',
    'Do not replace a topic-specific answer with a generic disclaimer.',
    "Keep the user's topic: career, timing, remedy, relationship, money, or health exactly as provided.",
    'If the original answer contains safe practical steps, keep them.',
    'Do not add monthly guidance unless it already exists in the original answer.',
    'Do not add remedies unless they already exist in the original answer or the question explicitly asks for remedies.',
    'Do not turn a specific timing answer into a generic monthly report.',
    'Do not add separate career and relationship sections unless they were already present.',
    'Keep any specific date phrase unchanged.',
    'Do not add medical, legal, pregnancy, death, lifespan, gemstone, curse, miracle, or guaranteed claims.',
    'Do not remove safety boundaries or disclaimers.',
    'Do not mention AI.',
    'Preserve the original meaning exactly.',
  ].join(' ')
}

function buildUserPrompt(input: SafeLLMRefineInput): string {
  return [
    `Question: ${input.question}`,
    'Original safe deterministic answer:',
    input.answer,
    'Rewrite the answer to sound more natural, caring, and human.',
    'Preserve all safety boundaries and do not add any new factual claims.',
  ].join('\n\n')
}

function containsTopicText(text: string, question: string): boolean {
  const lowerText = text.toLowerCase()
  const lowerQuestion = question.toLowerCase()
  const terms = [
    'career',
    'job',
    'work',
    'promotion',
    'timing',
    'tomorrow',
    'today',
    'month',
    'date',
    'relationship',
    'marriage',
    'money',
    'health',
    'sleep',
    'remedy',
    'upay',
    'mantra',
  ]

  return terms.some((term) => lowerText.includes(term) || lowerQuestion.includes(term))
}

export function shouldAcceptRefinedAnswer(input: {
  originalAnswer: string
  refinedAnswer: string
  question: string
}): boolean {
  const original = input.originalAnswer.toLowerCase()
  const refined = input.refinedAnswer.toLowerCase()
  const question = input.question.toLowerCase()

  if (!refined.trim()) return false

  const originalHasMonthly = /monthly guidance|this month|month ahead/i.test(original)
  const refinedAddsMonthly =
    /monthly guidance|this month|month ahead/i.test(refined) && !originalHasMonthly
  if (refinedAddsMonthly) return false

  const originalHasRemedy = /remedy|upay|mantra|practice/i.test(original)
  const refinedAddsRemedy =
    /remedy|upay|mantra/i.test(refined) &&
    !originalHasRemedy &&
    !/remedy|upay|mantra/i.test(question)
  if (refinedAddsRemedy) return false

  const refinedAddsMultiTopicDump =
    refined.includes('career') &&
    refined.includes('relationship') &&
    !original.includes('career') &&
    !original.includes('relationship')

  if (refinedAddsMultiTopicDump) return false

  if (
    containsTopicText(original, question) &&
    !containsTopicText(refined, question)
  ) {
    return false
  }

  return true
}

export async function refineReadingWithSafeLLM(
  input: SafeLLMRefineInput,
): Promise<SafeLLMRefineResult> {
  const provider = input.provider ?? getLLMProvider()

  try {
    const result = await provider.generate({
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(input),
      temperature: input.temperature ?? 0.2,
      maxTokens: input.maxTokens ?? 900,
    })

    const text = result.text.trim()

    if (!text) {
      return {
        answer: input.answer,
        usedLLM: false,
        provider: result.provider,
        model: result.model,
        fallback: true,
      }
    }

    const originalAnswer = input.originalAnswer ?? input.answer

    if (
      !shouldAcceptRefinedAnswer({
        originalAnswer,
        refinedAnswer: text,
        question: input.question,
      })
    ) {
      return {
        answer: input.answer,
        usedLLM: false,
        provider: result.provider,
        model: result.model,
        fallback: true,
      }
    }

    return {
      answer: text,
      usedLLM: true,
      provider: result.provider,
      model: result.model,
      fallback: false,
    }
  } catch (error) {
    if (isLLMProviderDisabledError(error)) {
      return {
        answer: input.answer,
        usedLLM: false,
        provider: 'disabled',
        fallback: true,
      }
    }

    return {
      answer: input.answer,
      usedLLM: false,
      provider: provider.name,
      fallback: true,
    }
  }
}

export async function refineReadingWithLocalAI(
  input: LocalAIRefineInput,
): Promise<LocalAIRefineResult> {
  const result = await refineReadingWithSafeLLM(input)

  return {
    answer: result.answer,
    usedLLM: result.usedLLM,
    provider: result.provider,
  }
}
