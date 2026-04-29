import type { AstrologySettings, BirthProfileInput } from '../../../lib/astro/types.ts'
import type { NormalizedBirthInput } from '../../../lib/astro/normalize.ts'
import { calculateMasterAstroOutput } from '../../../lib/astro/calculations/master.ts'
import type { MasterAstroCalculationOutput } from '../../../lib/astro/schemas/master.ts'
import {
  calculateWithPythonEngine,
  summarizePythonError,
  withPythonFallbackWarning,
} from './python-engine.ts'

type CalculateArgs = {
  input: BirthProfileInput
  normalized: NormalizedBirthInput
  settings: AstrologySettings
  runtime: { user_id: string; profile_id: string; current_utc: string; production: boolean }
}

type AstroEngineImpl = 'ts' | 'python' | 'shadow'

function getAstroEngineImpl(): AstroEngineImpl {
  const value = process.env.ASTRO_ENGINE_IMPL
  if (value === 'python' || value === 'shadow' || value === 'ts') return value
  return 'ts'
}

function safeShadowLog(details: Record<string, unknown>) {
  console.info('astro_python_shadow', details)
}

function mergePythonBaseWithTsDerivedSections(
  pythonOutput: MasterAstroCalculationOutput,
  tsOutput: MasterAstroCalculationOutput,
): MasterAstroCalculationOutput {
  return {
    ...pythonOutput,
    panchang: tsOutput.panchang,
    daily_transits: tsOutput.daily_transits,
    navamsa_d9: tsOutput.navamsa_d9,
    vimshottari_dasha: tsOutput.vimshottari_dasha,
    yogas: tsOutput.yogas,
    doshas: tsOutput.doshas,
    strength_weakness_indicators: tsOutput.strength_weakness_indicators,
    life_area_signatures: tsOutput.life_area_signatures,
    prediction_ready_context: tsOutput.prediction_ready_context,
    core_natal_summary: tsOutput.core_natal_summary,
    confidence: tsOutput.confidence,
    warnings: tsOutput.warnings,
  }
}

export async function calculateAstroEngine(
  args: CalculateArgs,
): Promise<MasterAstroCalculationOutput> {
  const impl = getAstroEngineImpl()

  if (impl === 'ts') {
    return calculateMasterAstroOutput(args)
  }

  if (impl === 'shadow') {
    const tsOutput = await calculateMasterAstroOutput(args)
    void calculateWithPythonEngine(args)
      .then((pythonOutput) => {
        safeShadowLog({
          result: 'success',
          ts_status: tsOutput.calculation_status,
          python_status: pythonOutput.calculation_status,
          python_schema_version: pythonOutput.schema_version,
          has_prediction_ready_context: 'prediction_ready_context' in pythonOutput,
        })
      })
      .catch((error) => {
        safeShadowLog({
          result: 'error',
          code: summarizePythonError(error),
        })
      })

    return tsOutput
  }

  try {
    const pythonOutput = await calculateWithPythonEngine(args)
    const tsOutput = await calculateMasterAstroOutput(args)
    if (tsOutput.calculation_status === 'rejected') {
      return pythonOutput
    }
    return mergePythonBaseWithTsDerivedSections(pythonOutput, tsOutput)
  } catch (error) {
    console.warn('astro_python_engine_fallback', {
      code: summarizePythonError(error),
    })

    const tsOutput = await calculateMasterAstroOutput(args)
    return withPythonFallbackWarning(tsOutput, error)
  }
}
