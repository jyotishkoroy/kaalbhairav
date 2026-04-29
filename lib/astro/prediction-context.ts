/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { ChartJson, PredictionContext, AstroExpandedSections } from './types.ts'
import type { DailyTransits, Panchang, CurrentTimingContext, NavamsaD9, BasicAspects, LifeAreaSignatures } from './engine/types.ts'

const UNSUPPORTED_FIELDS_WHEN_STUB = [
  'planetary_positions', 'lagna', 'houses', 'dashas',
  'transits', 'ashtakavarga', 'doshas', 'panchang', 'avkahada',
]

function isUnavailable(status: string | undefined): boolean {
  return !status || status === 'stub' || status === 'not_available' || status === 'error'
}

function buildExpandedContext(chart: ChartJson): PredictionContext['expanded_context'] {
  const ex = chart.expanded_sections as AstroExpandedSections | undefined
  if (!ex) return undefined

  const sectionsUnavailable: string[] = []

  const transits = ex.daily_transits as DailyTransits | undefined
  let daily_transits_summary: string | null = null
  if (isUnavailable(transits?.status)) {
    sectionsUnavailable.push('daily_transits')
  } else if (transits?.transits?.length) {
    daily_transits_summary = transits.transits
      .map((t) => `${t.planet} in ${t.sign} (house ${t.house_transited}${t.retrograde ? ', R' : ''})`)
      .join('. ')
  }

  const panchangData = ex.panchang as Panchang | undefined
  let panchang_summary: string | null = null
  if (isUnavailable(panchangData?.status)) {
    sectionsUnavailable.push('panchang')
  } else if (panchangData) {
    const parts: string[] = []
    if (panchangData.vara) parts.push(`Vara: ${panchangData.vara}`)
    if (panchangData.tithi) parts.push(`Tithi: ${panchangData.tithi.name} (${panchangData.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna'} Paksha)`)
    if (panchangData.nakshatra) parts.push(`Nakshatra: ${panchangData.nakshatra}`)
    if (panchangData.yoga) parts.push(`Yoga: ${panchangData.yoga}`)
    panchang_summary = parts.join('. ') || null
  }

  const timing = ex.current_timing as CurrentTimingContext | undefined
  let current_timing_summary: string | null = null
  if (isUnavailable(timing?.status)) {
    sectionsUnavailable.push('current_timing')
  } else if (timing) {
    const parts: string[] = []
    if (timing.current_mahadasha) parts.push(`Mahadasha: ${timing.current_mahadasha.lord} (ends ${timing.current_mahadasha.end_date})`)
    if (timing.current_antardasha) parts.push(`Antardasha: ${timing.current_antardasha.lord}`)
    if (timing.elapsed_dasha_percent != null) parts.push(`${timing.elapsed_dasha_percent.toFixed(0)}% elapsed`)
    current_timing_summary = parts.join('. ') || null
  }

  const navamsa = ex.navamsa_d9 as NavamsaD9 | undefined
  let navamsa_lagna: string | null = null
  let navamsa_summary: string | null = null
  if (isUnavailable(navamsa?.status)) {
    sectionsUnavailable.push('navamsa_d9')
  } else if (navamsa) {
    navamsa_lagna = navamsa.navamsa_lagna ?? null
    if (navamsa.planets.length) {
      navamsa_summary = navamsa.planets
        .map((p) => `${p.planet} in Navamsa ${p.navamsa_sign}`)
        .join('. ')
    }
  }

  const aspectsData = ex.basic_aspects as BasicAspects | undefined
  let aspects_summary: string | null = null
  if (isUnavailable(aspectsData?.status)) {
    sectionsUnavailable.push('basic_aspects')
  } else if (aspectsData?.aspects?.length) {
    const notable = aspectsData.aspects
      .filter((a) => a.aspected_planet !== null)
      .slice(0, 8)
      .map((a) => `${a.aspecting_planet} aspects ${a.aspected_planet} (${a.aspect_type})`)
    aspects_summary = notable.join('. ') || null
  }

  const lifeAreas = ex.life_area_signatures as LifeAreaSignatures | undefined
  let life_areas_summary: string | null = null
  if (isUnavailable(lifeAreas?.status)) {
    sectionsUnavailable.push('life_area_signatures')
  } else if (lifeAreas?.signatures?.length) {
    const keyAreas = ['career_status', 'partner_marriage', 'wealth', 'dharma_fortune', 'self']
    const notable = lifeAreas.signatures
      .filter((s) => keyAreas.includes(s.area))
      .map((s) => `${s.area.replace(/_/g, ' ')} (house ${s.house_number}): ${s.house_sign}, lord ${s.lord} in house ${s.lord_placement_house}`)
    life_areas_summary = notable.join('. ') || null
  }

  return {
    daily_transits_summary,
    panchang_summary,
    current_timing_summary,
    navamsa_lagna,
    navamsa_summary,
    aspects_summary,
    life_areas_summary,
    sections_unavailable: sectionsUnavailable,
  }
}
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
    expanded_context: buildExpandedContext(chart),
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
