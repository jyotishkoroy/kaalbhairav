/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type {
  LLMProviderConfig,
  LLMProviderName,
} from '@/lib/llm/provider'

function normalizeProviderName(value: string | undefined): LLMProviderName {
  const normalized = value?.trim().toLowerCase()

  if (normalized === 'ollama') return 'ollama'
  if (normalized === 'groq') return 'groq'

  return 'disabled'
}

export type LLMRefinerConfig = {
  enabled: boolean
  provider: LLMProviderName
  model?: string
  maxTokens: number
  temperature: number
  timeoutMs: number
}

function readBooleanEnv(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value == null) return defaultValue

  const normalized = value.trim().toLowerCase()

  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false

  return defaultValue
}

function readNumberEnv(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue

  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
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

export function getLLMRefinerConfig(): LLMRefinerConfig {
  const providerConfig = getLLMProviderConfig()

  return {
    enabled:
      providerConfig.enabled &&
      readBooleanEnv(process.env.ASTRO_LLM_REFINER_ENABLED, false),
    provider: providerConfig.provider,
    model:
      providerConfig.provider === 'groq'
        ? process.env.GROQ_MODEL
        : providerConfig.model,
    maxTokens: readNumberEnv(process.env.GROQ_MAX_TOKENS, 900),
    temperature: readNumberEnv(process.env.GROQ_TEMPERATURE, 0.2),
    timeoutMs: readNumberEnv(process.env.GROQ_TIMEOUT_MS, 5000),
  }
}

export function isLLMRefinerEnabled(): boolean {
  return getLLMRefinerConfig().enabled
}
