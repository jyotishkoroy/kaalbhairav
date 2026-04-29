import fs from 'node:fs'
import { getGeneratedGenericQaBankPaths, loadJsonlRecords } from './astro-v2-bank-check-core.mjs'

const { jsonlPath, summaryPath, reportPath } = getGeneratedGenericQaBankPaths()

if (!fs.existsSync(jsonlPath) || !fs.existsSync(summaryPath)) {
  throw new Error('Generic QA bank missing. Run npm run parse:astro-v2-generic-qa-bank first.')
}

const limit = process.env.ASTRO_V2_GENERIC_QA_FULL === '1' ? 50000 : Number(process.env.ASTRO_V2_GENERIC_QA_LIMIT ?? 1000)
const records = loadJsonlRecords(jsonlPath).slice(0, limit)
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
const issues = []

if (summary.totalRecords !== 50000) issues.push('summary_total_mismatch')
if (records.length !== limit) issues.push('limit_mismatch')

const report = {
  checked: records.length,
  issues,
  summary,
}

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (issues.length) process.exitCode = 1
