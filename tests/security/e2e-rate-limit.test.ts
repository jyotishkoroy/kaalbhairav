import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isE2ERateLimitDisabled, logE2ERateLimitDisabled } from '@/lib/security/e2e-rate-limit'

describe('e2e rate limit helper', () => {
  const originalInfo = console.info

  beforeEach(() => {
    delete process.env.ASTRO_E2E_RATE_LIMIT_DISABLED
    delete process.env.ASTRO_E2E_DEBUG_RATE_LIMIT
    console.info = vi.fn()
  })

  afterEach(() => {
    console.info = originalInfo
  })

  it('defaults to enabled when env is missing', () => {
    expect(isE2ERateLimitDisabled()).toBe(false)
  })

  it('stays enabled when env is false', () => {
    process.env.ASTRO_E2E_RATE_LIMIT_DISABLED = 'false'
    expect(isE2ERateLimitDisabled()).toBe(false)
  })

  it('disables when env is true', () => {
    process.env.ASTRO_E2E_RATE_LIMIT_DISABLED = 'true'
    expect(isE2ERateLimitDisabled()).toBe(true)
  })

  it('logs without private data when debug is enabled', () => {
    process.env.ASTRO_E2E_DEBUG_RATE_LIMIT = 'true'
    logE2ERateLimitDisabled('/api/astro/ask', 'llm-free')
    expect(console.info).toHaveBeenCalledWith('[astro_e2e_rate_limit_disabled]', {
      route: '/api/astro/ask',
      limiter: 'llm-free',
    })
  })
})
