import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { createRequestHandler, createProxyState, buildAnalyzePrompt, buildCriticPrompt, validateAnalyzerResult, validateCriticResult } from '../../../local-services/ollama-analyzer-proxy/server.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function makeResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function createMockReq(options: { method: string; path: string; headers?: Record<string, string>; body?: string }) {
  const req = new EventEmitter() as EventEmitter & { method: string; url: string; headers: Record<string, string>; destroy: () => void }
  req.method = options.method
  req.url = options.path
  req.headers = Object.fromEntries(Object.entries(options.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]))
  req.destroy = () => {}
  queueMicrotask(() => {
    if (options.body !== undefined) req.emit('data', Buffer.from(options.body))
    req.emit('end')
  })
  return req
}

function createMockRes() {
  let finish!: () => void
  const done = new Promise<void>((resolve) => {
    finish = resolve
  })
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    writeHead(statusCode: number, headers: Record<string, string>) {
      this.statusCode = statusCode
      this.headers = headers
    },
    end(chunk: string) {
      this.body = chunk ?? ''
      finish()
    },
    done,
  }
  return res
}

async function invoke(handler: ReturnType<typeof createRequestHandler>, options: { method: string; path: string; headers?: Record<string, string>; body?: string }) {
  const req = createMockReq(options)
  const res = createMockRes()
  await handler(req as never, res as never)
  await res.done
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null, headers: res.headers }
}

describe('ollama analyzer proxy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns JSON health', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'GET', path: '/health' })
    expect(result.status).toBe(200)
    expect(result.body.service).toBe('tarayai-ollama-analyzer-proxy')
  })

  it('health does not expose secret', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'GET', path: '/health' })
    expect(JSON.stringify(result.body)).not.toContain('secret')
  })

  it('analyze requires secret', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'What is my Lagna?' }) })
    expect(result.status).toBe(401)
  })

  it('critic requires secret', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/critic', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'Q', answer: 'A' }) })
    expect(result.status).toBe(401)
  })

  it('wrong secret is rejected', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'wrong' }, body: JSON.stringify({ question: 'What is my Lagna?' }) })
    expect(result.status).toBe(401)
  })

  it('missing runtime secret returns 503', async () => {
    const handler = createRequestHandler({ secret: '', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'x' }, body: JSON.stringify({ question: 'What is my Lagna?' }) })
    expect(result.status).toBe(503)
    expect(result.body.error).toBe('missing_secret')
  })

  it('unknown route returns 404 json', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'GET', path: '/nope' })
    expect(result.status).toBe(404)
  })

  it('rejects non-json content-type', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'text/plain', 'x-tarayai-local-secret': 'secret' }, body: 'x' })
    expect(result.status).toBe(415)
  })

  it('rejects invalid json', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: '{' })
    expect(result.status).toBe(400)
  })

  it('rejects large body', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'x'.repeat(30 * 1024) }) })
    expect(result.status).toBe(413)
  })

  it('rejects empty analyzer question', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: ' ' }) })
    expect(result.status).toBe(400)
  })

  it('rejects empty critic answer', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/critic', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'Q', answer: ' ' }) })
    expect(result.status).toBe(400)
  })

  it('returns 405 for unsupported method', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn() }, createProxyState())
    const result = await invoke(handler, { method: 'GET', path: '/analyze-question' })
    expect(result.status).toBe(405)
  })

  it('accepts extra analyzer fields', async () => {
    const fetchImpl = vi.fn(async () => makeResponse(200, { response: JSON.stringify({ language: 'en', topic: 'career', questionType: 'interpretive', riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 }) }))
    const handler = createRequestHandler({ secret: 'secret', fetchImpl }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'What is my Lagna?', extra: true }) })
    expect(result.status).toBe(200)
  })

  const analyzerCases = [
    { question: 'I am working hard and not getting promotion.', topic: 'career', questionType: 'interpretive', requiredFacts: ['house_10', 'current_dasha'], retrievalTags: ['career'] },
    { question: 'Give me remedy for bad sleep.', topic: 'sleep', questionType: 'remedy', needsRemedy: true },
    { question: 'What is my Lagna?', questionType: 'exact_fact' },
    { question: 'When will I get married?', topic: 'marriage', needsTiming: true },
    { question: 'Can my chart tell when I will die?', questionType: 'unsafe', riskFlags: ['death', 'lifespan'] },
    { question: 'Do I have cancer according to chart?', riskFlags: ['medical'] },
    { question: 'Which gemstone guarantees money?', riskFlags: ['gemstone_guarantee', 'financial_guarantee'] },
    { question: 'What will happen?', questionType: 'general' },
  ]

  for (const testCase of analyzerCases) {
    it(`analyzer classifies: ${testCase.question}`, async () => {
      const payload = { language: 'en', topic: testCase.topic ?? 'general', questionType: testCase.questionType ?? 'general', riskFlags: testCase.riskFlags ?? [], needsTiming: testCase.needsTiming ?? false, needsRemedy: testCase.needsRemedy ?? false, requiredFacts: testCase.requiredFacts ?? [], retrievalTags: testCase.retrievalTags ?? [], shouldAskFollowup: testCase.question === 'What will happen?', followupQuestion: testCase.question === 'What will happen?' ? 'Which area matters most?' : null, confidence: testCase.question === 'What will happen?' ? 0.4 : 0.7 }
      const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn(async () => makeResponse(200, { response: JSON.stringify(payload) })) }, createProxyState())
      const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: testCase.question }) })
      expect(result.status).toBe(200)
      expect(result.body.source).toBe('ollama')
      expect(result.body.topic).toBe(testCase.topic ?? 'general')
    })
  }

  const criticCases = [
    { answer: 'Your Lagna is Leo.', patch: { answersQuestion: true, tooGeneric: false, missingAnchors: [], missingSections: [], unsafeClaims: [], wrongFacts: [], companionToneScore: 0.8, shouldRetry: false, correctionInstruction: '' } },
    { answer: 'Things will improve soon.', patch: { answersQuestion: false, tooGeneric: true, missingAnchors: ['lagna'], missingSections: [], unsafeClaims: [], wrongFacts: [], companionToneScore: 0.2, shouldRetry: true, correctionInstruction: 'Be specific.' } },
    { answer: 'Answer', patch: { answersQuestion: true, tooGeneric: false, missingAnchors: [], missingSections: ['Accuracy'], unsafeClaims: [], wrongFacts: [], companionToneScore: 0.5, shouldRetry: true, correctionInstruction: 'Add accuracy.' } },
    { answer: 'You will definitely get promoted.', patch: { answersQuestion: true, tooGeneric: false, missingAnchors: [], missingSections: [], unsafeClaims: ['definite prediction'], wrongFacts: [], companionToneScore: 0.6, shouldRetry: true, correctionInstruction: 'Remove certainty.' } },
    { answer: 'Sun is in Aries.', patch: { answersQuestion: true, tooGeneric: false, missingAnchors: [], missingSections: [], unsafeClaims: [], wrongFacts: ['sun_sign'], companionToneScore: 0.7, shouldRetry: true, correctionInstruction: 'Fix the fact.' } },
  ]

  for (const testCase of criticCases) {
    it(`critic handles ${testCase.answer}`, async () => {
      const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn(async () => makeResponse(200, { response: JSON.stringify(testCase.patch) })) }, createProxyState())
      const result = await invoke(handler, { method: 'POST', path: '/critic', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'Q', answer: testCase.answer, contract: {}, facts: [] }) })
      expect(result.status).toBe(200)
      expect(result.body.companionToneScore).toBeGreaterThanOrEqual(0)
      expect(result.body.companionToneScore).toBeLessThanOrEqual(1)
    })
  }

  it('returns fallback on fetch rejection', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn(async () => { throw new Error('offline') }) }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'What is my Lagna?' }) })
    expect(result.status).toBe(502)
    expect(result.body.fallbackRecommended).toBe(true)
  })

  it('returns fallback on timeout', async () => {
    const handler = createRequestHandler({ secret: 'secret', timeoutMs: 20, fetchImpl: vi.fn(() => new Promise(() => {})) }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'What is my Lagna?' }) })
    expect(result.status).toBe(504)
    expect(result.body.fallbackRecommended).toBe(true)
  })

  it('returns fallback on non-200', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn(async () => makeResponse(500, { error: 'x' })) }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'What is my Lagna?' }) })
    expect(result.status).toBe(502)
  })

  it('returns fallback on invalid json string', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn(async () => makeResponse(200, { response: 'not-json' })) }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'What is my Lagna?' }) })
    expect(result.status).toBe(502)
    expect(result.body.error).toBe('invalid_ollama_json')
  })

  it('returns fallback on missing keys', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn(async () => makeResponse(200, { response: JSON.stringify({ hello: 'world' }) })) }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/critic', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'Q', answer: 'A' }) })
    expect(result.status).toBe(502)
  })

  it('clamps scores above 1', async () => {
    const handler = createRequestHandler({ secret: 'secret', fetchImpl: vi.fn(async () => makeResponse(200, { response: JSON.stringify({ answersQuestion: true, tooGeneric: false, missingAnchors: [], missingSections: [], unsafeClaims: [], wrongFacts: [], companionToneScore: 9, shouldRetry: false, correctionInstruction: '' }) })) }, createProxyState())
    const result = await invoke(handler, { method: 'POST', path: '/critic', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'Q', answer: 'A' }) })
    expect(result.body.companionToneScore).toBe(1)
  })

  it('queues and tracks health', async () => {
    const first = deferred<Response>()
    const fetchImpl = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(async () => makeResponse(200, { response: JSON.stringify({ language: 'en', topic: 'career', questionType: 'interpretive', riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 }) }))
    const state = createProxyState()
    const handler = createRequestHandler({ secret: 'secret', concurrencyLimit: 1, queueLimit: 1, fetchImpl }, state)
    const p1 = invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'A' }) })
    const p2 = invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'B' }) })
    const p3 = invoke(handler, { method: 'POST', path: '/analyze-question', headers: { 'content-type': 'application/json', 'x-tarayai-local-secret': 'secret' }, body: JSON.stringify({ question: 'C' }) })
    first.resolve(makeResponse(200, { response: JSON.stringify({ language: 'en', topic: 'career', questionType: 'interpretive', riskFlags: [], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 }) }))
    expect((await p1).status).toBe(200)
    expect((await p2).status).toBe(200)
    expect((await p3).status).toBe(429)
    const health = await invoke(handler, { method: 'GET', path: '/health' })
    expect(health.body.queueDepth).toBeGreaterThanOrEqual(0)
  })

  it('exports prompt and validation helpers', () => {
    expect(buildAnalyzePrompt({ question: 'Q', language: 'en', context: {} })).toContain('Question: Q')
    expect(buildCriticPrompt({ question: 'Q', answer: 'A', contract: {}, facts: [] })).toContain('Answer: A')
    expect(validateAnalyzerResult({ language: 'en', topic: 'career', questionType: 'interpretive', riskFlags: ['medical'], needsTiming: false, needsRemedy: false, requiredFacts: [], retrievalTags: [], shouldAskFollowup: false, followupQuestion: null, confidence: 0.7 })?.source).toBe('ollama')
    expect(validateCriticResult({ answersQuestion: true, tooGeneric: false, missingAnchors: [], missingSections: [], unsafeClaims: [], wrongFacts: [], companionToneScore: 9, shouldRetry: false, correctionInstruction: '' })?.companionToneScore).toBe(1)
  })
})
