export type LLMGenerateInput = {
  system: string
  prompt: string
  temperature?: number
  maxTokens?: number
}

export type LLMGenerateResult = {
  text: string
  provider: string
  model?: string
}

export type LLMProvider = {
  readonly name: string
  generate(input: LLMGenerateInput): Promise<LLMGenerateResult>
}

export type LLMProviderName = 'disabled' | 'ollama'

export type LLMProviderConfig = {
  provider: LLMProviderName
  model?: string
  baseUrl?: string
  enabled: boolean
}

export function isLLMGenerateInput(value: unknown): value is LLMGenerateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    typeof record.system === 'string' &&
    record.system.trim().length > 0 &&
    typeof record.prompt === 'string' &&
    record.prompt.trim().length > 0
  )
}
