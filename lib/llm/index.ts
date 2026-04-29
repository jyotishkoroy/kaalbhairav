/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { disabledLLMProvider } from '@/lib/llm/disabled'
import { createGroqProvider } from '@/lib/llm/groq'
import { createOllamaProvider } from '@/lib/llm/ollama'
import { getLLMProviderConfig } from '@/lib/llm/config'
import type { LLMProvider } from '@/lib/llm/provider'

export * from '@/lib/llm/provider'
export * from '@/lib/llm/disabled'
export * from '@/lib/llm/groq'
export * from '@/lib/llm/ollama'
export * from '@/lib/llm/config'

export function getLLMProvider(): LLMProvider {
  const config = getLLMProviderConfig()

  if (config.provider === 'groq') {
    return createGroqProvider({
      model: process.env.GROQ_MODEL,
      timeoutMs: Number(process.env.GROQ_TIMEOUT_MS || 5000),
    })
  }

  if (config.provider === 'ollama') {
    return createOllamaProvider({
      baseUrl: config.baseUrl,
      model: config.model,
    })
  }

  return disabledLLMProvider
}
