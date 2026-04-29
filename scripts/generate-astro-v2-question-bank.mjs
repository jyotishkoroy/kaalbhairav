/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  ensureDir,
  generateQuestionBankRecords,
  generateSeedCases,
  getGeneratedPaths,
  summarizeQuestionBank,
} from './astro-question-bank-core.mjs'

const { generatedDir, jsonlPath, summaryPath } = getGeneratedPaths()
ensureDir(generatedDir)

const records = generateQuestionBankRecords()
if (records.length !== 52000) {
  throw new Error(`Expected 52000 records, got ${records.length}`)
}

fs.writeFileSync(jsonlPath, records.map((record) => JSON.stringify(record)).join('\n') + '\n')
fs.writeFileSync(summaryPath, JSON.stringify(summarizeQuestionBank(records), null, 2))

const seedPath = path.resolve('tests/fixtures/astro-v2-question-bank-seeds.json')
ensureDir(path.dirname(seedPath))
fs.writeFileSync(seedPath, JSON.stringify(generateSeedCases(), null, 2))

console.log(JSON.stringify({ jsonlPath, summaryPath, total: records.length }, null, 2))
