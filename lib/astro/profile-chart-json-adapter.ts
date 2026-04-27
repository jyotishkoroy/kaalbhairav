import type { ChartJson, AstrologySettings, AstroExpandedSections, ConfidenceScore } from './types.ts'
import type { MasterAstroCalculationOutput } from './schemas/master.ts'
import type { DailyTransits, Panchang, CurrentTimingContext, DashaPeriod, TransitPlanet } from './engine/types.ts'

type MaybeObject = Record<string, unknown> | null | undefined

function nowISO(): string {
  return new Date().toISOString()
}

function mapStatus(status: string | undefined): DailyTransits['status'] | Panchang['status'] | CurrentTimingContext['status'] {
  if (status === 'real' || status === 'partial' || status === 'stub' || status === 'not_available' || status === 'error') {
    return status
  }
  if (status === 'calculated') return 'real'
  return 'not_available'
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

function adaptDailyTransits(output: MasterAstroCalculationOutput): DailyTransits {
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
      transits: [],
      warnings: ['Daily transits were not returned by the calculator.'],
    }
  }

  const transits = toArray(record.transits).length > 0
    ? toArray(record.transits)
    : toArray(record.transit_planets)
  const hasUsefulFields = transits.length > 0
    || typeof record.current_utc === 'string'
    || record.current_moon_rashi != null
    || record.current_moon_nakshatra != null
    || record.current_tithi != null
    || record.transit_relation_to_natal != null
  const explicitStatus = typeof record.status === 'string' ? mapStatus(record.status) : null
  return {
    status: hasUsefulFields ? (explicitStatus ?? 'real') : 'not_available',
    calculated_at: typeof record.calculated_at === 'string' ? record.calculated_at : (typeof record.current_utc === 'string' ? record.current_utc : nowISO()),
    transits: (transits as TransitPlanet[]),
    transit_planets: (toArray(record.transit_planets).length > 0 ? toArray(record.transit_planets) : transits) as TransitPlanet[],
    current_moon_rashi: (record.current_moon_rashi as DailyTransits['current_moon_rashi']) ?? null,
    current_moon_nakshatra: (record.current_moon_nakshatra as DailyTransits['current_moon_nakshatra']) ?? null,
    current_tithi: (record.current_tithi as DailyTransits['current_tithi']) ?? null,
    transit_relation_to_natal: toArray(record.transit_relation_to_natal),
    warnings: filterStringArray(record.warnings),
  }
}

function adaptPanchang(output: MasterAstroCalculationOutput): Panchang {
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

  const status = mapStatus(typeof record.status === 'string' ? record.status : (record.calculation_status as string | undefined)) as Panchang['status']
  return {
    status,
    calculated_at: typeof record.calculation_instant_utc === 'string' ? record.calculation_instant_utc : (typeof record.calculated_at === 'string' ? record.calculated_at : nowISO()),
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
    warnings: filterStringArray(record.warnings),
  }
}

function adaptCurrentTimingFromVimshottari(output: MasterAstroCalculationOutput): CurrentTimingContext {
  const source = (output as MaybeObject)?.vimshottari_dasha as Record<string, unknown> | undefined
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

function adaptNavamsa(output: MasterAstroCalculationOutput): Record<string, unknown> {
  const source =
    (output as MaybeObject)?.navamsa_d9 ??
    (output as MaybeObject)?.navamsa ??
    ((output as MaybeObject)?.divisional_charts ? toRecord((output as MaybeObject)?.divisional_charts).d9 : undefined) ??
    (output as MaybeObject)?.d9
  const record = toRecord(source)
  if (!source) {
    return { status: 'not_available', calculated_at: nowISO(), warnings: ['Navamsa was not returned by the calculator.'] }
  }
  return {
    status: 'real',
    calculated_at: typeof record.calculated_at === 'string' ? record.calculated_at : nowISO(),
    ...record,
  }
}

function adaptAspects(output: MasterAstroCalculationOutput): Record<string, unknown> {
  const source =
    (output as MaybeObject)?.planetary_aspects_drishti ??
    (output as MaybeObject)?.planetary_aspects ??
    (output as MaybeObject)?.aspects ??
    (output as MaybeObject)?.drishti
  const record = toRecord(source)
  if (!source) {
    return { status: 'not_available', calculated_at: nowISO(), aspects: [], warnings: ['Aspects were not returned by the calculator.'] }
  }
  return {
    status: 'real',
    calculated_at: typeof record.calculated_at === 'string' ? record.calculated_at : nowISO(),
    aspects: Array.isArray(record.aspects) ? record.aspects : record,
    warnings: filterStringArray(record.warnings),
  }
}

function adaptLifeAreas(output: MasterAstroCalculationOutput): Record<string, unknown> {
  const source =
    (output as MaybeObject)?.life_area_signatures ??
    (output as MaybeObject)?.life_areas ??
    ((output as MaybeObject)?.prediction_ready_context ? toRecord((output as MaybeObject)?.prediction_ready_context).life_area_signatures : undefined)
  const record = toRecord(source)
  if (!source) {
    return { status: 'not_available', calculated_at: nowISO(), signatures: [], warnings: ['Life-area signatures were not returned by the calculator.'] }
  }
  return {
    status: 'real',
    calculated_at: typeof record.calculated_at === 'string' ? record.calculated_at : nowISO(),
    signatures: Array.isArray(record.signatures) ? record.signatures : record,
    warnings: filterStringArray(record.warnings),
  }
}

export function buildProfileExpandedSectionsFromMasterOutput(output: MasterAstroCalculationOutput): AstroExpandedSections {
  const aspects = adaptAspects(output) as AstroExpandedSections['planetary_aspects']
  return {
    daily_transits: adaptDailyTransits(output),
    panchang: adaptPanchang(output),
    current_timing: adaptCurrentTimingFromVimshottari(output),
    navamsa_d9: adaptNavamsa(output) as AstroExpandedSections['navamsa_d9'],
    planetary_aspects: aspects,
    basic_aspects: aspects,
    life_area_signatures: adaptLifeAreas(output) as AstroExpandedSections['life_area_signatures'],
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
