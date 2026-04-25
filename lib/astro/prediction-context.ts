import type { ChartJson, PredictionContext } from './types'

export function buildPredictionContext(chartJson: ChartJson): PredictionContext {
  return {
    do_not_recalculate: true,
    chart_identity: {
      profile_id: chartJson.metadata.profile_id,
      chart_version_id: chartJson.metadata.chart_version_id,
      schema_version: chartJson.metadata.schema_version,
      engine_version: chartJson.metadata.engine_version,
      ephemeris_version: chartJson.metadata.ephemeris_version,
      calculation_status: chartJson.metadata.calculation_status,
    },
    confidence: chartJson.confidence_and_warnings.confidence,
    warnings: chartJson.confidence_and_warnings.warnings,
    core_natal_summary: {
      lagna_sign: null,
      moon_sign: null,
      moon_nakshatra: null,
      temperament_tags: [],
      pattern_tags: [],
    },
    life_area_signatures: chartJson.life_area_signatures,
    current_timing: chartJson.timing_signatures,
    dashas: chartJson.dashas,
    doshas: chartJson.doshas,
    allowed_astro_terms: [],
    unsupported_fields: [
      'planetary_positions',
      'lagna',
      'houses',
      'dashas',
      'transits',
      'ashtakavarga',
    ],
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
