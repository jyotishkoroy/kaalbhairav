/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export function isE2ERateLimitDisabled(): boolean {
  return process.env.ASTRO_E2E_RATE_LIMIT_DISABLED === 'true'
}

export function logE2ERateLimitDisabled(route: string, limiter: string): void {
  if (process.env.ASTRO_E2E_DEBUG_RATE_LIMIT === 'true') {
    console.info('[astro_e2e_rate_limit_disabled]', { route, limiter })
  }
}
