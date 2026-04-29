/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, expect, it, vi } from 'vitest'
import { createOllamaProvider } from '@/lib/llm/ollama'

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })
}

describe('Ollama provider', () => {
  it('calls local Ollama generate endpoint with injected fetch', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        response: 'refined answer',
        model: 'llama3.1',
        done: true,
      }),
    )

    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434/',
      model: 'llama3.1',
      fetchImpl,
    })

    const result = await provider.generate({
      system: 'system prompt',
      prompt: 'user prompt',
      temperature: 0.1,
      maxTokens: 100,
    })

    expect(result).toEqual({
      text: 'refined answer',
      provider: 'ollama',
      model: 'llama3.1',
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = ((fetchImpl.mock.calls[0] ?? []) as unknown) as [
      string,
      RequestInit | undefined,
    ]

    expect(url).toBe('http://localhost:11434/api/generate')
    expect(init?.method).toBe('POST')
    expect(String(init?.body)).toContain('llama3.1')
    expect(String(init?.body)).toContain('stream')
  })

  it('throws on non-ok response', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(
        {
          error: 'failed',
        },
        500,
      ),
    )

    const provider = createOllamaProvider({
      fetchImpl,
    })

    await expect(
      provider.generate({
        system: 'system',
        prompt: 'prompt',
      }),
    ).rejects.toThrow('Ollama request failed with status 500')
  })

  it('throws on Ollama error payload', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        error: 'model not found',
      }),
    )

    const provider = createOllamaProvider({
      fetchImpl,
    })

    await expect(
      provider.generate({
        system: 'system',
        prompt: 'prompt',
      }),
    ).rejects.toThrow('model not found')
  })
})
