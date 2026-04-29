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

function buildSystemPrompt(): string {
  return [
    'You are a careful astrology writing assistant.',
    'Rewrite only for clarity and warmth.',
    'Do not add new predictions.',
    'Do not add medical, legal, death, gemstone, or guaranteed claims.',
    'Preserve the original meaning.',
  ].join(' ')
}

function buildUserPrompt(input: LocalAIRefineInput): string {
  return [
    `Question: ${input.question}`,
    'Original deterministic answer:',
    input.answer,
    'Rewrite it to sound more natural while preserving all safety boundaries.',
  ].join('\n\n')
}

export async function refineReadingWithLocalAI(
  input: LocalAIRefineInput,
): Promise<LocalAIRefineResult> {
  const provider = input.provider ?? getLLMProvider()

  try {
    const result = await provider.generate({
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(input),
      temperature: 0.2,
      maxTokens: 900,
    })

    const text = result.text.trim()

    if (!text) {
      return {
        answer: input.answer,
        usedLLM: false,
        provider: result.provider,
      }
    }

    return {
      answer: text,
      usedLLM: true,
      provider: result.provider,
    }
  } catch (error) {
    if (isLLMProviderDisabledError(error)) {
      return {
        answer: input.answer,
        usedLLM: false,
        provider: 'disabled',
      }
    }

    return {
      answer: input.answer,
      usedLLM: false,
      provider: provider.name,
    }
  }
}
