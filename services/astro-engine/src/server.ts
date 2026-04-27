import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { calculateAstroEngine } from './calculate.ts'
import { astroEngineCalculationRequestSchema, astroEngineServiceResponseSchema } from '../../../lib/astro/schemas/engine-request.ts'
import { normalizeBirthInput } from '../../../lib/astro/normalize.ts'
import { astroV1ApiEnabled } from '../../../lib/astro/feature-flags.ts'
import { runStartupValidation } from '../../../lib/astro/engine/diagnostics.ts'

const port = Number(process.env.PORT ?? 3000)
const apiKey = process.env.ASTRO_ENGINE_SERVICE_API_KEY?.trim() ?? ''
const startupValidation = runStartupValidation()

function logRequest(details: {
  method: string | undefined
  path: string
  status: number
  has_input: boolean
  has_normalized: boolean
  has_settings: boolean
  has_runtime: boolean
}) {
  console.info('astro_engine_request', details)
}

function hasOwnField(value: unknown, key: string) {
  return Boolean(value && typeof value === 'object' && key in value)
}

export async function handleAstroEngineRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname
  const method = req.method

  let requestBody: unknown = null

  const sendJson = (status: number, payload: unknown) => {
    logRequest({
      method,
      path,
      status,
      has_input: hasOwnField(requestBody, 'input'),
      has_normalized: hasOwnField(requestBody, 'normalized'),
      has_settings: hasOwnField(requestBody, 'settings'),
      has_runtime: hasOwnField(requestBody, 'runtime'),
    })
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(payload))
  }

  if (method === 'GET' && path === '/health') {
    sendJson(200, { ok: true, startup_validation_passed: startupValidation.passed })
    return
  }

  if (method !== 'POST' || path !== '/astro/v1/calculate') {
    sendJson(404, { error: 'not_found' })
    return
  }

  if (!astroV1ApiEnabled()) {
    sendJson(503, { error: 'astro_v1_disabled' })
    return
  }

  if (apiKey) {
    const auth = req.headers.authorization ?? ''
    if (auth !== `Bearer ${apiKey}`) {
      sendJson(401, { error: 'unauthorized' })
      return
    }
  }

  let raw = ''
  for await (const chunk of req) raw += chunk
  try {
    requestBody = JSON.parse(raw || '{}')
  } catch {
    sendJson(400, { error: 'invalid_json' })
    return
  }
  const parsed = astroEngineCalculationRequestSchema.safeParse(requestBody)
  if (!parsed.success) {
    sendJson(400, {
      error: 'invalid_input',
      issues: parsed.error.issues.map(issue => ({
        path: issue.path.map(segment => String(segment)),
        message: issue.message,
      })),
    })
    return
  }

  if (!startupValidation.passed) {
    const output = astroEngineServiceResponseSchema.parse({
      schema_version: '29.0.0',
      calculation_status: 'rejected',
      rejection_reason: 'Swiss Ephemeris startup validation failed',
    })
    sendJson(422, output)
    return
  }

  try {
    const input = parsed.data.input
    const normalized = normalizeBirthInput(input)
    const output = await calculateAstroEngine({
      input,
      normalized,
      settings: parsed.data.settings,
      runtime: parsed.data.runtime,
    })

    if (output.calculation_status === 'rejected') {
      sendJson(422, output)
      return
    }

    sendJson(200, output)
  } catch {
    sendJson(422, astroEngineServiceResponseSchema.parse({
      schema_version: '29.0.0',
      calculation_status: 'rejected',
      rejection_reason: 'calculation_failed',
    }))
  }
}

const server = createServer(handleAstroEngineRequest)

if (process.env.NODE_ENV !== 'test') {
  server.listen(port)
}

export { server }
