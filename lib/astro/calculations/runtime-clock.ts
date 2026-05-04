/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type AstroRuntimeClock = {
  currentUtc: string
  asOfDate?: string
}

export function normalizeRuntimeClock(input?: Partial<AstroRuntimeClock>): AstroRuntimeClock {
  const currentUtc = input?.currentUtc ?? new Date().toISOString()
  const parsed = new Date(currentUtc)

  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Invalid currentUtc: ${currentUtc}`)
  }

  const normalizedCurrentUtc = parsed.toISOString()
  const asOfDate = input?.asOfDate ?? normalizedCurrentUtc.slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
    throw new Error(`Invalid asOfDate: ${asOfDate}`)
  }

  return {
    currentUtc: normalizedCurrentUtc,
    asOfDate,
  }
}

export function getRuntimeClockMs(clock: AstroRuntimeClock): number {
  const value = Date.parse(clock.currentUtc)
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid runtime clock currentUtc: ${clock.currentUtc}`)
  }
  return value
}
