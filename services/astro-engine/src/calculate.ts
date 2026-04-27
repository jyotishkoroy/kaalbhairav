import type { AstrologySettings, BirthProfileInput } from '../../../lib/astro/types'
import type { NormalizedBirthInput } from '../../../lib/astro/normalize'
import { calculateMasterAstroOutput } from '../../../lib/astro/calculations/master'

export async function calculateAstroEngine(args: {
  input: BirthProfileInput
  normalized: NormalizedBirthInput
  settings: AstrologySettings
  runtime: { user_id: string; profile_id: string; current_utc: string; production: boolean }
}) {
  return calculateMasterAstroOutput(args)
}
