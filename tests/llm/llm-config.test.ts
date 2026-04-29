import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getLLMProvider,
  getLLMProviderConfig,
  isLocalLLMEnabled,
} from '@/lib/llm'

const ORIGINAL_ENV = process.env

describe('LLM provider config', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.ASTRO_LLM_PROVIDER
    delete process.env.OLLAMA_BASE_URL
    delete process.env.OLLAMA_MODEL
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('defaults to disabled', () => {
    expect(getLLMProviderConfig()).toMatchObject({
      provider: 'disabled',
      enabled: false,
    })
    expect(isLocalLLMEnabled()).toBe(false)
    expect(getLLMProvider().name).toBe('disabled')
  })

  it('supports ollama provider config', () => {
    process.env.ASTRO_LLM_PROVIDER = 'ollama'
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    process.env.OLLAMA_MODEL = 'llama3.1'

    expect(getLLMProviderConfig()).toMatchObject({
      provider: 'ollama',
      enabled: true,
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1',
    })
    expect(isLocalLLMEnabled()).toBe(true)
    expect(getLLMProvider().name).toBe('ollama')
  })

  it('falls back to disabled for unknown providers', () => {
    process.env.ASTRO_LLM_PROVIDER = 'openai'

    expect(getLLMProviderConfig()).toMatchObject({
      provider: 'disabled',
      enabled: false,
    })
  })

  it('treats enabled as disabled because only disabled and ollama are supported', () => {
    process.env.ASTRO_LLM_PROVIDER = 'enabled'

    expect(getLLMProviderConfig()).toMatchObject({
      provider: 'disabled',
      enabled: false,
    })
    expect(isLocalLLMEnabled()).toBe(false)
    expect(getLLMProvider().name).toBe('disabled')
  })
})
