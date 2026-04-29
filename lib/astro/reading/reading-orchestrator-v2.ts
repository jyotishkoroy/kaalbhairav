import type {
  AstrologyReadingInput,
  AstrologyReadingResult,
  GenerateStableReading,
} from './reading-router-types'

/**
 * Reading Orchestrator V2 placeholder.
 *
 * Future phases will replace this stub with:
 * concern classifier -> chart evidence -> memory summary -> human generator -> safety filter.
 *
 * For Phase 0, this must be safe and non-invasive.
 * It may call the stable generator as a fallback to avoid changing user-facing behavior.
 */
export async function generateReadingV2(
  input: AstrologyReadingInput,
  options?: {
    stableFallback?: GenerateStableReading
  },
): Promise<AstrologyReadingResult> {
  if (options?.stableFallback) {
    const fallbackResult = await options.stableFallback(input)
    return {
      ...fallbackResult,
      meta: {
        ...(fallbackResult.meta ?? {}),
        version: 'v2',
        routedBy: 'astro-reading-router',
        usedFallback: true,
      },
    }
  }
  const question =
    typeof input.question === 'string'
      ? input.question
      : typeof input.message === 'string'
        ? input.message
        : ''
  return {
    answer:
      'Reading V2 is enabled, but the V2 interpretation engine is not implemented yet. The stable reading fallback was not provided.',
    meta: {
      version: 'v2',
      routedBy: 'astro-reading-router',
      usedFallback: false,
      questionPresent: question.length > 0,
    },
  }
}
