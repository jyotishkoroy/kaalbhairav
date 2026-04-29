/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getUser, runOrchestrator } = vi.hoisted(() => ({
  getUser: vi.fn(async () => ({ data: { user: { id: 'user-test' } } })),
  runOrchestrator: vi.fn(async () => ({
    mode: 'final_answer',
    state: { topic: 'career' },
    answer: { final_answer: { direct_answer: 'stable answer' } },
    rendered: 'stable answer from orchestrator',
    metadata: { validation_status: 'passed' },
  })),
}))

const summaryRecord = {
  id: 'summary-1',
  chart_version_id: 'chart-version-1',
  prediction_context: {
    do_not_recalculate: true,
    chart_identity: {
      profile_id: 'profile-1',
      chart_version_id: 'chart-version-1',
      schema_version: '1.0.0',
      engine_version: '1.0.0',
      ephemeris_version: '1.0.0',
      calculation_status: 'calculated',
    },
    confidence: {},
    warnings: [],
    core_natal_summary: { lagna_sign: 'Gemini', moon_sign: 'Virgo' },
    life_area_signatures: {},
    current_timing: {},
    dashas: {},
    doshas: {},
    expanded_context: {
      daily_transits_summary: 'Moon in Scorpio',
      panchang_summary: 'Tithi: Navami',
      current_timing_summary: 'Jupiter Mahadasha',
      navamsa_lagna: null,
      navamsa_summary: null,
      aspects_summary: null,
      life_areas_summary: null,
      sections_unavailable: [],
    },
    allowed_astro_terms: [],
    unsupported_fields: [],
    llm_instructions: {},
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'prediction_ready_summaries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn(async () => ({ data: summaryRecord, error: null })),
                    })),
                  })),
                })),
              })),
            })),
          })),
        }
      }

      if (table === 'astro_chat_messages') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                not: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(async () => ({ data: [{ classifier_result: { mode: 'final_answer' } }], error: null })),
                  })),
                })),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'message-1' }, error: null })),
            })),
          })),
        }
      }

      if (table === 'astro_chat_sessions') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'session-1' }, error: null })),
            })),
          })),
        }
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      }
    }),
  })),
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
      return { success: true, remaining: 19 }
    }
  },
}))

vi.mock('@/lib/astro/conversation/orchestrator', () => ({
  runOrchestrator,
}))

import { POST } from '@/app/api/astro/v1/chat/route'

const ORIGINAL_ENV = { ...process.env }

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/astro/v1/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Phase 1 baseline - chat API response shape', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    process.env.ASTRO_V1_API_ENABLED = 'true'
    process.env.ASTRO_V1_CHAT_ENABLED = 'true'
    process.env.ASTRO_CONVERSATION_ORCHESTRATOR_ENABLED = 'true'
    delete process.env.ASTRO_READING_V2_ENABLED
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns a compatible response shape for the career baseline request', async () => {
    const response = await POST(
      makeRequest({
        profile_id: '123e4567-e89b-12d3-a456-426614174000',
        question: 'I am working hard but not getting promotion. When will things improve?',
      }) as never,
    )

    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(500)
    const body = await response.text()
    expect(body).toContain('data:')
    expect(body).toContain('done')
  })
})
