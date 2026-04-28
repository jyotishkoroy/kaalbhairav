import type { ChartJson, AstrologySettings, AstroExpandedSections, ConfidenceScore } from './types.ts'
import type { MasterAstroCalculationOutput } from './schemas/master.ts'
import type { DailyTransits, Panchang, CurrentTimingContext, DashaPeriod, TransitPlanet } from './engine/types.ts'

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
  vara: Panchang['vara'] | null
  tithi: Panchang['tithi'] | null
  nakshatra: Panchang['nakshatra'] | null
  yoga: Panchang['yoga'] | null
  karana: Panchang['karana'] | null
  sunrise_utc: string | null
  sunset_utc: string | null
  sunrise_local?: string | null
  sunset_local?: string | null
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
    vara: (record.vara as Panchang['vara']) ?? null,
    tithi: (record.tithi as Panchang['tithi']) ?? null,
    nakshatra: asNakshatra(record.nakshatra),
    yoga: asYoga(record.yoga),
    karana: asKarana(record.karana),
    sunrise_utc: typeof record.sunrise_utc === 'string' ? record.sunrise_utc : null,
    sunset_utc: typeof record.sunset_utc === 'string' ? record.sunset_utc : null,
    sunrise_local: typeof record.sunrise_local === 'string' ? record.sunrise_local : null,
    sunset_local: typeof record.sunset_local === 'string' ? record.sunset_local : null,
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
  const hasCurrentDasha = !!(currentDasha.mahadasha || currentDasha.antardasha || currentDasha.pratyantardasha)

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

  const currentMahadasha = currentDasha.mahadasha ?? source.current_mahadasha ?? null
  const currentAntardasha = currentDasha.antardasha ?? source.current_antardasha ?? null
  const currentPratyantardasha = currentDasha.pratyantardasha ?? source.current_pratyantardasha ?? null
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
    avkahada_chakra: rawAvkahadaChakra ?? undefined,
    favourable_points: rawFavourablePoints ?? undefined,
    ghatak: rawGhatak ?? undefined,
    shadbala: rawShadbala ?? undefined,
  }
}

export function buildProfileExpandedSectionsFromStoredChartJson(chartJson: Record<string, unknown> | null | undefined): AstroExpandedSections | null {
  if (!chartJson) return null
  const storedExpanded = chartJson.expanded_sections as AstroExpandedSections | undefined
  if (storedExpanded) return storedExpanded
  if (!chartJson.astronomical_data) return null
  return buildProfileExpandedSectionsFromMasterOutput(chartJson.astronomical_data as MasterAstroCalculationOutput)
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
}): ChartJson {
  const expanded_sections = buildProfileExpandedSectionsFromMasterOutput(args.output)
  const confidence = ((args.output as MaybeObject)?.confidence ?? { value: 0, label: 'not_enough_context', reasons: [] }) as ConfidenceScore

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
  }
}
