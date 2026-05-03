/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

/**
 * Returns a safe relative redirect path.
 * Only allows paths starting with a single `/` and containing no colons or control characters.
 * Rejects absolute URLs, protocol-relative URLs, and paths with colons.
 */
export function getSafeRelativeRedirect(input: unknown, fallback = '/astro'): string {
  if (typeof input !== 'string' || !input) return fallback
  const trimmed = input.trim()
  const hasControlChar = trimmed.split('').some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes(':') &&
    !hasControlChar
  ) {
    return trimmed
  }
  return fallback
}
