/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

type OriginCheckResult = { ok: true } | { ok: false; status: number; error: string }
type RateLimitResult = { ok: boolean; retryAfterSeconds?: number }

// In-memory rate limit buckets — best-effort per serverless instance
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function cleanStaleBuckets() {
  const now = Date.now()
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt < now) rateBuckets.delete(key)
  }
}

export function getClientIp(request: Request): string {
  const headers = request.headers as unknown as Headers
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  if (rateBuckets.size > 5000) cleanStaleBuckets()

  const now = Date.now()
  const existing = rateBuckets.get(key)

  if (!existing || existing.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000)
    return { ok: false, retryAfterSeconds }
  }

  existing.count++
  return { ok: true }
}

function getAllowedOrigins(req: Request): Set<string> {
  const origins = new Set<string>()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) {
    try { origins.add(new URL(siteUrl).origin) } catch { /* ignore malformed */ }
  }
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    origins.add(`https://${vercelUrl}`)
  }
  // Allow same-origin based on the request URL
  try {
    origins.add(new URL(req.url).origin)
  } catch { /* ignore */ }
  // Always allow localhost in non-production
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000')
    origins.add('http://localhost:3001')
    origins.add('http://127.0.0.1:3000')
  }
  return origins
}

export function assertSameOriginRequest(request: Request): OriginCheckResult {
  const method = request.method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { ok: true }

  const headers = request.headers as unknown as Headers
  const origin = headers.get('origin')
  const referer = headers.get('referer')
  const allowed = getAllowedOrigins(request)

  if (origin) {
    if (allowed.has(origin)) return { ok: true }
    return { ok: false, status: 403, error: 'forbidden_origin' }
  }

  // Fall back to Referer check
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (allowed.has(refOrigin)) return { ok: true }
    } catch { /* ignore */ }
    return { ok: false, status: 403, error: 'forbidden_origin' }
  }

  // In production, reject missing origin for browser-facing routes
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, status: 403, error: 'forbidden_origin' }
  }

  return { ok: true }
}
