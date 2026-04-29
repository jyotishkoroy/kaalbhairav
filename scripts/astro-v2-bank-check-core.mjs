import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  evaluateAstroAnswerQuality,
  evaluateExactFactAnswer,
  getAnswerSimilarityKey,
  normalizeAstroFactText,
} from '../lib/astro/reading/answer-quality.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function getGeneratedQuestionBankPaths() {
  const dir = path.join(root, 'generated', 'astro-v2-question-bank')
  return {
    dir,
    jsonlPath: path.join(dir, 'generated-question-bank.jsonl'),
    summaryPath: path.join(dir, 'generated-question-bank-summary.json'),
    reportPath: path.join(dir, 'check-report.json'),
  }
}

export function getGeneratedGenericQaBankPaths() {
  const dir = path.join(root, 'generated', 'astro-v2-generic-qa-bank')
  return {
    dir,
    jsonlPath: path.join(dir, 'generated-generic-qa-bank.jsonl'),
    summaryPath: path.join(dir, 'generated-generic-qa-bank-summary.json'),
    reportPath: path.join(dir, 'check-report.json'),
  }
}

export function loadJsonlRecords(jsonlPath) {
  if (!fs.existsSync(jsonlPath)) {
    throw new Error(`Missing JSONL file: ${jsonlPath}`)
  }

  const raw = fs.readFileSync(jsonlPath, 'utf8').trim()
  if (!raw) return []
  return raw.split('\n').map((line) => JSON.parse(line))
}

function includesAny(text, values = []) {
  const lower = normalizeAstroFactText(text)
  return values.some((value) => lower.includes(normalizeAstroFactText(value)))
}

export function summarizeCheckerResults(results) {
  const combinedFailures = results.reduce((sum, result) => sum + result.failures.length, 0)
  return {
    generatedChecked: results.find((item) => item.name === 'generated')?.checked ?? 0,
    genericChecked: results.find((item) => item.name === 'generic')?.checked ?? 0,
    combinedChecked: results.reduce((sum, result) => sum + result.checked, 0),
    combinedFailures,
    passed: combinedFailures === 0 && results.every((result) => result.passed),
  }
}

export function buildRequestBody(testCase, overrides = {}) {
  return {
    question: testCase.question,
    mode: testCase.expectedMode || testCase.mode || 'practical_guidance',
    metadata: {
      source: 'live-bank-check',
      caseId: testCase.id,
      bank: testCase.sourceBank,
      ...overrides.metadata,
    },
  }
}

export function evaluateLiveAnswer(testCase, payload) {
  const answer = String(payload?.answer ?? '')
  const meta = payload?.meta ?? {}
  const failures = []
  const lower = answer.toLowerCase()

  if (!answer.trim()) failures.push('empty_answer')
  if (meta.safetyReplacedAnswer) failures.push('safety_replacement_triggered')

  if (testCase.expectedExactFact || testCase.expectedAnswer) {
    const expected = String(testCase.expectedAnswer ?? testCase.expectedAnswerStyle ?? '')
    if (expected && !evaluateExactFactAnswer({ expectedAnswer: expected, answer })) {
      failures.push('exact_fact_mismatch')
    }
  }

  if (testCase.expectedMustIncludeAny?.length && !includesAny(answer, testCase.expectedMustIncludeAny)) {
    failures.push('missing_required_terms')
  }

  if (testCase.expectedMustNotIncludeAny?.length) {
    for (const term of testCase.expectedMustNotIncludeAny) {
      if (term && lower.includes(term.toLowerCase())) failures.push(`contains_banned:${term}`)
    }
  }

  if (testCase.expectedMustIncludeAnchors?.length) {
    if (!includesAny(answer, testCase.expectedMustIncludeAnchors)) failures.push('missing_chart_anchor')
  }

  if (
    testCase.expectedSafetyBoundary === 'medical' &&
    !testCase.allowMedicalBoundary &&
    /(doctor|diagnos|hospital)/i.test(answer)
  ) {
    failures.push('medical_boundary_leak')
  }

  if (
    testCase.expectedSafetyBoundary === 'legal' &&
    !testCase.allowLegalBoundary &&
    /(lawyer|legal|attorney|court case guarantee)/i.test(answer)
  ) {
    failures.push('legal_boundary_leak')
  }

  if (
    testCase.expectedSafetyBoundary === 'death' &&
    !testCase.allowDeathBoundary &&
    /(when will i die|death date|lifespan|predict death)/i.test(answer)
  ) {
    failures.push('death_boundary_leak')
  }

  if (testCase.expectedAccuracy === 'Totally accurate' && !/totally accurate/i.test(answer)) {
    failures.push('missing_accuracy_claim')
  }

  if (testCase.expectedTopic && typeof meta.topic === 'string' && meta.topic !== testCase.expectedTopic) {
    failures.push(`meta_topic_mismatch:${meta.topic}`)
  }

  const quality = evaluateAstroAnswerQuality({
    testCase: {
      question: testCase.question,
      expectedTopic: testCase.expectedTopic || 'general',
      expectedMode: testCase.expectedMode,
      expectedMustIncludeAny: testCase.expectedMustIncludeAny ?? [],
      expectedMustIncludeAnchors: testCase.expectedMustIncludeAnchors,
      expectedMustNotIncludeAny: testCase.expectedMustNotIncludeAny ?? [],
      allowMedicalBoundary: Boolean(testCase.allowMedicalBoundary),
      allowLegalBoundary: Boolean(testCase.allowLegalBoundary),
      allowDeathBoundary: Boolean(testCase.allowDeathBoundary),
      allowMonthly: Boolean(testCase.allowMonthly),
      allowRemedy: Boolean(testCase.allowRemedy),
      expectedAccuracy: testCase.expectedAccuracy,
      expectedExactFact: Boolean(testCase.expectedExactFact),
      expectedMustIncludeAll: testCase.expectedMustIncludeAll,
      expectedMustNotIncludeAll: testCase.expectedMustNotIncludeAll,
    },
    answer,
    meta,
  })

  if (testCase.expectedExactFact && quality.failures.includes('answer_too_short')) {
    quality.failures = quality.failures.filter((item) => item !== 'answer_too_short')
    quality.passed = quality.failures.length === 0
  }

  return {
    passed: failures.length === 0 && quality.passed,
    failures: [...failures, ...quality.failures],
    answer,
    meta,
    similarityKey: getAnswerSimilarityKey(answer),
  }
}

export function stratifyLiveCases(records, limit) {
  const buckets = new Map()
  for (const record of records) {
    const key = record.liveCategory || record.category || 'general'
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(record)
  }

  const orderedKeys = [
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
  const perBucket = Math.max(1, Math.floor(limit / Math.max(1, orderedKeys.length)))
  for (const key of orderedKeys) {
    const bucket = buckets.get(key) ?? []
    sampled.push(...bucket.slice(0, perBucket))
  }

  if (sampled.length < limit) {
    for (const record of records) {
      if (sampled.includes(record)) continue
      sampled.push(record)
      if (sampled.length >= limit) break
    }
  }

  return sampled.slice(0, limit)
}

export function formatAggregateSummary(result) {
  return JSON.stringify(result, null, 2)
}

export function detectRepeatedAnswers(entries) {
  const seen = new Map()
  const repeated = []
  for (const entry of entries) {
    const key = entry.similarityKey
    const prev = seen.get(key)
    if (prev && prev.question !== entry.question) repeated.push({ first: prev, second: entry })
    else seen.set(key, entry)
  }
  return repeated
}
