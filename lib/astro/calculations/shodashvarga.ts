/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract, PlanetNameV2, PlanetaryPositionV2 } from './contracts.ts'
import {
  longitudeToSignDegree,
  normalizeDegrees360,
  ZODIAC_SIGN_NAMES,
  type SignNumber,
} from './longitude.ts'
import { makeUnavailableValue } from './unavailable.ts'

export const VARGA_TYPES = [
  'D1',
  'D2',
  'D3',
  'D4',
  'D7',
  'D9',
  'D10',
  'D12',
  'D16',
  'D20',
  'D24',
  'D27',
  'D30',
  'D40',
  'D45',
  'D60',
] as const

export type VargaType = (typeof VARGA_TYPES)[number]

export type VargaSignResult = {
  vargaType: VargaType
  signNumber: SignNumber
  signName: string
  source: 'deterministic_calculation'
}

export type ShodashvargaBodyInput = {
  body: PlanetNameV2
  absoluteLongitude: number
}

export type ShodashvargaByBody = Partial<
  Record<PlanetNameV2, Record<VargaType, VargaSignResult>>
>

export type CalculateAllShodashvargaArgs = {
  byBody: Partial<Record<PlanetNameV2, PlanetaryPositionV2>>
  ascendantLongitudeDeg?: number | null
}

function isVargaType(value: unknown): value is VargaType {
  return typeof value === 'string' && (VARGA_TYPES as readonly string[]).includes(value)
}

function assertVargaType(value: unknown): VargaType {
  if (!isVargaType(value)) {
    throw new Error(`Unsupported varga type: ${String(value)}`)
  }

  return value
}

function assertFiniteLongitude(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Longitude must be a finite number.')
  }

  return normalizeDegrees360(value)
}

function normalizeSignNumber(value: number): SignNumber {
  const normalized = (((Math.trunc(value) - 1) % 12) + 12) % 12 + 1
  return normalized as SignNumber
}

function addSigns(signNumber: SignNumber, offset: number): SignNumber {
  return normalizeSignNumber(signNumber + offset)
}

function isOddSign(signNumber: SignNumber): boolean {
  return signNumber % 2 === 1
}

function signElementGroupStart(signNumber: SignNumber): SignNumber {
  if (signNumber === 1 || signNumber === 5 || signNumber === 9) {
    return 1
  }

  if (signNumber === 2 || signNumber === 6 || signNumber === 10) {
    return 4
  }

  if (signNumber === 3 || signNumber === 7 || signNumber === 11) {
    return 7
  }

  return 10
}

function signModality(signNumber: SignNumber): 'movable' | 'fixed' | 'dual' {
  if (signNumber === 1 || signNumber === 4 || signNumber === 7 || signNumber === 10) {
    return 'movable'
  }

  if (signNumber === 2 || signNumber === 5 || signNumber === 8 || signNumber === 11) {
    return 'fixed'
  }

  return 'dual'
}

function signResult(vargaType: VargaType, signNumber: SignNumber): VargaSignResult {
  return {
    vargaType,
    signNumber,
    signName: ZODIAC_SIGN_NAMES[signNumber - 1],
    source: 'deterministic_calculation',
  }
}

function segmentIndex(degreeInSign: number, divisions: number): number {
  const index = Math.floor((degreeInSign * divisions) / 30)
  return Math.min(index, divisions - 1)
}

function calculateD30Sign(natalSign: SignNumber, degreeInSign: number): SignNumber {
  const odd = isOddSign(natalSign)

  const oddSpans = [
    { end: 5, sign: 1 },
    { end: 10, sign: 11 },
    { end: 18, sign: 9 },
    { end: 25, sign: 3 },
    { end: 30, sign: 7 },
  ] as const

  const evenSpans = [
    { end: 5, sign: 2 },
    { end: 12, sign: 6 },
    { end: 20, sign: 12 },
    { end: 25, sign: 10 },
    { end: 30, sign: 8 },
  ] as const

  const spans = odd ? oddSpans : evenSpans
  const found = spans.find((span) => degreeInSign < span.end)

  if (!found) {
    return spans[spans.length - 1].sign as SignNumber
  }

  return found.sign as SignNumber
}

export function calculateVargaSign(
  longitudeDeg: number,
  vargaTypeInput: VargaType,
): VargaSignResult {
  const vargaType = assertVargaType(vargaTypeInput)
  const normalized = assertFiniteLongitude(longitudeDeg)
  const signDegree = longitudeToSignDegree(normalized)
  const natalSign = signDegree.signNumber
  const degreeInSign = signDegree.degreeInSign

  let vargaSign: SignNumber

  switch (vargaType) {
    case 'D1': {
      vargaSign = natalSign
      break
    }
    case 'D2': {
      const half = segmentIndex(degreeInSign, 2)
      if (isOddSign(natalSign)) {
        vargaSign = half === 0 ? 5 : 4
      } else {
        vargaSign = half === 0 ? 4 : 5
      }
      break
    }
    case 'D3': {
      const part = segmentIndex(degreeInSign, 3)
      vargaSign = addSigns(natalSign, part * 4)
      break
    }
    case 'D4': {
      const part = segmentIndex(degreeInSign, 4)
      vargaSign = addSigns(natalSign, part * 3)
      break
    }
    case 'D7': {
      const integerDegree = Math.floor(degreeInSign)
      const part = Math.min(Math.floor((integerDegree * 7) / 30), 6)
      const start = isOddSign(natalSign) ? natalSign : addSigns(natalSign, 6)
      vargaSign = addSigns(start, part)
      break
    }
    case 'D9': {
      const part = segmentIndex(degreeInSign, 9)
      const modality = signModality(natalSign)
      const start =
        modality === 'movable'
          ? natalSign
          : modality === 'fixed'
            ? addSigns(natalSign, 8)
            : addSigns(natalSign, 4)
      vargaSign = addSigns(start, part)
      break
    }
    case 'D10': {
      const part = segmentIndex(degreeInSign, 10)
      const start = isOddSign(natalSign) ? natalSign : addSigns(natalSign, 8)
      vargaSign = addSigns(start, part)
      break
    }
    case 'D12': {
      const part = segmentIndex(degreeInSign, 12)
      vargaSign = addSigns(natalSign, part)
      break
    }
    case 'D16': {
      const part = segmentIndex(degreeInSign, 16)
      const modality = signModality(natalSign)
      const start = modality === 'movable' ? 1 : modality === 'fixed' ? 5 : 9
      vargaSign = addSigns(start as SignNumber, part)
      break
    }
    case 'D20': {
      const part = segmentIndex(degreeInSign, 20)
      const modality = signModality(natalSign)
      const start = modality === 'movable' ? 1 : modality === 'fixed' ? 9 : 5
      vargaSign = addSigns(start as SignNumber, part)
      break
    }
    case 'D24': {
      const part = segmentIndex(degreeInSign, 24)
      const start = isOddSign(natalSign) ? 5 : 4
      vargaSign = addSigns(start, part)
      break
    }
    case 'D27': {
      const part = segmentIndex(degreeInSign, 27)
      const start = signElementGroupStart(natalSign)
      vargaSign = addSigns(start, part)
      break
    }
    case 'D30': {
      vargaSign = calculateD30Sign(natalSign, degreeInSign)
      break
    }
    case 'D40': {
      const part = segmentIndex(degreeInSign, 40)
      const start = isOddSign(natalSign) ? 1 : 7
      vargaSign = addSigns(start, part)
      break
    }
    case 'D45': {
      const part = segmentIndex(degreeInSign, 45)
      const modality = signModality(natalSign)
      const start = modality === 'movable' ? 1 : modality === 'fixed' ? 5 : 9
      vargaSign = addSigns(start as SignNumber, part)
      break
    }
    case 'D60': {
      const part = segmentIndex(degreeInSign, 60)
      vargaSign = addSigns(natalSign, part)
      break
    }
    default: {
      const exhaustive: never = vargaType
      throw new Error(`Unsupported varga type: ${exhaustive}`)
    }
  }

  return signResult(vargaType, vargaSign)
}

function getBodyInputs(args: CalculateAllShodashvargaArgs): ShodashvargaBodyInput[] {
  const bodyInputs: ShodashvargaBodyInput[] = []

  for (const [body, position] of Object.entries(args.byBody)) {
    if (!position || !Number.isFinite(position.absoluteLongitude)) {
      continue
    }

    bodyInputs.push({
      body: body as PlanetNameV2,
      absoluteLongitude: position.absoluteLongitude,
    })
  }

  if (args.ascendantLongitudeDeg !== null && args.ascendantLongitudeDeg !== undefined) {
    if (!Number.isFinite(args.ascendantLongitudeDeg)) {
      throw new Error('Ascendant longitude must be finite when provided.')
    }

    bodyInputs.push({
      body: 'Asc',
      absoluteLongitude: args.ascendantLongitudeDeg,
    } as ShodashvargaBodyInput)
  }

  return bodyInputs
}

export function calculateAllShodashvarga(
  args: CalculateAllShodashvargaArgs,
): ShodashvargaByBody {
  const result: ShodashvargaByBody = {}

  for (const input of getBodyInputs(args)) {
    result[input.body] = VARGA_TYPES.reduce((acc, vargaType) => {
      acc[vargaType] = calculateVargaSign(input.absoluteLongitude, vargaType)
      return acc
    }, {} as Record<VargaType, VargaSignResult>)
  }

  return result
}

export function buildShodashvargaSection(args: {
  planetaryPositions: AstroSectionContract
  lagna: AstroSectionContract
}): AstroSectionContract {
  if (args.planetaryPositions.status !== 'computed') {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'planetary_positions_unavailable',
      fields: {
        shodashvarga: makeUnavailableValue({
          requiredModule: 'shodashvarga',
          fieldKey: 'shodashvarga.byBody',
          reason: 'insufficient_birth_data',
        }),
      },
      warnings: ['Shodashvarga requires computed planetary positions.'],
    }
  }

  const byBody = args.planetaryPositions.fields?.byBody

  if (!byBody || typeof byBody !== 'object' || Array.isArray(byBody)) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'planetary_positions_unavailable',
      fields: {
        shodashvarga: makeUnavailableValue({
          requiredModule: 'shodashvarga',
          fieldKey: 'shodashvarga.byBody',
          reason: 'insufficient_birth_data',
        }),
      },
    }
  }

  const ascendant = args.lagna.fields?.ascendant
  const ascendantLongitudeDeg =
    ascendant && typeof ascendant === 'object' && !Array.isArray(ascendant)
      ? (ascendant as { absoluteLongitude?: unknown }).absoluteLongitude
      : null

  const calculated = calculateAllShodashvarga({
    byBody: byBody as Partial<Record<PlanetNameV2, PlanetaryPositionV2>>,
    ascendantLongitudeDeg:
      typeof ascendantLongitudeDeg === 'number' && Number.isFinite(ascendantLongitudeDeg)
        ? ascendantLongitudeDeg
        : null,
  })

  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      vargaTypes: VARGA_TYPES,
      byBody: calculated,
    },
  }
}

export function buildD9ChartSectionFromShodashvarga(
  shodashvarga: AstroSectionContract,
): AstroSectionContract {
  if (shodashvarga.status !== 'computed') {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'shodashvarga_unavailable',
      fields: {
        d9Chart: makeUnavailableValue({
          requiredModule: 'shodashvarga',
          fieldKey: 'd9Chart.byBody',
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
      fields: {},
    }
  }

  const d9ByBody: Record<string, unknown> = {}

  for (const [body, byVarga] of Object.entries(byBody)) {
    if (!byVarga || typeof byVarga !== 'object' || Array.isArray(byVarga)) {
      continue
    }

    d9ByBody[body] = (byVarga as Record<string, unknown>).D9
  }

  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      byBody: d9ByBody,
    },
  }
}
