import type { AstroExpandedSections } from './engine/types.ts'
export type { AstroExpandedSections }

export type UUID = string
export type ISODate = string
export type ISODateTime = string

export type BirthTimePrecision = 'exact' | 'minute' | 'hour' | 'day_part' | 'unknown'
export type Gender = 'male' | 'female' | 'non_binary' | 'unknown' | 'not_provided'
export type Ayanamsa = 'lahiri' | 'raman' | 'krishnamurti' | 'true_chitra' | 'fagan_bradley' | 'yukteshwar' | 'custom'
export type HouseSystem = 'whole_sign' | 'sripati' | 'bhava_chalit' | 'equal' | 'placidus' | 'kp'
export type NodeType = 'mean_node' | 'true_node'
export type ZodiacType = 'sidereal' | 'tropical'
export type WarningSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical' | 'fatal'

export type AstroWarning = {
  warning_code: string
  severity: WarningSeverity
  affected_calculations: string[]
  explanation: string
  suggested_action?: string
  confidence_impact?: number
}

export type ConfidenceScore = {
  value: number
  label: 'high' | 'medium' | 'low' | 'not_enough_context'
  reasons: string[]
}

export type BirthProfileInput = {
  display_name: string
  birth_date: ISODate
  birth_time?: string | null
  birth_time_known: boolean
  birth_time_precision: BirthTimePrecision
  birth_place_name: string
  latitude: number
  longitude: number
  timezone: string
  gender?: Gender
  calendar_system?: 'gregorian'
  data_consent_version: string
}

export type EncryptedBirthPayload = BirthProfileInput & { submitted_at: ISODateTime }

export type AstrologySettings = {
  astrology_system: 'parashari' | 'jaimini' | 'kp' | 'mixed_research'
  zodiac_type: ZodiacType
  ayanamsa: Ayanamsa
  house_system: HouseSystem
  node_type: NodeType
  dasha_year_basis: 'civil_365.2425' | 'sidereal_365.25' | 'traditional_360'
}

export type CalculationStatus = 'stub' | 'real' | 'partial' | 'failed' | 'error'

export type ChartIdentity = {
  user_id: UUID
  profile_id: UUID
  calculation_id: UUID
  chart_version_id: UUID
  input_hash: string
  settings_hash: string
  engine_version: string
  ephemeris_version: string
  schema_version: string
  chart_version: number
  computed_at: ISODateTime
}

export type ChartJson = {
  metadata: ChartIdentity & { calculation_status: CalculationStatus }
  normalized_input: Record<string, unknown>
  calculation_settings: AstrologySettings
  astronomical_data: Record<string, unknown>
  panchang: Record<string, unknown>
  avkahada: Record<string, unknown>
  planets: Record<string, unknown>
  lagna: Record<string, unknown>
  houses: Record<string, unknown>
  d1_chart: Record<string, unknown>
  divisional_charts: Record<string, unknown>
  dashas: Record<string, unknown>
  doshas: Record<string, unknown>
  transits: Record<string, unknown>
  aspects: Record<string, unknown>
  ashtakavarga: Record<string, unknown>
  jaimini: Record<string, unknown>
  life_area_signatures: Record<string, unknown>
  timing_signatures: Record<string, unknown>
  prediction_ready_summaries: Record<string, unknown>
  confidence_and_warnings: {
    confidence: Record<string, ConfidenceScore>
    warnings: AstroWarning[]
  }
  audit: { sources: string[]; engine_modules: string[]; notes: string[] }
  expanded_sections?: AstroExpandedSections
  vimshottari_dasha?: Record<string, unknown>
  navamsa_d9?: Record<string, unknown>
  ashtakvarga?: Record<string, unknown>
  sade_sati?: Record<string, unknown>
  kalsarpa_dosh?: Record<string, unknown>
  manglik_dosha?: Record<string, unknown>
  avkahada_chakra?: Record<string, unknown>
  favourable_points?: Record<string, unknown>
  ghatak?: Record<string, unknown>
  shadbala?: Record<string, unknown>
}

export type PredictionContext = {
  do_not_recalculate: true
  chart_identity: {
    chart_version_id: UUID
    schema_version: string
    engine_version: string
    ephemeris_version: string
    calculation_status: CalculationStatus
  }
  confidence: Record<string, ConfidenceScore>
  warnings: AstroWarning[]
  core_natal_summary: Record<string, unknown>
  life_area_signatures: Record<string, unknown>
  current_timing: Record<string, unknown>
  dashas: Record<string, unknown>
  doshas: Record<string, unknown>
  expanded_context?: {
    daily_transits_summary: string | null
    panchang_summary: string | null
    current_timing_summary: string | null
    navamsa_lagna: string | null
    navamsa_summary: string | null
    aspects_summary: string | null
    life_areas_summary: string | null
    sections_unavailable: string[]
  }
  allowed_astro_terms: string[]
  unsupported_fields: string[]
  llm_instructions: {
    do_not_calculate_astrology: true
    do_not_modify_chart_values: true
    do_not_invent_missing_data: true
    do_not_infer_missing_data: true
    explain_only_from_supplied_context: true
    mention_warnings_where_relevant: true
    refuse_deterministic_medical_legal_financial_death_or_guaranteed_event_predictions: true
  }
}
