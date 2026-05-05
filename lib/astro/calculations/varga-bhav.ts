/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract, PlanetNameV2 } from './contracts.ts'
import type { SignNumber } from './longitude.ts'
import {
  VARGA_TYPES,
  type ShodashvargaByBody,
  type VargaType,
} from './shodashvarga.ts'
import { makeUnavailableValue } from './unavailable.ts'

export type VargaBhavResult = {
  vargaType: VargaType
  body: PlanetNameV2
  vargaSignNumber: SignNumber
  lagnaVargaSignNumber: SignNumber
  bhavNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  source: 'deterministic_calculation'
}

export type ShodashvargaBhavByBody = Partial<
  Record<PlanetNameV2, Partial<Record<VargaType, VargaBhavResult>>>
>

function isSignNumber(value: unknown): value is SignNumber {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12
}

function normalizeHouseNumber(value: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 {
  return ((((Math.trunc(value) - 1) % 12) + 12) % 12 + 1) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
}

export function calculateVargaBhav(
  planetVargaSign: number,
  lagnaVargaSign: number,
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 {
  if (!isSignNumber(planetVargaSign)) {
    throw new Error('planetVargaSign must be an integer from 1 to 12.')
  }

  if (!isSignNumber(lagnaVargaSign)) {
    throw new Error('lagnaVargaSign must be an integer from 1 to 12.')
  }

  return normalizeHouseNumber(planetVargaSign - lagnaVargaSign + 1)
}

export function calculateAllShodashvargaBhav(
  vargaSignsByBody: ShodashvargaByBody,
): ShodashvargaBhavByBody {
  const asc = vargaSignsByBody.Asc

  if (!asc) {
    throw new Error('Asc varga signs are required for Shodashvarga Bhav.')
  }

  const result: ShodashvargaBhavByBody = {}

  for (const [body, byVarga] of Object.entries(vargaSignsByBody)) {
    if (!byVarga) {
      continue
    }

    const bodyResult: Partial<Record<VargaType, VargaBhavResult>> = {}

    for (const vargaType of VARGA_TYPES) {
      const bodyVarga = byVarga[vargaType]
      const ascVarga = asc[vargaType]

      if (!bodyVarga || !ascVarga) {
        continue
      }

      bodyResult[vargaType] = {
        vargaType,
        body: body as PlanetNameV2,
        vargaSignNumber: bodyVarga.signNumber,
        lagnaVargaSignNumber: ascVarga.signNumber,
        bhavNumber: calculateVargaBhav(bodyVarga.signNumber, ascVarga.signNumber),
        source: 'deterministic_calculation',
      }
    }

    result[body as PlanetNameV2] = bodyResult
  }

  return result
}

export function buildShodashvargaBhavSection(args: {
  shodashvarga: AstroSectionContract
}): AstroSectionContract {
  if (args.shodashvarga.status !== 'computed') {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'shodashvarga_unavailable',
      fields: {
        shodashvargaBhav: makeUnavailableValue({
          requiredModule: 'shodashvarga_bhav',
          fieldKey: 'shodashvargaBhav.byBody',
          reason: 'insufficient_birth_data',
        }),
      },
      warnings: ['Shodashvarga Bhav requires computed Shodashvarga signs.'],
    }
  }

  const byBody = args.shodashvarga.fields?.byBody

  if (!byBody || typeof byBody !== 'object' || Array.isArray(byBody)) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'shodashvarga_unavailable',
      fields: {
        shodashvargaBhav: makeUnavailableValue({
          requiredModule: 'shodashvarga_bhav',
          fieldKey: 'shodashvargaBhav.byBody',
          reason: 'insufficient_birth_data',
        }),
      },
    }
  }

  try {
    const calculated = calculateAllShodashvargaBhav(byBody as ShodashvargaByBody)

    return {
      status: 'computed',
      source: 'deterministic_calculation',
      fields: {
        vargaTypes: VARGA_TYPES,
        byBody: calculated,
      },
    }
  } catch (error) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'lagna_varga_unavailable',
      fields: {
        shodashvargaBhav: makeUnavailableValue({
          requiredModule: 'shodashvarga_bhav',
          fieldKey: 'shodashvargaBhav.byBody',
          reason: 'insufficient_birth_data',
        }),
      },
      warnings: [error instanceof Error ? error.message : 'Shodashvarga Bhav unavailable.'],
    }
  }
}
