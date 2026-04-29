export type ExactFactAccuracy = 'Totally accurate' | 'Partially accurate' | 'Inaccurate'

export type ChartFactAnswer = {
  topic: string
  domainName: string
  accuracy: ExactFactAccuracy
  anchors: string[]
  answer: string
  reasoning: string
  followUpQuestion?: string
}

const FACTS = {
  name: 'Jyotishko Roy',
  sex: 'Male',
  dateOfBirth: '14 June 1999',
  timeOfBirth: '09:58:00',
  dayOfBirth: 'Monday',
  placeOfBirth: 'Kolkata',
  timeZone: 'UTC+5:30',
  latitude: '22°34′ N',
  longitude: '88°22′ E',
  lmt: '10:21:28',
  gmt: '04:28:00',
  tithi: 'Pratipad',
  paksha: 'Shukla',
  yoga: 'Ganda',
  karan: 'Kintudhhana',
  sunrise: '04:51:27',
  sunset: '18:21:49',
  dayDuration: '13:30:22',
  lagna: 'Leo',
  lagnaLord: 'Sun',
  rasi: 'Gemini',
  rasiLord: 'Mercury',
  nakshatra: 'Mrigasira',
  nakshatraPada: '4',
  nakshatraLord: 'Mars',
  julianDay: '2451344',
  indianSunSign: 'Taurus',
  westernSunSign: 'Gemini',
  ayanamsa: '023-50-56',
  ayanamsaName: 'Lahiri',
  siderealTime: '03.49.35',
  dasaBalance: 'Mars 1 Y 2 M 7 D',
  luckyNumber: '2',
  goodNumbers: '1, 3, 7, 9',
  evilNumbers: '5, 8',
  goodYears: '11, 20, 29, 38, 47',
  luckyDays: 'Saturday, Friday, Sunday',
  goodPlanets: 'Saturn, Venus, Sun',
  badPlanet: 'Moon',
  luckyStone: 'Emerald',
  luckyMetal: 'Bronze',
  badDay: 'Monday',
  badNakshatra: 'Swati',
  badTithi: '2, 7, 12',
} as const

const PLANETS: Record<string, string> = {
  ascendant: 'Leo 06-16-56 Magha pada 2 house 1',
  sun: 'Taurus 28-51-52 Mrigasira pada 2 house 10',
  moon: 'Gemini 04-24-17 Mrigasira pada 4 house 11',
  mars: 'Libra 01-14-40 Chitra pada 3 house 3',
  mercury: 'Gemini 19-03-54 Ardra pada 4 house 11',
  jupiter: 'Aries 03-42-40 Ashvini pada 2 house 9',
  venus: 'Cancer 14-11-09 Pushyami pada 4 house 12',
  saturn: 'Aries 18-41-10 Bharani pada 2 house 9',
  rahu: 'Cancer 21-51-05 Ashlesha pada 2 house 12',
  ketu: 'Capricorn 21-51-05 Sravana pada 4 house 6',
  uranus: 'Capricorn 22-49-09 Sravana pada 4 house 6',
  neptune: 'Capricorn 10-04-10 Sravana pada 1 house 6',
  pluto: 'Scorpio 14-49-11 Anuradha pada 4 house 4',
}

const HOUSES: Record<number, { sign: string; domain: string; lord: string }> = {
  1: { sign: 'Leo', domain: 'self/body/personality', lord: 'Sun' },
  2: { sign: 'Virgo', domain: 'speech/family/wealth', lord: 'Mercury' },
  3: { sign: 'Libra', domain: 'courage/siblings/effort', lord: 'Venus' },
  4: { sign: 'Scorpio', domain: 'home/property/mother', lord: 'Mars' },
  5: { sign: 'Sagittarius', domain: 'intelligence/children/creativity', lord: 'Jupiter' },
  6: { sign: 'Capricorn', domain: 'disease/debt/enemies', lord: 'Saturn' },
  7: { sign: 'Aquarius', domain: 'marriage/partnership', lord: 'Saturn' },
  8: { sign: 'Pisces', domain: 'longevity/occult/obstacles', lord: 'Jupiter' },
  9: { sign: 'Aries', domain: 'fortune/dharma/father', lord: 'Mars' },
  10: { sign: 'Taurus', domain: 'career/status/action', lord: 'Venus' },
  11: { sign: 'Gemini', domain: 'income/gains/networks', lord: 'Mercury' },
  12: { sign: 'Cancer', domain: 'expense/foreign lands/loss/sleep', lord: 'Moon' },
}

const SVA = {
  Aries: { total: 30, rank: 4 },
  Taurus: { total: 26, rank: 9 },
  Gemini: { total: 27, rank: 7 },
  Cancer: { total: 22, rank: 11 },
  Leo: { total: 35, rank: 2 },
  Virgo: { total: 21, rank: 12 },
  Libra: { total: 28, rank: 6 },
  Scorpio: { total: 37, rank: 1 },
  Sagittarius: { total: 23, rank: 10 },
  Capricorn: { total: 27, rank: 8 },
  Aquarius: { total: 32, rank: 3 },
  Pisces: { total: 29, rank: 5 },
} as const

const MAHADASHA = [
  ['Mars', '14 Jun 1999', '22 Aug 2000'],
  ['Rahu', '22 Aug 2000', '22 Aug 2018'],
  ['Jupiter', '22 Aug 2018', '22 Aug 2034'],
  ['Saturn', '22 Aug 2034', '22 Aug 2053'],
  ['Mercury', '22 Aug 2053', '22 Aug 2070'],
  ['Ketu', '22 Aug 2070', '22 Aug 2077'],
  ['Venus', '22 Aug 2077', '22 Aug 2097'],
  ['Sun', '22 Aug 2097', '22 Aug 2103'],
  ['Moon', '22 Aug 2103', '22 Aug 2113'],
] as const

const VARSHAPHAL_2026 = {
  Mars: '14 Jun 2026 to 05 Jul 2026, Bhav 10th',
  Rahu: '05 Jul 2026 to 29 Aug 2026, Bhav 8th',
  Jupiter: '29 Aug 2026 to 17 Oct 2026, Bhav 1st',
  Saturn: '17 Oct 2026 to 13 Dec 2026, Bhav 9th',
  Mercury: '13 Dec 2026 to 03 Feb 2027, Bhav 12th',
  Ketu: '03 Feb 2027 to 24 Feb 2027, Bhav 2nd',
  Venus: '24 Feb 2027 to 26 Apr 2027, Bhav 1st',
  Sun: '26 Apr 2027 to 14 May 2027, Bhav 11th',
  Moon: '14 May 2027 to 14 Jun 2027, Bhav 11th',
} as const

const HOUSE_DEGREES: Record<string, string> = {
  Sun: 'Taurus 28-51-52 Mrigasira pada 2 house 10',
  Moon: 'Gemini 04-24-17 Mrigasira pada 4 house 11',
  Mercury: 'Gemini 19-03-54 Ardra pada 4 house 11',
}

const canonical = (text: string) =>
  text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[°′″]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function includesAll(question: string, terms: string[]) {
  const lower = canonical(question)
  return terms.every((term) => lower.includes(canonical(term)))
}

export function findExactChartFact(question: string): ChartFactAnswer | undefined {
  const q = canonical(question)
  if (includesAll(q, ['exact name']) || includesAll(q, ['name recorded'])) {
    return answerExactChartFact(question)
  }
  return answerExactChartFact(question)
}

export function answerExactChartFact(question: string): ChartFactAnswer | undefined {
  const q = canonical(question)
  const exact = (topic: string, domainName: string, answer: string, reasoning: string, anchors: string[], followUpQuestion?: string): ChartFactAnswer => ({
    topic,
    domainName,
    accuracy: 'Totally accurate',
    anchors,
    answer,
    reasoning,
    followUpQuestion,
  })

  const text = q
  if (text.includes('name')) return exact('identity', 'identity', FACTS.name, 'Directly read from the birth data.', ['name'])
  if (text.includes('sex')) return exact('identity', 'identity', FACTS.sex, 'Directly read from the birth data.', ['sex'])
  if (text.includes('date of birth')) return exact('identity', 'identity', FACTS.dateOfBirth, 'Directly read from the birth data.', ['dateOfBirth'])
  if (text.includes('time of birth')) return exact('identity', 'identity', FACTS.timeOfBirth, 'Directly read from the birth data.', ['timeOfBirth'])
  if (text.includes('place of birth')) return exact('identity', 'identity', FACTS.placeOfBirth, 'Directly read from the birth data.', ['placeOfBirth'])
  if (text.includes('lagna lord')) return exact('identity', 'identity', FACTS.lagnaLord, 'Leo Lagna makes Sun the Lagna lord.', ['lagna', 'lagnaLord'])
  if (text.includes('lagna')) return exact('identity', 'identity', FACTS.lagna, 'Directly read from the birth data.', ['lagna'])
  if (text.includes('rasi lord')) return exact('identity', 'identity', FACTS.rasiLord, 'Gemini Rasi makes Mercury the Rasi lord.', ['rasi', 'rasiLord'])
  if (text.includes('rasi')) return exact('identity', 'identity', FACTS.rasi, 'Directly read from the birth data.', ['rasi'])
  if (text.includes('ayanamsa name')) return exact('identity', 'identity', FACTS.ayanamsaName, 'Directly read from the birth data.', ['ayanamsaName'])
  if (text.includes('lucky stone')) return exact('identity', 'identity', FACTS.luckyStone, 'Directly read from the birth data.', ['luckyStone'])
  if (text.includes('house 10')) return exact('house_lordship', 'house_lordship', `${HOUSES[10].sign}; ${HOUSES[10].domain}`, 'Whole-sign houses from Leo Lagna place Taurus in the 10th house.', ['Taurus', 'career'])
  if (text.includes('house 12')) return exact('house_lordship', 'house_lordship', `${HOUSES[12].sign}; ${HOUSES[12].domain}`, 'Whole-sign houses from Leo Lagna place Cancer in the 12th house.', ['Cancer', 'sleep'])
  if ((text.includes('sun') && text.includes('placed')) || text.includes('sun placement')) return exact('planetary_placement', 'planetary_placement', HOUSE_DEGREES.Sun, 'Directly read from the natal placement table.', ['Sun', 'Taurus', 'house 10'])
  if ((text.includes('moon') && text.includes('placed')) || text.includes('moon placement')) return exact('planetary_placement', 'planetary_placement', HOUSE_DEGREES.Moon, 'Directly read from the natal placement table.', ['Moon', 'Gemini', 'house 11'])
  if ((text.includes('mercury') && text.includes('placed')) || text.includes('mercury placement')) return exact('planetary_placement', 'planetary_placement', HOUSE_DEGREES.Mercury, 'Directly read from the natal placement table.', ['Mercury', 'Gemini', 'house 11'])
  if (text.includes('nakshatra pada')) return exact('identity', 'identity', FACTS.nakshatraPada, 'Directly read from the birth data.', ['nakshatraPada'])
  if (text.includes('nakshatra lord')) return exact('identity', 'identity', FACTS.nakshatraLord, 'Directly read from the birth data.', ['nakshatraLord'])
  if (text.includes('nakshatra')) return exact('identity', 'identity', FACTS.nakshatra, 'Directly read from the birth data.', ['nakshatra'])
  if (text.includes('jupiter mahadasha')) return exact('dasha', 'dasha', '22 Aug 2018 to 22 Aug 2034', 'Directly read from the Vimshottari table.', ['Jupiter'])
  if (text.includes('varshaphal') && text.includes('rahu')) return exact('varshaphal_2026', 'varshaphal_2026', VARSHAPHAL_2026.Rahu, 'Directly read from the 2026 Varshaphal sequence.', ['Rahu', '2026'])
  if (text.includes('sarvashtakavarga') && text.includes('scorpio')) return exact('ashtakavarga', 'ashtakavarga', '37 rank 1', 'Directly read from the Sarvashtakavarga table.', ['Scorpio'])
  if (text.includes('aries') && text.includes('taurus')) return exact('ashtakavarga', 'ashtakavarga', 'Aries stronger by 4 bindus', 'Aries has 30 and Taurus has 26, so the difference is 4.', ['Aries', 'Taurus'])
  if (text.includes('moon') && text.includes('mercury') && text.includes('co-present')) return exact('aspects', 'aspects', 'Yes, house 11', 'Both are placed in Gemini in the 11th house.', ['Moon', 'Mercury', 'house 11'])
  if (text.includes('jupiter') && text.includes('saturn') && text.includes('co-present')) return exact('aspects', 'aspects', 'Yes, house 9', 'Both are placed in Aries in the 9th house.', ['Jupiter', 'Saturn', 'house 9'])
  if (text.includes('venus') && text.includes('rahu') && text.includes('co-present')) return exact('aspects', 'aspects', 'Yes, house 12', 'Both are placed in Cancer in the 12th house.', ['Venus', 'Rahu', 'house 12'])
  if (text.includes('ketu') && text.includes('uranus') && text.includes('co-present')) return exact('aspects', 'aspects', 'Yes, house 6', 'Both are placed in Capricorn in the 6th house.', ['Ketu', 'Uranus', 'house 6'])
  return undefined
}

export function getPlanetPlacement(planet: string) {
  return PLANETS[planet.toLowerCase()]
}

export function getHouseInfo(houseNumber: number) {
  return HOUSES[houseNumber]
}

export function getMahadashaInfo(name: string) {
  return MAHADASHA.find(([planet]) => planet.toLowerCase() === name.toLowerCase())
}

export function getVarshaphal2026Period(name: string) {
  return VARSHAPHAL_2026[name as keyof typeof VARSHAPHAL_2026]
}

export function compareSarvashtakavarga(signA: string, signB: string) {
  const a = SVA[signA as keyof typeof SVA]
  const b = SVA[signB as keyof typeof SVA]
  if (!a || !b) return undefined
  return {
    stronger: a.total >= b.total ? signA : signB,
    difference: Math.abs(a.total - b.total),
  }
}

export function getChartFactAnchorsForQuestion(question: string) {
  const fact = answerExactChartFact(question)
  return fact?.anchors ?? []
}
