import { getLahiriAyanamsa } from '../engine/swiss'

export type AyanamsaResult = {
  name: 'lahiri'
  value_degrees: number
  source: 'swiss_ephemeris'
}

export function calculateAyanamsa(jd_ut: number): AyanamsaResult {
  const value = getLahiriAyanamsa(jd_ut)
  if (!isFinite(value)) {
    throw new Error(`Ayanamsa calculation returned non-finite value at JD ${jd_ut}`)
  }
  return { name: 'lahiri', value_degrees: value, source: 'swiss_ephemeris' }
}
