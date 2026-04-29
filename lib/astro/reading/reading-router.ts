/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { isAstroReadingV2Enabled } from '@/lib/astro/config/feature-flags'
import { generateReadingV2 } from './reading-orchestrator-v2'
import type {
  AstrologyReadingInput,
  AstrologyReadingResult,
  GenerateStableReading,
  GenerateV2Reading,
} from './reading-router-types'

export async function generateAstrologyReadingWithRouter(
  input: AstrologyReadingInput,
  options: {
    stableGenerator: GenerateStableReading
    v2Generator?: GenerateV2Reading
  },
): Promise<AstrologyReadingResult> {
  const { stableGenerator, v2Generator } = options
  if (!isAstroReadingV2Enabled()) {
    const result = await stableGenerator(input)
    return {
      ...result,
      meta: {
        ...(result.meta ?? {}),
        version: result.meta?.version ?? 'stable',
        routedBy: 'astro-reading-router',
      },
    }
  }
  const generateV2 =
    v2Generator ??
    ((nextInput: AstrologyReadingInput) =>
      generateReadingV2(nextInput, {
        stableFallback: stableGenerator,
      }))
  return generateV2(input)
}
