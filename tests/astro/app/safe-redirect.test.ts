/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect } from 'vitest'
import { getSafeRelativeRedirect } from '@/lib/security/safe-redirect'

describe('getSafeRelativeRedirect', () => {
  it('allows /astro', () => {
    expect(getSafeRelativeRedirect('/astro')).toBe('/astro')
  })

  it('allows /astro/setup', () => {
    expect(getSafeRelativeRedirect('/astro/setup')).toBe('/astro/setup')
  })

  it('allows /news', () => {
    expect(getSafeRelativeRedirect('/news')).toBe('/news')
  })

  it('rejects absolute external URL', () => {
    expect(getSafeRelativeRedirect('https://evil.com')).toBe('/astro')
  })

  it('rejects protocol-relative URL //evil.com', () => {
    expect(getSafeRelativeRedirect('//evil.com')).toBe('/astro')
  })

  it('rejects javascript: URL', () => {
    expect(getSafeRelativeRedirect('javascript:alert(1)')).toBe('/astro')
  })

  it('returns fallback for null', () => {
    expect(getSafeRelativeRedirect(null)).toBe('/astro')
  })

  it('returns fallback for undefined', () => {
    expect(getSafeRelativeRedirect(undefined)).toBe('/astro')
  })

  it('returns fallback for empty string', () => {
    expect(getSafeRelativeRedirect('')).toBe('/astro')
  })

  it('rejects path with control character', () => {
    expect(getSafeRelativeRedirect('/astro\x00evil')).toBe('/astro')
  })

  it('uses custom fallback when provided', () => {
    expect(getSafeRelativeRedirect('https://evil.com', '/home')).toBe('/home')
  })

  it('allows nested path /astro/setup?step=terms', () => {
    // Paths with query strings — no colon in the path segment itself
    // Actually this has ? which is fine but no colon
    expect(getSafeRelativeRedirect('/astro/setup?step=terms')).toBe('/astro/setup?step=terms')
  })
})
