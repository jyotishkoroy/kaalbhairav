import type { ChartJson, PredictionContext } from './types'

const UNSUPPORTED_FIELDS_WHEN_STUB = [
  'planetary_positions', 'lagna', 'houses', 'dashas',
  'transits', 'ashtakavarga', 'doshas', 'panchang', 'avkahada',
]

export function buildPredictionContext(chart: ChartJson, _topic: string = 'general'): PredictionContext {
  const isStub = chart.metadata.calculation_status === 'stub'
  return {
    do_not_recalculate: true,
    chart_identity: {
      profile_id: chart.metadata.profile_id,
      chart_version_id: chart.metadata.chart_version_id,
      schema_version: chart.metadata.schema_version,
      engine_version: chart.metadata.engine_version,
      ephemeris_version: chart.metadata.ephemeris_version,
      calculation_status: chart.metadata.calculation_status,
    },
    confidence: chart.confidence_and_warnings.confidence,
    warnings: chart.confidence_and_warnings.warnings,
    core_natal_summary: {
      lagna_sign: null,
      moon_sign: null,
      moon_nakshatra: null,
      temperament_tags: [],
      pattern_tags: [],
    },
    life_area_signatures: chart.life_area_signatures,
    current_timing: chart.timing_signatures,
    dashas: chart.dashas,
    doshas: chart.doshas,
    allowed_astro_terms: [],
    unsupported_fields: isStub ? UNSUPPORTED_FIELDS_WHEN_STUB : [],
    llm_instructions: {
      do_not_calculate_astrology: true,
      do_not_modify_chart_values: true,
      do_not_invent_missing_data: true,
      do_not_infer_missing_data: true,
      explain_only_from_supplied_context: true,
      mention_warnings_where_relevant: true,
      refuse_deterministic_medical_legal_financial_death_or_guaranteed_event_predictions: true,
    },
  }
}
