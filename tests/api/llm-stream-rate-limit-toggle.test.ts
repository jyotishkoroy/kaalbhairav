import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const limitSpy = vi.fn(async () => ({ success: true, remaining: 19 }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({})),
  },
}))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static fixedWindow() {
      return {}
    }
    async limit() {
      return limitSpy()
    }
  },
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/llm/stream/route'
import { createClient } from '@/lib/supabase/server'

function makeRequest(body: unknown) {
  return new NextRequest('https://www.tarayai.com/api/llm/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ASTRO_E2E_RATE_LIMIT_DISABLED = 'false'
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.com'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  process.env.GROQ_API_KEY = 'groq-key'
})

afterEach(() => {
  delete process.env.ASTRO_E2E_RATE_LIMIT_DISABLED
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.GROQ_API_KEY
})

describe('POST /api/llm/stream rate-limit toggle', () => {
  it('requires auth when the E2E toggle is enabled', async () => {
    process.env.ASTRO_E2E_RATE_LIMIT_DISABLED = 'true'
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } as never)

    const response = await POST(makeRequest({ question: 'hello' }))

    expect(response.status).toBe(401)
  })

  it('skips the llm free limiter when the E2E toggle is enabled', async () => {
    process.env.ASTRO_E2E_RATE_LIMIT_DISABLED = 'true'
    limitSpy.mockClear()
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table: string) => {
        if (table === 'site_config') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { value: true } }),
          }
        }
        if (table === 'birth_charts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    } as never)

    const mockStream = new ReadableStream({
      start(controller) {
        controller.close()
      },
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream) as never)

    const response = await POST(makeRequest({ question: 'hello' }))

    expect(response.status).toBe(200)
    expect(limitSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
