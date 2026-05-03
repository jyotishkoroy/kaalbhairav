/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest'
import { getSafeRelativeRedirect } from '@/lib/security/safe-redirect'

describe('getSafeRelativeRedirect', () => {
  it('allows /astro', () => {
    expect(getSafeRelativeRedirect('/astro')).toBe('/astro')
  })

  it('allows /astro/setup', () => {
    expect(getSafeRelativeRedirect('/astro/setup')).toBe('/astro/setup')
  })

  it('falls back to /astro for missing input', () => {
    expect(getSafeRelativeRedirect(undefined)).toBe('/astro')
    expect(getSafeRelativeRedirect(null)).toBe('/astro')
    expect(getSafeRelativeRedirect('')).toBe('/astro')
  })

  it('rejects external URLs', () => {
    expect(getSafeRelativeRedirect('https://evil.com')).toBe('/astro')
    expect(getSafeRelativeRedirect('//evil.com')).toBe('/astro')
  })

  it('rejects encoded and backslash-based external forms', () => {
    expect(getSafeRelativeRedirect('%2F%2Fevil.com')).toBe('/astro')
    expect(getSafeRelativeRedirect('/%5Cevil')).toBe('/astro')
  })

  it('rejects control characters', () => {
    expect(getSafeRelativeRedirect('/astro\x00evil')).toBe('/astro')
  })

  it('allows "/" when explicitly provided', () => {
    expect(getSafeRelativeRedirect('/')).toBe('/')
  })

  it('uses a custom fallback when provided', () => {
    expect(getSafeRelativeRedirect('https://evil.com', '/home')).toBe('/home')
  })
})
