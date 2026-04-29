/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const candidatePaths = [
  process.env.ASTRO_V2_GENERIC_QA_SOURCE,
  path.join(root, 'birth_chart_50000_difficult_questions_answers(3).md'),
  path.join(root, 'birth_chart_50000_difficult_questions_answers.md'),
  path.join(root, 'tmp', 'astro-source', 'birth_chart_50000_difficult_questions_answers.md'),
  '/mnt/data/birth_chart_50000_difficult_questions_answers(3).md',
].filter(Boolean)

const sourcePath = candidatePaths.find((p) => fs.existsSync(p))
if (!sourcePath) throw new Error(`Generic QA source not found. Looked in: ${candidatePaths.join(', ')}`)

const text = fs.readFileSync(sourcePath, 'utf8')
const rows = text.split(/\r?\n/).filter((line) => /^\|\s*\d+\s*\|/.test(line))

function splitRow(row) {
  return row
    .replace(/^\|\s*/, '')
    .replace(/\s*\|\s*$/, '')
    .split(/\s*\|\s*/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim())
}

const records = []
for (const row of rows) {
  const cells = splitRow(row)
  if (cells.length < 5) continue
  const id = Number(cells[0])
  const question = String(cells[1] ?? '').trim()
  const answer = String(cells[2] ?? '').trim()
  const reasoning = String(cells[3] ?? '').trim()
  const accuracy = String(cells[4] ?? '').trim()
  if (!Number.isFinite(id) || !question || !answer) continue

  const lowerQ = question.toLowerCase()
  let expectedTopic = 'general_chart'
  if (/lagna|rasi|nakshatra|tithi|yoga|karan|ayanamsa|latitude|longitude|time zone|dob|time of birth|lmt|gmt|lucky number/.test(lowerQ)) expectedTopic = 'chart_facts'
  else if (/house|sign|lord|whole-sign/.test(lowerQ)) expectedTopic = 'house_lordship'
  else if (/planet placement|placement|degree|nakshatra|pada|house/.test(lowerQ)) expectedTopic = 'planetary_placement'
  else if (/aspect|co-present|conjunction/.test(lowerQ)) expectedTopic = 'aspects'
  else if (/ashtakavarga|bindu|bindus|rank/.test(lowerQ)) expectedTopic = 'ashtakavarga'
  else if (/mahadasha|vimshottari/.test(lowerQ)) expectedTopic = 'dasha'
  else if (/sade sati|panoti|shani/.test(lowerQ)) expectedTopic = 'saturn_periods'
  else if (/varshaphal 2026|2026/.test(lowerQ)) expectedTopic = 'varshaphal_2026'
  else if (/kp|cusp|sub lord/.test(lowerQ)) expectedTopic = 'kp'
  else if (/career|promotion|job/.test(lowerQ)) expectedTopic = 'career'
  else if (/money|wealth|income/.test(lowerQ)) expectedTopic = 'money'
  else if (/marriage|love|partner/.test(lowerQ)) expectedTopic = 'relationship'
  else if (/health|disease|sleep/.test(lowerQ)) expectedTopic = 'health'
  else if (/death|longevity|lifespan/.test(lowerQ)) expectedTopic = 'death'
  else if (/legal|court|contract/.test(lowerQ)) expectedTopic = 'legal'

  const expectedMode =
    accuracy === 'Totally accurate'
      ? 'deep_astrology'
      : accuracy === 'Partially accurate'
        ? 'practical_guidance'
        : 'short_comfort'

  const expectedMustIncludeAny =
    accuracy === 'Totally accurate'
      ? answer.split(/[,\s;]+/).filter((token) => token && token.length > 2).slice(0, 4)
      : question.split(/[,\s;]+/).filter((token) => token && token.length > 3).slice(0, 4)

  records.push({
    id,
    question,
    expectedAnswer: answer,
    expectedReasoning: reasoning,
    accuracy,
    expectedMode,
    expectedTopic,
    expectedMustIncludeAny,
    expectedMustNotIncludeAny: accuracy === 'Inaccurate' ? ['guaranteed', 'certainly', 'exactly'] : [],
    expectedExactFact: accuracy === 'Totally accurate',
    expectedSafetyBoundary: /health/.test(lowerQ) ? 'medical' : /legal|court|contract/.test(lowerQ) ? 'legal' : /death|lifespan/.test(lowerQ) ? 'death' : 'none',
    sourceBank: 'generic-50000',
  })
}

const headerMatch = text.match(/Total Q&A items:\*\*\s*([\d,]+)/i)
const expectedTotal = headerMatch ? Number(headerMatch[1].replace(/,/g, '')) : 50000
if (records.length !== expectedTotal) {
  throw new Error(`Expected ${expectedTotal} records, parsed ${records.length}`)
}

const outDir = path.join(root, 'generated', 'astro-v2-generic-qa-bank')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'generated-generic-qa-bank.jsonl'), records.map((record) => JSON.stringify(record)).join('\n') + '\n')

const summary = {
  totalRecords: records.length,
  countsByAccuracy: records.reduce((acc, record) => {
    acc[record.accuracy] = (acc[record.accuracy] ?? 0) + 1
    return acc
  }, {}),
}
fs.writeFileSync(path.join(outDir, 'generated-generic-qa-bank-summary.json'), JSON.stringify(summary, null, 2))

const seedPath = path.join(root, 'tests', 'fixtures', 'astro-v2-generic-qa-bank-seeds.json')
fs.mkdirSync(path.dirname(seedPath), { recursive: true })
fs.writeFileSync(seedPath, JSON.stringify(records.slice(0, 500), null, 2))

console.log(JSON.stringify({ sourcePath, total: records.length }, null, 2))
