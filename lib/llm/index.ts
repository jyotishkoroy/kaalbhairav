import { disabledLLMProvider } from '@/lib/llm/disabled'
import { createOllamaProvider } from '@/lib/llm/ollama'
import { getLLMProviderConfig } from '@/lib/llm/config'
import type { LLMProvider } from '@/lib/llm/provider'

export * from '@/lib/llm/provider'
export * from '@/lib/llm/disabled'
export * from '@/lib/llm/ollama'
export * from '@/lib/llm/config'

export function getLLMProvider(): LLMProvider {
  const config = getLLMProviderConfig()

  if (config.provider === 'ollama') {
    return createOllamaProvider({
      baseUrl: config.baseUrl,
      model: config.model,
    })
  }

  return disabledLLMProvider
}
