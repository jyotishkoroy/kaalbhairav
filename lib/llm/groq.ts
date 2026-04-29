/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type {
  LLMGenerateInput,
  LLMGenerateResult,
  LLMProvider,
} from '@/lib/llm/provider'

export type GroqChatCompletionResponse = {
  id?: string
  model?: string
  choices?: Array<{
    message?: {
      content?: string
    }
    finish_reason?: string
  }>
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

export type GroqProviderOptions = {
  apiKey?: string
  model?: string
  baseUrl?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const DEFAULT_GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'
const DEFAULT_GROQ_TIMEOUT_MS = 5000

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function createAbortSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(timeoutMs)
  }

  return undefined
}

export function createGroqProvider(
  options: GroqProviderOptions = {},
): LLMProvider {
  const apiKey = options.apiKey ?? process.env.GROQ_API_KEY
  const model = options.model ?? process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? process.env.GROQ_BASE_URL ?? DEFAULT_GROQ_BASE_URL,
  )
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs =
    options.timeoutMs ??
    Number(process.env.GROQ_TIMEOUT_MS || DEFAULT_GROQ_TIMEOUT_MS)

  return {
    name: 'groq',

    async generate(input: LLMGenerateInput): Promise<LLMGenerateResult> {
      if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured')
      }

      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: input.system,
            },
            {
              role: 'user',
              content: input.prompt,
            },
          ],
          temperature: input.temperature ?? 0.2,
          max_completion_tokens: input.maxTokens ?? 900,
          stream: false,
        }),
        signal: createAbortSignal(timeoutMs),
      })

      if (!response.ok) {
        throw new Error(`Groq request failed with status ${response.status}`)
      }

      const data = (await response.json()) as GroqChatCompletionResponse

      if (data.error?.message) {
        throw new Error(data.error.message)
      }

      return {
        text: data.choices?.[0]?.message?.content ?? '',
        provider: 'groq',
        model: data.model ?? model,
      }
    },
  }
}

export const groqProvider = createGroqProvider()
