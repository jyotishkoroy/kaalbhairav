/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { describe, expect, it, vi } from 'vitest'
import { createGroqProvider } from '@/lib/llm/groq'

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })
}

describe('Groq provider', () => {
  it('calls Groq chat completions endpoint with injected fetch', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        model: 'openai/gpt-oss-120b',
        choices: [
          {
            message: {
              content: 'refined answer',
            },
            finish_reason: 'stop',
          },
        ],
      }),
    )

    const provider = createGroqProvider({
      apiKey: 'test-key',
      model: 'openai/gpt-oss-120b',
      baseUrl: 'https://api.groq.com/openai/v1/',
      fetchImpl,
      timeoutMs: 5000,
    })

    const result = await provider.generate({
      system: 'system prompt',
      prompt: 'user prompt',
      temperature: 0.2,
      maxTokens: 900,
    })

    expect(result).toEqual({
      text: 'refined answer',
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const callArgs = fetchImpl.mock.calls[0] as unknown as
      | [string, RequestInit | undefined]
      | undefined
    const url = callArgs?.[0]
    const init = callArgs?.[1]

    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect(init?.method).toBe('POST')
    expect(String(init?.body)).toContain('openai/gpt-oss-120b')
    expect(String(init?.body)).toContain('stream')
    expect(JSON.stringify(init?.headers)).not.toContain('gsk_')
  })

  it('throws when API key is missing', async () => {
    const provider = createGroqProvider({
      apiKey: '',
      fetchImpl: vi.fn(),
    })

    await expect(
      provider.generate({
        system: 'system',
        prompt: 'prompt',
      }),
    ).rejects.toThrow('GROQ_API_KEY is not configured')
  })

  it('throws on non-ok response', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(
        {
          error: {
            message: 'rate limited',
          },
        },
        429,
      ),
    )

    const provider = createGroqProvider({
      apiKey: 'test-key',
      fetchImpl,
    })

    await expect(
      provider.generate({
        system: 'system',
        prompt: 'prompt',
      }),
    ).rejects.toThrow('Groq request failed with status 429')
  })

  it('throws on Groq error payload', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        error: {
          message: 'model not found',
        },
      }),
    )

    const provider = createGroqProvider({
      apiKey: 'test-key',
      fetchImpl,
    })

    await expect(
      provider.generate({
        system: 'system',
        prompt: 'prompt',
      }),
    ).rejects.toThrow('model not found')
  })

  it('returns empty text safely when no choice is present', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse({}))

    const provider = createGroqProvider({
      apiKey: 'test-key',
      fetchImpl,
    })

    const result = await provider.generate({
      system: 'system',
      prompt: 'prompt',
    })

    expect(result.text).toBe('')
    expect(result.provider).toBe('groq')
  })
})
