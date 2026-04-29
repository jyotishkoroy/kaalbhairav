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
