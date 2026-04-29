/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import fs from 'node:fs'
import { getGeneratedGenericQaBankPaths, getGeneratedQuestionBankPaths, loadJsonlRecords } from './astro-v2-bank-check-core.mjs'

function checkQuestionBank(fullMode) {
  const { jsonlPath, summaryPath, reportPath } = getGeneratedQuestionBankPaths()
  if (!fs.existsSync(jsonlPath) || !fs.existsSync(summaryPath)) {
    throw new Error('Generated question bank missing.')
  }

  const limit = fullMode ? 52000 : Number(process.env.ASTRO_V2_BANK_LIMIT ?? 1000)
  const records = loadJsonlRecords(jsonlPath).slice(0, limit)
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  const issues = []
  if (summary.totalRecords !== 52000) issues.push('summary_total_mismatch')
  if (summary.domainCount !== 26) issues.push('summary_domain_count_mismatch')
  if (records.length !== limit) issues.push('limit_mismatch')
  fs.writeFileSync(reportPath, JSON.stringify({ checked: records.length, issues, summary }, null, 2))
  return { name: 'generated', checked: records.length, failures: issues, passed: issues.length === 0 }
}

function checkGenericBank(fullMode) {
  const { jsonlPath, summaryPath, reportPath } = getGeneratedGenericQaBankPaths()
  if (!fs.existsSync(jsonlPath) || !fs.existsSync(summaryPath)) {
    throw new Error('Generic QA bank missing.')
  }

  const limit = fullMode ? 50000 : Number(process.env.ASTRO_V2_GENERIC_QA_LIMIT ?? 1000)
  const records = loadJsonlRecords(jsonlPath).slice(0, limit)
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  const issues = []
  if (summary.totalRecords !== 50000) issues.push('summary_total_mismatch')
  if (records.length !== limit) issues.push('limit_mismatch')
  fs.writeFileSync(reportPath, JSON.stringify({ checked: records.length, issues, summary }, null, 2))
  return { name: 'generic', checked: records.length, failures: issues, passed: issues.length === 0 }
}

const fullGenerated = process.env.ASTRO_V2_FULL_BANK === '1'
const fullGeneric = process.env.ASTRO_V2_GENERIC_QA_FULL === '1'
const results = [checkQuestionBank(fullGenerated), checkGenericBank(fullGeneric)]
const combinedFailures = results.reduce((sum, item) => sum + item.failures.length, 0)
const report = {
  generatedChecked: results[0].checked,
  genericChecked: results[1].checked,
  combinedChecked: results[0].checked + results[1].checked,
  combinedFailures,
  passed: combinedFailures === 0,
}

fs.writeFileSync('generated/astro-v2-all-banks-check-report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

if (combinedFailures > 0) process.exitCode = 1
