import type {
  LLMProviderConfig,
  LLMProviderName,
} from '@/lib/llm/provider'

function normalizeProviderName(value: string | undefined): LLMProviderName {
  const normalized = value?.trim().toLowerCase()

  if (normalized === 'ollama') return 'ollama'

  return 'disabled'
}

export function getLLMProviderConfig(): LLMProviderConfig {
  const provider = normalizeProviderName(process.env.ASTRO_LLM_PROVIDER)

  return {
    provider,
    enabled: provider !== 'disabled',
    model: process.env.OLLAMA_MODEL,
    baseUrl: process.env.OLLAMA_BASE_URL,
  }
}

export function isLocalLLMEnabled(): boolean {
  return getLLMProviderConfig().enabled
}
