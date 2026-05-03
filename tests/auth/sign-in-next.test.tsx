/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  buttonProps: null as null | { nextPath?: string },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: state.user } })) },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { value: true }, error: null }),
        }),
      }),
    })),
  })),
}))

vi.mock('@/app/sign-in/sign-in-button', () => ({
  default: (props: { nextPath?: string }) => {
    state.buttonProps = props
    return null
  },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect')
  }),
}))

describe('sign-in next preservation', () => {
  it('passes /astro to the button when next is missing', async () => {
    state.user = null
    state.buttonProps = null
    const { default: SignInPage } = await import('@/app/sign-in/page')
    renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({}) } as never))
    expect((state.buttonProps as { nextPath?: string } | null)?.nextPath).toBe('/astro')
  })

  it('preserves /astro/setup', async () => {
    state.user = null
    state.buttonProps = null
    const { default: SignInPage } = await import('@/app/sign-in/page')
    renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({ next: '/astro/setup' }) } as never))
    expect((state.buttonProps as { nextPath?: string } | null)?.nextPath).toBe('/astro/setup')
  })

  it('sanitizes external next values back to /astro', async () => {
    state.user = null
    state.buttonProps = null
    const { default: SignInPage } = await import('@/app/sign-in/page')
    renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({ next: 'https://evil.com' }) } as never))
    expect((state.buttonProps as { nextPath?: string } | null)?.nextPath).toBe('/astro')
  })

  it('redirects authenticated users to the safe next path', async () => {
    state.user = { id: 'u1' }
    const { default: SignInPage } = await import('@/app/sign-in/page')
    await expect(SignInPage({ searchParams: Promise.resolve({ next: '/astro/setup' }) } as never)).rejects.toThrow('redirect')
  })
})
