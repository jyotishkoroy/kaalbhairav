import fs from 'node:fs'
import { getGeneratedQuestionBankPaths, loadJsonlRecords } from './astro-v2-bank-check-core.mjs'

const { jsonlPath, summaryPath, reportPath } = getGeneratedQuestionBankPaths()

if (!fs.existsSync(jsonlPath) || !fs.existsSync(summaryPath)) {
  throw new Error('Generated bank missing. Run npm run generate:astro-v2-question-bank first.')
}

const limit = process.env.ASTRO_V2_FULL_BANK === '1' ? 52000 : Number(process.env.ASTRO_V2_BANK_LIMIT ?? 1000)
const records = loadJsonlRecords(jsonlPath).slice(0, limit)
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))

const issues = []

if (summary.totalRecords !== 52000) issues.push('summary_total_mismatch')
if (summary.domainCount !== 26) issues.push('summary_domain_count_mismatch')
if (records.length !== limit) issues.push('limit_mismatch')

for (const record of records.slice(0, 50)) {
  if (!record.question || !record.expectedMustIncludeAny?.length) {
    issues.push(`bad_record:${record.id}`)
    break
  }
}

const report = {
  checked: records.length,
  issues,
  summary: {
    totalRecords: summary.totalRecords,
    domainCount: summary.domainCount,
  },
}

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

if (issues.length > 0) {
  process.exitCode = 1
}
