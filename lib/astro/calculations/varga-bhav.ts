/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract, PlanetNameV2 } from './contracts.ts'
import type { SignNumber } from './longitude.ts'
import { VARGA_TYPES, type VargaType } from './shodashvarga.ts'
import { makeUnavailableValue } from './unavailable.ts'

export type VargaBhavResult = {
  vargaType: VargaType
  body: PlanetNameV2
  vargaSignNumber: SignNumber
  lagnaVargaSignNumber: SignNumber
  bhavNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  source: 'deterministic_calculation'
}

function isSignNumber(value: unknown): value is SignNumber {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12
}

function normalizeHouseNumber(value: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 {
  return ((((Math.trunc(value) - 1) % 12) + 12) % 12 + 1) as
    | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
}

export function calculateVargaBhav(
  planetVargaSign: number,
  lagnaVargaSign: number,
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 {
  if (!isSignNumber(planetVargaSign) || !isSignNumber(lagnaVargaSign)) {
    throw new Error('Invalid sign for varga bhav calculation')
  }

  return normalizeHouseNumber(planetVargaSign - lagnaVargaSign + 1)
}

export function calculateAllShodashvargaBhav(args: {
  vargaSignsByBody: Record<string, Partial<Record<VargaType, number>>>
  lagnaBodyKey?: string
}): Record<string, Partial<Record<VargaType, number>>> {
  const lagnaBodyKey = args.lagnaBodyKey ?? 'Asc'
  const asc = args.vargaSignsByBody[lagnaBodyKey] ?? args.vargaSignsByBody.Lagna
  const result: Record<string, Partial<Record<VargaType, number>>> = {}

  if (!asc) {
    return result
  }

  for (const [body, byVarga] of Object.entries(args.vargaSignsByBody)) {
    if (!byVarga) continue

    const bodyResult: Partial<Record<VargaType, number>> = {}
    for (const vargaType of VARGA_TYPES) {
      const bodyVarga = byVarga[vargaType]
      const ascVarga = asc[vargaType]
      if (typeof bodyVarga !== 'number' || typeof ascVarga !== 'number') continue
      bodyResult[vargaType] = calculateVargaBhav(bodyVarga, ascVarga)
    }
    result[body] = bodyResult
  }

  return result
}

function extractSignNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { signNumber?: unknown }).signNumber === 'number') {
    return (value as { signNumber: number }).signNumber
  }
  return undefined
}

export function calculateAllShodashvargaBhavFromSection(shodashvarga: AstroSectionContract): AstroSectionContract {
  if (shodashvarga.status !== 'computed') {
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

  const byBody = shodashvarga.fields?.byBody
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

  const vargaSignsByBody: Record<string, Partial<Record<VargaType, number>>> = {}
  for (const [body, signs] of Object.entries(byBody as Record<string, Record<string, unknown>>)) {
    const bodySigns: Partial<Record<VargaType, number>> = {}
    for (const vargaType of VARGA_TYPES) {
      const extracted = extractSignNumber(signs?.[vargaType])
      if (typeof extracted === 'number') {
        bodySigns[vargaType] = extracted
      }
    }
    vargaSignsByBody[body] = bodySigns
  }

  const calculated = calculateAllShodashvargaBhav({
    vargaSignsByBody,
  })
  const ascVargaSigns = vargaSignsByBody.Asc

  const byBodyResult: Record<string, Partial<Record<VargaType, VargaBhavResult>>> = {}
  for (const [body, byVarga] of Object.entries(calculated)) {
    const bodySigns = vargaSignsByBody[body]
    const bodyResult: Partial<Record<VargaType, VargaBhavResult>> = {}
    for (const vargaType of VARGA_TYPES) {
      const bhavNumber = byVarga?.[vargaType]
      const bodyVarga = bodySigns?.[vargaType]
      const ascVarga = ascVargaSigns?.[vargaType]
      if (typeof bhavNumber !== 'number' || typeof bodyVarga !== 'number' || typeof ascVarga !== 'number') continue
      bodyResult[vargaType] = {
        vargaType,
        body: body as PlanetNameV2,
        vargaSignNumber: bodyVarga as SignNumber,
        lagnaVargaSignNumber: ascVarga as SignNumber,
        bhavNumber: bhavNumber as VargaBhavResult['bhavNumber'],
        source: 'deterministic_calculation',
      }
    }
    byBodyResult[body] = bodyResult
  }

  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      vargaTypes: VARGA_TYPES,
      byBody: byBodyResult,
    },
  }
}

export function buildShodashvargaBhavSection(args: { shodashvarga: AstroSectionContract }): AstroSectionContract {
  return calculateAllShodashvargaBhavFromSection(args.shodashvarga)
}
