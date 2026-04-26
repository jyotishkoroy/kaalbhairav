import type { ChartJson, PredictionContext } from './types'

const UNSUPPORTED_FIELDS_WHEN_STUB = [
  'planetary_positions', 'lagna', 'houses', 'dashas',
  'transits', 'ashtakavarga', 'doshas', 'panchang', 'avkahada',
]

export function buildPredictionContext(chart: ChartJson, topic: string = 'general'): PredictionContext {
  const isStub = chart.metadata.calculation_status === 'stub'

  // Extract real natal data when available
  const moon = chart.planets as Record<string, Record<string, unknown> | undefined>
  const lagna = chart.lagna as Record<string, unknown> | null

  const moonSign = moon?.moon?.sign as string | null ?? null
  const moonNakshatra = moon?.moon?.nakshatra as string | null ?? null
  const lagnaSign = lagna?.sign as string | null ?? null
  const lagnaUncertain = lagna?.uncertain as boolean | undefined

  const sunSign = moon?.sun?.sign as string | null ?? null
  const ascNakshatra = lagna ? (lagna.nakshatra as string | null ?? null) : null

  const coreSummaryLines: string[] = []
  if (!isStub) {
    if (lagnaSign) coreSummaryLines.push(`Lagna (Ascendant): ${lagnaSign}${lagnaUncertain ? ' (uncertain — birth time not known)' : ''}`)
    if (sunSign) coreSummaryLines.push(`Sun sign (sidereal): ${sunSign}`)
    if (moonSign) coreSummaryLines.push(`Moon sign (sidereal): ${moonSign}`)
    if (moonNakshatra) coreSummaryLines.push(`Moon nakshatra: ${moonNakshatra}`)
    if (ascNakshatra) coreSummaryLines.push(`Lagna nakshatra: ${ascNakshatra}`)

    // D1 placements summary
    const d1 = chart.d1_chart as Record<string, unknown> | null
    const placements = d1?.placements as Record<string, { house: number; sign: string }> | undefined
    if (placements) {
      const keyPlanets = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu']
      for (const p of keyPlanets) {
        const pl = placements[p]
        if (pl) coreSummaryLines.push(`${p.charAt(0).toUpperCase() + p.slice(1)}: ${pl.sign} (house ${pl.house})`)
      }
    }
  }

  const core_natal_summary = isStub
    ? { lagna_sign: null, moon_sign: null, moon_nakshatra: null, temperament_tags: [], pattern_tags: [] }
    : {
        lagna_sign: lagnaSign,
        moon_sign: moonSign,
        moon_nakshatra: moonNakshatra,
        sun_sign: sunSign,
        lagna_nakshatra: ascNakshatra,
        lagna_uncertain: lagnaUncertain ?? false,
        summary: coreSummaryLines.join('\n'),
        temperament_tags: [],
        pattern_tags: [],
        topic,
      }

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
    core_natal_summary,
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
