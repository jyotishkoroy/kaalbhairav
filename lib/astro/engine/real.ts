/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { AstrologySettings, AstroWarning } from '../types.ts'
import type { NormalizedBirthInput } from '../normalize.ts'
import type { EngineResult } from './index.ts'
import { isSwissEphemerisAvailable, isMoshierFallback, getSweVersion, sweJulday } from './swiss.ts'
import { getEngineDiagnostics, getEphemerisRangeMetadata, assertEphemerisRange } from './diagnostics.ts'
import { CONSTANTS_VERSION, RASHI_MAP_VERSION, NAKSHATRA_MAP_VERSION, DASHA_ORDER_VERSION, PANCHANG_SEQUENCE_VERSION } from '../calculations/constants.ts'
import { convertBirthTimeToUTC } from '../calculations/time.ts'
import { calculateJulianDay } from '../calculations/julian-day.ts'
import { calculateAyanamsa } from '../calculations/ayanamsa.ts'
import { calculateAllPlanets } from '../calculations/planets.ts'
import { calculateSign } from '../calculations/sign.ts'
import { calculateNakshatra } from '../calculations/nakshatra.ts'
import { calculateLagna } from '../calculations/lagna.ts'
import { calculateWholeSignHouses } from '../calculations/houses.ts'
import { calculateD1Chart } from '../calculations/d1.ts'
import { calculateNavamsaChart } from '../calculations/navamsa.ts'
import { calculateVimshottari } from '../calculations/vimshottari.ts'
import { calculatePanchangResult } from '../calculations/panchang.ts'
import { calculateTithi } from '../calculations/tithi.ts'
import { calculateGrahaDrishti } from '../calculations/aspects.ts'
import { calculateYogas } from '../calculations/yogas.ts'
import { calculateDoshas } from '../calculations/doshas.ts'
import { calculateStrength } from '../calculations/strength.ts'
import { calculateLifeAreas } from '../calculations/life-areas.ts'
import { calculateTransits } from '../calculations/transits.ts'
import { calculateConfidence } from '../calculations/confidence.ts'
import { collectWarnings } from '../calculations/warnings.ts'
import { ENGINE_VERSION_REAL } from './version.ts'

const SCHEMA_VERSION = '2.0.0'

export function runEngineReal(
  normalized: NormalizedBirthInput,
  settings: AstrologySettings,
): EngineResult {
  const legacyWarnings: AstroWarning[] = [...normalized.warnings]

  const allowDebugMoshier = process.env.ALLOW_MOSHIER_FALLBACK === 'true' && process.env.NODE_ENV !== 'production'
  if (!isSwissEphemerisAvailable() && !(allowDebugMoshier && isMoshierFallback())) {
    return _failedResult('Swiss Ephemeris not available', legacyWarnings)
  }

  if (normalized.timezone_status === 'invalid') {
    return _failedResult('Invalid timezone', legacyWarnings)
  }

  const birthTimeResult = convertBirthTimeToUTC({
    birth_date: normalized.birth_date_iso,
    birth_time: normalized.birth_time_iso ?? undefined,
    birth_time_known: normalized.birth_time_known,
    birth_time_precision: normalized.birth_time_precision,
    timezone: normalized.timezone,
  })

  if (birthTimeResult.timezone_status === 'invalid' || birthTimeResult.timezone_status === 'nonexistent') {
    return _failedResult(`Timezone issue: ${birthTimeResult.timezone_status}`, legacyWarnings)
  }

  if (!birthTimeResult.birth_utc) {
    return _failedResult('Birth UTC conversion failed', legacyWarnings)
  }

  const jdResult = calculateJulianDay(birthTimeResult.birth_utc, sweJulday)
  const jd_ut = jdResult.jd_ut

  try {
    assertEphemerisRange(jd_ut)
  } catch (e) {
    return _failedResult(String(e), legacyWarnings)
  }

  const ayanamsaResult = calculateAyanamsa(jd_ut)
  const ayanamsa = ayanamsaResult.value_degrees

  const nodeType: 'mean_node' | 'true_node' =
    settings.node_type === 'true_node' ? 'true_node' : 'mean_node'

  if (settings.zodiac_type !== 'sidereal') {
    legacyWarnings.push({ warning_code: 'TROPICAL_NOT_SUPPORTED', severity: 'medium', affected_calculations: ['planets', 'lagna'], explanation: 'Only sidereal zodiac supported. Using sidereal.', confidence_impact: -20 })
  }
  if (settings.ayanamsa !== 'lahiri') {
    legacyWarnings.push({ warning_code: 'AYANAMSA_FALLBACK', severity: 'low', affected_calculations: ['planets', 'lagna'], explanation: `Ayanamsa "${settings.ayanamsa}" not supported. Using Lahiri.`, confidence_impact: -5 })
  }

  const planets = calculateAllPlanets(jd_ut, ayanamsa, nodeType)
  const lagna = calculateLagna(
    jd_ut,
    normalized.latitude_full,
    normalized.longitude_full,
    ayanamsa,
    normalized.birth_time_known,
    normalized.birth_time_precision,
  )
  const houses = calculateWholeSignHouses(lagna)
  const d1Chart = calculateD1Chart(planets, lagna, houses)
  const navamsa = calculateNavamsaChart(planets, lagna)
  const moonPos = planets['Moon']
  const dasha = moonPos
    ? calculateVimshottari(moonPos.sidereal_longitude, birthTimeResult.birth_utc)
    : null

  let panchang = null
  try {
    const localDate = birthTimeResult.birth_local_wall_time.split('T')[0]
    panchang = calculatePanchangResult({
      calculationInstantUtc: birthTimeResult.birth_utc,
      localDate,
      timezone: normalized.timezone,
      latitude: normalized.latitude_full,
      longitude: normalized.longitude_full,
    })
  } catch {
    // Panchang failure is non-fatal
  }

  const aspects = calculateGrahaDrishti(d1Chart, false)
  const yogas = calculateYogas(d1Chart, aspects, navamsa)
  const doshas = calculateDoshas(d1Chart, aspects, planets)
  const strength = calculateStrength(planets, d1Chart, navamsa, aspects)
  const lifeAreas = calculateLifeAreas(d1Chart, aspects, strength.indicators, lagna)

  let transits = null
  try {
    const natalMoonSignIdx = moonPos?.sign_index ?? 0
    transits = calculateTransits(natalMoonSignIdx, lagna)
  } catch {
    // Non-fatal
  }

  const sunPos = planets['Sun']
  const tithi = moonPos && sunPos
    ? calculateTithi(moonPos.sidereal_longitude, sunPos.sidereal_longitude)
    : null

  const moonNearBoundary = (moonPos?.boundary_warnings.some(w => w.includes('nakshatra boundary'))) ?? false
  const anyPlanetBoundary = Object.values(planets).some(p =>
    p.boundary_warnings.some(w => w.includes('sign boundary')),
  )
  const confidence = calculateConfidence({
    birth_time_known: normalized.birth_time_known,
    birth_time_precision: normalized.birth_time_precision,
    timezone_status: birthTimeResult.timezone_status,
    moon_near_nakshatra_boundary: moonNearBoundary,
    lagna_near_sign_boundary: lagna?.near_sign_boundary ?? false,
    any_planet_near_sign_boundary: anyPlanetBoundary,
    high_latitude_ascendant_instability: lagna?.high_latitude_flag ?? false,
    panchang_sunrise_unavailable: !panchang?.sunrise_utc,
    swiss_ephemeris_available: isSwissEphemerisAvailable(),
  })

  const allBoundaryWarnings = Object.values(planets).flatMap(p => p.boundary_warnings)
  const structuredWarnings = collectWarnings({
    birth_time_known: normalized.birth_time_known,
    birth_time_precision: normalized.birth_time_precision,
    timezone_status: birthTimeResult.timezone_status,
    planet_boundary_warnings: allBoundaryWarnings,
    moon_near_nakshatra_boundary: moonNearBoundary,
    lagna_near_sign_boundary: lagna?.near_sign_boundary ?? false,
    latitude: normalized.latitude_full,
    panchang_available: !!panchang?.sunrise_utc,
    daily_transit_available: !!transits,
    yoga_statuses: yogas.map(y => y.status),
    dosha_statuses: doshas.map(d => d.status),
    swiss_ephemeris_available: isSwissEphemerisAvailable(),
  })

  const diagnostics = getEngineDiagnostics()
  const ephemerisRange = getEphemerisRangeMetadata()

  const coreDashaAtBirth = dasha ? {
    lord: dasha.birth_dasha_lord,
    elapsed_years: dasha.dasha_elapsed_years,
    remaining_years: dasha.dasha_remaining_years,
  } : null

  const coreNatalSummary = {
    ascendant: lagna,
    sun_sign: calculateSign(planets['Sun']?.sidereal_longitude ?? 0),
    moon_sign: calculateSign(planets['Moon']?.sidereal_longitude ?? 0),
    moon_nakshatra: calculateNakshatra(planets['Moon']?.sidereal_longitude ?? 0),
    birth_tithi: tithi,
    dasha_at_birth: coreDashaAtBirth,
    confidence,
    warnings: structuredWarnings,
  }

  const predictionReadyContext = {
    calculation_metadata: {
      ephemeris_engine: 'swiss_ephemeris' as const,
      swiss_ephemeris_version: getSweVersion(),
      timezone_engine: 'luxon' as const,
      ayanamsa: 'lahiri' as const,
      node_type: nodeType,
      sidereal_method: 'tropical_minus_ayanamsa' as const,
      moshier_fallback: isMoshierFallback(),
      constants_version: CONSTANTS_VERSION,
      rashi_map_version: RASHI_MAP_VERSION,
      nakshatra_map_version: NAKSHATRA_MAP_VERSION,
      dasha_order_version: DASHA_ORDER_VERSION,
      panchang_sequence_version: PANCHANG_SEQUENCE_VERSION,
    },
    core_natal_summary: coreNatalSummary,
    planet_positions: Object.values(planets),
    lagna,
    houses,
    d1_chart: d1Chart,
    d9_chart: navamsa,
    dasha,
    panchang,
    daily_transits: transits,
    aspects,
    yogas,
    doshas,
    strength_weakness: strength,
    life_area_signatures: lifeAreas,
    confidence,
    warnings: structuredWarnings,
    unsupported_fields: [] as string[],
  }

  const masterOutput = {
    schema_version: SCHEMA_VERSION,
    calculation_status: confidence.rejected ? 'rejected' as const : 'calculated' as const,
    rejection_reason: confidence.rejected ? confidence.rejection_reason : undefined,
    input_use: {
      used_for_astronomical_calculation: [
        'birth_date', 'birth_time', 'birth_time_known', 'birth_time_precision',
        'latitude', 'longitude', 'timezone', 'calendar_system',
      ],
      excluded_from_astronomical_calculation: ['display_name', 'birth_place_name', 'gender', 'data_consent_version'],
    },
    birth_time_result: birthTimeResult,
    julian_day: jdResult,
    ayanamsa: ayanamsaResult,
    external_engine_metadata: {
      ephemeris_engine: 'swiss_ephemeris' as const,
      swiss_ephemeris_version: getSweVersion(),
      timezone_engine: 'luxon' as const,
      ayanamsa: 'lahiri' as const,
      node_type: nodeType,
      sidereal_method: 'tropical_minus_ayanamsa' as const,
      moshier_fallback: isMoshierFallback(),
    },
    constants_version: {
      constants_version: CONSTANTS_VERSION,
      rashi_map_version: RASHI_MAP_VERSION,
      nakshatra_map_version: NAKSHATRA_MAP_VERSION,
      dasha_order_version: DASHA_ORDER_VERSION,
      panchang_sequence_version: PANCHANG_SEQUENCE_VERSION,
      tradition_settings: { node_type: nodeType, ayanamsa: 'lahiri' },
    },
    planetary_positions: {
      Sun: planets['Sun'],
      Moon: planets['Moon'],
      Mercury: planets['Mercury'],
      Venus: planets['Venus'],
      Mars: planets['Mars'],
      Jupiter: planets['Jupiter'],
      Saturn: planets['Saturn'],
      Rahu: planets['Rahu'],
      Ketu: planets['Ketu'],
    },
    sun_sign: calculateSign(planets['Sun']?.sidereal_longitude ?? 0),
    moon_sign: calculateSign(planets['Moon']?.sidereal_longitude ?? 0),
    nakshatra: calculateNakshatra(planets['Moon']?.sidereal_longitude ?? 0),
    pada: calculateNakshatra(planets['Moon']?.sidereal_longitude ?? 0).pada,
    tithi,
    lagna,
    whole_sign_houses: houses,
    d1_rashi_chart: d1Chart,
    navamsa_d9: navamsa,
    vimshottari_dasha: dasha,
    planetary_aspects_drishti: aspects,
    yogas,
    doshas,
    strength_weakness_indicators: strength,
    life_area_signatures: lifeAreas,
    panchang,
    daily_transits: transits,
    confidence,
    warnings: structuredWarnings,
    validation_results: [],
    core_natal_summary: coreNatalSummary,
    prediction_ready_context: predictionReadyContext,
    engine_boot_diagnostics: diagnostics,
    ephemeris_range_metadata: ephemerisRange,
  }

  return {
    calculation_status: 'real',
    astronomical_data: {
      julian_day: jdResult.jd_ut,
      ayanamsa_value: ayanamsa,
      ayanamsa_system: 'lahiri',
      birth_utc: birthTimeResult.birth_utc,
      schema_version: SCHEMA_VERSION,
      master_output: masterOutput,
    },
    panchang: panchang ?? {},
    avkahada: {},
    planets,
    lagna: lagna ?? { available: false, reason: 'unknown_birth_time' },
    houses: Object.fromEntries(houses.map(h => [`house_${h.house_number}`, h])),
    d1_chart: d1Chart,
    divisional_charts: { navamsa_d9: navamsa },
    dashas: dasha ?? { available: false, reason: 'moon_position_unavailable' },
    doshas: Object.fromEntries(doshas.map(d => [d.dosha_id, d])),
    transits: transits ?? {},
    aspects: { graha_drishti: aspects },
    ashtakavarga: {},
    jaimini: {},
    life_area_signatures: Object.fromEntries(lifeAreas.map(la => [la.life_area, la])),
    timing_signatures: { yogas: Object.fromEntries(yogas.map(y => [y.yoga_id, y])) },
    warnings: legacyWarnings,
    audit: {
      sources: [isMoshierFallback() ? 'moshier-via-sweph (fallback)' : `swiss-ephemeris@${getSweVersion()}`],
      engine_modules: ['planets', 'lagna', 'houses', 'navamsa', 'vimshottari', 'panchang', 'aspects', 'yogas', 'doshas', 'strength', 'life_areas', 'transits'],
      notes: [
        `Lahiri ayanamsa: ${ayanamsa.toFixed(6)}°`,
        `Birth UTC: ${birthTimeResult.birth_utc}`,
        `JD UT: ${jd_ut.toFixed(6)}`,
        `Confidence: ${confidence.score}/100 (${confidence.label})`,
        isMoshierFallback() ? 'WARNING: Using Moshier fallback — SE files not found' : 'Swiss Ephemeris files loaded',
        `Engine version: ${ENGINE_VERSION_REAL}`,
      ],
    },
  }
}

function _failedResult(reason: string, warnings: AstroWarning[]): EngineResult {
  return {
    calculation_status: 'error',
    astronomical_data: { error: reason, schema_version: SCHEMA_VERSION },
    panchang: {}, avkahada: {}, planets: {}, lagna: {}, houses: {},
    d1_chart: {}, divisional_charts: {}, dashas: {}, doshas: {},
    transits: {}, aspects: {}, ashtakavarga: {}, jaimini: {},
    life_area_signatures: {}, timing_signatures: {},
    warnings: [...warnings, {
      warning_code: 'CALCULATION_FAILED',
      severity: 'high',
      affected_calculations: ['all'],
      explanation: reason,
      confidence_impact: -100,
    }],
    audit: { sources: [], engine_modules: [], notes: [reason] },
  }
}
