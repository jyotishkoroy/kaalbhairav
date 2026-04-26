import { RASHI_MAP } from './constants'
import type { LagnaResult, LagnaReliability } from './lagna'

export type WholeSignHouse = {
  house_number: number
  sign: string
  sign_index: number
  reliability: LagnaReliability
}

export function calculateWholeSignHouses(lagna: LagnaResult | null): WholeSignHouse[] {
  if (!lagna) return []
  return Array.from({ length: 12 }, (_, i) => {
    const house_number = i + 1
    const sign_index = (lagna.sign_index + i) % 12
    return {
      house_number,
      sign: RASHI_MAP[sign_index].english_name,
      sign_index,
      reliability: lagna.reliability,
    }
  })
}
