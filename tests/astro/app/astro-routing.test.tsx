/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string; user_metadata?: Record<string, unknown> },
  activeProfile: null as null | Record<string, unknown>,
  latestChart: null as null | Record<string, unknown>,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: state.user } })) },
  })),
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'birth_profiles') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: state.activeProfile, error: null }) }),
            }),
          }),
        }
      }
      if (table === 'chart_json_versions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({ maybeSingle: async () => ({ data: state.latestChart, error: null }) }),
              }),
            }),
          }),
        }
      }
      return { select: () => ({}) }
    }),
  })),
}))

vi.mock('@/app/astro/components/BirthProfileForm', () => ({
  BirthProfileForm: () => <div>BirthProfileForm</div>,
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(url)
  }),
}))

describe('astro routing', () => {
  it('redirects unauthenticated users to /sign-in?next=/astro', async () => {
    state.user = null
    const { default: AstroPage } = await import('@/app/astro/page')
    await expect(AstroPage()).rejects.toThrow('/sign-in?next=/astro')
  })

  it('redirects authenticated users without a profile to /astro/setup', async () => {
    state.user = { id: 'u1' }
    state.activeProfile = null
    const { default: AstroPage } = await import('@/app/astro/page')
    await expect(AstroPage()).rejects.toThrow('/astro/setup')
  })

  it('renders the page when a profile and chart exist', async () => {
    state.user = { id: 'u1' }
    state.activeProfile = { id: 'p1', terms_accepted_at: '2026-05-01T00:00:00.000Z', terms_accepted_version: '1' }
    state.latestChart = { id: 'c1' }
    const { default: AstroPage } = await import('@/app/astro/page')
    const html = renderToStaticMarkup(await AstroPage())
    expect(html).toContain('Ask Guru')
  })

  it('redirects unauthenticated users from /astro/setup to sign-in with setup next', async () => {
    state.user = null
    const { default: AstroSetupPage } = await import('@/app/astro/setup/page')
    await expect(AstroSetupPage({ searchParams: Promise.resolve({}) } as never)).rejects.toThrow('/sign-in?next=/astro/setup')
  })

  it('renders the setup page for authenticated users', async () => {
    state.user = { id: 'u1', email: 'user@example.com', user_metadata: { name: 'User' } }
    state.activeProfile = null
    const { default: AstroSetupPage } = await import('@/app/astro/setup/page')
    const html = renderToStaticMarkup(await AstroSetupPage({ searchParams: Promise.resolve({}) } as never))
    expect(html).toContain('Your birth details')
    expect(html).toContain('BirthProfileForm')
  })
})
