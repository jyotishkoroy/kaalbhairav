import { createServer } from 'node:http'
import { calculateAstroEngine } from './calculate'
import { astroEngineCalculationRequestSchema, astroEngineServiceResponseSchema } from '../../../lib/astro/schemas/engine-request'
import { normalizeBirthInput } from '../../../lib/astro/normalize'
import { astroV1ApiEnabled } from '../../../lib/astro/feature-flags'
import { runStartupValidation } from '../../../lib/astro/engine/diagnostics'

const port = Number(process.env.PORT ?? 3000)
const apiKey = process.env.ASTRO_ENGINE_SERVICE_API_KEY?.trim() ?? ''
const startupValidation = runStartupValidation()

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, startup_validation_passed: startupValidation.passed }))
    return
  }

  if (req.method !== 'POST' || url.pathname !== '/astro/v1/calculate') {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not_found' }))
    return
  }

  if (!astroV1ApiEnabled()) {
    res.writeHead(503, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'astro_v1_disabled' }))
    return
  }

  if (apiKey) {
    const auth = req.headers.authorization ?? ''
    if (auth !== `Bearer ${apiKey}`) {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }
  }

  let raw = ''
  for await (const chunk of req) raw += chunk
  const body = JSON.parse(raw || '{}')
  const parsed = astroEngineCalculationRequestSchema.safeParse(body)
  if (!parsed.success) {
    res.writeHead(400, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'invalid_input', issues: parsed.error.issues }))
    return
  }

  if (!startupValidation.passed) {
    const output = astroEngineServiceResponseSchema.parse({
      schema_version: '29.0.0',
      calculation_status: 'rejected',
      rejection_reason: 'Swiss Ephemeris startup validation failed',
    })
    res.writeHead(422, { 'content-type': 'application/json' })
    res.end(JSON.stringify(output))
    return
  }

  try {
    const input = body.input
    const normalized = normalizeBirthInput(input)
    const output = await calculateAstroEngine({
      input,
      normalized,
      settings: body.settings,
      runtime: body.runtime,
    })

    if (output.calculation_status === 'rejected') {
      res.writeHead(422, { 'content-type': 'application/json' })
      res.end(JSON.stringify(output))
      return
    }

    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(output))
  } catch {
    res.writeHead(422, { 'content-type': 'application/json' })
    res.end(JSON.stringify(astroEngineServiceResponseSchema.parse({
      schema_version: '29.0.0',
      calculation_status: 'rejected',
      rejection_reason: 'calculation_failed',
    })))
  }
})

server.listen(port)
