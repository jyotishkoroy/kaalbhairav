/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect } from 'vitest'

function sanitizeNext(raw: string | null | undefined): string {
  const val = raw ?? '/astro'
  if (val.startsWith('/') && !val.startsWith('//') && !val.includes(':')) return val
  return '/astro'
}

describe('sign-in next redirect sanitization', () => {
  it('allows /astro', () => {
    expect(sanitizeNext('/astro')).toBe('/astro')
  })

  it('allows /astro/setup', () => {
    expect(sanitizeNext('/astro/setup')).toBe('/astro/setup')
  })

  it('defaults to /astro when next is undefined', () => {
    expect(sanitizeNext(undefined)).toBe('/astro')
  })

  it('defaults to /astro when next is null', () => {
    expect(sanitizeNext(null)).toBe('/astro')
  })

  it('rejects absolute external URL', () => {
    expect(sanitizeNext('https://evil.com/steal')).toBe('/astro')
  })

  it('rejects protocol-relative URL', () => {
    expect(sanitizeNext('//evil.com/steal')).toBe('/astro')
  })

  it('rejects URL with colon (potential javascript:)', () => {
    expect(sanitizeNext('javascript:alert(1)')).toBe('/astro')
  })

  it('allows /still', () => {
    expect(sanitizeNext('/still')).toBe('/still')
  })

  it('allows /news', () => {
    expect(sanitizeNext('/news')).toBe('/news')
  })

  it('rejects empty string — defaults to /astro', () => {
    expect(sanitizeNext('')).toBe('/astro')
  })
})

describe('homepage card hrefs route through sign-in', () => {
  const PRIMARY_LINKS = [
    { label: 'Ask Guru', href: '/sign-in?next=%2Fastro' },
    { label: 'Still', href: '/sign-in?next=%2Fstill' },
    { label: 'News', href: '/sign-in?next=%2Fnews' },
  ]

  it('Ask Guru card href includes /sign-in?next=', () => {
    const askGuru = PRIMARY_LINKS.find(l => l.label === 'Ask Guru')
    expect(askGuru?.href).toContain('/sign-in?next=')
  })

  it('Still card href includes /sign-in?next=', () => {
    const still = PRIMARY_LINKS.find(l => l.label === 'Still')
    expect(still?.href).toContain('/sign-in?next=')
  })

  it('Ask Guru ultimately leads to /astro after decode', () => {
    const askGuru = PRIMARY_LINKS.find(l => l.label === 'Ask Guru')
    const url = new URL(askGuru!.href, 'http://localhost')
    expect(decodeURIComponent(url.searchParams.get('next')!)).toBe('/astro')
  })
})
