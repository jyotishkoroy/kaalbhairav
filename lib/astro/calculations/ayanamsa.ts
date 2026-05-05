/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { getLahiriAyanamsa } from '../engine/swiss.ts'
import type { AyanamshaProvider } from './ayanamsha-provider.ts'
import type { AyanamshaType } from './contracts.ts'

export type AyanamsaResult = {
  name: 'lahiri'
  value_degrees: number
  source: 'swiss_ephemeris'
}

export function calculateAyanamsa(jd_ut: number): AyanamsaResult {
  const value = getLahiriAyanamsa(jd_ut)
  if (!isFinite(value)) {
    throw new Error(`Ayanamsa calculation returned non-finite value at JD ${jd_ut}`)
  }
  return { name: 'lahiri', value_degrees: value, source: 'swiss_ephemeris' }
}

export const DEFAULT_AYANAMSHA_ENGINE_ID = 'tarayai-local-ayanamsa'

export function calculateMainAyanamsha(jdUtExact: number): number {
  return calculateAyanamsa(jdUtExact).value_degrees
}

export function calculateKpAyanamsha(jdUtExact: number): number {
  if (!Number.isFinite(jdUtExact)) {
    throw new Error('jdUtExact must be a finite number.')
  }

  throw new Error('KP New ayanamsha provider is not implemented in the local ayanamsa wrapper.')
}

export function createDefaultAyanamshaProvider(): AyanamshaProvider {
  return {
    engineId: DEFAULT_AYANAMSHA_ENGINE_ID,
    calculateAyanamshaDeg(jdUtExact: number, type: AyanamshaType): number {
      if (type === 'lahiri') {
        return calculateMainAyanamsha(jdUtExact)
      }

      return calculateKpAyanamsha(jdUtExact)
    },
  }
}
