import { spawn } from 'node:child_process'
import { z } from 'zod'

import { masterAstroOutputSchema, type MasterAstroCalculationOutput } from '../../../lib/astro/schemas/master.ts'
import type { AstrologySettings, BirthProfileInput } from '../../../lib/astro/types.ts'
import type { NormalizedBirthInput } from '../../../lib/astro/normalize.ts'
import type { AstroRuntimeClock } from '../../../lib/astro/calculations/runtime-clock.ts'

export type PythonAstroEngineArgs = {
  input: BirthProfileInput
  normalized: NormalizedBirthInput
  settings: AstrologySettings
  runtime: {
    user_id: string
    profile_id: string
    current_utc: string
    production: boolean
  }
  runtimeClock?: Partial<AstroRuntimeClock>
}

const pythonOutputSchema = masterAstroOutputSchema.and(z.object({
  prediction_ready_context: z.unknown(),
}))

const DEFAULT_TIMEOUT_MS = 15_000
const MAX_STDOUT_BYTES = 2_000_000

export class PythonAstroEngineError extends Error {
  readonly code: string
  readonly exitCode?: number | null

  constructor(code: string, options: { exitCode?: number | null } = {}) {
    super(code)
    this.name = 'PythonAstroEngineError'
    this.code = code
    this.exitCode = options.exitCode
  }
}

function getPythonEntrypoint(): string {
  return process.env.PYTHON_ASTRO_ENGINE_ENTRYPOINT?.trim()
    || 'services/astro-engine/python/run_calculation.py'
}

function getTimeoutMs(): number {
  const raw = Number(process.env.ASTRO_ENGINE_PYTHON_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS
}

function appendFallbackWarning(
  output: MasterAstroCalculationOutput,
  reasonCode: string,
): MasterAstroCalculationOutput {
  const currentWarnings = Array.isArray((output as Record<string, unknown>).warnings)
    ? (output as Record<string, unknown>).warnings as unknown[]
    : []

  return {
    ...output,
    warnings: [
      ...currentWarnings,
      {
        warning_code: 'PYTHON_ENGINE_FALLBACK_TO_TS',
        severity: 'medium',
        affected_calculations: ['engine_selection'],
        explanation: 'Python engine failed or returned invalid output. TypeScript engine result was returned instead.',
        evidence: { code: reasonCode },
      },
    ],
  } as MasterAstroCalculationOutput
}

export function summarizePythonError(error: unknown): string {
  if (error instanceof PythonAstroEngineError) return error.code
  if (error instanceof Error && error.name === 'AbortError') return 'python_timeout'
  return 'python_unknown_error'
}

export function withPythonFallbackWarning(
  output: MasterAstroCalculationOutput,
  error: unknown,
): MasterAstroCalculationOutput {
  return appendFallbackWarning(output, summarizePythonError(error))
}

export async function calculateWithPythonEngine(
  args: PythonAstroEngineArgs,
): Promise<MasterAstroCalculationOutput> {
  const entrypoint = getPythonEntrypoint()
  const timeoutMs = getTimeoutMs()
  const startedAt = Date.now()

  return await new Promise<MasterAstroCalculationOutput>((resolve, reject) => {
    let settled = false
    let stdout = ''
    let stdoutBytes = 0
    let killedByTimeout = false
    let killedByStdoutLimit = false

    const child = spawn('python3', [entrypoint], {
      cwd: process.cwd(),
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    })

    const settleReject = (error: PythonAstroEngineError) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    }

    const settleResolve = (value: MasterAstroCalculationOutput) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }

    const timer = setTimeout(() => {
      killedByTimeout = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        killedByStdoutLimit = true
        child.kill('SIGKILL')
        return
      }
      stdout += chunk.toString('utf8')
    })

    child.on('error', () => {
      settleReject(new PythonAstroEngineError('python_spawn_failed'))
    })

    child.on('close', (exitCode) => {
      if (killedByTimeout) {
        settleReject(new PythonAstroEngineError('python_timeout', { exitCode }))
        return
      }

      if (killedByStdoutLimit) {
        settleReject(new PythonAstroEngineError('python_stdout_too_large', { exitCode }))
        return
      }

      if (exitCode !== 0) {
        settleReject(new PythonAstroEngineError('python_nonzero_exit', { exitCode }))
        return
      }

      let payload: unknown
      try {
        payload = JSON.parse(stdout)
      } catch {
        settleReject(new PythonAstroEngineError('python_invalid_json', { exitCode }))
        return
      }

      const parsed = pythonOutputSchema.safeParse(payload)
      if (!parsed.success) {
        settleReject(new PythonAstroEngineError('python_schema_validation_failed', { exitCode }))
        return
      }

      const output = parsed.data as MasterAstroCalculationOutput

      if (!('prediction_ready_context' in output)) {
        settleReject(new PythonAstroEngineError('python_missing_prediction_ready_context', { exitCode }))
        return
      }

      console.info('astro_python_engine_success', {
        status: output.calculation_status,
        schema_version: output.schema_version,
        duration_ms: Date.now() - startedAt,
      })

      settleResolve(output)
    })

    child.stdin.on('error', () => {
      settleReject(new PythonAstroEngineError('python_stdin_failed'))
    })

    child.stdin.end(JSON.stringify(args))
  })
}
