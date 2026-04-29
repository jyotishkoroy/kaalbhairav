/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { RASHI_MAP } from './constants.ts'
import type { LagnaResult, LagnaReliability } from './lagna.ts'

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
