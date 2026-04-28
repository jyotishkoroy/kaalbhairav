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
    return await calculateWithPythonEngine(args)
  } catch (error) {
    console.warn('astro_python_engine_fallback', {
      code: summarizePythonError(error),
    })

    const tsOutput = await calculateMasterAstroOutput(args)
    return withPythonFallbackWarning(tsOutput, error)
  }
}
