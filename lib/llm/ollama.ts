/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type {
  LLMGenerateInput,
  LLMGenerateResult,
  LLMProvider,
} from '@/lib/llm/provider'

export type OllamaGenerateResponse = {
  response?: string
  model?: string
  done?: boolean
  error?: string
}

export type OllamaProviderOptions = {
  baseUrl?: string
  model?: string
  fetchImpl?: typeof fetch
}

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434'
const DEFAULT_OLLAMA_MODEL = 'llama3.1'

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

export function createOllamaProvider(
  options: OllamaProviderOptions = {},
): LLMProvider {
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
  )
  const model =
    options.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL
  const fetchImpl = options.fetchImpl ?? fetch

  return {
    name: 'ollama',

    async generate(input: LLMGenerateInput): Promise<LLMGenerateResult> {
      const response = await fetchImpl(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: `${input.system}\n\n${input.prompt}`,
          stream: false,
          options: {
            temperature: input.temperature ?? 0.2,
            num_predict: input.maxTokens ?? 700,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`)
      }

      const data = (await response.json()) as OllamaGenerateResponse

      if (data.error) {
        throw new Error(data.error)
      }

      return {
        text: data.response ?? '',
        provider: 'ollama',
        model: data.model ?? model,
      }
    },
  }
}

export const ollamaProvider = createOllamaProvider()
