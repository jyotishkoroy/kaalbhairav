import { SIGN_LORD_BY_SIGN_INDEX, EXALTATION_SIGN, DEBILITATION_SIGN, EXALTATION_LORD_OF_DEBILITATION_SIGN, type GrahaName } from './constants'
import type { D1Chart } from './d1'
import type { GrahaDrishti } from './aspects'
import type { NavamsaChart } from './navamsa'

export type YogaResult = {
  yoga_id: string
  yoga_name: string
  present: boolean
  status: 'calculated' | 'unavailable' | 'unsupported'
  confidence: 'high' | 'medium' | 'low'
  rule_formula: string
  evidence: Record<string, unknown>
  cancellation_evidence?: Record<string, unknown>
  warnings: string[]
}

function unavailableYoga(id: string, name: string, reason: string): YogaResult {
  return {
    yoga_id: id, yoga_name: name, present: false, status: 'unavailable',
    confidence: 'low', rule_formula: '', evidence: {}, warnings: [reason],
  }
}

const KENDRAS = [1, 4, 7, 10]
const TRIKONAS = [1, 5, 9]
const DUSTHANAS = [6, 8, 12]

function getHouseLord(houseNum: number, lagnaSignIndex: number): GrahaName {
  const signIdx = (lagnaSignIndex + houseNum - 1) % 12
  return SIGN_LORD_BY_SIGN_INDEX[signIdx]
}

export function calculateYogas(
  d1Chart: D1Chart,
  aspects: GrahaDrishti[],
  navamsa: NavamsaChart,
): YogaResult[] {
  const yogas: YogaResult[] = []
  const { planet_to_house, planet_to_sign, lagna_sign_index, occupying_planets_by_house } = d1Chart

  if (lagna_sign_index === null) {
    return [unavailableYoga('all', 'All Yogas', 'Lagna unavailable — yoga calculations require reliable birth time')]
  }

  const moonHouse = planet_to_house['Moon']
  const jupHouse = planet_to_house['Jupiter']
  let gajakesariPresent = false
  let gajakesariStatus: YogaResult['status'] = 'calculated'

  if (moonHouse === null || jupHouse === null) {
    gajakesariStatus = 'unavailable'
  } else {
    const relHouse = ((jupHouse - moonHouse + 12) % 12) + 1
    gajakesariPresent = KENDRAS.includes(relHouse)
  }
  yogas.push({
    yoga_id: 'gajakesari', yoga_name: 'Gajakesari Yoga',
    present: gajakesariPresent, status: gajakesariStatus,
    confidence: gajakesariStatus === 'calculated' ? 'high' : 'low',
    rule_formula: 'Jupiter in 1st, 4th, 7th, or 10th from Moon',
    evidence: { moon_house: moonHouse, jupiter_house: jupHouse },
    warnings: gajakesariStatus === 'unavailable' ? ['House placement unavailable'] : [],
  })

  const marsHouse = planet_to_house['Mars']
  let chandraPresent = false
  let chandraStatus: YogaResult['status'] = 'calculated'
  if (moonHouse === null || marsHouse === null) {
    chandraStatus = 'unavailable'
  } else {
    chandraPresent = moonHouse === marsHouse
  }
  yogas.push({
    yoga_id: 'chandra_mangala', yoga_name: 'Chandra-Mangala Yoga',
    present: chandraPresent, status: chandraStatus,
    confidence: chandraStatus === 'calculated' ? 'high' : 'low',
    rule_formula: 'Moon and Mars conjunct in same house',
    evidence: { moon_house: moonHouse, mars_house: marsHouse },
    warnings: chandraStatus === 'unavailable' ? ['House placement unavailable'] : [],
  })

  const sunSign = planet_to_sign['Sun']
  const mercSign = planet_to_sign['Mercury']
  yogas.push({
    yoga_id: 'budha_aditya', yoga_name: 'Budha-Aditya Yoga',
    present: !!(sunSign && mercSign && sunSign.sign_index === mercSign.sign_index),
    status: 'calculated',
    confidence: 'high',
    rule_formula: 'Sun and Mercury in same sign',
    evidence: { sun_sign_index: sunSign?.sign_index, mercury_sign_index: mercSign?.sign_index },
    warnings: [],
  })

  const MAHAPURUSHA: Array<{ id: string; name: string; planet: string; ownSigns: number[]; exaltSigns: number[] }> = [
    { id: 'ruchaka',  name: 'Ruchaka Yoga',  planet: 'Mars',    ownSigns: [0, 7], exaltSigns: [9]  },
    { id: 'bhadra',   name: 'Bhadra Yoga',   planet: 'Mercury', ownSigns: [2, 5], exaltSigns: [5]  },
    { id: 'hamsa',    name: 'Hamsa Yoga',    planet: 'Jupiter', ownSigns: [8, 11], exaltSigns: [3] },
    { id: 'malavya',  name: 'Malavya Yoga',  planet: 'Venus',   ownSigns: [1, 6], exaltSigns: [11] },
    { id: 'sasa',     name: 'Sasa Yoga',     planet: 'Saturn',  ownSigns: [9, 10], exaltSigns: [6] },
  ]
  for (const maha of MAHAPURUSHA) {
    const pSign = planet_to_sign[maha.planet]
    const pHouse = planet_to_house[maha.planet]
    let present = false
    let status: YogaResult['status'] = 'calculated'
    if (!pSign || pHouse === null) {
      status = 'unavailable'
    } else {
      const inOwnOrExalt = maha.ownSigns.includes(pSign.sign_index) || maha.exaltSigns.includes(pSign.sign_index)
      present = inOwnOrExalt && KENDRAS.includes(pHouse)
    }
    yogas.push({
      yoga_id: maha.id, yoga_name: maha.name, present, status,
      confidence: status === 'calculated' ? 'high' : 'low',
      rule_formula: `${maha.planet} in own sign or exaltation AND in kendra (1,4,7,10)`,
      evidence: { planet: maha.planet, sign_index: pSign?.sign_index, house: pHouse },
      warnings: status === 'unavailable' ? ['House/sign placement unavailable'] : [],
    })
  }

  const classicPlanets: GrahaName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
  const parivartanaPairs: Array<{ a: string; b: string; a_sign: number; b_sign: number }> = []

  for (let i = 0; i < classicPlanets.length; i++) {
    for (let j = i + 1; j < classicPlanets.length; j++) {
      const pA = classicPlanets[i]
      const pB = classicPlanets[j]
      const signA = planet_to_sign[pA]
      const signB = planet_to_sign[pB]
      if (!signA || !signB) continue
      const lordOfA = SIGN_LORD_BY_SIGN_INDEX[signA.sign_index]
      const lordOfB = SIGN_LORD_BY_SIGN_INDEX[signB.sign_index]
      if (lordOfA === pB && lordOfB === pA) {
        parivartanaPairs.push({ a: pA, b: pB, a_sign: signA.sign_index, b_sign: signB.sign_index })
      }
    }
  }
  yogas.push({
    yoga_id: 'parivartana', yoga_name: 'Parivartana Yoga (Mutual Exchange)',
    present: parivartanaPairs.length > 0, status: 'calculated',
    confidence: parivartanaPairs.length > 0 ? 'high' : 'high',
    rule_formula: 'Two planets in each other\'s signs (mutual sign exchange)',
    evidence: { exchange_pairs: parivartanaPairs },
    warnings: [],
  })

  const vipritPlacements: Array<{ planet: string; rules_house: number; placed_in_house: number }> = []
  for (const dh of DUSTHANAS) {
    const dhLord = getHouseLord(dh, lagna_sign_index)
    const lordHouse = planet_to_house[dhLord]
    if (lordHouse !== null && DUSTHANAS.includes(lordHouse)) {
      vipritPlacements.push({ planet: dhLord, rules_house: dh, placed_in_house: lordHouse })
    }
  }
  yogas.push({
    yoga_id: 'vipreet_raja', yoga_name: 'Vipreet Raja Yoga',
    present: vipritPlacements.length > 0, status: 'calculated',
    confidence: vipritPlacements.length > 0 ? 'medium' : 'medium',
    rule_formula: 'Lord of 6th, 8th, or 12th house placed in a dusthana house (6, 8, or 12)',
    evidence: { qualifying_placements: vipritPlacements },
    warnings: vipritPlacements.length > 0 ? [] : [],
  })

  const kendraLords = new Set(KENDRAS.map(h => getHouseLord(h, lagna_sign_index)))
  const trikonaLords = new Set(TRIKONAS.map(h => getHouseLord(h, lagna_sign_index)))
  const rajaYogaPairs: Array<{ kendra_lord: string; trikona_lord: string; conjunct_house: number }> = []

  for (const kl of kendraLords) {
    for (const tl of trikonaLords) {
      if (kl === tl) continue
      const klHouse = planet_to_house[kl]
      const tlHouse = planet_to_house[tl]
      if (klHouse !== null && tlHouse !== null && klHouse === tlHouse) {
        rajaYogaPairs.push({ kendra_lord: kl, trikona_lord: tl, conjunct_house: klHouse })
      }
    }
  }
  yogas.push({
    yoga_id: 'raja_yoga', yoga_name: 'Raja Yoga',
    present: rajaYogaPairs.length > 0, status: 'calculated',
    confidence: rajaYogaPairs.length > 0 ? 'medium' : 'medium',
    rule_formula: 'Lord of a kendra (1,4,7,10) and lord of a trikona (1,5,9) conjunct in same house',
    evidence: { conjunct_pairs: rajaYogaPairs, kendra_lords: [...kendraLords], trikona_lords: [...trikonaLords] },
    warnings: [],
  })

  const neechBhangFound: Array<{
    debilitated_planet: string
    cancellation_factor: string
    cancelling_planet: string
    cancelling_planet_house: number
  }> = []

  const moonHouseForNB = moonHouse

  for (const planet of classicPlanets) {
    const gn = planet as GrahaName
    const debilSign = DEBILITATION_SIGN[gn]
    if (debilSign === undefined) continue
    const pSign = planet_to_sign[planet]
    if (!pSign || pSign.sign_index !== debilSign) continue

    const dispositor = SIGN_LORD_BY_SIGN_INDEX[debilSign]
    const dispositorHouse = planet_to_house[dispositor]
    if (dispositorHouse !== null && KENDRAS.includes(dispositorHouse)) {
      neechBhangFound.push({
        debilitated_planet: planet,
        cancellation_factor: 'dispositor_in_kendra',
        cancelling_planet: dispositor,
        cancelling_planet_house: dispositorHouse,
      })
    }
    if (moonHouseForNB !== null && dispositorHouse !== null) {
      const relToMoon = ((dispositorHouse - moonHouseForNB + 12) % 12) + 1
      if (KENDRAS.includes(relToMoon)) {
        neechBhangFound.push({
          debilitated_planet: planet,
          cancellation_factor: 'dispositor_in_kendra_from_moon',
          cancelling_planet: dispositor,
          cancelling_planet_house: dispositorHouse,
        })
      }
    }

    const exaltLord = EXALTATION_LORD_OF_DEBILITATION_SIGN[gn]
    if (exaltLord) {
      const exaltLordHouse = planet_to_house[exaltLord]
      if (exaltLordHouse !== null && KENDRAS.includes(exaltLordHouse)) {
        neechBhangFound.push({
          debilitated_planet: planet,
          cancellation_factor: 'exaltation_lord_in_kendra',
          cancelling_planet: exaltLord,
          cancelling_planet_house: exaltLordHouse,
        })
      }
    }
  }
  yogas.push({
    yoga_id: 'neech_bhang_raja', yoga_name: 'Neech Bhang Raja Yoga',
    present: neechBhangFound.length > 0, status: 'calculated',
    confidence: neechBhangFound.length > 0 ? 'medium' : 'medium',
    rule_formula: 'Debilitated planet whose debilitation is cancelled: dispositor or exaltation lord of debilitation sign is in kendra from Lagna or Moon',
    evidence: { cancellations: neechBhangFound },
    warnings: neechBhangFound.length > 0 ? ['Neech Bhang Raja Yoga requires careful interpretation — cancellation may partially mitigate debilitation'] : [],
  })

  return yogas
}
