import { normalize360 } from './math'
import type { D1Chart } from './d1'
import type { GrahaDrishti } from './aspects'
import type { PlanetPosition } from './planets'

export type DoshaResult = {
  dosha_id: string
  dosha_name: string
  present: boolean
  severity: 'none' | 'low' | 'medium' | 'high'
  status: 'calculated' | 'unavailable' | 'unsupported'
  confidence: 'high' | 'medium' | 'low'
  evidence: Record<string, unknown>
  cancellation_evidence: Record<string, unknown>
  warnings: string[]
}

function unavailableDosha(id: string, name: string, reason: string): DoshaResult {
  return {
    dosha_id: id, dosha_name: name, present: false, severity: 'none',
    status: 'unavailable', confidence: 'low',
    evidence: {}, cancellation_evidence: {},
    warnings: [reason],
  }
}

export function calculateDoshas(
  d1Chart: D1Chart,
  aspects: GrahaDrishti[],
  planets?: Record<string, PlanetPosition>,
): DoshaResult[] {
  const doshas: DoshaResult[] = []
  const { planet_to_house, planet_to_sign, lagna_sign_index } = d1Chart

  if (lagna_sign_index === null) {
    return [unavailableDosha('all', 'All Doshas', 'Lagna unavailable — dosha calculations require reliable birth time')]
  }

  const marsHouse = planet_to_house['Mars']
  const MANGAL_HOUSES = [1, 2, 4, 7, 8, 12]
  let mangalPresent = false
  let mangalStatus: DoshaResult['status'] = 'calculated'
  let mangalCancellation: Record<string, unknown> = {}

  if (marsHouse === null) {
    mangalStatus = 'unavailable'
  } else {
    mangalPresent = MANGAL_HOUSES.includes(marsHouse)
    const marsSign = planet_to_sign['Mars']
    if (marsSign) {
      const marsOwnOrExalt = [0, 7, 9].includes(marsSign.sign_index)
      if (mangalPresent && marsOwnOrExalt) {
        mangalPresent = false
        mangalCancellation = { reason: 'Mars in own sign or exaltation cancels Mangal Dosha', mars_sign_index: marsSign.sign_index }
      }
    }
  }

  doshas.push({
    dosha_id: 'mangal_dosha', dosha_name: 'Mangal Dosha (Kuja Dosha)',
    present: mangalPresent,
    severity: mangalPresent ? (marsHouse === 7 || marsHouse === 8 ? 'high' : 'medium') : 'none',
    status: mangalStatus,
    confidence: mangalStatus === 'calculated' ? 'high' : 'low',
    evidence: { mars_house: marsHouse, mangal_houses: MANGAL_HOUSES },
    cancellation_evidence: mangalCancellation,
    warnings: mangalStatus === 'unavailable' ? ['Mars house placement unavailable'] : [],
  })

  const rahuSign = planet_to_sign['Rahu']
  const ketuSign = planet_to_sign['Ketu']
  const classicPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
  let kaalSarpaPresent = false
  let kaalSarpaStatus: DoshaResult['status'] = 'calculated'
  let kaalSarpaEvidence: Record<string, unknown> = {}

  if (!planets || !rahuSign || !ketuSign || !classicPlanets.every(p => planet_to_sign[p] !== null)) {
    kaalSarpaStatus = 'unavailable'
  } else {
    const rahuLon = planets['Rahu']?.sidereal_longitude
    if (rahuLon === undefined) {
      kaalSarpaStatus = 'unavailable'
    } else {
      const planetLons = classicPlanets.map(p => planets[p]?.sidereal_longitude)
      if (planetLons.some(l => l === undefined)) {
        kaalSarpaStatus = 'unavailable'
      } else {
        const inRahuArc = planetLons.every(l => normalize360(l! - rahuLon) < 180)
        const inKetuArc = planetLons.every(l => normalize360(l! - rahuLon) >= 180)
        kaalSarpaPresent = inRahuArc || inKetuArc
        kaalSarpaEvidence = {
          rahu_longitude: rahuLon,
          ketu_longitude: planets['Ketu']?.sidereal_longitude,
          all_in_rahu_arc: inRahuArc,
          all_in_ketu_arc: inKetuArc,
          planet_longitudes: Object.fromEntries(classicPlanets.map(p => [p, planets[p]?.sidereal_longitude])),
        }
      }
    }
  }

  doshas.push({
    dosha_id: 'kaal_sarpa', dosha_name: 'Kaal Sarpa Dosha',
    present: kaalSarpaPresent,
    severity: kaalSarpaPresent ? 'high' : 'none',
    status: kaalSarpaStatus,
    confidence: kaalSarpaStatus === 'calculated' ? 'medium' : 'low',
    evidence: kaalSarpaEvidence,
    cancellation_evidence: {},
    warnings: kaalSarpaStatus === 'unavailable'
      ? ['Planetary longitude data unavailable for Kaal Sarpa calculation']
      : kaalSarpaPresent ? ['Kaal Sarpa interpretation varies by tradition — medium confidence'] : [],
  })

  const moonHouse = planet_to_house['Moon']
  const saturnHouse = planet_to_house['Saturn']
  let shaniPresent = false
  let shaniStatus: DoshaResult['status'] = 'calculated'

  if (moonHouse === null || saturnHouse === null) {
    shaniStatus = 'unavailable'
  } else {
    const relHouse = ((saturnHouse - moonHouse + 12) % 12) + 1
    shaniPresent = relHouse === 7
  }

  doshas.push({
    dosha_id: 'shani_dosha_moon', dosha_name: 'Shani Dosha (Saturn 7th from Moon)',
    present: shaniPresent,
    severity: shaniPresent ? 'medium' : 'none',
    status: shaniStatus,
    confidence: shaniStatus === 'calculated' ? 'medium' : 'low',
    evidence: { moon_house: moonHouse, saturn_house: saturnHouse },
    cancellation_evidence: {},
    warnings: shaniStatus === 'unavailable' ? ['House placement unavailable'] : [],
  })

  const sunHouse = planet_to_house['Sun']
  let pitraPresent = false
  let pitraStatus: DoshaResult['status'] = 'calculated'
  let pitraSeverity: DoshaResult['severity'] = 'none'
  let pitraEvidence: Record<string, unknown> = {}

  if (sunHouse === null) {
    pitraStatus = 'unavailable'
  } else {
    const sunInNinth = sunHouse === 9
    const rahuHouse = planet_to_house['Rahu']
    const saturnHouseP = planet_to_house['Saturn']
    const rahuConjunct = rahuHouse !== null && rahuHouse === sunHouse
    const saturnConjunct = saturnHouseP !== null && saturnHouseP === sunHouse
    const rahuAspectsHouse = aspects.some(a => a.source_planet === 'Rahu' && a.target_house === sunHouse)
    const saturnAspectsHouse = aspects.some(a => a.source_planet === 'Saturn' && a.target_house === sunHouse)
    const sunAfflicted = rahuConjunct || saturnConjunct || rahuAspectsHouse || saturnAspectsHouse

    if (sunInNinth && sunAfflicted) {
      pitraPresent = true
      pitraSeverity = rahuConjunct || saturnConjunct ? 'high' : 'medium'
    }

    pitraEvidence = {
      sun_house: sunHouse,
      sun_in_ninth: sunInNinth,
      rahu_conjunct_sun: rahuConjunct,
      saturn_conjunct_sun: saturnConjunct,
      rahu_aspects_sun_house: rahuAspectsHouse,
      saturn_aspects_sun_house: saturnAspectsHouse,
    }
  }

  doshas.push({
    dosha_id: 'pitra_dosha', dosha_name: 'Pitra Dosha',
    present: pitraPresent,
    severity: pitraSeverity,
    status: pitraStatus,
    confidence: pitraStatus === 'calculated' ? 'medium' : 'low',
    evidence: pitraEvidence,
    cancellation_evidence: {},
    warnings: pitraStatus === 'unavailable'
      ? ['Sun house placement unavailable']
      : pitraPresent ? ['Pitra Dosha assessment is tradition-specific; medium confidence'] : [],
  })

  return doshas
}
