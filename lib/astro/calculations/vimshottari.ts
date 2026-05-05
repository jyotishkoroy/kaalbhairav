/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { DASHA_SEQUENCE, DASHA_YEARS, NAKSHATRA_MAP, NAKSHATRA_SPAN, DASHA_YEAR_DAYS, VIMSHOTTARI_TOTAL_YEARS, type DashaLord } from './constants.ts'
import { normalize360 } from './math.ts'
import { nearNakshatraBoundary } from './boundary.ts'
import { getRuntimeClockMs, normalizeRuntimeClock, type AstroRuntimeClock } from './runtime-clock.ts'
import type { AstroSectionContract } from './contracts.ts'
import { makeUnavailableValue } from './unavailable.ts'
import { normalizeDegrees360 } from './longitude.ts'
import { calculateNakshatraPada } from './nakshatra.ts'
import {
  VIMSHOTTARI_SEQUENCE,
  VIMSHOTTARI_YEAR_DAYS,
  VIMSHOTTARI_YEARS as V2_VIMSHOTTARI_YEARS,
  NAKSHATRA_SPAN_DEG,
  type VimshottariLord,
} from './dasha-constants.ts'

export type DashaPeriod = {
  level: 'mahadasha' | 'antardasha' | 'pratyantardasha'
  lord: string
  start_utc: string
  end_utc: string
  duration_years: number
  duration_days: number
  parent_lords: string[]
}

export type VimshottariDashaResult = {
  moon_nakshatra_index: number
  moon_nakshatra: string
  birth_dasha_lord: string
  dasha_total_years: number
  dasha_elapsed_years: number
  dasha_remaining_years: number
  dasha_year_basis: '365.25_days' | 'sidereal_year_validated'
  mahadasha_sequence: DashaPeriod[]
  antardasha_sequence: DashaPeriod[]
  pratyantardasha_sequence: DashaPeriod[]
  current_dasha: {
    mahadasha: DashaPeriod | null
    antardasha: DashaPeriod | null
    pratyantardasha: DashaPeriod | null
  }
  boundary_warnings: string[]
  as_of_date?: string
  current_utc?: string
}

export type VimshottariPeriod = {
  lord: VimshottariLord
  startIso: string
  endIso: string
  durationYears: number
}

export type VimshottariDashaV2Args = {
  moonLongitudeDeg: number | null
  birthUtcIso: string | null
  runtimeClockIso: string
  maxAntardashaYears?: number
}

export type VimshottariDashaV2Fields = {
  birthNakshatra: string
  birthNakshatraPada: 1 | 2 | 3 | 4
  birthNakshatraLord: VimshottariLord
  dashaBalanceYears: number
  dashaBalanceDays: number
  mahadashaTimeline: VimshottariPeriod[]
  currentMahadasha: VimshottariPeriod | null
  currentAntardasha: VimshottariPeriod | null
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString()
}

function findCurrent<T extends { start_utc: string; end_utc: string }>(periods: T[], nowMs: number): T | null {
  return periods.find(p => new Date(p.start_utc).getTime() <= nowMs && nowMs < new Date(p.end_utc).getTime()) ?? null
}

function assertValidIso(value: string, label: string): Date {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid ISO datetime.`)
  }
  return date
}

function addDaysDate(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000)
}

function toIso(date: Date): string {
  return date.toISOString()
}

function getLordIndex(lord: VimshottariLord): number {
  return VIMSHOTTARI_SEQUENCE.indexOf(lord)
}

function getLordAt(startLord: VimshottariLord, offset: number): VimshottariLord {
  const startIndex = getLordIndex(startLord)
  const index = ((startIndex + offset) % VIMSHOTTARI_SEQUENCE.length + VIMSHOTTARI_SEQUENCE.length) % VIMSHOTTARI_SEQUENCE.length
  return VIMSHOTTARI_SEQUENCE[index]
}

function findCurrentPeriod(periods: VimshottariPeriod[], runtimeDate: Date): VimshottariPeriod | null {
  const time = runtimeDate.getTime()
  return periods.find((period) => {
    const start = new Date(period.startIso).getTime()
    const end = new Date(period.endIso).getTime()
    return time >= start && time < end
  }) ?? null
}

function buildAntardashaTimeline(
  mahadasha: VimshottariPeriod,
  startLord: VimshottariLord,
): VimshottariPeriod[] {
  let cursor = new Date(mahadasha.startIso)
  return VIMSHOTTARI_SEQUENCE.map((_, offset) => {
    const lord = getLordAt(startLord, offset)
    const durationYears = (mahadasha.durationYears * V2_VIMSHOTTARI_YEARS[lord]) / 120
    const end = addDaysDate(cursor, durationYears * VIMSHOTTARI_YEAR_DAYS)
    const period = {
      lord,
      startIso: toIso(cursor),
      endIso: toIso(end),
      durationYears,
    }
    cursor = end
    return period
  })
}

export function calculateVimshottari(moonSidereal: number, birthUtcISO: string, runtimeClockInput?: Partial<AstroRuntimeClock>): VimshottariDashaResult {
  const runtimeClock = normalizeRuntimeClock(runtimeClockInput)
  const nowMs = getRuntimeClockMs(runtimeClock)
  const normalized = normalize360(moonSidereal)
  const moon_nakshatra_index = Math.floor(normalized / NAKSHATRA_SPAN)
  const clampedIdx = Math.min(moon_nakshatra_index, 26)
  const nak = NAKSHATRA_MAP[clampedIdx]
  const birth_dasha_lord = nak.lord as DashaLord
  const dasha_total_years = DASHA_YEARS[birth_dasha_lord]
  const degrees_into_nakshatra = normalized - clampedIdx * NAKSHATRA_SPAN
  const fraction_elapsed = degrees_into_nakshatra / NAKSHATRA_SPAN
  const dasha_elapsed_years = fraction_elapsed * dasha_total_years
  const dasha_remaining_years = dasha_total_years - dasha_elapsed_years

  // Boundary warnings
  const boundary_warnings: string[] = []
  if (nearNakshatraBoundary(moonSidereal)) boundary_warnings.push('Moon near nakshatra boundary — dasha lord boundary-sensitive')

  // Build mahadasha start (birth minus elapsed years)
  const birthMs = new Date(birthUtcISO).getTime()
  const mhStart = new Date(birthMs - dasha_elapsed_years * DASHA_YEAR_DAYS * 86400000).toISOString()

  // Find the starting index in the dasha sequence
  const startIdx = DASHA_SEQUENCE.indexOf(birth_dasha_lord as DashaLord)

  // Build 9 mahadashas
  const mahadasha_sequence: DashaPeriod[] = []
  let mhCursor = mhStart
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_SEQUENCE[(startIdx + i) % 9] as DashaLord
    const years = i === 0 ? dasha_total_years : DASHA_YEARS[lord]
    const days = years * DASHA_YEAR_DAYS
    const end = addDays(mhCursor, days)
    mahadasha_sequence.push({
      level: 'mahadasha',
      lord,
      start_utc: mhCursor,
      end_utc: end,
      duration_years: years,
      duration_days: days,
      parent_lords: [],
    })
    mhCursor = end
  }

  // Build antardashas for each mahadasha
  const antardasha_sequence: DashaPeriod[] = []
  const pratyantardasha_sequence: DashaPeriod[] = []

  for (const mh of mahadasha_sequence) {
    const mhIdx = DASHA_SEQUENCE.indexOf(mh.lord as DashaLord)
    let adCursor = mh.start_utc
    for (let j = 0; j < 9; j++) {
      const adLord = DASHA_SEQUENCE[(mhIdx + j) % 9] as DashaLord
      const adYears = mh.duration_years * DASHA_YEARS[adLord] / VIMSHOTTARI_TOTAL_YEARS
      const adDays = adYears * DASHA_YEAR_DAYS
      const adEnd = addDays(adCursor, adDays)
      antardasha_sequence.push({
        level: 'antardasha',
        lord: adLord,
        start_utc: adCursor,
        end_utc: adEnd,
        duration_years: adYears,
        duration_days: adDays,
        parent_lords: [mh.lord],
      })

      // Build pratyantardashas for this antardasha
      const adIdx = DASHA_SEQUENCE.indexOf(adLord)
      let pdCursor = adCursor
      for (let k = 0; k < 9; k++) {
        const pdLord = DASHA_SEQUENCE[(adIdx + k) % 9] as DashaLord
        const pdYears = adYears * DASHA_YEARS[pdLord] / VIMSHOTTARI_TOTAL_YEARS
        const pdDays = pdYears * DASHA_YEAR_DAYS
        const pdEnd = addDays(pdCursor, pdDays)
        pratyantardasha_sequence.push({
          level: 'pratyantardasha',
          lord: pdLord,
          start_utc: pdCursor,
          end_utc: pdEnd,
          duration_years: pdYears,
          duration_days: pdDays,
          parent_lords: [mh.lord, adLord],
        })
        pdCursor = pdEnd
      }
      adCursor = adEnd
    }
  }

  const current_mahadasha = findCurrent(mahadasha_sequence, nowMs)
  const current_antardasha = findCurrent(antardasha_sequence, nowMs)
  const current_pratyantardasha = findCurrent(pratyantardasha_sequence, nowMs)

  return {
    moon_nakshatra_index: clampedIdx,
    moon_nakshatra: nak.name,
    birth_dasha_lord,
    dasha_total_years,
    dasha_elapsed_years,
    dasha_remaining_years,
    dasha_year_basis: '365.25_days',
    mahadasha_sequence,
    antardasha_sequence,
    pratyantardasha_sequence,
    current_dasha: {
      mahadasha: current_mahadasha,
      antardasha: current_antardasha,
      pratyantardasha: current_pratyantardasha,
    },
    boundary_warnings,
    as_of_date: runtimeClock.asOfDate,
    current_utc: runtimeClock.currentUtc,
  }
}

export function calculateVimshottariDashaV2(args: VimshottariDashaV2Args): AstroSectionContract {
  if (args.moonLongitudeDeg === null || !Number.isFinite(args.moonLongitudeDeg)) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'insufficient_birth_data',
      fields: {
        vimshottari: makeUnavailableValue({
          requiredModule: 'vimshottari',
          fieldKey: 'vimshottari.currentMahadasha',
          reason: 'insufficient_birth_data',
        }),
      },
      warnings: ['Moon longitude is required for Vimshottari Dasha calculation.'],
    }
  }

  if (!args.birthUtcIso) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'insufficient_birth_data',
      fields: {
        vimshottari: makeUnavailableValue({
          requiredModule: 'vimshottari',
          fieldKey: 'vimshottari.currentMahadasha',
          reason: 'insufficient_birth_data',
        }),
      },
      warnings: ['Birth UTC time is required for Vimshottari Dasha calculation.'],
    }
  }

  try {
    const birthDate = assertValidIso(args.birthUtcIso, 'birthUtcIso')
    const runtimeDate = assertValidIso(args.runtimeClockIso, 'runtimeClockIso')
    const moonLongitude = normalizeDegrees360(args.moonLongitudeDeg)
    const nakshatra = calculateNakshatraPada(moonLongitude)
    const birthLord = nakshatra.lord
    const remainingDeg = nakshatra.endLongitudeDeg - moonLongitude
    const remainingFraction = remainingDeg / NAKSHATRA_SPAN_DEG
    const birthLordYears = V2_VIMSHOTTARI_YEARS[birthLord]
    const dashaBalanceYears = remainingFraction * birthLordYears
    const dashaBalanceDays = dashaBalanceYears * VIMSHOTTARI_YEAR_DAYS

    const mahadashaTimeline: VimshottariPeriod[] = []
    let cursor = birthDate
    const firstEnd = addDaysDate(cursor, dashaBalanceDays)
    mahadashaTimeline.push({
      lord: birthLord,
      startIso: toIso(cursor),
      endIso: toIso(firstEnd),
      durationYears: dashaBalanceYears,
    })
    cursor = firstEnd

    for (let offset = 1; offset <= 9; offset += 1) {
      const lord = getLordAt(birthLord, offset)
      const durationYears = V2_VIMSHOTTARI_YEARS[lord]
      const end = addDaysDate(cursor, durationYears * VIMSHOTTARI_YEAR_DAYS)
      mahadashaTimeline.push({
        lord,
        startIso: toIso(cursor),
        endIso: toIso(end),
        durationYears,
      })
      cursor = end
    }

    const currentMahadasha = findCurrentPeriod(mahadashaTimeline, runtimeDate)
    const currentAntardasha = currentMahadasha ? findCurrentPeriod(buildAntardashaTimeline(currentMahadasha, currentMahadasha.lord), runtimeDate) : null

    const fields: VimshottariDashaV2Fields = {
      birthNakshatra: nakshatra.name,
      birthNakshatraPada: nakshatra.pada,
      birthNakshatraLord: birthLord,
      dashaBalanceYears,
      dashaBalanceDays,
      mahadashaTimeline,
      currentMahadasha,
      currentAntardasha,
    }

    return {
      status: 'computed',
      source: 'deterministic_calculation',
      fields,
    }
  } catch (error) {
    return {
      status: 'error',
      source: 'none',
      reason: error instanceof Error ? error.message : 'Vimshottari Dasha calculation failed.',
      fields: {},
    }
  }
}
