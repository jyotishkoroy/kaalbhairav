export type AstrologyReadingInput = {
  userId?: string
  question?: string
  message?: string
  birthDetails?: unknown
  chart?: unknown
  dasha?: unknown
  transits?: unknown
  context?: unknown
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export type AstrologyReadingResult = {
  answer?: string
  text?: string
  message?: string
  meta?: {
    version?: 'stable' | 'v2'
    routedBy?: 'astro-reading-router'
    usedFallback?: boolean
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type GenerateStableReading = (
  input: AstrologyReadingInput,
) => Promise<AstrologyReadingResult> | AstrologyReadingResult

export type GenerateV2Reading = (
  input: AstrologyReadingInput,
) => Promise<AstrologyReadingResult> | AstrologyReadingResult
