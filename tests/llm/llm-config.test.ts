/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getLLMProvider,
  getLLMProviderConfig,
  getLLMRefinerConfig,
  isLocalLLMEnabled,
  isLLMRefinerEnabled,
} from '@/lib/llm'

const ORIGINAL_ENV = process.env

describe('LLM provider config', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.ASTRO_LLM_PROVIDER
    delete process.env.ASTRO_LLM_REFINER_ENABLED
    delete process.env.OLLAMA_BASE_URL
    delete process.env.OLLAMA_MODEL
    delete process.env.GROQ_MODEL
    delete process.env.GROQ_MAX_TOKENS
    delete process.env.GROQ_TEMPERATURE
    delete process.env.GROQ_TIMEOUT_MS
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

  it('supports groq provider config', () => {
    process.env.ASTRO_LLM_PROVIDER = 'groq'
    process.env.GROQ_MODEL = 'openai/gpt-oss-120b'

    expect(getLLMProviderConfig()).toMatchObject({
      provider: 'groq',
      enabled: true,
    })
    expect(isLocalLLMEnabled()).toBe(true)
    expect(getLLMProvider().name).toBe('groq')
  })

  it('keeps refiner disabled by default even when provider is groq', () => {
    process.env.ASTRO_LLM_PROVIDER = 'groq'

    expect(getLLMRefinerConfig()).toMatchObject({
      provider: 'groq',
      enabled: false,
    })
    expect(isLLMRefinerEnabled()).toBe(false)
  })

  it('enables refiner only when provider and refiner flag are enabled', () => {
    process.env.ASTRO_LLM_PROVIDER = 'groq'
    process.env.ASTRO_LLM_REFINER_ENABLED = 'true'
    process.env.GROQ_MODEL = 'openai/gpt-oss-120b'
    process.env.GROQ_MAX_TOKENS = '900'
    process.env.GROQ_TEMPERATURE = '0.2'
    process.env.GROQ_TIMEOUT_MS = '5000'

    expect(getLLMRefinerConfig()).toMatchObject({
      provider: 'groq',
      enabled: true,
      model: 'openai/gpt-oss-120b',
      maxTokens: 900,
      temperature: 0.2,
      timeoutMs: 5000,
    })
    expect(isLLMRefinerEnabled()).toBe(true)
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
