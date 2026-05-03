/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/server'

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    'https://*.supabase.co',
    'https://*.supabase.in',
    'wss://*.supabase.co',
    'https://nominatim.openstreetmap.org',
    'https://api.open-meteo.com',
    'https://timeapi.io',
    'https://api.geotimezone.com',
    'https://accounts.google.com',
    'https://*.googleapis.com',
    'https://*.vercel-scripts.com',
  ].join(' '),
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
].join('; ')

export async function proxy(request: NextRequest) {
  const response = await updateSession(request)

  response.headers.set('Content-Security-Policy', CSP)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.delete('x-powered-by')
    response.headers.delete('server')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)',
  ],
}
