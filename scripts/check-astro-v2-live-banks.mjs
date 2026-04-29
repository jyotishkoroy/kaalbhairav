import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildRequestBody,
  detectRepeatedAnswers,
  evaluateLiveAnswer,
  getGeneratedGenericQaBankPaths,
  getGeneratedQuestionBankPaths,
  loadJsonlRecords,
} from './astro-v2-bank-check-core.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const reportDir = path.join(root, 'generated', 'astro-v2-live-bank-check')
const reportPath = path.join(reportDir, 'live-check-report.json')
const resultsPath = path.join(reportDir, 'live-check-results.jsonl')
const baseUrl = process.env.ASTRO_V2_LIVE_BASE_URL || 'https://tarayai.com'
const generatedLimit = Number(process.env.ASTRO_V2_LIVE_GENERATED_LIMIT ?? 0)
const genericLimit = Number(process.env.ASTRO_V2_LIVE_GENERIC_LIMIT ?? 0)
const fullMode = process.env.ASTRO_V2_LIVE_FULL === '1'
const concurrency = Number(process.env.ASTRO_V2_LIVE_CONCURRENCY ?? 2)
const delayMs = Number(process.env.ASTRO_V2_LIVE_DELAY_MS ?? 100)
const timeoutMs = Number(process.env.ASTRO_V2_LIVE_TIMEOUT_MS ?? 30000)
const resume = process.env.ASTRO_V2_LIVE_RESUME === '1'
const defaultLimit = Number(process.env.ASTRO_V2_LIVE_LIMIT ?? 200)

function ensureBankExists(paths, generatorHint) {
  if (fs.existsSync(paths.jsonlPath) && fs.existsSync(paths.summaryPath)) return
  throw new Error(`${generatorHint} missing. Run the corresponding generator first.`)
}

function inferLiveCategory(record) {
  const q = String(record.question || '').toLowerCase()
  if (record.expectedExactFact || /what exact|exact (name|sex|date|time|day|place|timezone|latitude|longitude|tithi|paksha|yoga|karan|sunrise|sunset|julian|ayanamsa)/.test(q)) return 'exact facts'
  if (/lagna|rasi|nakshatra|sun sign|moon|mars|mercury|jupiter|venus|saturn|rahu|ketu|uranus|neptune|pluto/.test(q)) return 'chart placements'
  if (/1st house|2nd house|3rd house|4th house|5th house|6th house|7th house|8th house|9th house|10th house|11th house|12th house|rule/.test(q)) return 'houses/lords'
  if (/with|aspect|co-presence|with mercury|with saturn|with rahu|with ketu/.test(q)) return 'aspects/co-presence'
  if (/sarvashtakavarga|sav|bindu/.test(q)) return 'sarvashtakavarga'
  if (/dasha|varshaphal|mahadasha|period in 2026/.test(q)) return 'dasha/varshaphal'
  if (/medical|death|court|contract|medicine|doctor|lawyer|legal|hopeless/.test(q)) return 'safety'
  if (/tomorrow|8th november 2026|april 2026|when will|date/.test(q)) return 'timing'
  if (/hinglish|bengali|bengali|how will be my/.test(q)) return 'hinglish'
  if (/career|promotion|salary|money|married|sleep|content|exam|abroad|spirituality/.test(q)) return 'interpretive'
  return 'general'
}

function withCategory(record) {
  return { ...record, liveCategory: inferLiveCategory(record) }
}

function buildCases(records, limit, sourceBank) {
  const cases = records.map((record) => withCategory({ ...record, sourceBank }))
  if (fullMode) return cases
  const limitValue = limit > 0 ? limit : defaultLimit
  const categories = [
    'exact facts',
    'chart placements',
    'houses/lords',
    'aspects/co-presence',
    'sarvashtakavarga',
    'dasha/varshaphal',
    'interpretive',
    'safety',
    'timing',
    'hinglish',
    'general',
  ]
  const sampled = []
  const per = Math.max(1, Math.floor(limitValue / categories.length))
  for (const category of categories) {
    sampled.push(...cases.filter((item) => item.liveCategory === category).slice(0, per))
  }
  for (const item of cases) {
    if (sampled.length >= limitValue) break
    if (!sampled.some((existing) => existing.id === item.id && existing.sourceBank === item.sourceBank)) sampled.push(item)
  }
  return sampled.slice(0, limitValue)
}

async function fetchWithRetry(url, options, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeout)
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`http_${response.status}`)
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
        continue
      }
      return response
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }
  throw lastError ?? new Error('request_failed')
}

function readCompletedIds() {
  if (!resume || !fs.existsSync(resultsPath)) return new Set()
  const completed = new Set()
  for (const line of fs.readFileSync(resultsPath, 'utf8').trim().split('\n').filter(Boolean)) {
    const entry = JSON.parse(line)
    if (entry.passed) completed.add(entry.caseKey)
  }
  return completed
}

async function runCase(testCase) {
  const caseKey = `${testCase.sourceBank}:${testCase.id}`
  const response = await fetchWithRetry(`${baseUrl}/api/astro/v2/reading`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(buildRequestBody(testCase)),
  })
  const raw = await response.text()
  let payload = null
  try {
    payload = JSON.parse(raw)
  } catch {
    payload = { answer: '', meta: {}, raw }
  }
  const evaluation = evaluateLiveAnswer(testCase, payload)
  const passed = response.ok && evaluation.passed
  return {
    caseKey,
    question: testCase.question,
    expected: testCase.expectedAnswer ?? testCase.expectedAnswerStyle ?? '',
    actual: String(payload.answer ?? ''),
    meta: payload.meta ?? {},
    status: response.status,
    passed,
    failures: [...evaluation.failures, ...(response.ok ? [] : [`http_${response.status}`])],
  }
}

function appendResult(entry) {
  fs.appendFileSync(resultsPath, `${JSON.stringify(entry)}\n`)
}

function loadCases() {
  const generatedPaths = getGeneratedQuestionBankPaths()
  const genericPaths = getGeneratedGenericQaBankPaths()
  ensureBankExists(generatedPaths, 'Generated question bank')
  ensureBankExists(genericPaths, 'Generic QA bank')
  const generated = buildCases(loadJsonlRecords(generatedPaths.jsonlPath), fullMode ? 52000 : generatedLimit || defaultLimit, 'generated-50000')
  const generic = buildCases(loadJsonlRecords(genericPaths.jsonlPath), fullMode ? 50000 : genericLimit || defaultLimit, 'generic-50000')
  return [...generated, ...generic]
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true })
  if (!resume) {
    fs.writeFileSync(resultsPath, '')
  }

  const completed = readCompletedIds()
  const cases = loadCases().filter((item) => !completed.has(`${item.sourceBank}:${item.id}`))
  const summary = {
    baseUrl,
    generatedChecked: 0,
    genericChecked: 0,
    combinedChecked: 0,
    failures: 0,
    passed: true,
    rateLimitBlocked: false,
    repeatedAnswers: 0,
  }

  const results = []
  let index = 0
  let active = 0

  await new Promise((resolve) => {
    const launch = () => {
      while (active < concurrency && index < cases.length) {
        const testCase = cases[index++]
        active += 1
        runCase(testCase)
          .then((entry) => {
            results.push({ ...entry, sourceBank: testCase.sourceBank })
            appendResult({ ...entry, sourceBank: testCase.sourceBank })
            if (!entry.passed) summary.failures += 1
            if (!entry.passed && entry.failures.some((item) => String(item).includes('http_429'))) summary.rateLimitBlocked = true
          })
          .catch((error) => {
            const entry = {
              caseKey: `${testCase.sourceBank}:${testCase.id}`,
              question: testCase.question,
              expected: testCase.expectedAnswer ?? testCase.expectedAnswerStyle ?? '',
              actual: '',
              meta: {},
              status: 0,
              passed: false,
              failures: [error instanceof Error ? error.message : 'request_failed'],
              sourceBank: testCase.sourceBank,
            }
            results.push(entry)
            appendResult(entry)
            summary.failures += 1
          })
          .finally(() => {
            active -= 1
            if (index % 100 === 0 || index === cases.length) {
              console.log(JSON.stringify({ progress: index, total: cases.length, failures: summary.failures }))
            }
            if (index >= cases.length && active === 0) resolve()
            else launch()
          })
      }
    }
    launch()
  })

  summary.generatedChecked = results.filter((item) => item.sourceBank === 'generated-50000').length
  summary.genericChecked = results.filter((item) => item.sourceBank === 'generic-50000').length
  summary.combinedChecked = summary.generatedChecked + summary.genericChecked
  summary.repeatedAnswers = detectRepeatedAnswers(results).length
  summary.passed = summary.failures === 0 && !summary.rateLimitBlocked && summary.repeatedAnswers === 0

  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))

  if (!summary.passed) process.exitCode = 1
}

await main()
