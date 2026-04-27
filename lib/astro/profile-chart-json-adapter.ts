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

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asVara(value: unknown): Panchang['vara'] {
  return typeof value === 'string' ? (value as Panchang['vara']) : 'Sunday'
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

function adaptPlanets(output: MasterAstroCalculationOutput): Record<string, unknown> {
  return toRecord((output as MaybeObject)?.planetary_positions)
}

function adaptHouses(output: MasterAstroCalculationOutput): Record<string, unknown> {
  return toRecord((output as MaybeObject)?.whole_sign_houses)
}

function adaptD1Chart(output: MasterAstroCalculationOutput): Record<string, unknown> {
  return toRecord((output as MaybeObject)?.d1_rashi_chart)
}

function adaptDailyTransits(output: MasterAstroCalculationOutput): DailyTransits {
  const source = (output as MaybeObject)?.daily_transits as Record<string, unknown> | undefined
  if (!source) {
    return {
      status: 'not_available',
      calculated_at: nowISO(),
      transits: [],
      warnings: ['Daily transits were not returned by the calculator.'],
    }
  }

  const transits = Array.isArray(source.transit_planets) ? source.transit_planets : []
  return {
    status: mapStatus(typeof source.status === 'string' ? source.status : undefined) as DailyTransits['status'],
    calculated_at: typeof source.current_utc === 'string' ? source.current_utc : (typeof source.calculated_at === 'string' ? source.calculated_at : nowISO()),
    transits: transits as TransitPlanet[],
    warnings: Array.isArray(source.warnings) ? source.warnings.filter((warning): warning is string => typeof warning === 'string') : [],
  }
}

function adaptPanchang(output: MasterAstroCalculationOutput): Panchang {
  const source = (output as MaybeObject)?.panchang as Record<string, unknown> | undefined
  if (!source) {
    return {
      status: 'not_available',
      calculated_at: nowISO(),
      date_local: '',
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

  return {
    status: mapStatus(typeof source.status === 'string' ? source.status : undefined) as Panchang['status'],
    calculated_at: typeof source.calculation_instant_utc === 'string' ? source.calculation_instant_utc : (typeof source.calculated_at === 'string' ? source.calculated_at : nowISO()),
    date_local: typeof source.panchang_local_date === 'string' ? source.panchang_local_date : '',
    vara: asVara(source.vara),
    tithi: (source.tithi as Panchang['tithi']) ?? null,
    nakshatra: asNakshatra(source.nakshatra),
    yoga: asYoga(source.yoga),
    karana: asKarana(source.karana),
    sunrise_utc: typeof source.sunrise_utc === 'string' ? source.sunrise_utc : null,
    sunset_utc: typeof source.sunset_utc === 'string' ? source.sunset_utc : null,
    warnings: Array.isArray(source.warnings) ? source.warnings.filter((warning): warning is string => typeof warning === 'string') : [],
  }
}

function adaptCurrentTimingFromVimshottari(output: MasterAstroCalculationOutput): CurrentTimingContext {
  const source = (output as MaybeObject)?.vimshottari_dasha as Record<string, unknown> | undefined
  if (!source) {
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

  const currentDasha = toRecord(source.current_dasha)
  const elapsed = typeof source.dasha_elapsed_years === 'number' ? source.dasha_elapsed_years : null
  const total = typeof source.dasha_total_years === 'number' ? source.dasha_total_years : null
  const elapsedPercent = elapsed != null && total != null && Number.isFinite(elapsed) && Number.isFinite(total) && total > 0
    ? Math.round((elapsed / total) * 10000) / 100
    : null

  return {
    status: 'real',
    calculated_at: nowISO(),
    current_mahadasha: (currentDasha.mahadasha as DashaPeriod | null) ?? null,
    current_antardasha: (currentDasha.antardasha as DashaPeriod | null) ?? null,
    current_pratyantardasha: (currentDasha.pratyantardasha as DashaPeriod | null) ?? null,
    transiting_lagna_sign: null,
    elapsed_dasha_percent: elapsedPercent,
    warnings: Array.isArray(source.boundary_warnings) ? source.boundary_warnings.filter((warning): warning is string => typeof warning === 'string') : [],
  }
}

export function buildProfileExpandedSectionsFromMasterOutput(output: MasterAstroCalculationOutput): AstroExpandedSections {
  return {
    daily_transits: adaptDailyTransits(output),
    panchang: adaptPanchang(output),
    current_timing: adaptCurrentTimingFromVimshottari(output),
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
