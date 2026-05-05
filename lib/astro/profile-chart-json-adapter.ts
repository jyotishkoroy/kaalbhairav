/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ChartJson, AstrologySettings, AstroExpandedSections, ConfidenceScore } from './types.ts'
import type { MasterAstroCalculationOutput } from './schemas/master.ts'
import type { DailyTransits, Panchang, CurrentTimingContext, DashaPeriod, TransitPlanet } from './engine/types.ts'
import { extractCalculationSettingsMetadata } from './calculation-settings-metadata.ts'
import { buildCanonicalChartJsonV2 } from './schemas/canonical-chart-json.ts'
import {
  buildCanonicalChartJsonV2FromCalculation,
  hasCanonicalChartJsonV2Sections,
} from './canonical-chart-json-adapter.ts'
import type { CanonicalChartJsonV2 } from './chart-json-v2.ts'
import { computedAstroSection, unavailableAstroSection } from './schemas/astro-section-contract.ts'
import { engineModeToSectionSource } from './engine/engine-section-source.ts'
import { buildD9ChartSectionFromShodashvarga, buildShodashvargaSection } from './calculations/shodashvarga.ts'
import { buildShodashvargaBhavSection } from './calculations/varga-bhav.ts'

type MaybeObject = Record<string, unknown> | null | undefined

export type DailyTransitDisplayRow = {
  planet: string
  sign: string
  house: string | number | null
  nakshatra?: string | null
  retrograde?: boolean | null
  summary: string
}

export type DailyTransitDisplay = {
  status: 'real' | 'partial' | 'not_available'
  calculated_at: string
  rows: DailyTransitDisplayRow[]
  summary?: string | null
  warnings: string[]
  transits?: TransitPlanet[]
  transit_planets?: TransitPlanet[]
  current_moon_rashi?: DailyTransits['current_moon_rashi']
  current_moon_nakshatra?: DailyTransits['current_moon_nakshatra']
  current_tithi?: DailyTransits['current_tithi']
  transit_relation_to_natal?: Array<unknown>
}

export type PanchangDisplayRow = { label: string; value: string }
export type PanchangDisplay = {
  status: 'real' | 'partial' | 'not_available'
  calculated_at: string
  rows: PanchangDisplayRow[]
  warnings: string[]
  date_local: string | null
  local_date?: string | null
  timezone?: string | null
  source?: 'sun_moon_sidereal_longitude' | 'not_implemented'
  convention?: 'at_birth_time' | 'at_local_sunrise'
  vara: Panchang['vara'] | null
  tithi: Panchang['tithi'] | null
  nakshatra: Panchang['nakshatra'] | null
  yoga: Panchang['yoga'] | null
  karana: Panchang['karana'] | null
  fields?: Panchang['fields']
  sunrise_utc: string | null
  sunset_utc: string | null
  sunrise_local?: string | null
  sunset_local?: string | null
  sunrise?: Panchang['sunrise']
  moon_rashi?: Panchang['moon_rashi'] | null
  sunrise_moon_rashi?: Panchang['sunrise_moon_rashi'] | null
}

export type NavamsaDisplayRow = { planet: string; sign: string; house: string | number | null; summary: string }
export type NavamsaDisplay = {
  status: 'real' | 'partial' | 'not_available'
  calculated_at: string
  lagna?: string | null
  rows: NavamsaDisplayRow[]
  warnings: string[]
}

export type AspectDisplayRow = {
  from: string
  to: string
  type: string
  source_house: number | string | null
  target_house: number | string | null
  target_sign: string | null
  strength?: string | number | null
  tradition: string | null
  summary: string
}
export type AspectDisplay = {
  status: 'real' | 'partial' | 'not_available'
  calculated_at: string
  rows: AspectDisplayRow[]
  warnings: string[]
}

export type LifeAreaDisplayRow = {
  area: string
  house: string | number | null
  sign?: string | null
  lord?: string | null
  lord_house?: string | number | null
  strength_note?: string | null
  summary: string
}
export type LifeAreaDisplay = {
  status: 'real' | 'partial' | 'not_available'
  calculated_at: string
  rows: LifeAreaDisplayRow[]
  warnings: string[]
}

function nowISO(): string {
  return new Date().toISOString()
}

function filterStringArray(values: unknown): string[] {
  return Array.isArray(values) ? values.filter((entry): entry is string => typeof entry === 'string') : []
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function isTruthyObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getEngineName(output: MasterAstroCalculationOutput): string {
  const engine = (output as MaybeObject)?.engine
  return typeof engine === 'string' && engine.trim() ? engine.trim() : 'unknown'
}

function getEngineVersion(output: MasterAstroCalculationOutput): string | undefined {
  const engineVersion = (output as MaybeObject)?.engine_version
  return typeof engineVersion === 'string' && engineVersion.trim() ? engineVersion.trim() : undefined
}

function getSettingsHash(args: { output: MasterAstroCalculationOutput; settingsHash?: string }): string | undefined {
  const hash = args.settingsHash ?? (args.output as MaybeObject)?.settings_hash
  return typeof hash === 'string' && hash.trim() ? hash.trim() : undefined
}

function sectionComputed<T>(
  engine: string,
  output: MasterAstroCalculationOutput,
  fields: T,
  warnings?: string[],
) {
  return computedAstroSection({
    source: engineModeToSectionSource((output as MaybeObject)?.engine_mode ?? (output as MaybeObject)?.engineMode ?? (output as MaybeObject)?.engine),
    engine,
    engineVersion: getEngineVersion(output),
    settingsHash: getSettingsHash({ output }),
    computedAt: typeof (output as MaybeObject)?.computed_at === 'string' ? ((output as MaybeObject)?.computed_at as string) : undefined,
    fields,
    warnings,
  })
}

function sectionUnavailable(engine: string, output: MasterAstroCalculationOutput, reason: string) {
  return unavailableAstroSection({
    reason,
    source: 'not_implemented',
    engine,
    engineVersion: getEngineVersion(output),
    settingsHash: getSettingsHash({ output }),
    computedAt: typeof (output as MaybeObject)?.computed_at === 'string' ? ((output as MaybeObject)?.computed_at as string) : undefined,
  })
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function getLagnaSignNumber(lagna: unknown): number | null {
  const record = getRecord(lagna)
  if (typeof record?.sign_index === 'number' && Number.isFinite(record.sign_index)) {
    return record.sign_index + 1
  }
  const ascendant = getRecord(record?.ascendant)
  const signNumber = ascendant?.signNumber
  return typeof signNumber === 'number' && Number.isFinite(signNumber) ? signNumber : null
}

function buildDeterministicD1ChartSection(output: MasterAstroCalculationOutput) {
  const d1Chart = getRecord((output as MaybeObject)?.d1_rashi_chart) ?? getRecord((output as MaybeObject)?.d1_chart)
  const lagna = getRecord((output as MaybeObject)?.lagna)
  const lagnaSign = typeof lagna?.sign === 'string'
    ? lagna.sign
    : typeof getRecord(lagna?.ascendant)?.sign === 'string'
      ? getRecord(lagna?.ascendant)?.sign as string
      : undefined
  const lagnaSignNumber = getLagnaSignNumber(lagna)

  const planetToSign = getRecord(d1Chart?.planet_to_sign)
  const planetToHouse = getRecord(d1Chart?.planet_to_house)
  const houses = Array.isArray(d1Chart?.houses) ? d1Chart.houses : []

  if ((!planetToSign && !planetToHouse) || !lagnaSign || lagnaSignNumber === null) {
    return null
  }

  const placements: Record<string, Record<string, unknown>> = {}
  let moonSign: string | undefined
  let moonHouse: number | undefined
  let sunSign: string | undefined
  let sunHouse: number | undefined

  const bodyNames = new Set<string>([
    ...Object.keys(planetToSign ?? {}),
    ...Object.keys(planetToHouse ?? {}),
  ])

  for (const body of bodyNames) {
    const signPlacement = getRecord(planetToSign?.[body]) ?? {}
    const sign = typeof signPlacement.sign === 'string' ? signPlacement.sign : undefined
    const signNumber = typeof signPlacement.signNumber === 'number' && Number.isFinite(signPlacement.signNumber)
      ? signPlacement.signNumber
      : typeof signPlacement.sign_index === 'number' && Number.isFinite(signPlacement.sign_index)
        ? signPlacement.sign_index + 1
      : null
    const houseValue = planetToHouse?.[body]
    const house = typeof houseValue === 'number' && Number.isFinite(houseValue)
      ? houseValue
      : signNumber === null
        ? undefined
        : ((((signNumber - lagnaSignNumber) % 12) + 12) % 12) + 1
    if (!sign) continue
    placements[body] = {
      sign,
      signNumber,
      degreeInSign: typeof signPlacement.degreeInSign === 'number' ? signPlacement.degreeInSign : undefined,
      absoluteLongitude: typeof signPlacement.absoluteLongitude === 'number' ? signPlacement.absoluteLongitude : undefined,
      wholeSignHouse: house,
      source: 'deterministic_calculation',
    }
    if (body === 'Moon') {
      moonSign = sign
      moonHouse = house
    }
    if (body === 'Sun') {
      sunSign = sign
      sunHouse = house
    }
  }

  const lagnaHouse = houses.find((row) => {
    const record = getRecord(row)
    return typeof record?.house_number === 'number' && record.house_number === 1
  })

  return {
    lagnaSign,
    lagnaSignNumber,
    lagnaHouse: lagnaHouse && typeof getRecord(lagnaHouse)?.house_number === 'number' ? getRecord(lagnaHouse)?.house_number : undefined,
    moonSign,
    moonHouse,
    sunSign,
    sunHouse,
    placements,
  }
}

function buildCanonicalSections(output: MasterAstroCalculationOutput, expanded_sections: AstroExpandedSections | null | undefined) {
  const engine = getEngineName(output)
  const planetaryPositions = (output as MaybeObject)?.planetary_positions
  const lagna = (output as MaybeObject)?.lagna
  const houses = (output as MaybeObject)?.houses
  const panchang = expanded_sections?.panchang ?? (output as MaybeObject)?.panchang
  const d1Chart = (output as MaybeObject)?.d1_chart ?? buildDeterministicD1ChartSection(output)
  const deterministicPlanetaryPositionsSection = isTruthyObject((output as MaybeObject)?.planetary_positions)
    ? {
        status: 'computed' as const,
        source: 'deterministic_calculation' as const,
        fields: { byBody: toRecord((output as MaybeObject)?.planetary_positions) },
      }
    : sectionUnavailable(engine, output, 'planetary_positions_not_available')
  const deterministicLagnaSection = isTruthyObject((output as MaybeObject)?.lagna)
    ? (output as MaybeObject)?.lagna as Record<string, unknown> as never
    : sectionUnavailable(engine, output, 'lagna_not_available')
  const deterministicShodashvarga = buildShodashvargaSection({
    planetaryPositions: deterministicPlanetaryPositionsSection as never,
    lagna: deterministicLagnaSection as never,
  })
  const deterministicShodashvargaBhav = buildShodashvargaBhavSection({ shodashvarga: deterministicShodashvarga })
  const deterministicD9Chart = buildD9ChartSectionFromShodashvarga(deterministicShodashvarga)
  const shodashvarga = deterministicShodashvarga
  const shodashvargaBhav = deterministicShodashvargaBhav
  const dosha = (output as MaybeObject)?.sections && isTruthyObject((output as MaybeObject)?.sections)
    ? toRecord((output as MaybeObject)?.sections).dosha
    : (output as MaybeObject)?.dosha
  const yoga = (output as MaybeObject)?.sections && isTruthyObject((output as MaybeObject)?.sections)
    ? toRecord((output as MaybeObject)?.sections).yoga
    : (output as MaybeObject)?.yoga
  const d9ChartCompat = deterministicD9Chart
  const kp = (output as MaybeObject)?.sections && isTruthyObject((output as MaybeObject)?.sections)
    ? toRecord((output as MaybeObject)?.sections).kp
    : (output as MaybeObject)?.kp
  const vimshottari = expanded_sections?.vimshottari_dasha ?? (output as MaybeObject)?.vimshottari_dasha
  const transits = expanded_sections?.daily_transits ?? (output as MaybeObject)?.daily_transits
  const timeFacts = (output as MaybeObject)?.runtime_clock ?? (output as MaybeObject)?.prediction_ready_context

  return {
    timeFacts: isTruthyObject(timeFacts) ? sectionComputed(engine, output, timeFacts) : sectionUnavailable(engine, output, 'time_facts_not_available'),
    planetaryPositions: isTruthyObject(planetaryPositions) ? sectionComputed(engine, output, planetaryPositions) : sectionUnavailable(engine, output, 'planetary_positions_not_available'),
    lagna: isTruthyObject(lagna) ? sectionComputed(engine, output, lagna) : sectionUnavailable(engine, output, 'lagna_not_available'),
    houses: isTruthyObject(houses) ? sectionComputed(engine, output, houses) : sectionUnavailable(engine, output, 'houses_not_available'),
    panchang: isTruthyObject(panchang)
      ? sectionComputed(engine, output, panchang)
      : sectionUnavailable(engine, output, 'panchang_not_available'),
    d1Chart: isTruthyObject(d1Chart) ? sectionComputed(engine, output, d1Chart) : sectionUnavailable(engine, output, 'd1_chart_not_available'),
    d9Chart: d9ChartCompat,
    shodashvarga,
    shodashvargaBhav,
    dosha: isTruthyObject(dosha) ? sectionComputed(engine, output, dosha) : sectionUnavailable(engine, output, 'dosha_not_available'),
    yoga: isTruthyObject(yoga) ? sectionComputed(engine, output, yoga) : sectionUnavailable(engine, output, 'yoga_not_available'),
    vimshottari: isTruthyObject(vimshottari) ? sectionComputed(engine, output, vimshottari) : sectionUnavailable(engine, output, 'vimshottari_not_available'),
    kp: isTruthyObject(kp) ? sectionComputed(engine, output, kp) : sectionUnavailable(engine, output, 'kp_not_available'),
    transits: isTruthyObject(transits) ? sectionComputed(engine, output, transits) : sectionUnavailable(engine, output, 'transits_not_available'),
    advanced: {
      outerPlanets: sectionUnavailable(engine, output, 'outer_planets_not_enabled_for_all_engine_modes'),
    },
  }
}

function canonicalSectionFromLegacySection(section: unknown, fallbackReason: string) {
  if (!isTruthyObject(section)) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: fallbackReason,
      fields: {},
    }
  }

  const status = (section as Record<string, unknown>).status
  const source = (section as Record<string, unknown>).source
  const mappedSource = source === 'stored_current_chart_json' || source === 'none'
    ? source
    : 'deterministic_calculation'

  if (status === 'computed' || status === 'partial' || status === 'unavailable' || status === 'error') {
    return {
      ...section,
      source: mappedSource,
    }
  }

  return {
    status: 'unavailable',
    source: 'none',
    reason: fallbackReason,
    fields: {},
  }
}

function isAvailableSection(value: unknown): value is {
  status?: string
  rows?: unknown[]
  items?: unknown[]
  data?: unknown
  warnings?: unknown[]
  source?: string
} {
  return !!value && typeof value === 'object' && (value as { status?: unknown }).status === 'available'
}

function normalizeAvailableSection(value: unknown) {
  if (!isAvailableSection(value)) return null

  const section = value as {
    status?: string
    rows?: unknown[]
    items?: unknown[]
    data?: unknown
    warnings?: unknown[]
    source?: string
  }

  return {
    status: 'available' as const,
    source: section.source ?? 'python_astro_calculation_engine',
    data: section.data ?? null,
    rows: Array.isArray(section.rows) ? section.rows : [],
    items: Array.isArray(section.items) ? section.items : [],
    warnings: Array.isArray(section.warnings) ? section.warnings : [],
  }
}

function normalizeDisplaySection(value: unknown) {
  if (!value || typeof value !== 'object') return null

  const section = value as {
    status?: unknown
    rows?: unknown[]
    items?: unknown[]
    data?: unknown
    warnings?: unknown[]
    current_mahadasha?: unknown
    current_antardasha?: unknown
    current_pratyantardasha?: unknown
    transits?: unknown[]
    transit_planets?: unknown[]
    signatures?: unknown[]
    aspects?: unknown[]
    placements?: unknown[]
  }

  return {
    status: typeof section.status === 'string' ? section.status : undefined,
    rows: Array.isArray(section.rows) ? section.rows : [],
    items: Array.isArray(section.items) ? section.items : [],
    data: section.data ?? null,
    current_mahadasha: section.current_mahadasha ?? null,
    current_antardasha: section.current_antardasha ?? null,
    current_pratyantardasha: section.current_pratyantardasha ?? null,
    transits: Array.isArray(section.transits) ? section.transits : [],
    transit_planets: Array.isArray(section.transit_planets) ? section.transit_planets : [],
    signatures: Array.isArray(section.signatures) ? section.signatures : [],
    aspects: Array.isArray(section.aspects) ? section.aspects : [],
    placements: Array.isArray(section.placements) ? section.placements : [],
  }
}

function statusRank(status: string | undefined): number {
  if (status === 'real' || status === 'available') return 3
  if (status === 'partial') return 2
  if (status === 'not_available' || status === 'stub' || status === 'error' || status === 'failed') return 1
  return 0
}

function displaySectionHasData(section: ReturnType<typeof normalizeDisplaySection>): boolean {
  if (!section) return false
  if (section.rows.length > 0) return true
  if (section.items.length > 0) return true
  if (section.transits.length > 0) return true
  if (section.transit_planets.length > 0) return true
  if (section.signatures.length > 0) return true
  if (section.aspects.length > 0) return true
  if (section.placements.length > 0) return true
  if (section.current_mahadasha || section.current_antardasha || section.current_pratyantardasha) return true

  if (section.data && typeof section.data === 'object') {
    const data = section.data as {
      rows?: unknown
      items?: unknown
      placements?: unknown
      mahadasha_sequence?: unknown
      current_dasha?: unknown
      signatures?: unknown
      aspects?: unknown
      transits?: unknown
      transit_planets?: unknown
    }
    if (Array.isArray(data.rows) && data.rows.length > 0) return true
    if (Array.isArray(data.items) && data.items.length > 0) return true
    if (Array.isArray(data.placements) && data.placements.length > 0) return true
    if (Array.isArray(data.mahadasha_sequence) && data.mahadasha_sequence.length > 0) return true
    if (Array.isArray(data.signatures) && data.signatures.length > 0) return true
    if (Array.isArray(data.aspects) && data.aspects.length > 0) return true
    if (Array.isArray(data.transits) && data.transits.length > 0) return true
    if (Array.isArray(data.transit_planets) && data.transit_planets.length > 0) return true
    if (data.current_dasha && typeof data.current_dasha === 'object') return true
  }

  return false
}

function preferDisplaySection(candidate: unknown, fallback: unknown): unknown {
  const normalizedCandidate = normalizeDisplaySection(candidate)
  const normalizedFallback = normalizeDisplaySection(fallback)

  if (!normalizedCandidate) return fallback ?? candidate
  if (!normalizedFallback) return candidate

  const candidateHasData = displaySectionHasData(normalizedCandidate)
  const fallbackHasData = displaySectionHasData(normalizedFallback)

  if (candidateHasData && !fallbackHasData) return candidate
  if (fallbackHasData && !candidateHasData) return fallback

  const candidateRank = statusRank(normalizedCandidate.status)
  const fallbackRank = statusRank(normalizedFallback.status)

  if (candidateRank !== fallbackRank) {
    return candidateRank > fallbackRank ? candidate : fallback
  }

  return candidateHasData ? candidate : (fallback ?? candidate)
}

function availableSectionHasDisplayData(section: ReturnType<typeof normalizeAvailableSection>): boolean {
  if (!section) return false
  if (section.rows.length > 0) return true
  if (section.items.length > 0) return true
  if (section.data && typeof section.data === 'object') {
    const data = section.data as {
      rows?: unknown
      items?: unknown
      placements?: unknown
      mahadasha_sequence?: unknown
      current_dasha?: unknown
    }
    if (Array.isArray(data.rows) && data.rows.length > 0) return true
    if (Array.isArray(data.items) && data.items.length > 0) return true
    if (Array.isArray(data.placements) && data.placements.length > 0) return true
    if (Array.isArray(data.mahadasha_sequence) && data.mahadasha_sequence.length > 0) return true
    if (data.current_dasha && typeof data.current_dasha === 'object') return true
  }
  return section.data != null
}

function preferAvailableSection(candidate: unknown, fallback: unknown): unknown {
  const normalizedCandidate = normalizeAvailableSection(candidate)
  if (availableSectionHasDisplayData(normalizedCandidate)) return normalizedCandidate

  const normalizedFallback = normalizeAvailableSection(fallback)
  if (availableSectionHasDisplayData(normalizedFallback)) return normalizedFallback

  return fallback ?? candidate
}

function isMeaningfulText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.trim() !== '—'
}

function displayString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') {
    const cleaned = value.trim()
    return cleaned ? cleaned.replace(/_/g, ' ') : null
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return (
      displayString(record.name) ??
      displayString(record.label) ??
      displayString(record.title) ??
      displayString(record.value) ??
      displayString(record.sign) ??
      displayString(record.rashi) ??
      displayString(record.planet) ??
      displayString(record.graha) ??
      displayString(record.area) ??
      null
    )
  }
  return null
}

function displayNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function objectEntriesToRecords(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([key, raw]) => {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return { key, ...(raw as Record<string, unknown>) }
      }
      return { key, value: raw }
    })
  }
  return []
}

function asNakshatra(value: unknown): Panchang['nakshatra'] {
  return typeof value === 'string' ? (value as Panchang['nakshatra']) : null
}

function asYoga(value: unknown): Panchang['yoga'] {
  return typeof value === 'string' ? (value as Panchang['yoga']) : null
}

function asKarana(value: unknown): Panchang['karana'] {
  return typeof value === 'string' ? (value as Panchang['karana']) : null
}

function mapChartStatus(status: string | undefined): ChartJson['metadata']['calculation_status'] {
  if (status === 'partial') return 'partial'
  if (status === 'rejected' || status === 'error') return 'failed'
  return 'real'
}

export function formatProfileChartStatus(status: unknown): string {
  switch (status) {
    case 'calculated':
    case 'real':
      return 'Real'
    case 'partial':
      return 'Partial'
    case 'failed':
    case 'error':
    case 'rejected':
      return 'Failed'
    case 'stub':
      return 'Stub'
    default:
      return 'Unknown'
  }
}

function adaptPlanets(output: MasterAstroCalculationOutput): Record<string, unknown> {
  return toRecord((output as MaybeObject)?.planetary_positions ?? (output as MaybeObject)?.planets)
}

function adaptHouses(output: MasterAstroCalculationOutput): Record<string, unknown> {
  return toRecord((output as MaybeObject)?.whole_sign_houses ?? (output as MaybeObject)?.houses)
}

function adaptD1Chart(output: MasterAstroCalculationOutput): Record<string, unknown> {
  return toRecord((output as MaybeObject)?.d1_rashi_chart ?? (output as MaybeObject)?.d1_chart)
}

function houseSignFromD1(output: MasterAstroCalculationOutput, houseNumber: number | string | null | undefined): string | null {
  const house = displayNumber(houseNumber)
  if (house == null) return null
  const d1 = adaptD1Chart(output)
  const houses = toArray(d1.houses)
  const match = houses.find((item) => {
    const row = toRecord(item)
    return displayNumber(row.house_number) === house
  })
  return displayString(match ? toRecord(match).sign : null)
}

function occupantsForHouse(output: MasterAstroCalculationOutput, houseNumber: number | string | null | undefined): string[] {
  const house = displayNumber(houseNumber)
  if (house == null) return []
  const d1 = adaptD1Chart(output)
  const occupants = toRecord(d1.occupying_planets_by_house)
  const value = occupants[String(house)]
  return Array.isArray(value) ? value.map(displayString).filter((planet): planet is string => !!planet) : []
}

function aspectTypeFromOffset(offset: unknown, planet?: unknown): string | null {
  const planetName = displayString(planet)
  const numericOffset =
    typeof offset === 'number'
      ? offset
      : typeof offset === 'string' && offset.trim() !== ''
        ? Number(offset)
        : NaN

  if (!Number.isFinite(numericOffset)) return null

  if (planetName === 'Mars' && numericOffset === 4) return 'Mars 4th drishti'
  if (planetName === 'Mars' && numericOffset === 8) return 'Mars 8th drishti'
  if (planetName === 'Jupiter' && numericOffset === 5) return 'Jupiter 5th drishti'
  if (planetName === 'Jupiter' && numericOffset === 9) return 'Jupiter 9th drishti'
  if (planetName === 'Saturn' && numericOffset === 3) return 'Saturn 3rd drishti'
  if (planetName === 'Saturn' && numericOffset === 10) return 'Saturn 10th drishti'
  if (numericOffset === 7) return '7th drishti'

  return `${numericOffset}th drishti`
}

function adaptDailyTransits(output: MasterAstroCalculationOutput): DailyTransitDisplay {
  const source =
    (output as MaybeObject)?.daily_transits ??
    (output as MaybeObject)?.transits ??
    ((output as MaybeObject)?.astronomical_data ? toRecord((output as MaybeObject)?.astronomical_data).daily_transits : undefined) ??
    ((output as MaybeObject)?.prediction_ready_context ? toRecord((output as MaybeObject)?.prediction_ready_context).daily_transits : undefined)
  const record = toRecord(source)
  if (!source) {
    return {
      status: 'not_available',
      calculated_at: nowISO(),
      rows: [],
      warnings: ['Daily transits were not returned by the calculator.'],
    }
  }

  const transitSource = toArray(record.rows).length > 0
    ? toArray(record.rows)
    : toArray(record.transits).length > 0
      ? toArray(record.transits)
      : toArray(record.transit_planets).length > 0
        ? toArray(record.transit_planets)
        : toArray(record.planets)
  const rows: DailyTransitDisplayRow[] = transitSource.flatMap((item) => {
    const row = toRecord(item)
    const planet = displayString(row.planet ?? row.graha ?? row.name ?? row.body ?? row.key)
    const sign = displayString(row.sign ?? row.rashi ?? row.current_sign ?? row.transit_sign ?? row.sign_name)
    const house = displayString(row.house_transited ?? row.house ?? row.transit_house ?? row.house_from_lagna ?? row.from_lagna)
    const nakshatra = displayString(row.nakshatra ?? row.current_nakshatra ?? row.nakshatra_name)
    const retrograde = typeof row.retrograde === 'boolean' ? row.retrograde : typeof row.is_retrograde === 'boolean' ? row.is_retrograde : null
    const rawSummary = displayString(row.summary) ?? displayString(row.label) ?? displayString(row.value)
    const resolvedSummary = rawSummary ?? (planet && sign && house ? `${planet} in ${sign}, House ${house}` : planet && sign ? `${planet} in ${sign}` : sign ? `Transit in ${sign}` : planet ?? null)
    if (!resolvedSummary) return []
    return [{ planet: planet ?? '', sign: sign ?? 'Unknown', house: house ?? null, nakshatra: nakshatra ?? null, retrograde, summary: resolvedSummary }]
  })
  const hasPlanetSignRows = rows.some((row) => isMeaningfulText(row.planet) && isMeaningfulText(row.sign))
  const hasUsefulFields = rows.length > 0
    || typeof record.current_utc === 'string'
    || isMeaningfulText(displayString(record.current_moon_rashi))
    || isMeaningfulText(displayString(record.current_moon_nakshatra))
    || isMeaningfulText(displayString(record.current_tithi))
    || record.transit_relation_to_natal != null
  const warnings = filterStringArray(record.warnings)
  if (!rows.length && hasUsefulFields) warnings.push('Daily transit source exists but no displayable transit rows were found.')
  return {
    status: hasPlanetSignRows
      ? 'real'
      : source
        ? 'partial'
        : 'not_available',
    calculated_at: typeof record.calculated_at === 'string' ? record.calculated_at : (typeof record.current_utc === 'string' ? record.current_utc : nowISO()),
    rows,
    transits: (toArray(record.transits).length > 0 ? toArray(record.transits) : transitSource) as TransitPlanet[],
    transit_planets: (toArray(record.transit_planets).length > 0 ? toArray(record.transit_planets) : transitSource) as TransitPlanet[],
    current_moon_rashi: (record.current_moon_rashi as DailyTransits['current_moon_rashi']) ?? null,
    current_moon_nakshatra: (record.current_moon_nakshatra as DailyTransits['current_moon_nakshatra']) ?? null,
    current_tithi: (record.current_tithi as DailyTransits['current_tithi']) ?? null,
    transit_relation_to_natal: toArray(record.transit_relation_to_natal),
    warnings,
  }
}

function adaptPanchang(output: MasterAstroCalculationOutput): PanchangDisplay {
  const source =
    (output as MaybeObject)?.panchang ??
    (output as MaybeObject)?.panchaang ??
    ((output as MaybeObject)?.astronomical_data ? toRecord((output as MaybeObject)?.astronomical_data).panchang : undefined) ??
    ((output as MaybeObject)?.prediction_ready_context ? toRecord((output as MaybeObject)?.prediction_ready_context).panchang : undefined)
  const record = toRecord(source)
  if (!source) {
    return {
      status: 'not_available',
      calculated_at: nowISO(),
      rows: [],
      date_local: null,
      vara: null,
      tithi: null,
      nakshatra: null,
      yoga: null,
      karana: null,
      sunrise_utc: null,
      sunset_utc: null,
      warnings: ['Panchang was not returned by the calculator.'],
    }
  }

  const rows: PanchangDisplayRow[] = [
    { label: 'Vara', value: displayString(record.vara) ?? '' },
    { label: 'Tithi', value: displayString((record.tithi as Record<string, unknown> | undefined)?.tithi_name) ?? displayString(record.tithi) ?? '' },
    { label: 'Nakshatra', value: displayString((record.nakshatra as Record<string, unknown> | undefined)?.nakshatra) ?? displayString(record.nakshatra) ?? '' },
    { label: 'Yoga', value: displayString((record.yoga as Record<string, unknown> | undefined)?.yoga_name) ?? displayString(record.yoga) ?? '' },
    { label: 'Karana', value: displayString((record.karana as Record<string, unknown> | undefined)?.karana_name) ?? displayString(record.karana) ?? '' },
    { label: 'Moon Rashi', value: displayString((record.moon_rashi as Record<string, unknown> | undefined)?.sign) ?? displayString(record.moon_rashi) ?? '' },
    { label: 'Sunrise', value: displayString(record.sunrise_local) ?? displayString(record.sunrise_utc) ?? '' },
    { label: 'Sunset', value: displayString(record.sunset_local) ?? displayString(record.sunset_utc) ?? '' },
  ].filter((row) => isMeaningfulText(row.value))
  const warnings = filterStringArray(record.warnings)
  if (!rows.length) warnings.push('Panchang source exists but no displayable fields were found.')
  return {
    status: rows.length >= 3 ? 'real' : 'partial',
    calculated_at: typeof record.calculation_instant_utc === 'string' ? record.calculation_instant_utc : (typeof record.calculated_at === 'string' ? record.calculated_at : nowISO()),
    rows,
    date_local: typeof record.panchang_local_date === 'string' ? record.panchang_local_date : (typeof record.date_local === 'string' ? record.date_local : null),
    local_date: typeof record.local_date === 'string' ? record.local_date : (typeof record.panchang_local_date === 'string' ? record.panchang_local_date : null),
    timezone: typeof record.timezone === 'string' ? record.timezone : null,
    source: typeof record.source === 'string' ? record.source as 'sun_moon_sidereal_longitude' | 'not_implemented' : undefined,
    convention: typeof record.convention === 'string' ? record.convention as 'at_birth_time' | 'at_local_sunrise' : undefined,
    vara: (record.vara as Panchang['vara']) ?? null,
    tithi: (record.tithi as Panchang['tithi']) ?? null,
    nakshatra: asNakshatra(record.nakshatra),
    yoga: asYoga(record.yoga),
    karana: asKarana(record.karana),
    fields: record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields) ? record.fields as Panchang['fields'] : undefined,
    sunrise_utc: typeof record.sunrise_utc === 'string' ? record.sunrise_utc : null,
    sunset_utc: typeof record.sunset_utc === 'string' ? record.sunset_utc : null,
    sunrise_local: typeof record.sunrise_local === 'string' ? record.sunrise_local : null,
    sunset_local: typeof record.sunset_local === 'string' ? record.sunset_local : null,
    sunrise: record.sunrise && typeof record.sunrise === 'object' && !Array.isArray(record.sunrise) ? record.sunrise as Panchang['sunrise'] : undefined,
    moon_rashi: (record.moon_rashi as Panchang['moon_rashi']) ?? null,
    sunrise_moon_rashi: (record.sunrise_moon_rashi as Panchang['sunrise_moon_rashi']) ?? null,
    warnings,
  }
}

function adaptCurrentTimingFromVimshottari(output: MasterAstroCalculationOutput): CurrentTimingContext {
  const rawSource = (output as MaybeObject)?.vimshottari_dasha as Record<string, unknown> | undefined
  const source = rawSource?.data && typeof rawSource.data === 'object'
    ? { ...rawSource, ...(rawSource.data as Record<string, unknown>) }
    : rawSource
  const currentDasha = source ? toRecord(source.current_dasha) : {}
  const currentDashaFromItems = (() => {
    const items = toArray(source?.items)
    return items.length > 0 ? toRecord(items.find((item) => {
      const row = toRecord(item)
      return displayString(row.mahadasha ?? row.lord ?? row.name) != null
    })) : {}
  })()
  const currentDashaFromSequence = (() => {
    const sequence = toArray(source?.mahadasha_sequence)
    return sequence.length > 0 ? toRecord(sequence.find((item) => {
      const row = toRecord(item)
      return displayString(row.mahadasha ?? row.lord ?? row.name) != null
    })) : {}
  })()
  const resolvedMahadasha =
    currentDasha.mahadasha ??
    currentDashaFromItems.mahadasha ??
    currentDashaFromSequence.mahadasha ??
    source?.current_reference_mahadasha ??
    source?.current_mahadasha ??
    null
  const resolvedAntardasha = currentDasha.antardasha ?? source?.current_antardasha ?? null
  const resolvedPratyantardasha = currentDasha.pratyantardasha ?? source?.current_pratyantardasha ?? null
  const hasCurrentDasha = !!(resolvedMahadasha || resolvedAntardasha || resolvedPratyantardasha)

  if (!source || !hasCurrentDasha) {
    return {
      status: 'not_available',
      calculated_at: nowISO(),
      current_mahadasha: null,
      current_antardasha: null,
      current_pratyantardasha: null,
      transiting_lagna_sign: null,
      elapsed_dasha_percent: null,
      warnings: ['Vimshottari dasha data was not returned by the calculator.'],
    }
  }

  const currentMahadasha = resolvedMahadasha
    ? (typeof resolvedMahadasha === 'object'
        ? {
            lord: displayString((resolvedMahadasha as Record<string, unknown>).lord ?? (resolvedMahadasha as Record<string, unknown>).mahadasha) ?? 'Unknown',
            start_date:
              displayString(
                (resolvedMahadasha as Record<string, unknown>).start_date ??
                  (resolvedMahadasha as Record<string, unknown>).from ??
                  (resolvedMahadasha as Record<string, unknown>).start_utc ??
                  source?.current_reference_from,
              ) ?? '',
            end_date:
              displayString(
                (resolvedMahadasha as Record<string, unknown>).end_date ??
                  (resolvedMahadasha as Record<string, unknown>).to ??
                  (resolvedMahadasha as Record<string, unknown>).end_utc ??
                  source?.current_reference_to,
              ) ?? '',
          }
        : {
            lord: resolvedMahadasha,
            start_date: (displayString(source?.current_reference_from) ?? displayString(currentDasha.start_date)) ?? null,
            end_date: (displayString(source?.current_reference_to) ?? displayString(currentDasha.end_date)) ?? null,
          })
    : null
  const currentAntardasha = resolvedAntardasha ?? null
  const currentPratyantardasha = resolvedPratyantardasha ?? null
  const elapsed = typeof source.dasha_elapsed_years === 'number' ? source.dasha_elapsed_years : null
  const total = typeof source.dasha_total_years === 'number' ? source.dasha_total_years : null
  const elapsedPercent = elapsed != null && total != null && Number.isFinite(elapsed) && Number.isFinite(total) && total > 0
    ? Math.round((elapsed / total) * 10000) / 100
    : null

  return {
    status: 'real',
    calculated_at: nowISO(),
    current_mahadasha: currentMahadasha as DashaPeriod | null,
    current_antardasha: currentAntardasha as DashaPeriod | null,
    current_pratyantardasha: currentPratyantardasha as DashaPeriod | null,
    transiting_lagna_sign: null,
    elapsed_dasha_percent: elapsedPercent,
    warnings: filterStringArray(source.boundary_warnings ?? source.warnings),
  }
}

function adaptNavamsa(output: MasterAstroCalculationOutput): NavamsaDisplay {
  const source =
    (output as MaybeObject)?.navamsa_d9 ??
    (output as MaybeObject)?.navamsa ??
    ((output as MaybeObject)?.divisional_charts ? toRecord((output as MaybeObject)?.divisional_charts).d9 : undefined) ??
    (output as MaybeObject)?.d9
  const record = toRecord(source)
  if (!source) {
    return { status: 'not_available', calculated_at: nowISO(), rows: [], warnings: ['Navamsa was not returned by the calculator.'] }
  }
  const placements = toArray(record.rows).length > 0
    ? toArray(record.rows)
    : toArray(record.placements).length > 0
      ? toArray(record.placements)
      : toArray(record.planets).length > 0
        ? toArray(record.planets)
        : toArray(record.planetary_positions)
  const nestedPlacements = placements.length > 0 ? placements : objectEntriesToRecords(record.placements)
  const rows = nestedPlacements.flatMap((item) => {
    const row = toRecord(item)
    const planet = displayString(row.planet ?? row.graha ?? row.name ?? row.body ?? row.key)
    const sign = displayString(row.sign ?? row.rashi ?? row.navamsa_sign ?? row.d9_sign)
    const house = displayString(row.house ?? row.navamsa_house ?? row.d9_house)
    if (!planet || !sign) return []
    return [{ planet, sign, house: house ?? null, summary: house ? `${planet}: ${sign} (H${house})` : `${planet}: ${sign}` }]
  })
  const warnings = filterStringArray(record.warnings)
  if (!rows.length) warnings.push('Navamsa source exists but no displayable placements were found.')
  return {
    status: rows.length > 0 ? 'real' : 'partial',
    calculated_at: typeof record.calculated_at === 'string' ? record.calculated_at : nowISO(),
    lagna: displayString(record.navamsa_lagna ?? record.navamsa_lagna_sign ?? record.lagna),
    rows,
    warnings,
  }
}

function adaptAspects(output: MasterAstroCalculationOutput): AspectDisplay {
  const source =
    (output as MaybeObject)?.planetary_aspects_drishti ??
    (output as MaybeObject)?.planetary_aspects ??
    (output as MaybeObject)?.aspects ??
    (output as MaybeObject)?.drishti
  const record = toRecord(source)
  if (!source) {
    const d1 = adaptD1Chart(output)
    const planetToHouse = toRecord(d1.planet_to_house)
    const houseEntries = Object.entries(planetToHouse).flatMap(([planet, rawHouse]) => {
      const house = displayNumber(rawHouse)
      if (house == null) return []
      return [{ planet, house }]
    })
    if (houseEntries.length === 0) {
      return { status: 'not_available', calculated_at: nowISO(), rows: [], warnings: ['Aspects were not returned by the calculator.'] }
    }
    const fallbackRows = []
    for (const { planet, house } of houseEntries) {
      const type = '7th drishti'
      const targetHouse = ((house - 1 + 7 - 1 + 12) % 12) + 1
      const targetSign = houseSignFromD1(output, targetHouse)
      const occupants = occupantsForHouse(output, targetHouse)
      if (occupants.length > 0) {
        for (const target of occupants) {
          fallbackRows.push({
            from: planet,
            to: target,
            type,
            source_house: house,
            target_house: targetHouse,
            target_sign: targetSign,
            strength: null,
            tradition: null,
            summary: targetSign ? `${planet} aspects ${target} in House ${targetHouse} (${targetSign}) — ${type}` : `${planet} aspects ${target} in House ${targetHouse} — ${type}`,
          })
        }
      } else {
        fallbackRows.push({
          from: planet,
          to: `House ${targetHouse}`,
          type,
          source_house: house,
          target_house: targetHouse,
          target_sign: targetSign,
          strength: null,
          tradition: null,
          summary: targetSign ? `${planet} aspects House ${targetHouse} (${targetSign}) — ${type}` : `${planet} aspects House ${targetHouse} — ${type}`,
        })
      }
    }
    return {
      status: fallbackRows.length > 0 ? 'real' : 'partial',
      calculated_at: nowISO(),
      rows: fallbackRows,
      warnings: fallbackRows.length > 0 ? [] : ['Aspect data exists but no displayable aspect rows were found.'],
    }
  }
  const aspectItems = Array.isArray(source)
    ? source
    : toArray(record.rows).length > 0
      ? toArray(record.rows)
      : toArray(record.aspects).length > 0
        ? toArray(record.aspects)
      : toArray(record.items).length > 0
        ? toArray(record.items)
          : objectEntriesToRecords(record.aspects ?? source)
  const rows = aspectItems.flatMap((item) => {
    const row = toRecord(item)
    const from = displayString(row.aspecting_planet ?? row.from ?? row.source ?? row.planet ?? row.graha ?? row.source_planet)
    const sourceHouse = displayNumber(row.source_house)
    const targetHouse = displayNumber(row.target_house ?? row.aspected_house)
    const targetHouseSource = (row.target_house ?? row.aspected_house) as number | string | null | undefined
    const targetSign = displayString(row.target_sign ?? row.target_sign_name)
      ?? houseSignFromD1(output, targetHouse ?? targetHouseSource)
    const type =
      displayString(row.aspect_type ?? row.type ?? row.aspect ?? row.drishti_type ?? row.relationship)
      ?? aspectTypeFromOffset(row.aspect_offset, row.source_planet ?? from)
    const strength = displayString(row.strength ?? row.score ?? row.weight ?? row.reliability)
    const tradition = displayString(row.tradition)
    const targetOccupants = occupantsForHouse(output, targetHouse)
    const summary =
      targetHouse != null && targetOccupants.length > 0 && from && type
        ? targetOccupants.flatMap((target) => {
            const resolvedTargetSign = targetSign ?? houseSignFromD1(output, targetHouse)
            if (!resolvedTargetSign) {
              return [`${from} aspects ${target} in House ${targetHouse} — ${type}`]
            }
            return [`${from} aspects ${target} in House ${targetHouse} (${resolvedTargetSign}) — ${type}`]
          })
        : targetHouse != null && from && type
          ? [targetSign ? `${from} aspects House ${targetHouse} (${targetSign}) — ${type}` : `${from} aspects House ${targetHouse} — ${type}`]
          : from && displayString(row.to ?? row.aspected_planet ?? row.target ?? row.receiver)
            ? [displayString(row.summary) ?? `${from} → ${displayString(row.to ?? row.aspected_planet ?? row.target ?? row.receiver)}: ${type ?? 'Unknown'}`]
            : displayString(row.summary) || displayString(row.label)
              ? [displayString(row.summary) ?? displayString(row.label) ?? '']
              : []
    if (summary.length === 0) return []
    return summary.map((entry, index) => ({
      from: from ?? 'Unknown',
      to: targetOccupants[index] ?? (displayString(row.to ?? row.aspected_planet ?? row.target ?? row.receiver) ?? (targetHouse != null ? `House ${targetHouse}` : 'Unknown')),
      type: type ?? 'Unknown',
      source_house: sourceHouse,
      target_house: targetHouse,
      target_sign: targetSign,
      strength: strength ?? null,
      tradition: tradition ?? null,
      summary: entry,
    }))
  })
  const warnings = filterStringArray(record.warnings)
  if (!rows.length) warnings.push('Aspect data exists but no displayable aspect rows were found.')
  return {
    status: rows.length > 0 ? 'real' : 'partial',
    calculated_at: typeof record.calculated_at === 'string' ? record.calculated_at : nowISO(),
    rows,
    warnings,
  }
}

function adaptLifeAreas(output: MasterAstroCalculationOutput): LifeAreaDisplay {
  const source =
    (output as MaybeObject)?.life_area_signatures ??
    (output as MaybeObject)?.life_areas ??
    ((output as MaybeObject)?.prediction_ready_context ? toRecord((output as MaybeObject)?.prediction_ready_context).life_area_signatures : undefined)
  const record = toRecord(source)
  if (!source) {
    return { status: 'not_available', calculated_at: nowISO(), rows: [], warnings: ['Life-area signatures were not returned by the calculator.'] }
  }
  const signatureItems = toArray(record.rows).length > 0
    ? toArray(record.rows)
    : toArray(record.signatures).length > 0
      ? toArray(record.signatures)
      : toArray(record.areas).length > 0
        ? toArray(record.areas)
      : toArray(record.items).length > 0
        ? toArray(record.items)
          : objectEntriesToRecords(record.signatures ?? source)
  const rows = signatureItems.flatMap((item) => {
    const row = toRecord(item)
    const area = displayString(row.area ?? row.life_area ?? row.name ?? row.key ?? row.label)
    const house = displayString(row.house_number ?? row.house ?? row.bhava)
    const sign = displayString(row.house_sign ?? row.sign ?? row.rashi)
    const lord = displayString(row.lord ?? row.house_lord ?? row.lord_planet)
    const lordHouse = displayString(row.lord_placement_house ?? row.lord_house ?? row.lord_in_house)
    const strengthNote = displayString(row.strength_note ?? row.strength ?? row.summary ?? row.note)
    if (!area && !house && !sign && !strengthNote) return []
    const summary = area
      ? (house && sign && lord && lordHouse ? `${area}: H${house} ${sign}, lord ${lord} in H${lordHouse}` : strengthNote ? `${area}: ${strengthNote}` : house && sign ? `${area}: H${house} ${sign}` : null)
      : (house && sign ? `House ${house}: ${sign}` : strengthNote ? strengthNote : null)
    if (!summary) return []
    return [{ area: area ?? `House ${house ?? 'Unknown'}`, house: house ?? null, sign: sign ?? null, lord: lord ?? null, lord_house: lordHouse ?? null, strength_note: strengthNote ?? null, summary }]
  })
  const warnings = filterStringArray(record.warnings)
  if (!rows.length) warnings.push('Life-area source exists but no displayable rows were found.')
  return {
    status: rows.length > 0 ? 'real' : 'partial',
    calculated_at: typeof record.calculated_at === 'string' ? record.calculated_at : nowISO(),
    rows,
    warnings,
  }
}

export function buildProfileExpandedSectionsFromMasterOutput(output: MasterAstroCalculationOutput): AstroExpandedSections {
  const record = output as Record<string, unknown>
  const rawPanchang = normalizeAvailableSection(record.panchang)
  const rawVimshottariDasha = normalizeAvailableSection(record.vimshottari_dasha)
  const rawNavamsaD9 = normalizeAvailableSection(record.navamsa_d9)
  const rawAshtakvarga = normalizeAvailableSection(record.ashtakvarga)
  const rawSadeSati = normalizeAvailableSection(record.sade_sati)
  const rawKalsarpaDosh = normalizeAvailableSection(record.kalsarpa_dosh)
  const rawManglikDosh = normalizeAvailableSection(record.manglik_dosha)
  const rawDosha = normalizeAvailableSection(record.dosha)
  const rawYoga = normalizeAvailableSection(record.yoga)
  const rawAvkahadaChakra = normalizeAvailableSection(record.avkahada_chakra)
  const rawFavourablePoints = normalizeAvailableSection(record.favourable_points)
  const rawGhatak = normalizeAvailableSection(record.ghatak)
  const rawShadbala = normalizeAvailableSection(record.shadbala)
  const daily_transits = adaptDailyTransits(output) as AstroExpandedSections['daily_transits']
  const panchang = (rawPanchang ?? adaptPanchang(output)) as AstroExpandedSections['panchang']
  const navamsa_d9 = (rawNavamsaD9 ?? adaptNavamsa(output)) as unknown as AstroExpandedSections['navamsa_d9']
  const aspects = adaptAspects(output) as unknown as AstroExpandedSections['planetary_aspects']
  const life_area_signatures = adaptLifeAreas(output) as unknown as AstroExpandedSections['life_area_signatures']
  return {
    daily_transits,
    panchang,
    current_timing: adaptCurrentTimingFromVimshottari(output),
    vimshottari_dasha: rawVimshottariDasha ?? undefined,
    navamsa_d9,
    planetary_aspects: aspects,
    basic_aspects: aspects,
    life_area_signatures,
    ashtakvarga: rawAshtakvarga ?? undefined,
    sade_sati: rawSadeSati ?? undefined,
    kalsarpa_dosh: rawKalsarpaDosh ?? undefined,
    manglik_dosha: rawManglikDosh ?? undefined,
    dosha: rawDosha ?? undefined,
    yoga: rawYoga ?? undefined,
    avkahada_chakra: rawAvkahadaChakra ?? undefined,
    favourable_points: rawFavourablePoints ?? undefined,
    ghatak: rawGhatak ?? undefined,
    shadbala: rawShadbala ?? undefined,
  }
}

export function buildProfileExpandedSectionsFromStoredChartJson(chartJson: Record<string, unknown> | null | undefined): AstroExpandedSections | null {
  if (!chartJson) return null
  const storedExpanded = chartJson.expanded_sections as AstroExpandedSections | undefined
  const source =
    chartJson.astronomical_data && typeof chartJson.astronomical_data === 'object'
      ? (chartJson.astronomical_data as MasterAstroCalculationOutput)
      : (chartJson as unknown as MasterAstroCalculationOutput)

  const rebuilt = buildProfileExpandedSectionsFromMasterOutput(source)

  if (!storedExpanded) {
    return rebuilt
  }

  return {
    ...storedExpanded,
    daily_transits: preferDisplaySection(rebuilt.daily_transits, storedExpanded.daily_transits) as AstroExpandedSections['daily_transits'],
    panchang: preferDisplaySection(rebuilt.panchang, storedExpanded.panchang) as AstroExpandedSections['panchang'],
    current_timing: preferDisplaySection(rebuilt.current_timing, storedExpanded.current_timing) as AstroExpandedSections['current_timing'],
    vimshottari_dasha: preferDisplaySection(rebuilt.vimshottari_dasha, storedExpanded.vimshottari_dasha) as AstroExpandedSections['vimshottari_dasha'],
    navamsa_d9: preferDisplaySection(rebuilt.navamsa_d9, storedExpanded.navamsa_d9) as AstroExpandedSections['navamsa_d9'],
    planetary_aspects: preferDisplaySection(rebuilt.planetary_aspects, storedExpanded.planetary_aspects) as AstroExpandedSections['planetary_aspects'],
    basic_aspects: preferDisplaySection(rebuilt.basic_aspects, storedExpanded.basic_aspects) as AstroExpandedSections['basic_aspects'],
    life_area_signatures: preferDisplaySection(rebuilt.life_area_signatures, storedExpanded.life_area_signatures) as AstroExpandedSections['life_area_signatures'],
    ashtakvarga: preferAvailableSection(rebuilt.ashtakvarga, storedExpanded.ashtakvarga) as AstroExpandedSections['ashtakvarga'],
    sade_sati: preferAvailableSection(rebuilt.sade_sati, storedExpanded.sade_sati) as AstroExpandedSections['sade_sati'],
    kalsarpa_dosh: preferAvailableSection(rebuilt.kalsarpa_dosh, storedExpanded.kalsarpa_dosh) as AstroExpandedSections['kalsarpa_dosh'],
    manglik_dosha: preferAvailableSection(rebuilt.manglik_dosha, storedExpanded.manglik_dosha) as AstroExpandedSections['manglik_dosha'],
    avkahada_chakra: preferAvailableSection(rebuilt.avkahada_chakra, storedExpanded.avkahada_chakra) as AstroExpandedSections['avkahada_chakra'],
    favourable_points: preferAvailableSection(rebuilt.favourable_points, storedExpanded.favourable_points) as AstroExpandedSections['favourable_points'],
    ghatak: preferAvailableSection(rebuilt.ghatak, storedExpanded.ghatak) as AstroExpandedSections['ghatak'],
    shadbala: preferAvailableSection(rebuilt.shadbala, storedExpanded.shadbala) as AstroExpandedSections['shadbala'],
  }
}

export function buildProfileChartJsonFromMasterOutput(args: {
  output: MasterAstroCalculationOutput
  userId: string
  profileId: string
  calculationId: string
  chartVersionId: string
  chartVersion: number
  inputHash: string
  settingsHash: string
  settingsForHash: AstrologySettings
  normalized: Record<string, unknown>
  engineVersion: string
  ephemerisVersion: string
  schemaVersion: string
}): ChartJson & { chart_json_v2?: CanonicalChartJsonV2; chartJsonV2?: CanonicalChartJsonV2 } {
  const expanded_sections = buildProfileExpandedSectionsFromMasterOutput(args.output)
  const confidence = ((args.output as MaybeObject)?.confidence ?? { value: 0, label: 'not_enough_context', reasons: [] }) as ConfidenceScore
  const calculationSettings = extractCalculationSettingsMetadata({
    metadata: {
      calculation_settings: args.settingsForHash,
      settings_hash: args.settingsHash,
      engine_version: args.engineVersion,
      schema_version: args.schemaVersion,
      engine: (args.output as MaybeObject)?.engine,
    },
    calculation_settings: args.settingsForHash,
  })
  if (!calculationSettings.panchangConvention) {
    const panchangConvention = (args.output as MaybeObject)?.panchang && typeof (args.output as MaybeObject)?.panchang === 'object'
      ? ((args.output as MaybeObject)?.panchang as Record<string, unknown>).convention
      : undefined
    if (typeof panchangConvention === 'string' && panchangConvention.trim()) {
      calculationSettings.panchangConvention = panchangConvention.trim().toLowerCase().replace(/[\s-]+/g, '_')
    }
  }
  const canonical_chart_json_v2 = buildCanonicalChartJsonV2({
    metadata: {
      userId: args.userId,
      profileId: args.profileId,
      calculationId: args.calculationId,
      chartVersionId: args.chartVersionId,
      inputHash: args.inputHash,
      settingsHash: args.settingsHash,
      engine: getEngineName(args.output),
      engineVersion: args.engineVersion,
      calculationSettings,
      runtimeClock: ((args.output as MaybeObject)?.runtime_clock as { current_utc: string; as_of_date?: string } | undefined)
        ? {
            currentUtc: ((args.output as MaybeObject)?.runtime_clock as { current_utc: string; as_of_date?: string }).current_utc,
            asOfDate: ((args.output as MaybeObject)?.runtime_clock as { current_utc: string; as_of_date?: string }).as_of_date,
          }
        : undefined,
    },
    sections: buildCanonicalSections(args.output, expanded_sections) as never,
  })
  const chart_json_v2 = buildCanonicalChartJsonV2FromCalculation({
    profileId: args.profileId,
    calculationId: args.calculationId,
    inputHash: args.inputHash,
    settingsHash: args.settingsHash,
    engineVersion: args.engineVersion,
    ephemerisVersion: args.ephemerisVersion,
    ayanamsha: (calculationSettings.ayanamsa ?? 'lahiri'),
    houseSystem: (calculationSettings.houseSystem ?? 'whole_sign'),
    runtimeClockIso: ((args.output as MaybeObject)?.runtime_clock as { current_utc: string; as_of_date?: string } | undefined)?.current_utc ?? nowISO(),
    sections: (hasCanonicalChartJsonV2Sections(canonical_chart_json_v2)
      ? {
          timeFacts: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.timeFacts, 'time_facts_not_available'),
          planetaryPositions: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.planetaryPositions, 'planetary_positions_not_available'),
          lagna: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.lagna, 'lagna_not_available'),
          houses: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.houses, 'houses_not_available'),
          panchang: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.panchang, 'panchang_not_available'),
          d1Chart: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.d1Chart, 'd1_chart_not_available'),
          d9Chart: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.d9Chart, 'd9_chart_not_available'),
          shodashvarga: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.shodashvarga, 'shodashvarga_not_available'),
          shodashvargaBhav: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.shodashvargaBhav, 'shodashvarga_bhav_not_available'),
          vimshottari: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.vimshottari, 'vimshottari_not_available'),
          kp: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.kp, 'kp_not_available'),
          dosha: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.dosha, 'dosha_not_available'),
          ashtakavarga: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.ashtakavarga, 'ashtakavarga_not_available'),
          transits: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.transits, 'transits_not_available'),
          advanced: canonicalSectionFromLegacySection(canonical_chart_json_v2.sections.advanced, 'advanced_not_available'),
        }
      : ({} as never)) as never,
  })

  return {
    metadata: {
      user_id: args.userId,
      profile_id: args.profileId,
      calculation_id: args.calculationId,
      chart_version_id: args.chartVersionId,
      input_hash: args.inputHash,
      settings_hash: args.settingsHash,
      engine_version: args.engineVersion,
      ephemeris_version: args.ephemerisVersion,
      schema_version: args.schemaVersion,
      chart_version: args.chartVersion,
      computed_at: nowISO(),
      calculation_status: mapChartStatus(args.output.calculation_status),
      runtime_clock: ((args.output as MaybeObject)?.runtime_clock as { current_utc: string; as_of_date?: string } | undefined) ?? undefined,
      canonical_schema_version: 'chart_json_v2',
    },
    normalized_input: args.normalized,
    calculation_settings: args.settingsForHash,
    planets: adaptPlanets(args.output),
    lagna: toRecord((args.output as MaybeObject)?.lagna),
    houses: adaptHouses(args.output),
    d1_chart: adaptD1Chart(args.output),
    expanded_sections,
    astronomical_data: args.output,
    prediction_ready_summaries: (args.output as MaybeObject)?.prediction_ready_context as Record<string, unknown> ?? {},
    confidence_and_warnings: {
      confidence: { overall: confidence },
      warnings: Array.isArray((args.output as MaybeObject)?.warnings) ? (args.output as MaybeObject)?.warnings as ChartJson['confidence_and_warnings']['warnings'] : [],
    },
    audit: (args.output as MaybeObject)?.audit as ChartJson['audit'] ?? { sources: [], engine_modules: [], notes: [] },
    panchang: toRecord((args.output as MaybeObject)?.panchang),
    avkahada: toRecord((args.output as MaybeObject)?.avkahada),
    divisional_charts: toRecord((args.output as MaybeObject)?.divisional_charts),
    dashas: toRecord((args.output as MaybeObject)?.dashas),
    doshas: toRecord((args.output as MaybeObject)?.doshas),
    transits: toRecord((args.output as MaybeObject)?.transits),
    aspects: toRecord((args.output as MaybeObject)?.aspects),
    ashtakavarga: toRecord((args.output as MaybeObject)?.ashtakavarga),
    jaimini: toRecord((args.output as MaybeObject)?.jaimini),
    life_area_signatures: toRecord((args.output as MaybeObject)?.life_area_signatures),
    timing_signatures: toRecord((args.output as MaybeObject)?.timing_signatures),
    canonical_chart_json_v2,
    chart_json_v2,
    chartJsonV2: chart_json_v2,
  }
}
