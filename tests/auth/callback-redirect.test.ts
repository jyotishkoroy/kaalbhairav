/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  exchangeError: null as null | { message: string },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({ error: state.exchangeError })),
    },
  })),
}))

describe('auth callback redirects', () => {
  it('redirects successful exchange to /astro', async () => {
    state.exchangeError = null
    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('http://localhost/auth/callback?code=abc&next=/astro'))
    expect(new URL(response.headers.get('location') ?? '', 'http://localhost').pathname).toBe('/astro')
  })

  it('preserves /astro/setup', async () => {
    state.exchangeError = null
    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('http://localhost/auth/callback?code=abc&next=/astro/setup'))
    expect(new URL(response.headers.get('location') ?? '', 'http://localhost').pathname).toBe('/astro/setup')
  })

  it('defaults missing next to /astro', async () => {
    state.exchangeError = null
    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('http://localhost/auth/callback?code=abc'))
    expect(new URL(response.headers.get('location') ?? '', 'http://localhost').pathname).toBe('/astro')
  })

  it('sanitizes external next values', async () => {
    state.exchangeError = null
    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('http://localhost/auth/callback?code=abc&next=https://evil.com'))
    expect(new URL(response.headers.get('location') ?? '', 'http://localhost').pathname).toBe('/astro')
  })

  it('redirects exchange failures back to sign-in with safe next', async () => {
    state.exchangeError = { message: 'boom' }
    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('http://localhost/auth/callback?code=abc&next=/astro'))
    const url = new URL(response.headers.get('location') ?? '', 'http://localhost')
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('next')).toBe('/astro')
    expect(url.searchParams.get('error')).toBe('auth_callback_failed')
  })

  it('redirects missing code back to sign-in with safe next', async () => {
    state.exchangeError = null
    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('http://localhost/auth/callback?next=/astro'))
    const url = new URL(response.headers.get('location') ?? '', 'http://localhost')
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('next')).toBe('/astro')
    expect(url.searchParams.get('error')).toBe('missing_code')
  })
})
