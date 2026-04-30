/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('node:http')
const { URL } = require('node:url')

const SERVICE_NAME = 'tarayai-ollama-analyzer-proxy'
const MAX_BODY_BYTES = 20 * 1024
const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_CONCURRENCY_LIMIT = 1
const DEFAULT_QUEUE_LIMIT = 5
const DEFAULT_MODEL = 'qwen2.5:3b'
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 8787
const REQUIRED_ANALYZER_KEYS = ['language', 'topic', 'questionType', 'riskFlags', 'needsTiming', 'needsRemedy', 'requiredFacts', 'retrievalTags', 'shouldAskFollowup', 'followupQuestion', 'confidence']
const REQUIRED_CRITIC_KEYS = ['answersQuestion', 'tooGeneric', 'missingAnchors', 'missingSections', 'unsafeClaims', 'wrongFacts', 'companionToneScore', 'shouldRetry', 'correctionInstruction']
const RISK_FLAGS = new Set(['medical', 'legal', 'death', 'lifespan', 'self_harm', 'pregnancy', 'financial_guarantee', 'gemstone_guarantee', 'expensive_puja_pressure'])
const TOPICS = new Set(['career', 'sleep', 'marriage', 'money', 'health', 'legal', 'safety', 'foreign', 'spirituality', 'general'])
const QUESTION_TYPES = new Set(['exact_fact', 'interpretive', 'timing', 'remedy', 'unsafe', 'general'])

function createProxyState() {
  return { activeRequests: 0, queue: [], latencies: [], timeoutTimestamps: [], invalidJsonTimestamps: [], lastSuccessAt: null, lastError: null }
}

function clamp01(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback
}

function pruneHour(timestamps, now = Date.now()) {
  const cutoff = now - 60 * 60 * 1000
  while (timestamps.length && timestamps[0] < cutoff) timestamps.shift()
}

function averageLatency(latencies) {
  if (!latencies.length) return 0
  return Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
}

function sanitizeText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function sanitizeArray(value, fallback = []) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : fallback.slice()
}

function stripJsonFences(text) {
  if (typeof text !== 'string') return text
  const trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    const withoutStart = trimmed.replace(/^```(?:json)?\s*/i, '')
    return withoutStart.replace(/\s*```$/, '').trim()
  }
  return trimmed
}

function buildAnalyzePrompt(input) {
  return [
    'Classify this astrology user question.',
    'No final answer. No advice.',
    'Return only strict JSON.',
    'Keys exactly: language, topic, questionType, riskFlags, needsTiming, needsRemedy, requiredFacts, retrievalTags, shouldAskFollowup, followupQuestion, confidence.',
    'If unsure, use topic "general", questionType "general", confidence 0.4.',
    'Risk flags must use: medical, legal, death, lifespan, self_harm, pregnancy, financial_guarantee, gemstone_guarantee, expensive_puja_pressure.',
    'Topics: career, sleep, marriage, money, health, legal, safety, foreign, spirituality, general.',
    'Question types: exact_fact, interpretive, timing, remedy, unsafe, general.',
    `Question: ${input.question}`,
    input.language ? `Language: ${input.language}` : 'Language: en',
    input.context ? `Context: ${JSON.stringify(input.context)}` : 'Context: {}',
  ].join('\n')
}

function buildCriticPrompt(input) {
  return [
    'Evaluate the answer against the supplied contract and facts.',
    'Do not rewrite the answer.',
    'Return only strict JSON.',
    'Keys exactly: answersQuestion, tooGeneric, missingAnchors, missingSections, unsafeClaims, wrongFacts, companionToneScore, shouldRetry, correctionInstruction.',
    `Question: ${input.question}`,
    `Answer: ${input.answer}`,
    `Contract: ${JSON.stringify(input.contract ?? {})}`,
    `Facts: ${JSON.stringify(input.facts ?? [])}`,
  ].join('\n')
}

function validateAnalyzerResult(value) {
  if (!value || typeof value !== 'object') return null
  for (const key of REQUIRED_ANALYZER_KEYS) {
    if (!(key in value)) return null
  }
  const result = {
    language: sanitizeText(value.language, 'en'),
    topic: sanitizeText(value.topic, 'general'),
    questionType: sanitizeText(value.questionType, 'general'),
    riskFlags: sanitizeArray(value.riskFlags, []),
    needsTiming: Boolean(value.needsTiming),
    needsRemedy: Boolean(value.needsRemedy),
    requiredFacts: sanitizeArray(value.requiredFacts, []),
    retrievalTags: sanitizeArray(value.retrievalTags, []),
    shouldAskFollowup: Boolean(value.shouldAskFollowup),
    followupQuestion: value.followupQuestion == null ? null : sanitizeText(value.followupQuestion, ''),
    confidence: clamp01(Number(value.confidence), 0.4),
    source: 'ollama',
  }
  if (!TOPICS.has(result.topic)) result.topic = 'general'
  if (!QUESTION_TYPES.has(result.questionType)) result.questionType = 'general'
  result.riskFlags = result.riskFlags.filter((flag) => RISK_FLAGS.has(flag))
  if (!result.followupQuestion) result.followupQuestion = null
  return result
}

function validateCriticResult(value) {
  if (!value || typeof value !== 'object') return null
  for (const key of REQUIRED_CRITIC_KEYS) {
    if (!(key in value)) return null
  }
  const result = {
    answersQuestion: Boolean(value.answersQuestion),
    tooGeneric: Boolean(value.tooGeneric),
    missingAnchors: sanitizeArray(value.missingAnchors, []),
    missingSections: sanitizeArray(value.missingSections, []),
    unsafeClaims: sanitizeArray(value.unsafeClaims, []),
    wrongFacts: sanitizeArray(value.wrongFacts, []),
    companionToneScore: clamp01(Number(value.companionToneScore), 0.5),
    shouldRetry: Boolean(value.shouldRetry),
    correctionInstruction: sanitizeText(value.correctionInstruction, ''),
  }
  return result
}

function parseJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(Object.assign(new Error('body_too_large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(Object.assign(new Error('invalid_json'), { statusCode: 400 }))
      }
    })
    req.on('error', (error) => reject(error))
  })
}

function isJsonContentType(req) {
  const contentType = req.headers['content-type']
  return typeof contentType === 'string' && contentType.toLowerCase().includes('application/json')
}

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) })
  res.end(body)
}

async function callOllama(fetchImpl, baseUrl, model, prompt, timeoutMs) {
  try {
    const controller = new AbortController()
    const responsePromise = fetchImpl(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, format: 'json', options: { temperature: 0.1 } }),
      signal: controller.signal,
    })
    const response = await Promise.race([
      responsePromise,
      new Promise((_, reject) => setTimeout(() => {
        controller.abort()
        reject(Object.assign(new Error('ollama_timeout'), { name: 'AbortError' }))
      }, timeoutMs)),
    ])
    if (!response || !response.ok) {
      return { kind: 'error', error: 'ollama_unavailable', statusCode: 502 }
    }
    const data = await response.json().catch(() => null)
    if (!data) return { kind: 'error', error: 'invalid_ollama_json', statusCode: 502 }
    let candidate = data
    if (typeof data.response === 'string') {
      try {
        const parsed = JSON.parse(stripJsonFences(data.response))
        candidate = parsed
      } catch {
        return { kind: 'error', error: 'invalid_ollama_json', statusCode: 502 }
      }
    } else if (data.response && typeof data.response === 'object') {
      candidate = data.response
    }
    return { kind: 'ok', value: candidate }
  } catch (error) {
    if (error && error.name === 'AbortError') return { kind: 'error', error: 'ollama_timeout', statusCode: 504 }
    return { kind: 'error', error: 'ollama_unavailable', statusCode: 502 }
  }
}

function createServer(options = {}) {
  const state = options.state ?? createProxyState()
  const handler = createRequestHandler(options, state)
  const host = options.host ?? process.env.HOST ?? DEFAULT_HOST
  const port = Number(options.port ?? process.env.PORT ?? DEFAULT_PORT)
  const server = http.createServer(handler)
  server.listenHost = host
  server.listenPort = port
  server.proxyState = state
  server.getState = () => state
  return server
}

function createRequestHandler(options = {}, state = createProxyState()) {
  const host = options.host ?? process.env.HOST ?? DEFAULT_HOST
  const port = Number(options.port ?? process.env.PORT ?? DEFAULT_PORT)
  const secret = options.secret ?? process.env.TARAYAI_LOCAL_SECRET ?? ''
  const baseUrl = options.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'
  const model = options.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL
  const timeoutMs = Number(options.timeoutMs ?? process.env.REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
  const concurrencyLimit = Number(options.concurrencyLimit ?? process.env.CONCURRENCY_LIMIT ?? DEFAULT_CONCURRENCY_LIMIT)
  const queueLimit = Number(options.queueLimit ?? process.env.QUEUE_LIMIT ?? DEFAULT_QUEUE_LIMIT)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch

  const processNext = () => {
    if (state.activeRequests >= concurrencyLimit) return
    const job = state.queue.shift()
    if (!job) return
    state.activeRequests += 1
    job.run().finally(() => {
      state.activeRequests -= 1
      processNext()
    })
  }

  const enqueue = (run) => {
    if (state.activeRequests >= concurrencyLimit && state.queue.length >= queueLimit) return false
    state.queue.push({ run })
    processNext()
    return true
  }

  const handleProxy = async (req, res, route) => {
    if (!secret) {
      jsonResponse(res, 503, { error: 'missing_secret', fallbackRecommended: true })
      return
    }
    if (req.headers['x-tarayai-local-secret'] !== secret) {
      jsonResponse(res, 401, { error: 'unauthorized' })
      return
    }
    if (!isJsonContentType(req)) {
      jsonResponse(res, 415, { error: 'unsupported_media_type' })
      return
    }
    let body
    try {
      body = await parseJsonBody(req)
    } catch (error) {
      if (error.statusCode === 413) {
        jsonResponse(res, 413, { error: 'body_too_large' })
        return
      }
      jsonResponse(res, 400, { error: 'invalid_json' })
      return
    }
    if (route === 'analyze-question' && (typeof body.question !== 'string' || !body.question.trim())) {
      jsonResponse(res, 400, { error: 'missing_question' })
      return
    }
    if (route === 'critic' && (typeof body.question !== 'string' || !body.question.trim() || typeof body.answer !== 'string' || !body.answer.trim())) {
      jsonResponse(res, 400, { error: 'missing_question_or_answer' })
      return
    }
    const prompt = route === 'analyze-question' ? buildAnalyzePrompt(body) : buildCriticPrompt(body)
    const start = Date.now()
    const accepted = enqueue(async () => {
      const result = await callOllama(fetchImpl, baseUrl, model, prompt, timeoutMs)
      const latency = Date.now() - start
      state.latencies.push(latency)
      if (state.latencies.length > 100) state.latencies.shift()
      if (result.kind === 'ok') {
        const validated = route === 'analyze-question' ? validateAnalyzerResult(result.value) : validateCriticResult(result.value)
        if (!validated) {
          state.invalidJsonTimestamps.push(Date.now())
          pruneHour(state.invalidJsonTimestamps)
          state.lastError = 'invalid_ollama_json'
          jsonResponse(res, 502, { error: 'invalid_ollama_json', fallbackRecommended: true })
          return
        }
        state.lastSuccessAt = new Date().toISOString()
        state.lastError = null
        jsonResponse(res, 200, validated)
        return
      }
      if (result.error === 'ollama_timeout') state.timeoutTimestamps.push(Date.now())
      if (result.error === 'invalid_ollama_json') state.invalidJsonTimestamps.push(Date.now())
      pruneHour(state.timeoutTimestamps)
      pruneHour(state.invalidJsonTimestamps)
      state.lastError = result.error
      jsonResponse(res, result.statusCode, { error: result.error, fallbackRecommended: true })
    })
    if (!accepted) {
      jsonResponse(res, 429, { error: 'queue_overflow' })
    }
  }

  return async (req, res) => {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`)
    if (req.method === 'GET' && requestUrl.pathname === '/health') {
      pruneHour(state.timeoutTimestamps)
      pruneHour(state.invalidJsonTimestamps)
      jsonResponse(res, 200, {
        ok: Boolean(secret) && !state.lastError,
        service: SERVICE_NAME,
        model,
        queueDepth: state.queue.length,
        activeRequests: state.activeRequests,
        averageLatencyMs: averageLatency(state.latencies),
        timeoutsLastHour: state.timeoutTimestamps.length,
        invalidJsonLastHour: state.invalidJsonTimestamps.length,
        lastSuccessAt: state.lastSuccessAt,
        lastError: state.lastError,
      })
      return
    }
    if (requestUrl.pathname === '/analyze-question' || requestUrl.pathname === '/critic') {
      if (req.method !== 'POST') {
        jsonResponse(res, 405, { error: 'method_not_allowed' })
        return
      }
      await handleProxy(req, res, requestUrl.pathname.slice(1))
      return
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
      jsonResponse(res, 405, { error: 'method_not_allowed' })
      return
    }
    jsonResponse(res, 404, { error: 'not_found' })
  }
}

module.exports = { createServer, createRequestHandler, buildAnalyzePrompt, buildCriticPrompt, validateAnalyzerResult, validateCriticResult, parseJsonBody, createProxyState }

if (require.main === module) {
  const server = createServer()
  server.listen(server.listenPort, server.listenHost, () => {
    console.log(JSON.stringify({ service: SERVICE_NAME, host: server.listenHost, port: server.listenPort }))
  })
}
